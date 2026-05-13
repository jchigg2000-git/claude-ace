#!/usr/bin/env node
import { run } from '../src/index.js';

run(process.argv.slice(2)).catch((err) => {
  process.stderr.write(`claude-ace: ${err.message}\n`);
  if (process.env.CLAUDE_ACE_DEBUG) process.stderr.write(`${err.stack}\n`);
  process.exit(1);
});
