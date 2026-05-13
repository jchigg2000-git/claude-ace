import { style, termWidth, box, padRight, padLeft, visualLength } from './style.js';
import { animate, easeOutCubic, isAnimatable } from './animate.js';

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);
const pct = (num, denom) => (denom > 0 ? `${((num / denom) * 100).toFixed(1)}%` : '0%');

export function summarizeLocal(events) {
  let input = 0, output = 0, cacheRead = 0, cacheCreate = 0;
  const models = new Map();
  const eventTypes = new Map();
  for (const e of events) {
    input += e.input_tokens || 0;
    output += e.output_tokens || 0;
    cacheRead += e.cache_read_tokens || 0;
    cacheCreate += e.cache_creation_tokens || 0;
    if (e.model) {
      const m = models.get(e.model) || { count: 0, tokens: 0 };
      m.count++;
      m.tokens += (e.input_tokens || 0) + (e.output_tokens || 0) + (e.cache_creation_tokens || 0);
      models.set(e.model, m);
    }
    if (e.event_type) eventTypes.set(e.event_type, (eventTypes.get(e.event_type) || 0) + 1);
  }
  return { input, output, cacheRead, cacheCreate, models, eventTypes, totalEvents: events.length };
}

function hr(width, char = box.h) {
  return char.repeat(width);
}

function banner(width, title, subtitle) {
  const inner = width - 2;
  const lines = [];
  lines.push(style.cyan(box.tl + hr(inner) + box.tr));
  const left = '  ' + style.bold(title);
  const right = subtitle + '  ';
  const padding = inner - visualLength(left) - visualLength(right);
  lines.push(style.cyan(box.v) + left + ' '.repeat(Math.max(1, padding)) + style.gray(right) + style.cyan(box.v));
  lines.push(style.cyan(box.bl + hr(inner) + box.br));
  return lines.join('\n');
}

function sectionHeader(title) {
  return '  ' + style.bold(style.underline(title));
}

function kv(label, value, labelWidth = 20) {
  return '  ' + style.dim('─ ') + padRight(label + ':', labelWidth) + ' ' + value;
}

function scaleLocal(local, t) {
  return {
    input: Math.round((local.input || 0) * t),
    output: Math.round((local.output || 0) * t),
    cacheRead: Math.round((local.cacheRead || 0) * t),
    cacheCreate: Math.round((local.cacheCreate || 0) * t),
    models: new Map(
      [...(local.models || new Map())].map(([k, v]) => [
        k,
        { count: Math.round(v.count * t), tokens: Math.round(v.tokens * t) },
      ]),
    ),
    eventTypes: new Map(
      [...(local.eventTypes || new Map())].map(([k, v]) => [k, Math.round(v * t)]),
    ),
    totalEvents: Math.round((local.totalEvents || 0) * t),
  };
}

function tokenTable(width, local) {
  const labelW = 22;
  const valW = 18;
  const rows = [
    ['input',          fmt(local.input)],
    ['output',         fmt(local.output)],
    ['cache read',     fmt(local.cacheRead)],
    ['cache creation', fmt(local.cacheCreate)],
  ];
  const lines = [];
  lines.push('  ' + style.gray(box.tl + hr(labelW) + box.tt + hr(valW) + box.tr));
  for (const [k, v] of rows) {
    lines.push(
      '  ' +
        style.gray(box.v) +
        ' ' + padRight(k, labelW - 1) +
        style.gray(box.v) + ' ' +
        padLeft(v, valW - 2) + ' ' +
        style.gray(box.v),
    );
  }
  lines.push('  ' + style.gray(box.bl + hr(labelW) + box.bt + hr(valW) + box.br));
  return lines.join('\n');
}

function modelsBlock(width, local, top = 5, barScale = 1) {
  const entries = [...local.models.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, top);
  if (entries.length === 0) return '  ' + style.dim('(no model data)');
  const totalEvents = entries.reduce((n, [, m]) => n + m.count, 0);
  const maxBar = Math.max(20, Math.min(40, width - 60));
  const max = entries[0][1].count;
  return entries.map(([name, m]) => {
    const filledFinal = Math.round((m.count / Math.max(1, max)) * maxBar);
    const filled = Math.min(filledFinal, Math.round(filledFinal * barScale));
    const bar = style.brightGreen('█'.repeat(filled)) + style.gray('░'.repeat(maxBar - filled));
    return (
      '    ' +
      padRight(name, 22) + ' ' +
      padLeft(fmt(m.count) + ' ev', 12) + '  ' +
      bar + '  ' +
      padLeft(pct(m.count, totalEvents), 6)
    );
  }).join('\n');
}

function eventTypesBlock(width, local, barScale = 1) {
  const entries = [...local.eventTypes.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '  ' + style.dim('(no event types)');
  const max = entries[0][1];
  const maxBar = Math.max(20, Math.min(40, width - 50));
  return entries.map(([name, count]) => {
    const filledFinal = Math.round((count / max) * maxBar);
    const filled = Math.min(filledFinal, Math.round(filledFinal * barScale));
    const bar = style.cyan('█'.repeat(filled)) + style.gray('░'.repeat(maxBar - filled));
    return (
      '    ' +
      padRight(name, 22) + ' ' +
      padLeft(fmt(count), 10) + '  ' +
      bar
    );
  }).join('\n');
}

export async function renderAnimatedReport(args) {
  if (!isAnimatable()) {
    process.stdout.write(renderReport(args));
    return;
  }
  const { scan, local, packageVersion } = args;
  const w = termWidth();
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  process.stdout.write('\n' + banner(w, `claude-ace v${packageVersion}`, ts) + '\n');
  process.stdout.write('\n' + sectionHeader('Scan summary') + '\n');
  process.stdout.write(kv('files scanned', `${fmt(scan.scannedFiles)} / ${fmt(scan.totalFiles)}`) + '\n');
  process.stdout.write(kv('events',        fmt(scan.events)) + '\n');

  process.stdout.write('\n' + sectionHeader('Token totals') + '\n');
  await animate({
    steps: 24,
    fps: 30,
    render: (t) => tokenTable(w, scaleLocal(local, easeOutCubic(t))) + '\n',
  });

  process.stdout.write('\n' + sectionHeader('Top models') + '\n');
  await animate({
    steps: 18,
    fps: 30,
    render: (t) => modelsBlock(w, local, 5, easeOutCubic(t)) + '\n',
  });

  process.stdout.write('\n' + sectionHeader('Event types') + '\n');
  await animate({
    steps: 18,
    fps: 30,
    render: (t) => eventTypesBlock(w, local, easeOutCubic(t)) + '\n',
  });

  process.stdout.write('\n');
}

export function renderReport({ scan, local, packageVersion }) {
  const w = termWidth();
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  const sections = [];
  sections.push('');
  sections.push(banner(w, `claude-ace v${packageVersion}`, ts));
  sections.push('');
  sections.push(sectionHeader('Scan summary'));
  sections.push(kv('files scanned', `${fmt(scan.scannedFiles)} / ${fmt(scan.totalFiles)}`));
  sections.push(kv('events',        fmt(scan.events)));
  sections.push('');
  sections.push(sectionHeader('Token totals'));
  sections.push(tokenTable(w, local));
  sections.push('');
  sections.push(sectionHeader('Top models'));
  sections.push(modelsBlock(w, local));
  sections.push('');
  sections.push(sectionHeader('Event types'));
  sections.push(eventTypesBlock(w, local));
  sections.push('');

  return sections.join('\n');
}
