const colorOff = process.env.NO_COLOR != null || !process.stdout.isTTY;

function code(open, close) {
  return (s) => (colorOff ? String(s) : `\x1b[${open}m${s}\x1b[${close}m`);
}

export const style = {
  bold: code(1, 22),
  dim: code(2, 22),
  italic: code(3, 23),
  underline: code(4, 24),
  inverse: code(7, 27),
  red: code(31, 39),
  green: code(32, 39),
  yellow: code(33, 39),
  blue: code(34, 39),
  magenta: code(35, 39),
  cyan: code(36, 39),
  gray: code(90, 39),
  brightGreen: code(92, 39),
  brightYellow: code(93, 39),
  brightCyan: code(96, 39),
};

export function termWidth() {
  const c = process.stdout.columns || 80;
  return Math.max(80, Math.min(120, c));
}

export function strip(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

export function visualLength(s) {
  return strip(s).length;
}

export function padRight(s, width) {
  const len = visualLength(s);
  return len >= width ? s : s + ' '.repeat(width - len);
}

export function padLeft(s, width) {
  const len = visualLength(s);
  return len >= width ? s : ' '.repeat(width - len) + s;
}

export const box = {
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  h: '─', v: '│',
  lt: '├', rt: '┤', tt: '┬', bt: '┴', cross: '┼',
};
