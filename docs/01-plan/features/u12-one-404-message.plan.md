# u12-one-404-message — PDCA cycle artifact for Phase 2 unit U12

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for unit **U12** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). The Phase 2 plan's U12 entry is the authoritative record. This file carries **no
> approval status of its own**. If this file and the Phase 2 entry disagree, the Phase 2 entry wins.
>
> **Project**: Supplement Stack Intelligence Platform
> **Unit**: U12 · FU-28 — one message for both 404s
> **Date**: 2026-09-11
> **Status**: cycle artifact — subordinate to the approved Phase 2 plan (no status of its own)
> **Method**: bkit PDCA (plan → design → do → check → report), driven from the Phase 2 entry

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | `notFound(what)` renders `${what} not found.` into the client-facing `error.message`, so a foreign stack and a foreign item answer the same status and code but different text. FU-28: the Phase 1 pin claimed "identically" and asserted only status and code. |
| **Solution** | **Option C (owner ruling 2026-09-11): A's scope with B's enforcement.** The two FU-28 pairs in the stack-item route (PUT and DELETE) answer one message, `Stack item not found.`; `notFound(what)` keeps its parameter and the other twelve sites are untouched. The FU-28 pin asserts message **and byte-length** equality. A new `NOT_FOUND_UNIFORMITY` scan asserts that within any single `route.ts` every 404 call site resolves to one literal — the mechanical form of the defect class, no allowlist today, inventory asserted non-empty. |
| **Function/UX Effect** | **Declared behaviour change #3, sized as two response bodies, not fourteen:** the stack-item route's PUT and DELETE 404s change `error.message`. Status, code, envelope, and the absence of `correlationId` on 404 are unchanged. |
| **Core Value** | Within one route, the 404 carries no more information than the status and code already do — and a guard makes that true for every route from now on. The product-wide "one uniform 404" question is **N-50**, open and unassigned; rule 13 governs internal text, not resource names. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | FU-28, open since Phase 1 closeout; deferred from Group C to Group D with a written obligation. |
| **WHO** | Consumers of the stack-item route's PUT and DELETE; every future route, via the scan. |
| **RISK** | The scan going green over nothing — mitigated by two non-empty inventory assertions (M3). |
| **SUCCESS** | FU-28 pin asserts equal message and length; M1–M3 red; four gate commands green; CI green on the pushed SHA. |
| **SCOPE** | One route (four call sites), its test, one new architecture test. `respond.ts` and `services/` untouched. |

## 1–7. See the Phase 2 plan's U12 entry (grep `U12 PLAN`). Everything here restates it and adds nothing.

---

## 8. Do / Check — see the Phase 2 entry's DONE block (2026-09-11)

- Red first: 3 failures (new spec + strengthened pin) before any source edit.
- Mutations M1–M5 executed against the final detector, recorded verbatim in the Phase 2 entry.
- Gate: tsc clean · lint 360/360, 0 errors · vitest **1294/106** · build succeeds.
- Reviews: ecc:code-reviewer REQUEST CHANGES (1 blocking, 3 advisory) → all four addressed → APPROVE
  (0 outstanding, 1 low note recorded, not taken) · ecc:security-reviewer NO REMAINING CHANNEL (0
  blocking, 1 advisory → N-51).
- Findings registered, not absorbed: N-50 (product question, unassigned), N-51 (UUID path-param
  validation, unassigned).
