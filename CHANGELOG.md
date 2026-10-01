# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/) once
it leaves the `0.x` zone.

## [Unreleased]

### Fixed

- **Subagent logs are now counted.** The scan walks session directories
  recursively, picking up `subagents/` and `subagents/workflows/` logs that a
  one-level scan missed.
- **Token totals no longer multiply per content block.** Usage repeated across
  the lines of one API response is counted once per message id (keeping the
  final output count), instead of once per line.
- **Pricing table refreshed to 2026-09-25 rates.** Adds Fable 5.1, Mythos 5.1,
  Opus 5.5, Opus 5 and Sonnet 5.5; corrects Sonnet 5 to $2 / $10; uses published
  cache-read rates where they differ from 0.1× input; bare `opus` / `sonnet` /
  `fable` / `mythos` aliases point at the newest model of each family.

- **Report layout.** A long model id (such as a dated snapshot) no longer pushes
  the cost table's border out of line; label columns size to the longest name and
  cut absurdly long ids with an ellipsis. "Top models" percentages are now each
  model's share of all model events, not of the five rows shown.

### Changed

- Log files last modified before the 30-day window are skipped without being
  read, so "files scanned" now counts only files that could hold reported events.

### Added

- **Scan progress.** A full scan of a busy `~/.claude/projects` takes many seconds
  and used to print nothing until it finished. On an interactive terminal a
  transient "scanning session logs… N%" line now shows on stderr and is erased
  before the report; piped or redirected runs are unchanged.
- **Estimated cost (USD) section.** The report now dollarizes token totals per
  model — input, output, cache-read (0.1× input), and cache-creation (1.25×
  input) — with a grand total, using a built-in point-in-time pricing table for
  the current Claude model families (`src/pricing.js`). Unrecognized models are
  shown as `(no price)` and counted as `$0` so they never inflate the total.

## [0.2.0] — 2026-05-18

`claude-ace` is a local-only log viewer for Claude Code session logs —
token totals, top models, event types — with a hydration animation.
No network calls, no accounts.

Supersedes the deprecated `0.1.0` line. (`0.1.1` was published and
unpublished, so npm requires a new version number.)

## [0.1.1] — 2026-05-13

Initial release. `claude-ace` is a local-only log viewer for Claude Code
session logs — token totals, top models, event types — with a hydration
animation. No network calls, no accounts.
