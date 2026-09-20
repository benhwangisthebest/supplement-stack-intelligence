# u29-pre-spend-ownership — PDCA cycle artifact for Phase 2 unit U29

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for unit **U29** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). That plan's U29 entry is the authoritative record. This file carries **no approval
> status of its own**, and **mirrors the register rather than replacing it** — every finding this unit
> raises is registered in the plan's §4.5, in this unit's own commit (standing rule, 2026-09-18).
>
> **Project**: Supplement Stack Intelligence Platform
> **Unit**: U29 · N-48 (no ownership check before the paid call) · N-49 (unchecked `conversation_id` on write)
> **Date**: 2026-09-19 · created 2026-09-11 by owner ruling on N-48; unblocked by U31 and U32 landing
> **Status**: cycle artifact — the plan block is **AWAITING OWNER APPROVAL**; nothing here authorises
> implementation.
> **Method**: bkit PDCA (plan → design → do → check → report), driven from the Phase 2 entry

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | **N-48**: `POST /api/advisor` accepts a caller-supplied `conversationId` and never checks it belongs to the caller. The turn reserves budget and calls a paid model first; ownership is discovered — if at all — afterwards. **N-49**: `confirmAndApply` writes that same unchecked id into the caller's `advisor_actions` rows. |
| **Solution** | An ownership check before any reservation on the advisor route, and a check on the id `confirmAndApply` persists. Foreign and nonexistent both answer **404 `Conversation not found.`**, identical to the byte. |
| **Function/UX Effect** | **Declared behaviour change:** a request naming a conversation the caller does not own — or one that does not exist — now answers 404 instead of proceeding to a paid turn. No change for any caller using their own conversations. |
| **Core Value** | The paid call stops being the first thing that happens to an unauthorised request. RLS already isolates tenants at the database (§2.3 rule 12); this is the **spend** and **response-shape** half, which RLS does not cover. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | N-48 (U26 plan, confirmed by `ecc:architect`) and N-49 (`ecc:security-reviewer`, U26 review). Both assigned to U29 by owner ruling, 2026-09-11. |
| **WHO** | `POST /api/advisor`; `confirmAndApply` and its route; anyone billed for a turn they did not authorise. |
| **RISK** | Making "foreign" and "nonexistent" distinguishable — the response must not become an existence oracle for other users' conversation ids. |
| **SUCCESS** | Mutations red; both cases byte-identical; no paid call and no reservation on either; four gates green. |
| **SCOPE** | `src/app/api/advisor/route.ts` + test · `src/services/advisor-actions.ts` + its route test · possibly `src/lib/advisor/repo.ts`. No migration. |

## 1–7. See the Phase 2 plan's U29 entry (grep `U29 PLAN`). Everything here restates it and adds nothing.
