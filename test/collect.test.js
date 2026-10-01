import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, chmod, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { listSessionFiles } from '../src/collect.js';

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
