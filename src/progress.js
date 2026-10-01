// A transient "scanning…" line for the slow part of a run. A full scan of a
// heavy ~/.claude/projects can take many seconds, and until the report prints
// there is otherwise no sign of life. Written to stderr (never stdout, so piped
// reports stay clean) and only when stderr is an interactive terminal; the line
// is erased before the report is drawn.

const MIN_INTERVAL_MS = 100;
const CLEAR = '\r\x1b[2K';

export function createScanProgress(stream = process.stderr, now = Date.now) {
  const enabled = Boolean(stream.isTTY) && process.env.TERM !== 'dumb';
  let lastDrawn = -Infinity;
  let drew = false;

  return {
    onProgress({ filesDone, filesTotal, bytesDone, bytesTotal }) {
      if (!enabled) return;
      const t = now();
      if (t - lastDrawn < MIN_INTERVAL_MS && filesDone < filesTotal) return;
      lastDrawn = t;
      drew = true;
      const pct = bytesTotal > 0 ? Math.floor((bytesDone / bytesTotal) * 100) : 100;
      const nf = new Intl.NumberFormat('en-US');
      stream.write(
        `${CLEAR}  scanning session logs… ${pct}% (${nf.format(filesDone)} / ${nf.format(filesTotal)} files)`,
      );
    },
    // Erase the line if one was drawn. Safe to call more than once.
    finish() {
      if (!drew) return;
      drew = false;
      stream.write(CLEAR);
    },
  };
}
