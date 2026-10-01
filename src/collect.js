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

// event field ← usage key
const TOKEN_FIELDS = [
  ['input_tokens', 'input_tokens'],
  ['output_tokens', 'output_tokens'],
  ['cache_read_tokens', 'cache_read_input_tokens'],
  ['cache_creation_tokens', 'cache_creation_input_tokens'],
];

const MAX_PAST_DAYS = 30;
const FUTURE_SLACK_MS = 5 * 60 * 1000;

// Walk the projects dir recursively. Main-session logs sit at
// <project>/<session>.jsonl, but subagent and workflow-agent logs nest below
// the session (<project>/<session>/subagents/[workflows/wf_*/]agent-*.jsonl)
// and usually carry most of the token spend, so a one-level scan misses them.
export async function listSessionFiles(projectsDir) {
  let top;
  try {
    top = await readdir(projectsDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const files = [];
  const walk = async (dir, entries) => {
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        let inner;
        try {
          inner = await readdir(full, { withFileTypes: true });
        } catch {
          continue; // unreadable or vanished dir — don't abort the whole scan
        }
        await walk(full, inner);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl') && dir !== projectsDir) {
        files.push(full);
      }
    }
  };
  await walk(projectsDir, top);
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

  const event = {
    external_event_id: uuid,
    occurred_at: ts,
    event_type: type,
  };
  if (raw.message?.model) event.model = raw.message.model;
  if (typeof raw.message?.id === 'string' && raw.message.id) event.message_id = raw.message.id;
  const usage = raw.message?.usage || {};
  for (const [field, key] of TOKEN_FIELDS) {
    if (typeof usage[key] === 'number') event[field] = usage[key];
  }
  return event;
}

// Claude Code writes one JSONL line per content block of an API response, and
// every line repeats that response's `usage` (the earlier lines carry a partial
// output count; the last carries the final one). Summing per line inflates
// totals several-fold, so token counts are kept once per message.id: the first
// event for an id holds the per-field max seen across its lines, and later
// events for the same id keep their place in event/model counts with no tokens.
function makeUsageDeduper() {
  const firstById = new Map();
  return (event) => {
    const id = event.message_id;
    delete event.message_id;
    if (!id) return;
    const first = firstById.get(id);
    if (!first) {
      firstById.set(id, event);
      return;
    }
    for (const [field] of TOKEN_FIELDS) {
      if (typeof event[field] === 'number') {
        first[field] = Math.max(first[field] ?? 0, event[field]);
        delete event[field];
      }
    }
  };
}

export async function collectNewEvents({ projectsDir, state, onProgress }) {
  const files = await listSessionFiles(projectsDir);
  const events = [];
  const dedupeUsage = makeUsageDeduper();
  // Lines are only appended, so a file last modified before the reporting
  // window holds no event the window would keep — skip reading it.
  const oldestMs = Date.now() - MAX_PAST_DAYS * 24 * 60 * 60 * 1000;
  const newCursors = {};

  // Pass 1 — decide which files need reading (cheap: stat only), so progress
  // can be reported against the real amount of work.
  const pending = [];
  let bytesTotal = 0;
  for (const file of files) {
    let st;
    try {
      st = await stat(file);
    } catch {
      continue;
    }
    const cursor = state[file] || { lastUuid: null, mtimeMs: 0 };
    if ((st.mtimeMs <= cursor.mtimeMs && cursor.lastUuid) || st.mtimeMs < oldestMs) {
      newCursors[file] = cursor;
      continue;
    }
    pending.push({ file, st, cursor });
    bytesTotal += st.size;
  }

  // Pass 2 — read them.
  let bytesDone = 0;
  let filesDone = 0;
  for (const { file, st, cursor } of pending) {
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

    for (const ev of fileEvents) dedupeUsage(ev);
    events.push(...fileEvents);
    newCursors[file] = { lastUuid: lastEventUuid, mtimeMs: st.mtimeMs };
    bytesDone += st.size;
    onProgress?.({
      filesDone: ++filesDone,
      filesTotal: pending.length,
      bytesDone,
      bytesTotal,
    });
  }

  return { events, newCursors, scannedFiles: pending.length, totalFiles: files.length };
}
