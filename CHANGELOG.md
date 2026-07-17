# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/) once
it leaves the `0.x` zone.

## [Unreleased]

### Added

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
