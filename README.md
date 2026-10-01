# claude-ace

A small Node CLI that scans your Claude Code session logs in
`~/.claude/projects/` and renders a pretty terminal summary — token
totals, top models, event types, and an estimated dollar cost — with a
hydration animation.

No network calls. No accounts. No data leaves your machine.

## Install

```bash
npm install -g claude-ace
# or run from a clone:
node ./bin/cli.js
```

Requires Node 20+.

## Usage

```bash
claude-ace                 # render the report (animated)
claude-ace --no-animate    # skip the animation
claude-ace --help
```

## Test

```bash
npm test
```

## What gets counted

Every `*.jsonl` log under `~/.claude/projects/`, including the subagent and
workflow-agent logs nested under each session, for the last 30 days. Claude
Code writes one log line per content block of a response and repeats that
response's usage on each line, so token totals count each response once (by
message id) rather than once per line.

## Cost estimation

The report includes an **Estimated cost (USD)** section that dollarizes the
token totals per model — input, output, cache-read, and cache-creation tokens
multiplied by that model's published rates, with a grand total.

These are estimates from a built-in, point-in-time pricing table for the
current Claude model families (cache-creation is priced at 1.25× the base input
rate; cache-read uses the model's published rate where the table has one, else
0.1× the base input rate). Models the table doesn't recognize are shown as
`(no price)` and counted as `$0` rather than guessed, so an unknown model never
inflates the total. Rates live in [`src/pricing.js`](src/pricing.js).

## Environment

| Variable | Notes |
| --- | --- |
| `CLAUDE_ACE_NO_ANIMATE` | Set to `1` to disable animation (same as `--no-animate`). |
| `NO_COLOR` | Standard — disables ANSI colors and the animation. |

## License

MIT
