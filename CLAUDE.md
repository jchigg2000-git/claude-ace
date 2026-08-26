**`ROADMAP.md` is the SINGLE SOURCE OF TRUTH for execution** — what's left, what's next, and
every phase / acceptance criterion / decision, across all workstreams. On any handoff, **read it
first and follow only it as the plan.** There are deliberately **no other `*_PLAN` or handoff
docs** — none existed at install (2026-08-07); never create them. Put new plan or status
content in `ROADMAP.md`. If any doc's status conflicts with ROADMAP, ROADMAP wins.

`CHANGELOG.md` is release history, a different layer — never fold it into ROADMAP.

**Backlog items are not blockers.** No item under a `BACKLOG` / `PARKED` status gates any other
work unless it carries a `⛔ BLOCKS:` line quoting the owner's instruction from when it was
parked. Absent that line, it is non-blocking. Do not infer blocking from urgency or dependency
order.

`DECISIONS.md` is append-only; supersede rather than rewrite.

Read order for a fresh session: this file → `ROADMAP.md`.
