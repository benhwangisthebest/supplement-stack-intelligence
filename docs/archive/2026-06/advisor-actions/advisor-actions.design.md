---
template: design
version: 1.3
feature: advisor-actions
date: 2026-06-22
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v7
---

# advisor-actions Design Document

> **Summary**: Turn the v6 read-only advisor into a **suggest-then-confirm actor** via a dedicated `lib/advisor/actions/` boundary — proposal tools return validated `ActionProposal`s, the v6 agent loop **halts** on a proposal, a pure safety re-check runs the *projected* stack back through the engines, an editable confirm card surfaces the diff + new flags, and on explicit confirm the **existing repos** execute the write and an audit row records an inverse for one-click undo.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v7
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-22
> **Status**: Draft
> **Planning Doc**: [advisor-actions.plan.md](../../01-plan/features/advisor-actions.plan.md)

---

## Context Anchor

> Copied from Plan document. Ensures strategic context survives Design→Do handoff.

| Key | Value |
|-----|-------|
| **WHY** | The advisor can synthesize a recommendation but cannot act on it; the user must manually re-enter every change the advisor just reasoned out. The read path is trust-proven (v6) — the pre-documented next step is a *guarded* write path. |
| **WHO** | The established evidence-literate audience (biohacker / longevity / power user) who already has a stack, profile, meds, and labs entered — exactly the users for whom "apply this fix" beats re-reading it. |
| **RISK** | The LLM gaining write authority or fabricating an action (a supplement/dose/ID absent from tool results); a proposal applying a change that *introduces* a new interaction/allergy/dose risk; the client tampering with proposed values before apply; partial/duplicate writes; un-reversible actions; RLS leaking one user's audit/undo to another; proposal schemas drifting from the real write paths. |
| **SUCCESS** | The advisor proposes any of the four action types, grounded only in prior tool results; each proposal is re-checked for safety on the projected stack *before* the confirm card renders; the server re-validates on confirm (never trusts client values); writes go exclusively through existing repos; every applied action is audited with a working undo; a sweep test asserts no fabricated/ungrounded action can be proposed; existing engine/write files are unmodified. |
| **SCOPE** | `lib/advisor/actions/` (proposal tool defs + Zod schemas + pure `applyProposal` dispatcher) · `lib/advisor/safety-recheck.ts` · proposal-halt state in the existing agent loop · `app/api/advisor/actions` (confirm-execute + undo, server re-validation) · additive `0004_advisor_actions.sql` (RLS, inverse payload) · `ActionProposalCard` + `UndoToast` in `AdvisorPanel` · 4 proposal tools · grounding/no-fabrication sweep extended to proposals. **No** batch multi-action proposals, **no** autonomous (no-confirm) execution, **no** new write business logic, **no** v6 streaming/deep-link polish (all v8+). |

---

## 1. Overview

### 1.1 Design Goals
- Let the advisor **propose** four write-actions (add item, remove item, edit item, generate-&-save protocol, attach product) without ever writing data itself.
- Preserve the v6 invariant that **the engines/repos are the only writers** and the **LLM stays isolated behind `ClaudeAdapter`**.
- Guarantee every proposal is **grounded** (IDs/doses traced to prior tool results or context) and **safety-re-checked on the projected result** before the user can apply it.
- Make every applied action **auditable and reversible**, RLS-scoped per user.
- Remain **additive**: zero changes to existing engines (`evidence`, `stack-evaluator`, `interactions`, `biomarkers`, `lab-trends`, `protocol-builder`, `product-matcher`) and zero changes to existing write API routes/repos beyond *calling* them.

### 1.2 Design Principles
- **Propose, never commit** — proposal tools are pure; the only writers remain the existing repos, invoked by the confirm endpoint after explicit user approval.
- **Server is the source of truth** — the confirm endpoint re-loads context, re-validates the proposal, and re-runs the safety check; client-supplied canonical values are never trusted (only user-editable `dose`/`timing` are accepted, then re-validated).
- **Grounding by construction** — a proposal tool refuses (returns `ok:false`) when its referenced supplement/stack-item/product id is not present in `AdvisorContext` or the prior tool results.
- **Reuse over re-implement** — writes go through `stack-item-repo` / `stack-repo` and the pure `generateProtocol` / `matchProducts`; no new write business logic.

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | Proposal tools inside `tools.ts`; extend `ToolResult` with `proposal?` | Separated subsystem: own registry, dispatcher port, use-case service, result types | Dedicated `lib/advisor/actions/` + `safety-recheck.ts` + audit repo; small loop extension; one actions route |
| **New Files** | ~7 | ~14 | ~10 |
| **Modified v6 files** | 4 | 3 | 4 |
| **Engines / write-APIs touched** | 0 | 0 | 0 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium (read/write entangled) | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | Medium | Low | Low |
| **Recommendation** | Quick path | Over-built for 4 actions | **Default choice** |

**Selected**: **Option C** — **Rationale**: keeps proposal tools, schemas, the apply-dispatcher, and the safety re-check in a dedicated `lib/advisor/actions/` boundary so read vs. write tools never entangle; reuses the existing repos as the only writers; needs only a small proposal-halt extension to the proven v6 loop. Matches the Plan SCOPE exactly. Option B's extra ports/services are over-engineering for four action types; Option A risks coupling write logic into the read registry.

### 2.1 Component Diagram

```
┌──────────────────────┐   SSE: token/citations/proposal   ┌───────────────────────────┐
│ AdvisorPanel (UI)    │◀──────────────────────────────────│ POST /api/advisor (v6)    │
│  ├─ MessageBubble    │                                   │  runAdvisorTurn()         │
│  ├─ ProvenanceChips  │                                   │   ├─ read tools (v6)      │
│  └─ ActionProposalCard ──┐  POST confirm / undo          │   └─ PROPOSAL-HALT (v7) ──┼─┐
│       + UndoToast        │                                └───────────────────────────┘ │
└──────────────────────┘   │                                                              │
                           ▼                                                              ▼
                 ┌───────────────────────────┐                         ┌────────────────────────────┐
                 │ POST /api/advisor/actions │  (re-validate + apply)  │ lib/advisor/actions/        │
                 │  POST .../[id]/undo       │────────────────────────▶│  proposals.ts (tools)       │
                 │   ├─ getUser / getStack   │                         │  schema.ts (Zod)            │
                 │   ├─ safetyRecheck()      │                         │  apply.ts (applyProposal)   │
                 │   ├─ applyProposal()──────┼───┐                     └────────────────────────────┘
                 │   └─ advisor-action-repo  │   │ reuse existing repos (ONLY writers)
                 └───────────────────────────┘   ▼
        ┌───────────────────────────────────────────────────────────────────────────┐
        │ stack-item-repo (addItem/updateItem/deleteItem) · stack-repo (createStack) │
        │ generateProtocol (pure) · matchProducts (pure) · evaluateStack/findInter…  │
        └───────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User asks in /advisor
  → runAdvisorTurn: v6 read tools run (searchLibrary, evaluateStack, …)
  → model calls a PROPOSAL tool (e.g. propose_add_item)
  → proposal handler validates IDs/doses against ctx + prior results  (no write)
  → AGENT LOOP HALTS  → builds ActionProposal
  → safetyRecheck(ctx, projectedItems) attaches NEW flags
  → status:"proposed" returned to route → persisted assistant msg + SSE `proposal` event
  → ActionProposalCard renders diff + new flags + editable dose/timing
  → user edits / confirms / rejects
On CONFIRM → POST /api/advisor/actions
  → server re-loads ctx, re-validates proposal + edited fields, re-runs safetyRecheck
  → applyProposal() → existing repo write → advisor_actions row (status:applied, inverse)
  → UndoToast → POST /api/advisor/actions/[id]/undo → apply stored inverse via same repos
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `actions/proposals.ts` | `AdvisorContext`, `defaultLibrary`, `actions/schema.ts` | Build/validate proposals from context (pure) |
| `actions/apply.ts` | `stack-item-repo`, `stack-repo`, `protocol-builder`, `product-matcher` | Execute a confirmed proposal via existing writers |
| `safety-recheck.ts` | `stack-evaluator`, `interactions`, `biomarkers` | Re-evaluate the projected stack; diff new flags |
| `agent.ts` (extended) | `actions/proposals.ts`, `safety-recheck.ts` | Proposal-halt + attach safety flags |
| `/api/advisor/actions` | `advisor-action-repo`, `apply.ts`, `safety-recheck.ts` | Confirm-execute + undo with server re-validation |
| `ActionProposalCard` | SSE `proposal` payload | Render diff, edit, confirm/reject |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// src/types/advisor-action.ts — Domain, PURE (no I/O).

export type AdvisorActionType =
  | "add_item"
  | "remove_item"
  | "edit_item"
  | "generate_protocol"
  | "attach_product";

export type AdvisorActionStatus = "proposed" | "applied" | "undone";

/** A diff line shown on the confirm card (human-readable, engine-grounded). */
export interface ProposalDiffLine {
  label: string;            // "Add Magnesium glycinate · 300 mg · bedtime"
  before?: string;          // present for edit/remove
  after?: string;           // present for add/edit
}

/** User-editable fields the card may change before confirm (re-validated server-side). */
export interface EditableProposalFields {
  dose?: number;
  unit?: string;
  timing?: string;
  frequency?: string;
}

/**
 * The structured, validated proposal the LLM produced. Carries only IDs/values
 * traced to AdvisorContext or prior tool results — never free-form model data.
 */
export interface ActionProposal {
  type: AdvisorActionType;
  stackId: string;                 // the user's active stack (from ctx)
  /** Type-specific, Zod-validated payload (see §3.2 schemas). */
  payload: Record<string, unknown>;
  diff: ProposalDiffLine[];
  editable: EditableProposalFields | null;  // null when nothing is user-editable
  rationaleCitations: Citation[];  // why the advisor proposed this (reuses v6 Citation)
}

/** Result returned when the agent loop halts on a proposal (extends the turn result). */
export interface AdvisorProposalResult {
  status: "proposed";
  proposal: ActionProposal;
  /** Flags the projected stack WOULD introduce — surfaced before apply (SC4). */
  newSafetyFlags: EvaluationFlag[];
  citations: Citation[];
  usage: { inputTokens: number; outputTokens: number };
  toolsUsed: string[];
}

/** Persisted audit record (one per applied action) with its inverse for undo. */
export interface AdvisorActionRecord {
  id: string;
  userId: string;
  conversationId: string | null;
  actionType: AdvisorActionType;
  status: AdvisorActionStatus;
  payload: Record<string, unknown>;   // what was applied (post re-validation)
  inverse: Record<string, unknown>;   // how to reverse it
  createdAt: string;
  undoneAt: string | null;
}
```

> `AdvisorTurnStatus` (v6) gains one member, `"proposed"`, and the agent returns `AdvisorTurnResult | AdvisorProposalResult` (discriminated on `status`). This is the only change to v6 advisor *types*.

### 3.2 Proposal Payload Schemas (Zod — `actions/schema.ts`)

| Action | Payload | Validated against |
|--------|---------|-------------------|
| `add_item` | `{ supplementId, dose, unit, timing, frequency, reason }` | `supplementId` ∈ `defaultLibrary`; dose>0; maps to `stackItemInputSchema` |
| `remove_item` | `{ stackItemId }` | `stackItemId` ∈ `ctx.stackItems` |
| `edit_item` | `{ stackItemId, dose?, unit?, timing?, frequency? }` | `stackItemId` ∈ `ctx.stackItems`; at least one field present |
| `generate_protocol` | `{ goal? }` (uses profile) | profile present; produced by pure `generateProtocol` |
| `attach_product` | `{ stackItemId, productId }` | `stackItemId` ∈ `ctx.stackItems`; `productId` ∈ matcher results for that item |

> Each proposal payload reuses/wraps the **existing** validation: `add_item`/`edit_item` map to `stackItemInputSchema`; the confirm endpoint re-parses with the same schema before writing.

### 3.3 Database Schema

```sql
-- supabase/migrations/0004_advisor_actions.sql  (additive, RLS — no existing table altered)
CREATE TABLE advisor_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES advisor_conversations(id) ON DELETE SET NULL,
  action_type     TEXT NOT NULL CHECK (action_type IN
                    ('add_item','remove_item','edit_item','generate_protocol','attach_product')),
  status          TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','undone')),
  payload         JSONB NOT NULL,
  inverse         JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  undone_at       TIMESTAMPTZ
);

ALTER TABLE advisor_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY advisor_actions_select ON advisor_actions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY advisor_actions_insert ON advisor_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY advisor_actions_update ON advisor_actions
  FOR UPDATE USING (auth.uid() = user_id);   -- undo flips status only

CREATE INDEX advisor_actions_user_created ON advisor_actions (user_id, created_at DESC);
```

> Only `applied`/`undone` persist; a `proposed` action lives in the response/SSE payload and is never written until confirmed.

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/advisor | (v6, extended) Run a turn; may return a `proposal` SSE event | Required |
| POST | /api/advisor/actions | Confirm + execute a proposal (server re-validates) | Required |
| POST | /api/advisor/actions/[id]/undo | Reverse an applied action via its inverse | Required |

### 4.2 Detailed Specification

#### `POST /api/advisor/actions`

**Request:**
```json
{
  "conversationId": "uuid-or-null",
  "proposal": { "type": "add_item", "stackId": "…", "payload": { "supplementId": "…", "dose": 300, "unit": "mg", "timing": "bedtime", "frequency": "daily", "reason": "sleep support" }, "diff": [], "editable": { "dose": 300, "unit": "mg", "timing": "bedtime" }, "rationaleCitations": [] },
  "edits": { "dose": 400, "timing": "evening" }
}
```

**Server algorithm (the trust boundary — SC2/SC3/SC4/SC6):**
1. `getUser()` → 401 if absent.
2. Re-load `AdvisorContext` server-side (never trust client ctx).
3. **Re-validate** the proposal with `actions/schema.ts` against fresh context: IDs must still exist and be owned (`getStack(user, stackId)`); merge `edits` only into `editable` fields, then re-parse via `stackItemInputSchema`.
4. **Re-run `safetyRecheck`** on the projected stack; if it introduces a `critical` flag, return `409 SAFETY_BLOCK` with the flag (the only hard block — mirrors the product's "strongly warn" exception).
5. `applyProposal()` → calls the existing repo writer; compute `inverse`.
6. Insert `advisor_actions` row (`status:'applied'`).
7. Return `201 { data: { actionId, applied, resultingItem|stackId, newSafetyFlags } }`.

**Response (201 Created):**
```json
{ "data": { "actionId": "uuid", "applied": true, "resultingItemId": "uuid", "newSafetyFlags": [] } }
```

**Error Responses:**
- `400 VALIDATION_ERROR` — payload/edits fail Zod (`.error.details.fieldErrors`).
- `401 UNAUTHORIZED` — not signed in.
- `404 NOT_FOUND` — stack/item/product no longer exists or not owned.
- `409 SAFETY_BLOCK` — projected change introduces a critical safety flag; body carries the flag.
- `409 STALE_PROPOSAL` — referenced id changed since the proposal was made.

#### `POST /api/advisor/actions/[id]/undo`
- Loads the owned `advisor_actions` row; refuses if `status='undone'` (`409 ALREADY_UNDONE`).
- Applies `inverse` via the same repos (e.g. an `add_item` inverse is `deleteItem(resultingItemId)`).
- Sets `status='undone'`, `undone_at=now()`. Returns `200 { data: { id, undone: true } }`.

#### Inverse mapping

| Action | Inverse |
|--------|---------|
| `add_item` | `delete_item(resultingItemId)` |
| `remove_item` | `add_item(snapshot of removed item)` |
| `edit_item` | `edit_item(prior field values)` |
| `generate_protocol` | `delete_stack(createdStackId)` |
| `attach_product` | `edit_item(prior productId, possibly null)` |

---

## 5. UI/UX Design

### 5.1 Screen Layout (within existing `/advisor`)

```
┌──────────────────────────────────────────────┐
│ AdvisorPanel (existing)                      │
│  …assistant message + ProvenanceChips…       │
│  ┌────────────────────────────────────────┐  │
│  │ ⚙ Proposed change                      │  │  ← ActionProposalCard
│  │  + Add Magnesium glycinate             │  │
│  │    300mg → [400mg] · [evening ▾]       │  │  ← editable fields
│  │  ⚠ New flag: dose above common range   │  │  ← newSafetyFlags
│  │  ‹why› Creatine→sleep, Grade B (chip)  │  │
│  │     [ Confirm ]   [ Reject ]           │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ ✓ Added to Sleep stack   [ Undo ]      │  │  ← UndoToast (post-apply)
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 5.2 User Flow

```
Ask → assistant answer (+ optional Proposal card) → edit dose/timing →
Confirm → success toast with Undo → (optional) Undo → reverted
                       │
                       └─ Reject → card dismissed, nothing written
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `ActionProposalCard` | `src/components/advisor/` | Render diff + new safety flags + editable fields; POST confirm/reject |
| `UndoToast` | `src/components/advisor/` | Show applied result; POST undo |
| `AdvisorPanel` (modified) | `src/components/advisor/` | Consume SSE `proposal` event; manage card/toast state |

### 5.4 Page UI Checklist

#### Advisor page — Action Proposal card
- [ ] Card: action type header (one of Add / Remove / Edit / Generate protocol / Attach product)
- [ ] Diff: before/after lines (before shown for edit/remove; after shown for add/edit)
- [ ] Editable input: dose (number, > 0) — only when `editable` present
- [ ] Editable input: timing dropdown / unit — only when `editable` present
- [ ] Safety: `newSafetyFlags` list with severity badge (info / caution / critical color)
- [ ] Chips: `rationaleCitations` rendered via existing `ProvenanceChips`
- [ ] Button: Confirm (disabled while POST in flight; disabled on `critical` safety block)
- [ ] Button: Reject (dismisses card, no network write)
- [ ] State: validation error message on 400 (field-level)
- [ ] State: stale/safety-block message on 409

#### Advisor page — Undo toast
- [ ] Toast: success summary ("Added X to {stack}")
- [ ] Button: Undo (one click → reversal)
- [ ] State: toast auto-dismiss after timeout; Undo disabled after use

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | VALIDATION_ERROR | Payload/edits fail Zod | Show field errors on card |
| 401 | UNAUTHORIZED | Not signed in | Redirect to login |
| 404 | NOT_FOUND | Stack/item/product missing or not owned | Dismiss card, show notice |
| 409 | SAFETY_BLOCK | Projected change introduces a critical flag | Show flag; block confirm |
| 409 | STALE_PROPOSAL | Referenced id changed since proposal | Ask user to re-ask the advisor |
| 409 | ALREADY_UNDONE | Undo on an already-undone action | Disable Undo |
| 503 | NOT_CONFIGURED | LLM key missing (turn path only) | Existing v6 handling |

### 6.2 Error Response Format
```json
{ "error": { "code": "SAFETY_BLOCK", "message": "This change would exceed the common studied dose range.", "details": { "flag": { "severity": "critical", "category": "dose", "title": "…" } } } }
```

---

## 7. Security Considerations

- [ ] **Auth on every action endpoint** (`getUser()` → 401) — mirrors v6.
- [ ] **Ownership re-check** — `getStack(user.id, stackId)` and item/product membership re-verified server-side on confirm and undo; RLS on `advisor_actions` + all written tables is the second layer.
- [ ] **No trust in client canonical values** — only `editable` fields are merged from the client; everything else is re-derived from server context; final payload re-parsed via `stackItemInputSchema`.
- [ ] **LLM never writes** — proposal tools are pure; the agent loop has no DB handle; the only writers are existing repos invoked by the confirm endpoint after user confirmation.
- [ ] **Safety gate before apply** — `safetyRecheck` runs server-side on confirm; a `critical` projected flag hard-blocks (the product's sanctioned "strongly warn" exception).
- [ ] **Banned-language sweep** — all card-facing copy (rationale, flag titles) routes through `lib/safety`; the honesty sweep test is extended to proposal output.
- [ ] **Idempotency** — confirm writes exactly one audit row; undo is guarded by `status` to prevent double-reversal.

---

## 8. Test Plan (v2.3.0)

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| Unit | proposal grounding/refusal, schema, applyProposal+inverse, safetyRecheck diff, agent proposal-halt, honesty sweep | Vitest | Do |
| L1: API | `/api/advisor/actions` (+undo) — status, validation, auth, safety-block | Playwright request | Do |
| L2: UI | ActionProposalCard confirm/reject/edit; UndoToast | Playwright | Do |
| L3: E2E | ask → propose → edit → confirm → undo round-trip | Playwright (`E2E_LIVE`) | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test | Status | Expected |
|---|----------|--------|------|:------:|----------|
| 1 | /api/advisor/actions | POST | Unauthenticated blocked | 401 | `.error.code=UNAUTHORIZED` |
| 2 | /api/advisor/actions | POST | Invalid payload (dose ≤ 0) | 400 | `.error.details.fieldErrors.dose` |
| 3 | /api/advisor/actions | POST | Unknown supplementId | 404 | `.error.code=NOT_FOUND` |
| 4 | /api/advisor/actions | POST | Valid add_item (authed) | 201 | `.data.actionId`, `.data.applied=true` |
| 5 | /api/advisor/actions | POST | Projected critical flag | 409 | `.error.code=SAFETY_BLOCK`, `.details.flag` |
| 6 | /api/advisor/actions/[id]/undo | POST | Undo applied action | 200 | `.data.undone=true` |
| 7 | /api/advisor/actions/[id]/undo | POST | Re-undo blocked | 409 | `.error.code=ALREADY_UNDONE` |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected | Verification |
|---|------|--------|----------|--------------|
| 1 | /advisor | Receive proposal | Card shows diff + chips + buttons | All §5.4 elements visible |
| 2 | /advisor | Edit dose then Confirm | POST carries edited dose; success toast | API 201; toast Undo visible |
| 3 | /advisor | Reject | Card dismissed; no network write | No POST fired |
| 4 | /advisor | Confirm with critical flag | Confirm blocked; flag shown | 409 surfaced |

### 8.4 L3: E2E Scenario

| # | Scenario | Steps | Success |
|---|----------|-------|---------|
| 1 | Suggest→confirm→undo | Login → /advisor → ask "tidy my stack" → proposal → edit → Confirm → verify item in stack → Undo → verify removed | No 401/500; stack state matches each step |

### 8.5 Seed Data Requirements

| Entity | Min Count | Key Fields |
|--------|:---------:|-----------|
| Profile | 1 | medications (≥1, to exercise safety re-check), goals |
| Stack (current) | 1 | mode='current' |
| StackItems | ≥2 | one redundant pair (to exercise remove proposal) |
| Products | ≥1 | matchable to a stack item (attach_product) |

> Reuse the existing `src/lib/db/seed.ts` demo user; add a redundant pair + a matchable product if absent.

---

## 9. Clean Architecture

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `ActionProposal`, `AdvisorActionRecord`, types | Domain | `src/types/advisor-action.ts` |
| Proposal tools + Zod schemas (pure) | Domain | `src/lib/advisor/actions/proposals.ts`, `actions/schema.ts` |
| `applyProposal` dispatcher + inverse (pure mapping) | Domain | `src/lib/advisor/actions/apply.ts` |
| `safetyRecheck` (pure engine composition) | Domain | `src/lib/advisor/safety-recheck.ts` |
| Agent proposal-halt (extended) | Domain | `src/lib/advisor/agent.ts` |
| `advisor-action-repo` (audit persist/undo) | Infrastructure | `src/lib/db/advisor-action-repo.ts` |
| Actions API routes | Application | `src/app/api/advisor/actions/route.ts`, `actions/[id]/undo/route.ts` |
| `ActionProposalCard`, `UndoToast` | Presentation | `src/components/advisor/` |

> Dependency direction preserved: Domain (`actions/*`, `safety-recheck`) imports only existing pure engines/types; the Application route wires Infrastructure repos to the Domain dispatcher. `apply.ts` declares the *intent* (which repo + args); the route performs the I/O — so Domain stays free of Supabase imports.

---

## 10. Coding Convention Reference

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase (`ActionProposalCard.tsx`) |
| Pure modules | camelCase files under `lib/advisor/actions/` |
| Design ref comments | `// Design Ref: §{n}` + `// Plan SC: {n}` on key paths (v6 style) |
| Validation | Zod at the route boundary; reuse `stackItemInputSchema` |
| Error handling | Existing `lib/api/respond` helpers (`ok`/`fail`/`unauthorized`/`notFound`/`validationError`) |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── types/advisor-action.ts                        (new)
├── lib/advisor/
│   ├── actions/
│   │   ├── schema.ts                               (new — Zod payloads)
│   │   ├── proposals.ts                            (new — 4 proposal tools + registry)
│   │   └── apply.ts                                (new — applyProposal + inverse)
│   ├── safety-recheck.ts                           (new)
│   └── agent.ts                                    (modify — proposal-halt)
├── lib/db/advisor-action-repo.ts                   (new — audit persist/undo)
├── app/api/advisor/
│   ├── route.ts                                    (modify — SSE `proposal` event)
│   └── actions/
│       ├── route.ts                                (new — confirm)
│       └── [id]/undo/route.ts                      (new — undo)
├── components/advisor/
│   ├── ActionProposalCard.tsx                      (new)
│   ├── UndoToast.tsx                               (new)
│   └── AdvisorPanel.tsx                            (modify — render card/toast)
└── supabase/migrations/0004_advisor_actions.sql    (new)
```

### 11.2 Implementation Order
1. [ ] Domain: types + Zod schemas + proposal tools (pure, fully unit-tested).
2. [ ] Domain: `safety-recheck` + `applyProposal`/inverse (pure).
3. [ ] Loop: agent proposal-halt + extend honesty sweep.
4. [ ] Migration `0004` + `advisor-action-repo`.
5. [ ] Routes: confirm + undo (auth, re-validation, safety gate).
6. [ ] Advisor route: surface `proposal` over SSE.
7. [ ] UI: `ActionProposalCard` + `UndoToast` + `AdvisorPanel` wiring.
8. [ ] Tests: L1 + L2 + (env-gated) L3.

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| Proposal core (Domain) | `module-1` | types, `actions/schema.ts`, `actions/proposals.ts`, `safety-recheck.ts`, `actions/apply.ts` + unit tests; agent proposal-halt + honesty sweep | 45-55 |
| Persistence & API | `module-2` | `0004` migration, `advisor-action-repo`, `/api/advisor/actions` (confirm) + `/undo`, SSE `proposal` event, L1 tests | 40-50 |
| UI surface | `module-3` | `ActionProposalCard`, `UndoToast`, `AdvisorPanel` wiring, L2/L3 tests | 40-50 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | full | done |
| Session 2 | Do | `--scope module-1` | 45-55 |
| Session 3 | Do | `--scope module-2` | 40-50 |
| Session 4 | Do | `--scope module-3` | 40-50 |
| Session 5 | Check + QA + Report | full | 30-40 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-22 | Initial draft — Option C (Pragmatic) selected | benhwang121@gmail.com |
