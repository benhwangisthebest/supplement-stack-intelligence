# u34-honest-post-commit-failures — PDCA cycle artifact for Phase 2 unit U34

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for unit **U34** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). That plan's U34 entry and its **U34 PLAN** block are the authoritative record. This
> file carries **no approval status of its own**, and **mirrors the register rather than replacing it**
> (standing rule, 2026-09-18).
>
> **Project**: Supplement Stack Intelligence Platform
> **Unit**: U34 · N-71 + N-72 — post-commit failures report their state honestly
> **Date**: 2026-09-21 · created 2026-09-20 by owner ruling on N-71; half (b) added 2026-09-21
> **Status**: cycle artifact — the Phase 2 entry's **U34 PLAN block is AWAITING OWNER APPROVAL**.
> Nothing is implemented.
> **Method**: bkit PDCA (plan → design → do → check → report)

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | **N-71**: after `executeBatch` commits, a throw in `recordBatch` returns `ACTION_ERROR` with no `rolledBack`, so a client cannot tell a rolled-back batch from an applied-but-unaudited one. **N-74** (found while planning): the `rolledBack: true` that *is* returned is asserted rather than computed, because the compensating rollback swallows its own failures. **N-72**: the undo route is the only handler off `handle()`. |
| **Solution** | Roll back at the audit step using the existing inverse replay, and report the outcome with a code that names the **state**: `ACTION_ERROR` + `rolledBack: true` when every inverse succeeded, `PARTIALLY_APPLIED` + counts when one did not. Move the undo route onto `handle()` with an optional `{ code }` so `UNDO_ERROR` survives. |
| **Function/UX Effect** | **Declared:** a `recordBatch` failure now rolls back; a failed rollback answers a new code; a throw in the undo route's `await params` becomes a logged envelope 500 instead of an unlogged framework 500. Success paths unchanged. |
| **Core Value** | The server stops claiming an undo it may not have performed, and stops losing the only copy of a deleted stack item's prior state. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | N-71 (`ecc:code-reviewer`, U29 review) and N-72 (U30 planning) → U34 by owner rulings, 2026-09-20 and 2026-09-21. |
| **WHO** | Anyone whose `remove_item` or `edit_item` batch fails at the audit step — the prior dose, unit, timing and notes live **only** in the unpersisted inverse. |
| **RISK** | `recordBatch` fails by losing the database; the compensating replay needs the same database. The expected failure mode is a PARTIAL rollback, which is why a binary `rolledBack` would make this worse rather than better. |
| **SUCCESS** | The three outcomes are distinguishable by code; a failed rollback says so with counts; the undo route's `await params` throw is logged; `UNDO_ERROR` is preserved. |
| **SCOPE** | `src/services/advisor-actions.ts` · `src/lib/advisor/actions/execute.ts` · `src/lib/api/respond.ts` (`handle` gains `{ code }`) · `src/app/api/advisor/actions/[id]/undo/route.ts` · three test files. No migration, no new spec. |

## 1–7. See the Phase 2 plan's U34 entry and U34 PLAN block (grep `U34 PLAN`). Everything here restates it and adds nothing.
