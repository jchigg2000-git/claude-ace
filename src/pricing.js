// Per-model pricing for dollarizing token totals.
//
// Rates are US dollars per **million** tokens, for the standard (non-batch)
// Claude API tier. Cache read/write rates are derived from the base input
// rate with the documented multipliers rather than stored per model:
//   - cache read  ≈ 0.10× base input  (tokens served from an existing cache)
//   - cache write ≈ 1.25× base input  (5-minute ephemeral cache creation)
//
// These are ESTIMATES. The table is a point-in-time snapshot (see PRICES_AS_OF)
// and covers the current Claude model families. Any model not in the table —
// including older or unrecognized ids — is priced at $0 and flagged, so an
// unknown model never inflates the total with a guessed rate.

export const PRICES_AS_OF = '2026-06-24';

export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_MULTIPLIER = 1.25;

// input / output USD per 1M tokens. Keys are canonical model ids (lowercase).
const PRICING = {
  'claude-fable-5':    { input: 10, output: 50 },
  'claude-mythos-5':   { input: 10, output: 50 },
  'claude-opus-4-8':   { input: 5,  output: 25 },
  'claude-opus-4-7':   { input: 5,  output: 25 },
  'claude-opus-4-6':   { input: 5,  output: 25 },
  'claude-opus-4-5':   { input: 5,  output: 25 },
  'claude-sonnet-5':   { input: 3,  output: 15 },
  'claude-sonnet-4-6': { input: 3,  output: 15 },
  'claude-sonnet-4-5': { input: 3,  output: 15 },
  'claude-haiku-4-5':  { input: 1,  output: 5 },
};

// Bare aliases that show up in logs → canonical id (latest of that family).
const ALIASES = {
  opus: 'claude-opus-4-8',
  sonnet: 'claude-sonnet-5',
  haiku: 'claude-haiku-4-5',
  fable: 'claude-fable-5',
  mythos: 'claude-mythos-5',
};

// Reduce a raw model string from the logs to a canonical pricing key.
// Handles suffixes the loggers append: context tags like "[1m]", trailing
// dated snapshots like "-20251001", and stray parentheticals / whitespace.
export function normalizeModel(model) {
  if (!model || typeof model !== 'string') return '';
  let m = model.toLowerCase().trim();
  // Drop bracketed context tags: "claude-opus-4-8[1m]" → "claude-opus-4-8".
  m = m.replace(/\[[^\]]*\]/g, '');
  // Drop parenthetical descriptions: "opus 4.8 (1m)" → "opus 4.8".
  m = m.replace(/\([^)]*\)/g, '');
  m = m.trim();
  if (ALIASES[m]) return ALIASES[m];
  // Drop a trailing dated snapshot: "-20251001".
  const dated = m.replace(/-\d{8}$/, '');
  if (PRICING[dated]) return dated;
  if (PRICING[m]) return m;
  return m;
}

// Return { input, output } USD-per-1M rates for a model, or null if unknown.
export function priceForModel(model) {
  const key = normalizeModel(model);
  return PRICING[key] || null;
}

// Cost in USD for one model's token breakdown given its rates.
function costForTokens(rate, { input = 0, output = 0, cacheRead = 0, cacheCreate = 0 }) {
  const per = (tokens, r) => (tokens / 1_000_000) * r;
  return (
    per(input, rate.input) +
    per(output, rate.output) +
    per(cacheRead, rate.input * CACHE_READ_MULTIPLIER) +
    per(cacheCreate, rate.input * CACHE_WRITE_MULTIPLIER)
  );
}

// Estimate spend from a summarizeLocal() result. The model map must carry
// per-model token classes (input/output/cacheRead/cacheCreate).
// Returns:
//   { rows: [{ model, cost, known }], total, unknownModels }
// sorted by cost descending. `total` counts only known-priced models.
export function estimateCost(local) {
  const rows = [];
  let total = 0;
  const unknownModels = [];
  for (const [model, m] of (local.models || new Map())) {
    const rate = priceForModel(model);
    if (rate) {
      const cost = costForTokens(rate, m);
      total += cost;
      rows.push({ model, cost, known: true });
    } else {
      const hasTokens =
        (m.input || 0) + (m.output || 0) + (m.cacheRead || 0) + (m.cacheCreate || 0) > 0;
      rows.push({ model, cost: 0, known: false });
      if (hasTokens) unknownModels.push(model);
    }
  }
  rows.sort((a, b) => b.cost - a.cost || (a.known === b.known ? 0 : a.known ? -1 : 1));
  return { rows, total, unknownModels };
}

// Format a USD amount. Sub-cent totals still show a meaningful figure.
export function formatUSD(amount) {
  const n = amount || 0;
  const digits = n > 0 && n < 0.01 ? 4 : 2;
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}
