import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLocal, renderReport } from '../src/display.js';

const ev = (model, n, extra = {}) =>
  Array.from({ length: n }, () => ({
    event_type: 'assistant',
    model,
    input_tokens: 10,
    output_tokens: 20,
    ...extra,
  }));

const report = (events) =>
  renderReport({
    scan: { scannedFiles: 1, totalFiles: 1, events: events.length },
    local: summarizeLocal(events),
    packageVersion: '0.0.0',
  });

// Lines of the report between a section header and the next blank line.
const section = (text, header) => {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.includes(header));
  const out = [];
  for (let i = start + 1; i < lines.length && lines[i].trim() !== ''; i++) out.push(lines[i]);
  return out;
};

test('cost table borders stay aligned for a long dated model id', () => {
  const long = 'claude-haiku-4-5-20251001';
  const text = report([...ev(long, 2), ...ev('claude-opus-5-5', 3)]);
  const table = section(text, 'Estimated cost').filter((l) => /^\s+[┌│├└]/.test(l));
  assert.ok(table.length >= 5);
  assert.ok(table.some((l) => l.includes(long + ' ')), 'the full id fits, untruncated, with a space before the border');
  assert.equal(new Set(table.map((l) => l.length)).size, 1, 'every table row is the same width');
});

test('an absurdly long model id is truncated rather than breaking the table', () => {
  const text = report(ev('claude-' + 'x'.repeat(80), 1));
  const table = section(text, 'Estimated cost').filter((l) => /^\s+[┌│├└]/.test(l));
  assert.equal(new Set(table.map((l) => l.length)).size, 1);
  assert.ok(table.some((l) => l.includes('…')));
});

test('top-models percentages are shares of all model events, not of the rows shown', () => {
  // Seven models: 10 events each for the top five, 5 each for two hidden ones.
  const events = [];
  for (const m of ['a', 'b', 'c', 'd', 'e']) events.push(...ev(`m-${m}`, 10));
  for (const m of ['f', 'g']) events.push(...ev(`m-${m}`, 5));
  const rows = section(report(events), 'Top models');
  assert.equal(rows.length, 5);
  // 10 of 60 events = 16.7%; shares of the five shown rows would read 20.0%.
  assert.ok(rows.every((r) => r.trimEnd().endsWith('16.7%')), rows.join('\n'));
});

test('model names in the top-models list are aligned', () => {
  const rows = section(report([...ev('claude-haiku-4-5-20251001', 2), ...ev('claude-opus-5-5', 3)]), 'Top models');
  const barStarts = rows.map((r) => r.search(/[█░]/));
  assert.equal(new Set(barStarts).size, 1);
});
