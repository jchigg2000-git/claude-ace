import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScanProgress } from '../src/progress.js';

const fakeStream = (isTTY) => {
  const writes = [];
  return { isTTY, writes, write: (s) => writes.push(s) };
};
const step = (filesDone, filesTotal = 4) => ({
  filesDone,
  filesTotal,
  bytesDone: filesDone * 25,
  bytesTotal: filesTotal * 25,
});

test('writes nothing when stderr is not a terminal', () => {
  const stream = fakeStream(false);
  const p = createScanProgress(stream);
  p.onProgress(step(1));
  p.onProgress(step(4));
  p.finish();
  assert.deepEqual(stream.writes, []);
});

test('draws a throttled percentage line on a terminal and erases it on finish', () => {
  const prevTerm = process.env.TERM;
  process.env.TERM = 'xterm';
  try {
    const stream = fakeStream(true);
    let clock = 1000;
    const p = createScanProgress(stream, () => clock);
    p.onProgress(step(1)); // drawn
    p.onProgress(step(2)); // same instant: throttled
    clock += 150;
    p.onProgress(step(3)); // drawn
    p.onProgress(step(4)); // final step always drawn
    assert.equal(stream.writes.length, 3);
    assert.match(stream.writes[0], /25% \(1 \/ 4 files\)/);
    assert.match(stream.writes[2], /100% \(4 \/ 4 files\)/);
    p.finish();
    assert.equal(stream.writes.at(-1), '\r\x1b[2K');
    const n = stream.writes.length;
    p.finish();
    assert.equal(stream.writes.length, n, 'finish is idempotent');
  } finally {
    if (prevTerm === undefined) delete process.env.TERM;
    else process.env.TERM = prevTerm;
  }
});

test('finish is a no-op when nothing was drawn', () => {
  const stream = fakeStream(true);
  createScanProgress(stream).finish();
  assert.deepEqual(stream.writes, []);
});
