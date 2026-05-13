import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

const ALLOWED_EVENT_TYPES = new Set([
  'user',
  'assistant',
  'summary',
  'system',
  'tool_use',
  'tool_result',
  'file-history-snapshot',
]);

const MAX_PAST_DAYS = 30;
const FUTURE_SLACK_MS = 5 * 60 * 1000;

export async function listSessionFiles(projectsDir) {
  let projectDirs;
  try {
    projectDirs = await readdir(projectsDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const files = [];
  for (const entry of projectDirs) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(projectsDir, entry.name);
    const inner = await readdir(dir, { withFileTypes: true });
    for (const f of inner) {
      if (f.isFile() && f.name.endsWith('.jsonl')) {
        files.push(path.join(dir, f.name));
      }
    }
  }
  return files;
}

export async function* readJsonlEvents(file) {
  const rl = readline.createInterface({
    input: createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // skip malformed lines silently — these are append-only logs
    }
  }
}

export function mapToEvent(raw) {
  const uuid = raw.uuid;
  const ts = raw.timestamp;
  const type = raw.type;
  if (!uuid || !ts || !type) return null;
  if (!ALLOWED_EVENT_TYPES.has(type)) return null;

  const occurredMs = Date.parse(ts);
  if (Number.isNaN(occurredMs)) return null;
  const now = Date.now();
  if (occurredMs > now + FUTURE_SLACK_MS) return null;
  if (occurredMs < now - MAX_PAST_DAYS * 24 * 60 * 60 * 1000) return null;

  const usage = raw.message?.usage || {};
  const event = {
    external_event_id: uuid,
    occurred_at: ts,
    event_type: type,
  };
  if (raw.message?.model) event.model = raw.message.model;
  if (typeof usage.input_tokens === 'number') event.input_tokens = usage.input_tokens;
  if (typeof usage.output_tokens === 'number') event.output_tokens = usage.output_tokens;
  if (typeof usage.cache_read_input_tokens === 'number') event.cache_read_tokens = usage.cache_read_input_tokens;
  if (typeof usage.cache_creation_input_tokens === 'number') event.cache_creation_tokens = usage.cache_creation_input_tokens;
  return event;
}

export async function collectNewEvents({ projectsDir, state }) {
  const files = await listSessionFiles(projectsDir);
  const events = [];
  const newCursors = {};
  let scannedFiles = 0;

  for (const file of files) {
    let st;
    try {
      st = await stat(file);
    } catch {
      continue;
    }
    const cursor = state[file] || { lastUuid: null, mtimeMs: 0 };
    if (st.mtimeMs <= cursor.mtimeMs && cursor.lastUuid) {
      newCursors[file] = cursor;
      continue;
    }
    scannedFiles++;

    const fileEvents = [];
    let seenLastUuid = cursor.lastUuid == null;
    let lastEventUuid = cursor.lastUuid;

    for await (const raw of readJsonlEvents(file)) {
      const id = raw.uuid;
      if (!seenLastUuid) {
        if (id === cursor.lastUuid) seenLastUuid = true;
        continue;
      }
      const ev = mapToEvent(raw);
      if (ev) fileEvents.push(ev);
      if (id) lastEventUuid = id;
    }

    if (!seenLastUuid) {
      // cursor not found in file (rotated/truncated) — fall back to forwarding everything
      for await (const raw of readJsonlEvents(file)) {
        const ev = mapToEvent(raw);
        if (ev) fileEvents.push(ev);
        if (raw.uuid) lastEventUuid = raw.uuid;
      }
    }

    events.push(...fileEvents);
    newCursors[file] = { lastUuid: lastEventUuid, mtimeMs: st.mtimeMs };
  }

  return { events, newCursors, scannedFiles, totalFiles: files.length };
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
