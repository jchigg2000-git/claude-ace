// Frame-based redraw animation for the terminal.
// Strategy: write a frame, then on the next frame move cursor up and rewrite.
// Assumes constant line count between frames; render functions are responsible
// for that. No-op (final frame only) when stdout is not a TTY or NO_COLOR is set.

import { style } from './style.js';

export const isAnimatable = () =>
  process.stdout.isTTY && process.env.NO_COLOR == null && process.env.CLAUDE_ACE_NO_ANIMATE !== '1';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lineCount = (s) => (s.match(/\n/g) || []).length;

export async function animate({ steps = 30, fps = 30, render, finalize }) {
  const frameMs = 1000 / fps;
  if (!isAnimatable()) {
    process.stdout.write(render(1));
    if (finalize) process.stdout.write(finalize());
    return;
  }
  let prev = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const out = render(t);
    if (prev > 0) {
      process.stdout.write(`\x1b[${prev}A\r`);
      // Clear each line we're about to overwrite, then come back up.
      for (let l = 0; l < prev; l++) process.stdout.write('\x1b[2K\n');
      process.stdout.write(`\x1b[${prev}A\r`);
    }
    process.stdout.write(out);
    prev = lineCount(out);
    if (i < steps) await sleep(frameMs);
  }
  if (finalize) process.stdout.write(finalize());
}

// Spinner that runs an async task. Returns the task's result.
const SPIN_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export async function withSpinner(label, task) {
  if (!isAnimatable()) {
    process.stdout.write(`  ${label}…\n`);
    return await task();
  }
  let i = 0;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    process.stdout.write(`\r  ${style.cyan(SPIN_FRAMES[i % SPIN_FRAMES.length])} ${style.dim(label)}`);
    i++;
    setTimeout(tick, 80);
  };
  tick();
  try {
    const result = await task();
    stopped = true;
    process.stdout.write('\r\x1b[2K');
    return result;
  } catch (err) {
    stopped = true;
    process.stdout.write('\r\x1b[2K');
    throw err;
  }
}
