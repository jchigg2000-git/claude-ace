import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { paths } from './config.js';
import { collectNewEvents } from './collect.js';
import { summarizeLocal, renderReport, renderAnimatedReport } from './display.js';
import { isAnimatable } from './animate.js';

async function readPackageVersion() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  try {
    const raw = await readFile(path.join(here, '..', 'package.json'), 'utf8');
    return JSON.parse(raw).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function help() {
  return `claude-ace — show a pretty summary of your local Claude Code logs

Usage:
  claude-ace                  Render the log summary (with hydration animation).
  claude-ace --no-animate     Skip the animation.
  claude-ace --help

Environment:
  CLAUDE_ACE_NO_ANIMATE       "1" to disable animation (same as --no-animate).
  NO_COLOR                    Disable ANSI colors (also disables animation).
`;
}

async function collectAndSummarize() {
  const collected = await collectNewEvents({ projectsDir: paths.claudeProjects, state: {} });
  const local = summarizeLocal(collected.events);
  return {
    scannedFiles: collected.scannedFiles,
    totalFiles: collected.totalFiles,
    events: collected.events,
    local,
  };
}

async function render(ctx, { animate, packageVersion }) {
  const reportArgs = {
    scan: {
      scannedFiles: ctx.scannedFiles,
      totalFiles: ctx.totalFiles,
      events: ctx.events.length,
    },
    local: ctx.local,
    packageVersion,
  };
  if (animate && isAnimatable()) {
    await renderAnimatedReport(reportArgs);
  } else {
    process.stdout.write(renderReport(reportArgs));
  }
  return reportArgs;
}

export async function run(argv = []) {
  const { values } = parseArgs({
    args: argv,
    options: {
      help:         { type: 'boolean', short: 'h' },
      'no-animate': { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    process.stdout.write(help());
    return 0;
  }

  const animate = !values['no-animate'];
  const packageVersion = await readPackageVersion();
  const ctx = await collectAndSummarize();
  await render(ctx, { animate, packageVersion });
  return 0;
}
