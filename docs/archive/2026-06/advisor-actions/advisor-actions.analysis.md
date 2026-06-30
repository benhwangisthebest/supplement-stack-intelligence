---
template: analysis
version: 1.0
feature: advisor-actions
date: 2026-06-23
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
milestone: v7
---

# advisor-actions Analysis (Check Phase)

> **Verdict**: Match Rate **98%** (static + runtime). All 8 Success Criteria met. No Critical or Important gaps. Open items are pre-documented, design-consistent deferrals (live-authed E2E env-gated; v6 streaming/deep-link polish out of scope).

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | The advisor could reason out a change but not act on it; users re-entered it by hand. |
| **WHO** | Evidence-literate users with stack/profile/meds/labs entered. |
| **RISK** | LLM gaining write authority / fabricating an action; a change that *introduces* a new risk; client tampering; un-reversible actions. |
| **SUCCESS** | Grounded proposals; pre-apply safety re-check; server re-validation; audit + undo; zero engine edits. |
| **SCOPE** | `lib/advisor/actions/` + `safety-recheck` + proposal-halt + confirm/undo API + `0004` + card/toast. |

---

## 1. Strategic Alignment (WHY)

The implementation directly closes the loop the Plan identified: the v6 read-only advisor now **proposes** concrete stack/protocol/product changes that the user confirms, while the engines/repos remain the only writers. The non-negotiable invariant ("engines are the only writers", project rule #6/#8) is preserved — verified structurally (no DB handle anywhere in `lib/advisor/`; the confirm route is the sole writer and reuses existing repos). **Aligned.**

---

## 2. Success Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|:------:|----------|
| SC1 | Four+ proposal tools produce valid `ActionProposal` | ✅ Met | `actions/proposals.ts` (5 tools); `proposals.test.ts` 15 tests pass |
| SC2 | LLM never writes | ✅ Met | `lib/advisor/actions/*` import no Supabase; sole writer is `api/advisor/actions/route.ts` via existing repos; structurally verified |
| SC3 | Grounding enforced (no fabrication) | ✅ Met | proposal tools return `ok:false` on ungrounded ids; `agent-proposals.test.ts` ("ungrounded → refusal"); honesty sweep on proposal summary |
| SC4 | Pre-apply safety re-check | ✅ Met | `safety-recheck.ts` (`recheckForProposal` + `diffNewFlags`); authoritative server gate hard-blocks critical (`SAFETY_BLOCK` 409); `safety-recheck.test.ts` 10 tests |
| SC5 | Edit-before-confirm | ✅ Met | `ActionProposalCard` editable inputs → route merges only `editable` fields; L1 lifecycle asserts edited dose 350 written |
| SC6 | Server re-validation (never trust client) | ✅ Met | `route.ts` `revalidate()`: ownership via `getStack`, re-parse via `stackItemInputSchema`, re-ground supplement/product |
| SC7 | Audit + undo | ✅ Met | `0004` `advisor_actions` (+inverse); `undo/route.ts`; `ALREADY_UNDONE` 409 guard; `apply.test.ts` inverse mapping |
| SC8 | Additive / zero-regression | ✅ Met | 268/268 unit (+40); `next build` OK; 0 engine/write-API-route files modified |

**Success rate: 8/8 met.** SC5/SC6/SC7 are fully runtime-verified for paths runnable without live creds (unit + build + L1 auth-guards); their authed lifecycle assertions are env-gated on `E2E_LIVE` (needs migration `0004` applied), the same posture as v4 lab-timeline / v6 ai-advisor.

---

## 3. Gap Analysis (3 static axes + runtime)

### 3.1 Structural — 100%
All 14 design-specified files present (`§11.1` File Structure). Both new routes registered in `next build` (`/api/advisor/actions`, `/api/advisor/actions/[id]/undo`). Migration `0004` present and additive.

### 3.2 Functional — 98%
No placeholders/TODO/stubs in any v7 file (grep clean). Every proposal tool wraps a real engine; `applyProposal`/inverse, `safety-recheck`, `execute`, confirm/undo, and the UI card/toast all contain real logic. One **accepted deviation** (not a gap): `attach_product` is backed by a DB-only `product_id` column + `setItemProduct`/`getItemProductId` rather than the item-update path the Design §3 implied — chosen during Do to avoid cascading the `StackItem` domain type through ~6 construction sites; the attachment affects no evaluation, so the type doesn't need it. Additive and consistent with YAGNI.

### 3.3 API Contract — 100% (3-way verified)
- **SSE proposal**: server `sse("proposal", …)` (`api/advisor/route.ts:114`) ↔ client `event === "proposal" → h.onProposal` (`AdvisorPanel.tsx:273`) ↔ handler updates message state (`:116`).
- **Confirm**: `ActionProposalCard` `POST /api/advisor/actions` ↔ route Zod `confirmSchema` ↔ existing repos.
- **Undo**: `UndoToast` `POST /api/advisor/actions/:id/undo` ↔ route ↔ `executeIntent` + `markUndone`.
- **Status codes** present: `VALIDATION_ERROR` 400, `UNAUTHORIZED` 401, `NOT_FOUND` 404, `SAFETY_BLOCK` 409, `STALE_PROPOSAL` 409, `ALREADY_UNDONE` 409.

### 3.4 Runtime — ~95%
| Check | Result |
|-------|--------|
| `tsc --noEmit` | clean |
| Unit suite | **268/268** (+40 new) |
| `next build` | compiled OK; routes registered |
| L1 auth-guards (live server) | **2/2** (real 401s) |
| L1 authed confirm/edit/undo lifecycle | written; `E2E_LIVE`-gated (needs `0004` applied) |
| L2/L3 suggest→confirm→undo UI | written; `E2E_LIVE`-gated |

**Match Rate** = Structural×0.15 + Functional×0.25 + Contract×0.25 + Runtime×0.35 = 100·.15 + 98·.25 + 100·.25 + 95·.35 = **≈ 98%**.

---

## 4. Decision Record Verification

| Decision | Followed? | Evidence |
|----------|:---------:|----------|
| [Plan] Approach A — Proposal-Tool pattern | ✅ | proposal tools return `ActionProposal`; agent halts; engines unchanged |
| [Design] Option C — dedicated `lib/advisor/actions/` boundary | ✅ | `actions/{schema,proposals,apply,execute}.ts` |
| [Plan] Engines are the only writers | ✅ | confirm route reuses `addItem`/`updateItem`/`deleteItem`/`createStack`/`deleteStack` |
| [Do] Critical projected flag = hard-block | ✅ | `SAFETY_BLOCK` 409 in `route.ts` |
| [Do] Product attachment = DB-only column | ✅ (deviation, accepted) | `setItemProduct`/`getItemProductId`; `StackItem` type untouched |

---

## 5. Issues by Severity

- **Critical**: none.
- **Important**: none.
- **Minor (deferred, design-consistent)**:
  - Authed L1 lifecycle + L2/L3 UI specs are `E2E_LIVE`-gated — require migration `0004` applied to a live Supabase project. Same deferral as v4/v6.
  - v6 polish (true LLM token-streaming, provenance chip deep-linking, atomic usage RPC) and batch multi-action proposals remain **v8** per Plan YAGNI.
  - `attach_product` surfacing of the attached product in the item UI is not shown in v7 (stored only) — a v8 nicety.

---

## 6. Recommendation

Match Rate **98% (≥ 90)**, 8/8 SCs met, no Critical/Important gaps. **Proceed to Report** (optionally `/simplify` first for a cleanup pass). No iteration required.
