# u30-uuid-path-params — PDCA cycle artifact for Phase 2 unit U30

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for unit **U30** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). That plan's U30 entry is the authoritative record. This file carries **no approval
> status of its own**, and **mirrors the register rather than replacing it** (standing rule, 2026-09-18).
>
> **Project**: Supplement Stack Intelligence Platform
> **Unit**: U30 · N-51 — a malformed path parameter answers 400, not 500
> **Date**: 2026-09-21 · created 2026-09-14 by decision 8(d); unblocked by U29 landing
> **Status**: cycle artifact — the Phase 2 entry's U30 plan block was **APPROVED by the owner on
> 2026-09-21**, with five rulings recorded there. This file still carries no status of its own; the
> line is synced because a reader of the artifact alone would otherwise draw the wrong conclusion
> (ecc:code-reviewer, U30, advisory).
> **Method**: bkit PDCA (plan → design → do → check → report)

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | **N-51**: a malformed `id` path segment reaches Postgres, the uuid cast fails, and the throw surfaces as **500**. The route answers "we broke" for what is a client error, and the 500 carries a correlation id into the log for every scanner that tries `/api/stacks/x`. |
| **Solution** | `uuidParam.parse(id)` at each dynamic handler, so a malformed id becomes a **ZodError**, which `handle()` already maps to **400** via `validationError`. No new error class, no change to `respond.ts`, plus a scan asserting every dynamic handler validates its id params. |
| **Function/UX Effect** | **Declared behaviour change:** malformed path id → **400 `VALIDATION_ERROR`** instead of 500. A well-formed id that does not exist still answers 404, unchanged. |
| **Core Value** | The status code stops lying about whose fault it is, and the scan stops the next dynamic route from being written without the check. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | N-51 (`ecc:security-reviewer`, U12 review) → U30 by decision 8(d), 2026-09-14. |
| **WHO** | Twelve handlers across eight files; every client that can mistype a URL. |
| **RISK** | *(**[2026-09-21] SUPERSEDED BY U34** — that handler is now on `handle()` and uses the same bare `uuidParam.parse(id)` as the other eleven. The row stays as written: it was the risk U30 faced, and U30 was right to treat it as one.)* The twelfth handler is not like the other eleven — `advisor/actions/[id]/undo` does not use `handle()` (see the plan entry). A guard that assumes uniformity would pass over it. |
| **SUCCESS** | Malformed id → 400 at all twelve; the scan reddens on a thirteenth handler that skips the check; mutations red. |
| **SCOPE** | Eight route files · `src/lib/validation/schemas.ts` (or wherever `uuidParam` lands) · one new architecture spec · route tests. No migration, no repo change. |

## 1–7. See the Phase 2 plan's U30 entry (grep `U30 PLAN`). Everything here restates it and adds nothing.
