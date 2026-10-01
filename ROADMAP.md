# claude-ace — ROADMAP

> ⭐ **SINGLE SOURCE OF TRUTH.** On any handoff or fresh session, **read this first and follow
> only this** for what's left, what's next, phases, acceptance criteria, and decisions. There are
> **no other `*_PLAN` / handoff docs** — they were consolidated into this file. If another doc's
> status ever conflicts with this one, **this wins.**
>
> - **Release history**: `CHANGELOG.md` (never-touch, a different layer)
> - **Decisions**: `DECISIONS.md` (append-only log; roadmap items cite it by date + title)

**Legend:** ✅ done · 🔶 shipped but UNVERIFIED · ⏳ in progress · ⬜ not started · 🔬 verification
owed · 🔁 superseded (kept for its evidence, not as work) · ⛔ **BLOCKS** — the only marker that
gates anything

**Backlog items are not blockers.** No item under a `BACKLOG` / `PARKED` status may be cited as
gating, blocking, or holding up any other work unless it carries a `⛔ BLOCKS:` line with the
owner's verbatim instruction. Absent that line, treat it as non-blocking. An agent that reports
a parked item as a blocker is misreading this file.

**Contents:** §0 Do next · §1 Open items · Appendix

## §0 Do next

> ### ▶ RESUME HERE — 2026-10-01.
>
> **State:** `main` clean and pushed; `npm test` green (22 tests). Node CLI published to npm as
> `claude-ace` (0.2.0); scans `~/.claude/projects/` session logs (subagent logs included,
> usage counted once per message id) and renders a terminal summary: tokens, top models, event
> types, estimated cost. No network calls, no accounts.
>
> **▶ NEXT ACTION: owner-gated only.** Everything below needs the owner; nothing owner-free is
> queued. Start with item 1.
>
> **Unreleased on `main`** (see `CHANGELOG.md`): subagent logs counted, per-response usage dedupe,
> pricing table refreshed to 2026-09-25, estimated-cost section, report layout fixes, scan
> progress line. Not yet published; version still 0.2.0.

## §1 Open items

All owner-gated. None blocks any other work.

1. 🔬 **Verify the price table.** `src/pricing.js` (`PRICES_AS_OF` 2026-09-25) was self-sourced by
   an agent, not checked against Anthropic's pricing page. Owner checks every rate, the alias
   targets (`opus` → 5.5, `sonnet` → 5.5, `fable` → 5.1, `mythos` → 5.1), and the
   `cacheRead` overrides.
2. ⬜ **Price 1-hour cache writes at their own rate.** Current Claude Code logs carry
   `usage.cache_creation.ephemeral_1h_input_tokens` (and `_5m_`); the report prices every
   cache-creation token at the 5-minute 1.25× rate, so cost is understated wherever the 1-hour
   tier is used (98% of cache-creation tokens in a 2026-10-01 sample of the 150 newest session logs were 1-hour). Needs the two tiers carried
   through `mapToEvent` → `summarizeLocal` → `estimateCost`, plus a verified 1-hour multiplier
   (the published 2×; confirm under item 1). Do it after item 1 so the two number changes do not
   collide.
3. ⬜ **Release.** Decide the version (0.2.1 or 0.3.0) and publish the unreleased changes
   (`npm publish` is the owner's call; `package.json` metadata is untouched).

### Not worth doing now (measured, 2026-10-01)

- **Scan speed.** A full scan of ~4,700 in-window files (~7 GB) takes ~15 s on the owner's
  machine; `JSON.parse` of large tool-result lines dominates. Manual chunk-splitting instead of
  `readline` saved only ~15%. A real win needs a persisted per-file cache or worker threads, both
  of which add state or complexity the owner has not asked for; the progress line covers the
  wait.
- **Event-count double counting.** ~0.3% of events share a `uuid` across resumed-session files;
  tokens are already deduped by message id, so only the "events" and "ev" counts are affected.

## Appendix — consolidation history

No rival plan/backlog/handoff docs existed in this repo at install time (`git ls-files '*.md'`
returned only `README.md` and `CHANGELOG.md`). Nothing was folded or deleted. This roadmap was
seeded fresh by the `doc-consolidation` sweep (2026-08-07) and its open set refreshed
2026-10-01.
