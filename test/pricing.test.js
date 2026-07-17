import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeModel,
  priceForModel,
  estimateCost,
  formatUSD,
  CACHE_READ_MULTIPLIER,
  CACHE_WRITE_MULTIPLIER,
} from '../src/pricing.js';

test('normalizeModel strips context tags and dated snapshots', () => {
  assert.equal(normalizeModel('claude-opus-4-8[1m]'), 'claude-opus-4-8');
  assert.equal(normalizeModel('claude-haiku-4-5-20251001'), 'claude-haiku-4-5');
  assert.equal(normalizeModel('claude-opus-4-8'), 'claude-opus-4-8');
});

test('normalizeModel resolves bare aliases and parentheticals', () => {
  assert.equal(normalizeModel('opus'), 'claude-opus-4-8');
  assert.equal(normalizeModel('sonnet'), 'claude-sonnet-5');
  assert.equal(normalizeModel('haiku'), 'claude-haiku-4-5');
  assert.equal(normalizeModel('fable'), 'claude-fable-5');
  assert.equal(normalizeModel('Opus 4.8 (1M)'), 'opus 4.8');
});

test('normalizeModel is safe on junk input', () => {
  assert.equal(normalizeModel(''), '');
  assert.equal(normalizeModel(null), '');
  assert.equal(normalizeModel(undefined), '');
  assert.equal(normalizeModel('<synthetic>'), '<synthetic>');
});

test('priceForModel returns rates for known models, null otherwise', () => {
  assert.deepEqual(priceForModel('claude-opus-4-8'), { input: 5, output: 25 });
  assert.deepEqual(priceForModel('claude-opus-4-8[1m]'), { input: 5, output: 25 });
  assert.deepEqual(priceForModel('claude-sonnet-5'), { input: 3, output: 15 });
  assert.equal(priceForModel('<synthetic>'), null);
  assert.equal(priceForModel('gpt-4'), null);
});

test('estimateCost computes input/output/cache costs with the documented multipliers', () => {
  const local = {
    models: new Map([
      [
        'claude-opus-4-8',
        { input: 1_000_000, output: 1_000_000, cacheRead: 1_000_000, cacheCreate: 1_000_000 },
      ],
    ]),
  };
  const { rows, total, unknownModels } = estimateCost(local);
  // 1M input @ $5 + 1M output @ $25 + 1M cacheRead @ 5*0.1 + 1M cacheCreate @ 5*1.25
  const expected = 5 + 25 + 5 * CACHE_READ_MULTIPLIER + 5 * CACHE_WRITE_MULTIPLIER;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].known, true);
  assert.ok(Math.abs(total - expected) < 1e-9, `total ${total} ≈ ${expected}`);
  assert.deepEqual(unknownModels, []);
});

test('estimateCost flags unknown models as $0 without inflating the total', () => {
  const local = {
    models: new Map([
      ['claude-opus-4-8', { input: 1_000_000, output: 0, cacheRead: 0, cacheCreate: 0 }],
      ['<synthetic>', { input: 500_000, output: 500_000, cacheRead: 0, cacheCreate: 0 }],
    ]),
  };
  const { rows, total, unknownModels } = estimateCost(local);
  assert.ok(Math.abs(total - 5) < 1e-9, 'only the known model contributes');
  const synthetic = rows.find((r) => r.model === '<synthetic>');
  assert.equal(synthetic.known, false);
  assert.equal(synthetic.cost, 0);
  assert.deepEqual(unknownModels, ['<synthetic>']);
});

test('estimateCost sorts rows by cost descending', () => {
  const local = {
    models: new Map([
      ['claude-haiku-4-5', { input: 1_000_000, output: 0, cacheRead: 0, cacheCreate: 0 }],
      ['claude-opus-4-8', { input: 1_000_000, output: 0, cacheRead: 0, cacheCreate: 0 }],
    ]),
  };
  const { rows } = estimateCost(local);
  assert.equal(rows[0].model, 'claude-opus-4-8');
  assert.equal(rows[1].model, 'claude-haiku-4-5');
});

test('estimateCost handles empty / missing model maps', () => {
  assert.deepEqual(estimateCost({}), { rows: [], total: 0, unknownModels: [] });
  assert.deepEqual(estimateCost({ models: new Map() }), { rows: [], total: 0, unknownModels: [] });
});

test('formatUSD renders cents and sub-cent amounts', () => {
  assert.equal(formatUSD(0), '$0.00');
  assert.equal(formatUSD(12.3), '$12.30');
  assert.equal(formatUSD(1234.5), '$1,234.50');
  assert.equal(formatUSD(0.0025), '$0.0025');
});
