# u26-bind-owner — PDCA cycle artifact for Phase 2 unit U26

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for unit **U26** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). The Phase 2 plan's U26 entry is the authoritative record — its plan block, its
> red-evidence table, its closeout. This file carries **no approval status of its own**; it exists
> because `CLAUDE.md` §9 says the bkit tooling must be revived deliberately or retired, and U26 is
> where it was revived (owner ruling, 2026-09-11). If this file and the Phase 2 entry disagree, the
> Phase 2 entry wins.
>
> **Project**: Supplement Stack Intelligence Platform
> **Unit**: U26 · Bind the owner in the four ratchet functions
> **Date**: 2026-09-11
> **Status**: cycle artifact — subordinate to the approved Phase 2 plan (no status of its own)
> **Method**: bkit PDCA (plan → design → do → analyze → report), driven from the Phase 2 entry

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | Four repository functions touch a user-owned table without binding the owner: `getAction`, `markUndone`, `getActionsByBatch` (`advisor_actions`, which has a `user_id` column) and `appendMessages` (its `advisor_conversations` bump). They rely on RLS alone. GATE C1 was discharged with these four named as the remainder and held in `REPO_SCOPING`'s `UNSCOPED_FUNCTIONS` ratchet. |
| **Solution** | Add a `userId` parameter in the existing `(supabase, userId, …)` position and apply `.eq("user_id", userId)`. For `appendMessages`, bind the owner as a **filter on the parent conversation** (there is no `user_id` column on `advisor_messages`): owner-scoped bump first with `.select("id")`, throw on zero rows, then insert. Empty the ratchet. |
| **Function/UX Effect** | None visible. No response byte, status, or envelope changes. A foreign `conversationId` in `POST /api/advisor` still ends as a generic `error` event with a correlation id, now raised by the repo's owner clause rather than by RLS. |
| **Core Value** | Defence in depth at the repository layer, so a bug in `src/` cannot rely on RLS to save it. RLS already isolates tenants (`CLAUDE.md` §2.3 rule 12); this makes "protected by the mechanism this codebase claims to apply" true for the last four functions. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | GATE C1's named remainder: four functions the corrected quantifier sees and the exemption list must not absorb. |
| **WHO** | Every authenticated advisor user; the undo route and the advisor turn route. |
| **RISK** | Three adjacent `string` parameters make a transposed call site type-clean; mitigated by mutation M4 and positional route-test assertions. |
| **SUCCESS** | `UNSCOPED_FUNCTIONS` is `{}`; M1–M4 shown red; four gate commands green; CI green on the pushed SHA. |
| **SCOPE** | 2 repo modules · 2 routes · 4 test files · `repo-scoping.test.ts` · docs. No route-level pre-spend check (that is U29). |

---

## 1. Overview

See the Phase 2 plan, U26 entry (`docs/01-plan/phase-2-operational-dependability.plan.md`, grep
`^\*\*U26`). Everything below restates it in this template's shape and adds nothing.

### 1.3 Related Documents
- Authoritative: Phase 2 plan §5 Group C, U26 entry and GATE C1 discharge block.
- Ratchet: `src/architecture/repo-scoping.test.ts`.
- Owner-binding precedent: Phase 2 U9 pins, `src/lib/db/__testing__/query-spy.ts`.

## 2. Scope

### 2.1 In Scope
- [x] `getAction`, `markUndone`, `getActionsByBatch` take `userId` and filter on it.
- [x] `appendMessages` takes `userId`; owner-scoped conversation bump first, insert second.
- [x] Every caller updated (enumerated in the Phase 2 entry).
- [x] `UNSCOPED_FUNCTIONS` emptied; hardcoded `toHaveLength(4)` removed; header corrected.
- [x] Standing claims made false by this unit dated (FU-32 class sweep).

### 2.2 Out of Scope
- A pre-spend ownership check in `POST /api/advisor` — registered as **N-48**, owned by **U29**.
- U12 (FU-28) — lands in its own commit after U26's closeout.

## 3. Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Each of the four functions applies `.eq("user_id", userId)` on the user-owned table it touches | High |
| FR-02 | `appendMessages` writes no message row when the owner-scoped bump matches zero rows | High |
| FR-03 | Ratchet asserts zero unscoped functions and stays red in both directions | High |
| FR-04 | No response byte changes (declared: none) | High |

## 4. Success Criteria
- [x] M1: fix one function, keep its register row → ratchet red.
- [x] M2: empty the register with one function unfixed → ratchet red.
- [x] M3: revert `markUndone`'s owner clause → its pin red.
- [x] M4: pass a second user's id to `getAction` in the pin → red.
- [x] `npx tsc --noEmit` · `npm run lint` · `npx vitest run` · `npx next build` all green; counts re-measured.

## 5. Risks
| Risk | Mitigation |
|---|---|
| Transposed `string` arguments at a call site | M4 + route-test positional assertions |
| `toHaveLength(4)` left behind reds the empty register for the wrong reason | Removed with the register |
| Register reason text claims a route check that does not exist | Corrected in the same commit; N-48 registered |

## 6. Impact Analysis — see the Phase 2 entry's caller table (8 sites, 2 routes, 4 test files).

## 7. Architecture — ecc:architect verdict recorded in the Phase 2 entry: §4 boundaries PASS; §4 rule 8 PASS WITH NOTE (the note is N-48).

---

## 8. Design (recorded here; no separate design document by ruling — one decision, not three options)

**`appendMessages` binds the owner as a filter on the parent conversation, bump-first.** `advisor_messages`
has no `user_id` column (migration 0003), so the owner cannot be a column on the message row. The
owner-scoped `updated_at` bump runs first with `.select("id")`; zero rows throws before any insert. Chosen
over insert-then-scoped-bump because that order persists rows first and discovers non-ownership second.
Stated cost: `updated_at` may lead the newest message if the insert then fails. ecc:architect: PASS WITH
NOTE (the note is N-48). Full reasoning in the Phase 2 entry.

## 9. Do / Analyze / Report — see the Phase 2 entry's DONE block (2026-09-11)

- Red first: 10 failures across four rewritten test files before any source edit.
- Mutations M1–M4 executed and recorded verbatim in the Phase 2 entry.
- Gate: tsc clean · lint 359/359, 0 errors · vitest **1278/105** · build succeeds.
- Reviews: ecc:code-reviewer APPROVE (0 blocking, 1 advisory) · ecc:security-reviewer NO REMAINING PATH
  (0 blocking, 1 advisory → N-49).
- Findings registered, not absorbed: N-48 (→ U29), N-49 (→ U29, which owns the conversation-ownership predicate at both sites; splits U29/U30 if it exceeds S).
