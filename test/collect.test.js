import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, chmod, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { listSessionFiles, collectNewEvents } from '../src/collect.js';

test('listSessionFiles skips an unreadable project dir instead of throwing', async (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('permission bits not enforced here');
    return;
  }
  const root = await mkdtemp(path.join(os.tmpdir(), 'claude-ace-'));
  const bad = path.join(root, 'locked');
  try {
    await mkdir(path.join(root, 'ok'));
    await mkdir(bad);
    await writeFile(path.join(root, 'ok', 'a.jsonl'), '{}\n');
    await writeFile(path.join(bad, 'b.jsonl'), '{}\n');
    await chmod(bad, 0o000);
    const files = await listSessionFiles(root);
    assert.deepEqual(files, [path.join(root, 'ok', 'a.jsonl')]);
  } finally {
    await chmod(bad, 0o755).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
});

test('listSessionFiles returns [] when the projects dir is missing', async () => {
  assert.deepEqual(await listSessionFiles(path.join(os.tmpdir(), 'claude-ace-nope-' + Date.now())), []);
});

test('collectNewEvents finds nested subagent logs and counts each response\'s usage once', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'claude-ace-'));
  try {
    const ts = new Date().toISOString();
    const line = (uuid, msgId, usage, type = 'assistant') =>
      JSON.stringify({ uuid, timestamp: ts, type, message: { id: msgId, model: 'claude-opus-5-5', usage } });
    const session = path.join(root, 'proj');
    const nested = path.join(session, 'sess-1', 'subagents', 'workflows', 'wf_1');
    await mkdir(nested, { recursive: true });
    // One API response split over two content-block lines: the first carries a
    // partial output count, the last the final one.
    await writeFile(
      path.join(session, 'sess-1.jsonl'),
      [
        line('u1', 'msg_a', { input_tokens: 10, output_tokens: 3, cache_read_input_tokens: 100 }),
        line('u2', 'msg_a', { input_tokens: 10, output_tokens: 50, cache_read_input_tokens: 100 }),
      ].join('\n') + '\n',
    );
    await writeFile(
      path.join(nested, 'agent-x.jsonl'),
      line('u3', 'msg_b', { input_tokens: 1, output_tokens: 7, cache_read_input_tokens: 0 }) + '\n',
    );
    // A stray log at the projects root is not a session log.
    await writeFile(path.join(root, 'stray.jsonl'), line('u9', 'msg_z', { input_tokens: 999 }) + '\n');

    const { events, totalFiles } = await collectNewEvents({ projectsDir: root, state: {} });
    assert.equal(totalFiles, 2);
    assert.equal(events.length, 3, 'every line still counts as an event');
    const sum = (k) => events.reduce((n, e) => n + (e[k] || 0), 0);
    assert.equal(sum('input_tokens'), 11);
    assert.equal(sum('output_tokens'), 57);
    assert.equal(sum('cache_read_tokens'), 100);
    assert.ok(events.every((e) => e.model === 'claude-opus-5-5'));
    assert.ok(events.every((e) => !('message_id' in e)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
