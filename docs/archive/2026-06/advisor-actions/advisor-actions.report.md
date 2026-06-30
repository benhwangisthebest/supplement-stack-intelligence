---
template: report
version: 1.1
feature: advisor-actions
date: 2026-06-23
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
milestone: v7
---

# advisor-actions Completion Report

> **Status**: Complete
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v7
> **Author**: benhwang121@gmail.com
> **Completion Date**: 2026-06-23
> **PDCA Cycle**: v7 (advisor-actions)

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | advisor-actions (suggest-then-confirm) |
| Start Date | 2026-06-22 (Plan-Plus) |
| End Date | 2026-06-23 |
| Method | Plan-Plus → PDCA (Do ×3 modules) |

### 1.2 Results Summary

```
┌─────────────────────────────────────────────┐
│  Match Rate: 98%   (Check, no iterations)    │
├─────────────────────────────────────────────┤
│  ✅ Success Criteria:   8 / 8 met            │
│  ✅ Unit tests:       268 / 268 (+40)        │
│  ✅ Critical gaps:      0                    │
│  ⏳ Env-gated (live):   authed L1 + L2/L3     │
└─────────────────────────────────────────────┘
```

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | v6 made every engine conversationally *readable*, but the advisor was a dead end for action — the moment its synthesis became actionable, the user had to leave chat and re-enter the change by hand. |
| **Solution** | A suggest-then-confirm layer: the advisor proposes a Zod-validated `ActionProposal`; the system re-checks safety on the *projected* result, shows an editable diff card, and writes only on explicit confirm — through the existing repos. The LLM proposes; it never commits. |
| **Function/UX Effect** | `/advisor` answers can now carry an Action Proposal card (diff + editable dose/timing + new-flag display + Confirm/Reject) and an Undo toast. Five proposal tools (add / remove / edit / generate-protocol / attach-product). +40 unit tests, 0 new dependencies. |
| **Core Value** | The advisor became a **safe collaborator** — closing the loop from understanding to doing without giving the LLM any write authority. Verified: 0 engine/write-API-route files modified; the confirm route reuses existing repos as the only writers. |

---

## 1.4 Success Criteria Final Status

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | Proposal tools produce valid `ActionProposal` | ✅ Met | `actions/proposals.ts` (5 tools); `proposals.test.ts` 15/15 |
| SC-2 | LLM never writes | ✅ Met | no Supabase import in `lib/advisor/actions/*`; sole writer is the confirm route via existing repos |
| SC-3 | Grounding enforced (no fabrication) | ✅ Met | tools refuse ungrounded ids; `agent-proposals.test.ts`; honesty sweep on proposal summary |
| SC-4 | Pre-apply safety re-check | ✅ Met | `safety-recheck.ts`; authoritative server gate hard-blocks critical (`SAFETY_BLOCK` 409) |
| SC-5 | Edit-before-confirm | ✅ Met | `ActionProposalCard` editable inputs → route merges `editable` only; L1 lifecycle asserts dose 350 |
| SC-6 | Server re-validation | ✅ Met | `route.ts revalidate()`: ownership, `stackItemInputSchema` re-parse, supplement/product re-ground |
| SC-7 | Audit + undo | ✅ Met | `0004` `advisor_actions` (+inverse); `undo/route.ts`; `ALREADY_UNDONE` guard; `apply.test.ts` |
| SC-8 | Additive / zero-regression | ✅ Met | 268/268 unit; `next build` OK; 0 engine/write-route files modified |

**Success Rate**: 8/8 criteria met (100%).

## 1.5 Decision Record Summary

| Source | Decision | Followed? | Outcome |
|--------|----------|:---------:|---------|
| [Plan] | Approach A — Proposal-Tool pattern | ✅ | Proposal tools return `ActionProposal`; agent halts; engines untouched |
| [Design] | Option C — dedicated `lib/advisor/actions/` boundary | ✅ | `actions/{schema,proposals,apply,execute}.ts` clean separation |
| [Plan] | Engines/repos are the only writers | ✅ | Confirm route reuses `addItem`/`updateItem`/`deleteItem`/`createStack`/`deleteStack` |
| [Do] | Critical projected flag → hard-block | ✅ | `SAFETY_BLOCK` 409 in confirm route |
| [Do] | Product attachment = DB-only `product_id` column | ✅ (deviation) | `setItemProduct`/`getItemProductId`; `StackItem` type untouched — avoided ~6-site churn, additive |

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [advisor-actions.plan.md](../01-plan/features/advisor-actions.plan.md) | ✅ Finalized |
| Design | [advisor-actions.design.md](../02-design/features/advisor-actions.design.md) | ✅ Finalized |
| Check | [advisor-actions.analysis.md](../03-analysis/advisor-actions.analysis.md) | ✅ Complete (98%) |
| Act | Current document | ✅ Complete |

---

## 3. Completed Items

### 3.1 Functional Requirements

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| FR-01 | Propose add / remove / edit stack item | ✅ Complete | 3 proposal tools |
| FR-02 | Propose generate-&-save protocol | ✅ Complete | reuses pure `generateProtocol` |
| FR-03 | Propose attach matched product | ✅ Complete | DB-only `product_id` column |
| FR-04 | Pre-apply safety re-check + hard-block | ✅ Complete | `safety-recheck` + `SAFETY_BLOCK` |
| FR-05 | Edit-before-confirm | ✅ Complete | editable dose/timing on card |
| FR-06 | Server re-validation on confirm | ✅ Complete | ownership + re-parse + re-ground |
| FR-07 | Audit + one-click undo | ✅ Complete | `advisor_actions` + inverse |

### 3.2 Non-Functional Requirements

| Item | Target | Achieved | Status |
|------|--------|----------|--------|
| New dependencies | 0 | 0 | ✅ |
| Engine/write-route files modified | 0 | 0 | ✅ |
| Unit regression | none | 268/268 | ✅ |
| Build | passes | `next build` OK | ✅ |

### 3.3 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| Domain (types, proposals, apply, safety-recheck) | `src/types/advisor-action.ts`, `src/lib/advisor/actions/*`, `src/lib/advisor/safety-recheck.ts` | ✅ |
| Persistence + API | `supabase/migrations/0004_advisor_actions.sql`, `src/lib/db/advisor-action-repo.ts`, `src/app/api/advisor/actions/**` | ✅ |
| UI | `src/components/advisor/ActionProposalCard.tsx`, `UndoToast.tsx`, `AdvisorPanel.tsx` | ✅ |
| Tests | 4 unit specs (+40), 2 e2e specs (L1 + L2/L3) | ✅ |

---

## 4. Incomplete Items

### 4.1 Carried Over (v8)

| Item | Reason | Priority |
|------|--------|----------|
| Authed L1 + L2/L3 live E2E | Needs migration `0004` applied + `E2E_LIVE` (same as v4/v6) | Medium |
| Batch multi-action proposals | Plan YAGNI deferral | Medium |
| True LLM token-streaming, chip deep-linking, atomic usage RPC | v6 polish carry-overs | Low |
| Surface attached product in the item UI | v7 stores it; display is a nicety | Low |

### 4.2 Cancelled/On Hold

| Item | Reason | Alternative |
|------|--------|-------------|
| `productId` on `StackItem` domain type | Affects no evaluation; would cascade ~6 sites | DB-only column via `setItemProduct`/`getItemProductId` |

---

## 5. Quality Metrics

### 5.1 Final Analysis Results

| Metric | Target | Final | Status |
|--------|--------|-------|--------|
| Design Match Rate | ≥ 90% | 98% | ✅ |
| Unit tests | green | 268/268 (+40) | ✅ |
| Typecheck | clean | `tsc` clean | ✅ |
| Build | passes | OK; both routes registered | ✅ |
| L1 auth-guards (live) | 401 | 2/2 live | ✅ |
| Critical/Important gaps | 0 | 0 | ✅ |

### 5.2 Notable Engineering Decisions Resolved During Do

| Item | Resolution | Result |
|------|------------|--------|
| `StackItem` had no `productId` (design assumed it) | DB-only nullable column + narrow repo fns | ✅ No domain-type churn |
| `evaluateStack` already composes interactions+biomarkers | Safety re-check diffs a single `evaluateStack` call | ✅ No double-counting |
| Union return type broke v6 route/tests | Extended `AdvisorTurnResult` with optional `proposal` + `"proposed"` status | ✅ Zero consumer churn |

---

## 6. Lessons Learned & Retrospective

### 6.1 What Went Well (Keep)
- The v4/v6 "isolate the non-deterministic unit behind a port, make the guarantee unit-testable" pattern transferred cleanly to writes — proposal tools are pure, so SC-2/3 are provable against fixtures.
- Reading the real repos/types before coding caught the `productId` gap and the `evaluateStack` composition early, avoiding rework.
- Modeling forward/inverse as pure `WriteIntent` mappings made undo trivial and fully unit-testable without a DB.

### 6.2 What Needs Improvement (Problem)
- The Design assumed `StackItem.productId` from CLAUDE.md's data model without verifying the v1 implementation — a Design-time grep would have caught it before Do.
- Live-authed paths remain env-gated across the whole arc; the project still lacks a CI Supabase project to exercise them.

### 6.3 What to Try Next (Try)
- A Design-phase "verify assumed schema against code" checklist item.
- Stand up an ephemeral Supabase project in CI so `E2E_LIVE` authed flows run automatically.

---

## 7. Process Improvement Suggestions

| Phase | Current | Improvement |
|-------|---------|-------------|
| Design | Data model assumed from spec | Grep code to confirm fields exist before specifying reuse |
| Check | Live E2E env-gated | Provision CI Supabase for authed runtime verification |

---

## 8. Next Steps

### 8.1 Immediate
- [ ] Apply migration `0004` to the Supabase project; run authed L1 + L2/L3 with `E2E_LIVE=1 --workers=1`.
- [ ] `/pdca archive advisor-actions` to archive the v7 cycle.

### 8.2 Next PDCA Cycle (v8 candidates)
| Item | Priority |
|------|----------|
| Batch multi-action proposals | Medium |
| True LLM token-streaming + provenance chip deep-linking | Medium |
| Personalization / context-adjusted grades; finish remaining effect profiles | Medium |
| Condition/pregnancy interaction rules; external interaction API; LOINC | Low |

---

## 9. Changelog

### v7 (2026-06-23)

**Added:**
- Suggest-then-confirm advisor: 5 proposal tools, proposal-halt agent loop, pre-apply safety re-check.
- `POST /api/advisor/actions` (confirm) + `POST /api/advisor/actions/:id/undo` with server re-validation and audit/inverse.
- `advisor_actions` table + nullable `stack_items.product_id` (migration `0004`, additive, RLS).
- `ActionProposalCard` + `UndoToast` + SSE `proposal` event.

**Changed:**
- `AdvisorTurnResult` gains optional `proposal`/`newSafetyFlags` + `"proposed"` status (additive).
- System prompt: read-only → suggest-then-confirm contract.

**Fixed:**
- (none — no regressions; 268/268 unit green.)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-23 | Completion report created | benhwang121@gmail.com |
