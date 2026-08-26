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

> ### ▶ RESUME HERE — session handoff 2026-08-07.
>
> **State:** `git status` clean at ROADMAP install time. Repo last committed 2026-07-29. Node
> CLI (npm package), scans `~/.claude/projects/` session logs, renders a terminal summary
> (tokens, top models, event types, estimated cost). No network calls, no accounts.
>
> **▶ NEXT ACTION: none queued.** No open work item found — no TODO/FIXME markers in source, no
> prior plan/handoff/backlog doc.
>
> #### What shipped
> Full CLI per README.md; published to npm (per [[public-thesis-and-footprint]] memory).
>
> #### What I found by reading that nobody reported
> No rival plan/backlog/handoff doc existed anywhere in the repo — this is the first roadmap.
>
> #### What I deliberately did NOT do, and why
> Did not touch `CHANGELOG.md` — never-touch, release history is a different layer from
> execution planning.

## §1 Open items

(none found — clean seed install)

## Appendix — consolidation history

No rival plan/backlog/handoff docs existed in this repo at install time (`git ls-files '*.md'`
returned only `README.md` and `CHANGELOG.md`). Nothing was folded or deleted. This roadmap was
seeded fresh by the `doc-consolidation` sweep (2026-08-07).
