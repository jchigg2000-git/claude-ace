# claude-ace

A small Node CLI that scans your Claude Code session logs in
`~/.claude/projects/` and renders a pretty terminal summary — token
totals, top models, event types — with a hydration animation.

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

## Environment

| Variable | Notes |
| --- | --- |
| `CLAUDE_ACE_NO_ANIMATE` | Set to `1` to disable animation (same as `--no-animate`). |
| `NO_COLOR` | Standard — disables ANSI colors and the animation. |

## License

MIT
