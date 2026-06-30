---
template: design
version: 1.0
feature: advisor-experience
date: 2026-06-30
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v8
plan_ref: docs/01-plan/features/advisor-experience.plan.md
architecture: Option C (Pragmatic Balance) — Approach A (progress-stream + buffered-safe)
---

# advisor-experience Design Document

> Completes the v6/v7 advisor arc: true token-streaming (Approach A — progress-stream + buffered-safe), batch multi-action proposals with selective confirm + atomic apply + grouped undo, provenance chip deep-linking, and attached-product UI. Additive throughout; one minimal additive migration (`0005`, nullable `batch_id` only). The final-answer grounding + `lib/safety` gate is **unmodified** — streaming is layered around it.

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v6 (read) + v7 (guarded write) proved the hard parts; the experience layer the v7 report deferred remains: faked streaming, single-action-only proposals, inert chips, invisible attached products. |
| **WHO** | The evidence-literate audience already living in `/advisor` — the users who feel the frozen-pane latency, one-action friction, and dead chips most. |
| **RISK** | Streaming a token *before* the grounding/banned-language gate runs (cardinal sin); a partial batch write leaving the stack half-changed; the cumulative safety re-check missing a flag that emerges only from the *combination*; client tampering across a batch; a batch blowing the budget; dead deep-links; an unwanted destructive migration. |
| **SUCCESS** | Final answer passes the existing gate **before** any token streams; live tool-progress events fire; advisor proposes ≤ N grounded actions; user confirms a selected subset, cumulative-safety-gated server-side, applied all-or-nothing with grouped undo; chips deep-link (graceful when unresolved); attached products render; 0 engine/write-logic files changed; one additive `0005` only; all prior suites green. |
| **SCOPE** | `onProgress` sink + capped batch collection in `agent.ts` · `ProgressEvent` + `proposals[]` types · `route.ts` live-progress + token-replay of the gated answer · `actions/route.ts` selected-subset re-validate + cumulative gate + compensating rollback + `recordBatch` · `advisor-action-repo` `recordBatch`/`undoBatch` · additive `0005` (`batch_id`) · multi-action ConfirmCard + deep-link chips + attached-product row. **No** Claude streaming API, **no** new engine/dependency, **no** stream reconnect, **no** autonomous execution. |

---

## 1. Overview

### 1.1 Design Goals
1. **Responsiveness without compromise** — live tool-phase progress + token-streamed answer, with the safety gate byte-for-byte unchanged.
2. **Multi-step in one gesture** — propose ≤ N grounded actions, confirm a selected subset, apply all-or-nothing, undo as one unit.
3. **Navigability** — provenance chips become deep-links into the exact Library effect / evidence breakdown; matched products surface on stack items.
4. **Additive & minimal** — reuse v6/v7 surfaces; a single cleanly-additive migration; zero engine/write-logic change.

### 1.2 Design Principles
- **Gate-around, never gate-through.** The route streams *only after* `runAdvisorTurn` returns a finalized, gated answer. Progress events carry **no model prose** — only tool names and lifecycle markers.
- **Engines remain the only writers; LLM stays behind the one `ClaudeAdapter` port** (unchanged — no streaming API added).
- **All-or-nothing batch** via sequential execute + compensating-inverse rollback (reuses v7's per-action `WriteIntent` inverses).
- **Additive Option C** in the v4/v7 `000N` lineage: nullable column only, legacy rows untouched.

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Option | Batch audit / undo | Streaming wiring | Migration | Complexity | Maintainability | Risk |
|--------|-------------------|------------------|:---------:|:----------:|:---------------:|:----:|
| A — Minimal | N rows grouped heuristically by `conversation_id` | inline in `route.ts` | none | Low | Low | Heuristic undo over/under-selects; route bloat |
| B — Clean | new streaming module + `BatchProposal` aggregate + `batch_id` + dedicated batch-repo | abstracted SSE module | `0005` | High | High | Over-engineered for a finishing release |
| **C — Pragmatic (Chosen)** | additive `0005` nullable `batch_id`; extend existing `advisor-action-repo` (`recordBatch`/`undoBatch`); N rows share `batch_id` → grouped atomic undo, each row a valid single `action_type` | `onProgress` callback threaded route→agent | `0005` (nullable only) | Medium | High | Smallest surface for correct atomic undo |

**Selected: C.** Correct grouped undo + per-action auditability with one cleanly-additive migration (no CHECK-constraint change), reusing the existing repo.

### 2.1 Component Diagram

```
Presentation  app/advisor/page.tsx
              ├─ AdvisorPanel ── SSE client: progress | token | citations | proposals | done
              │    ├─ AdvisorMessageBubble ── ProvenanceChips (now deep-links)
              │    └─ ActionProposalCard ── N actions, per-action toggle + editable dose/timing
              └─ components/stack/StackItemRow ── attached-product badge

Application   app/api/advisor/route.ts            (live progress → token-replay gated answer)
              app/api/advisor/actions/route.ts    (subset re-validate → cumulative gate → atomic apply → recordBatch)
              app/api/advisor/actions/[id]/undo/route.ts  (batch-aware reverse)

Domain        lib/advisor/agent.ts        (onProgress sink + capped batch collection + finalizeProposalBatch)
              lib/advisor/safety-recheck.ts  (cumulative projected-stack re-check — reused)
              lib/advisor/actions/*       (proposals/execute — reused, batch-composed in route)
              [ClaudeAdapter port — UNCHANGED]

Infra         lib/db/advisor-action-repo.ts  (+ recordBatch / undoBatch)
              supabase/migrations/0005_advisor_batch.sql  (nullable batch_id + index)
              [claude-adapter.ts — UNCHANGED]
```

### 2.2 Data Flow

```
POST /api/advisor
  auth → budget → ctx+history (parallel, unchanged)
  runAdvisorTurn({ ..., onProgress })
    each tool dispatch → onProgress({type:'tool-call', name}) → SSE event LIVE
    loop → 0..N grounded proposals (cap N)  OR  final answer
  final answer → EXISTING grounding + lib/safety gate → safe string
  persist turn + meter usage (unchanged)
  SSE: [progress…] → token(delta)×k of SAFE string → citations
        → proposals[] (+ cumulative safetyFlags) if any → done

POST /api/advisor/actions   { conversationId, actions: [{proposal, edits}] }  // selected subset only
  reload ctx → for each action: revalidate (own/fresh)  → any stale ⇒ 409 whole batch
  cumulative recheckForProposal over PROJECTED COMBINED stack → new critical ⇒ 409 SAFETY_BLOCK
  batchId = uuid; sequential executeProposal:
      on failure ⇒ run accumulated inverses (compensating rollback) ⇒ 500
      on success ⇒ recordBatch(rows sharing batchId) ⇒ 201 { batchId, results[] }

POST /api/advisor/actions/[id]/undo
  load row → if batch_id: undoBatch (reverse all sibling rows, reverse order) else single undo
```

### 2.3 Dependencies
- **No new dependency.** Reuses `@anthropic-ai/sdk` (v4), `zod`, Supabase client.
- **No Claude streaming API** — Approach A derives progress from the existing loop and replays the gated answer as token deltas. `ClaudeAdapter` / `claude-adapter.ts` unchanged.

---

## 3. Data Model

### 3.1 Entity Definition (additive type changes)

| Type | File | Change |
|------|------|--------|
| `ProgressEvent` | `types/advisor.ts` | **new** union: `{type:'turn-start'}` · `{type:'tool-call'; name:string}` · `{type:'composing'}` |
| `AdvisorTurnResult` | `types/advisor.ts` | add `proposals?: ActionProposal[]` (batch); `newSafetyFlags` becomes the **cumulative** projected set. `proposal?` retained as deprecated single alias. |
| `RunAdvisorTurnArgs` | `lib/advisor/agent.ts` | add `onProgress?: (e: ProgressEvent) => void`; add `maxBatch?: number` (test override) |
| `AdvisorActionRecord` | `types/advisor-action.ts` | add `batchId: string \| null` |
| `BatchActionRequest` | `types/advisor-action.ts` | **new**: `{ conversationId: string \| null; actions: { proposal: ActionProposal; edits?: EditableProposalFields }[] }` |

`Citation` (existing) already carries `kind: CitationKind` + `refId` — the deep-link resolver (§5) is a **pure mapping** over these; no type change.

### 3.2 Cumulative safety re-check (reuse, composed)
`recheckForProposal(ctx, proposal, edits)` is unchanged. For a batch, the route folds proposals left-to-right, projecting each onto a running `ctx'` so the **combined** stack is what's evaluated — catching an interaction that only two *together* introduce. A new `critical` flag anywhere in the fold blocks the whole batch.

### 3.3 Database Schema — `0005_advisor_batch.sql` (ADDITIVE ONLY)

```sql
-- Migration 0005 — advisor-experience (v8, Design §3.3). ADDITIVE ONLY.
-- Adds a nullable batch_id to advisor_actions so a multi-action confirm writes N
-- rows sharing one batch_id → grouped, atomic one-click undo. Each row remains a
-- valid single action_type (the 0004 CHECK is untouched). Legacy rows: batch_id NULL.
alter table public.advisor_actions
  add column if not exists batch_id uuid;

create index if not exists idx_advisor_actions_batch
  on public.advisor_actions(batch_id) where batch_id is not null;
```

> No CHECK-constraint change, no column drop/alter, no RLS change (the existing `own_advisor_actions` policy already scopes by `user_id`). Streak of non-destructive migrations preserved.

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/advisor` | SSE gains `progress` events + `proposals[]` event (was single `proposal`) |
| POST | `/api/advisor/actions` | body now `{ conversationId, actions:[{proposal,edits}] }` (selected subset); atomic apply; returns `{ batchId, results[] }` |
| POST | `/api/advisor/actions/[id]/undo` | batch-aware: reverses all sibling rows when `batch_id` present |

### 4.2 Detailed Specification

**POST /api/advisor** — SSE event sequence (order guaranteed):
```
event: progress    data: {"type":"turn-start"}
event: progress    data: {"type":"tool-call","name":"check_interactions"}
event: progress    data: {"type":"composing"}
event: token       data: {"delta":"Magnesium "}          ← only AFTER gate passed
...
event: citations   data: {"citations":[ {kind,refId,label,href?} ... ]}
event: proposals   data: {"proposals":[...], "safetyFlags":[...]}   ← if any (length≥1)
event: done        data: {"conversationId","status","toolsUsed"}
```
- `progress` events are emitted **during** the loop via `onProgress`; `token` events are emitted **only after** `runAdvisorTurn` returns a finalized, gated answer (SC2). On `refused-*` statuses, no proposals event; the refusal text still token-streams.

**POST /api/advisor/actions** — request:
```jsonc
{ "conversationId": "…|null",
  "actions": [ { "proposal": ActionProposal, "edits": { "dose": 200, "timing": "am" }? } ] }
```
- Server **ignores** any client canonical values; only `edits` (dose/unit/timing/frequency) merge, then re-parse via `stackItemInputSchema` per action (SC: client never trusted).
- Validate each action's ownership/freshness (`revalidate`, reused). Cumulative safety gate. `batchId=crypto.randomUUID()`. Apply sequentially; on any error, run accumulated inverses in reverse, return `ACTION_ERROR` 500. Success → `recordBatch` → `201 { batchId, results:[{actionId,resultingItemId?,createdStackId?}], newSafetyFlags }`.
- Single-action call = `actions.length === 1` (no batch_id needed, but still assigned for uniform undo).

**POST /api/advisor/actions/[id]/undo** — load the row; if `batch_id` non-null, `undoBatch(batchId)` reverses every still-`applied` sibling in reverse `created_at`, marking each `undone`; else single undo (v7 behavior).

---

## 5. UI/UX Design

### 5.1 Screen Layout (within existing `/advisor`)
- **Progress strip** in `AdvisorPanel`: while streaming, a single line cycles named states ("Checking interactions…", "Grading evidence…", "Composing…") driven by `progress` events; replaced by the token-streamed answer.
- **Multi-action ConfirmCard** (`ActionProposalCard` extended): a header summary + a list of N action rows, each with a **checkbox** (default checked), the diff label, editable dose/timing inputs, and the cumulative new-safety-flag heads-up banner above the Confirm / Reject buttons. Confirm submits only checked rows.
- **Attached-product badge** on `StackItemRow`: when `item.productId` is set, render the matched product (brand · name) with a small "matched by advisor" tag.

### 5.2 User Flow
1. Ask multi-part question → progress strip animates → answer streams in.
2. ConfirmCard appears listing N proposed actions; user unchecks any they don't want, optionally edits dose/timing.
3. Confirm → cumulative safety gate → all-or-nothing apply → success toast with a single **Undo**.
4. Undo reverses the whole batch.

### 5.3 Component List

| Component | File | Change |
|-----------|------|--------|
| `AdvisorPanel` | `components/advisor/AdvisorPanel.tsx` | parse `progress` events → progress strip; parse `proposals[]` |
| `ActionProposalCard` | `components/advisor/ActionProposalCard.tsx` | render N actions with per-action toggle; submit checked subset |
| `ProvenanceChips` | `components/advisor/ProvenanceChips.tsx` | render chips as `<Link>` via `citationHref(kind,refId)`; plain span when unresolved |
| `StackItemRow` | `components/stack/StackItemRow.tsx` | attached-product badge when `productId` present |
| `citationHref` | `lib/advisor/citation-href.ts` (**new, pure**) | `(kind,refId) → string \| null` deep-link resolver |

### 5.4 Page UI Checklist
- [ ] Progress strip shows ≥1 named tool state before tokens, then disappears.
- [ ] No answer token renders before the gate (verified via test, not visually).
- [ ] ConfirmCard checkboxes default checked; unchecking excludes from submit.
- [ ] Cumulative new-flag banner shows count and is non-diagnostic.
- [ ] `effect-grade`/`paper` chips navigate; `stack-eval` etc. render as non-link text (no dead href).
- [ ] Attached product visible on the item; absent → no badge (no empty box).

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | HTTP | When |
|------|:----:|------|
| `SAFETY_BLOCK` | 409 | Cumulative projected stack introduces a **critical** flag — whole batch blocked |
| `STALE_PROPOSAL` | 409 | Any action references a changed/owned-elsewhere stack/item/product — whole batch rejected |
| `NOT_FOUND` | 404 | Supplement/stack id absent on re-validation |
| `ACTION_ERROR` | 500 | Mid-batch execute failure **after** compensating rollback completed |
| `NOT_CONFIGURED` | 503 | LLM key missing (advisor route, unchanged) |

### 6.2 Error Response Format
Reuses `lib/api/respond` `fail(code, message, status, extra?)`. `SAFETY_BLOCK` includes `{ flag }`; batch failures include `{ rolledBack: true }`.

---

## 7. Security Considerations
- **Safety gate untouched**: streaming layered around `finalize`; a banned/ungrounded answer still falls back to the deterministic grounded summary **before** any token is emitted.
- **Client values never trusted** across the batch: only `edits` merge; every item re-parsed via `stackItemInputSchema`; canonical fields recomputed server-side.
- **Atomic boundary**: cumulative safety gate + all-or-nothing apply prevents a partially-applied unsafe combination.
- **RLS unchanged**: `own_advisor_actions` scopes audit + undo per user; `batch_id` carries no cross-user reference.
- **Budget**: batch proposals still consume one turn's token budget; the cap (`MAX_BATCH_PROPOSALS`) bounds proposal volume.

---

## 8. Test Plan (v2.3.0)

### 8.1 Test Scope
Unit (extend the 268-suite) + L1/L2/L3 E2E (L2/L3 gated on `E2E_LIVE` + `0005` applied, matching v7).

### 8.2 L1: API Test Scenarios
- POST `/api/advisor` unauth → 401; SSE order: `progress` precedes first `token`; `token` count > 1 (true streaming, not one blob).
- POST `/api/advisor/actions` with a batch where the **combination** introduces a critical flag → 409 `SAFETY_BLOCK`.
- Batch with one stale action → 409 `STALE_PROPOSAL`, **nothing applied**.
- Undo on a batch member → all siblings `undone`.

### 8.3 L2: UI Action Test Scenarios
- Progress strip renders ≥1 named state then is replaced by streamed text.
- ConfirmCard: uncheck one of three actions → submit body contains exactly two.
- Deep-link chip click navigates to the Library effect; `stack-eval` chip is non-clickable.

### 8.4 L3: E2E Scenario
- Multi-part ask → batch ConfirmCard → confirm subset → both items appear in stack → single Undo reverts both.

### 8.5 Unit (pure, always-on)
- `agent`: `onProgress` fires one `tool-call` per dispatched tool, in order; batch collection caps at `MAX_BATCH_PROPOSALS`; over-cap proposals dropped (not errored); cumulative `newSafetyFlags` folds projections.
- `citation-href`: `effect-grade`/`paper` → href; others → null.
- `advisor-action-repo`: `recordBatch` writes N rows sharing `batch_id`; `undoBatch` reverses in reverse order, idempotent on already-undone rows.
- Compensating rollback: simulate action-2 failure → action-1 inverse executed; net no-op.

---

## 9. Clean Architecture

### 9.4 This Feature's Layer Assignment

| Unit | Layer | Notes |
|------|-------|-------|
| `ProgressEvent`, batch collection, `finalizeProposalBatch`, cumulative re-check fold, `citation-href` | **Domain** | Pure; `onProgress` is an injected sink (testable), no I/O |
| `ClaudeAdapter` port | Domain boundary | **Unchanged** — no streaming API added |
| `route.ts` progress relay + token-replay + persistence; `actions/route.ts` orchestration; `undo` route | **Application** | Compose pure units + repos; own SSE + transaction-ish rollback |
| `advisor-action-repo` (`recordBatch`/`undoBatch`), `0005` migration | **Infrastructure** | Only writers; additive schema |

### 9.2 Dependency Rule check
Domain emits `ProgressEvent`s through an injected callback and returns `proposals[]`; it never imports the SSE encoder, Supabase, or the SDK. ✅ inward-only.

---

## 10. Coding Convention Reference

### 10.4 This Feature's Conventions
- `// Design Ref: §N — rationale` on each changed module; `// Plan SC-n` at the safety-gate-ordering and rollback sites.
- SSE event names lowercase (`progress`/`token`/`citations`/`proposals`/`done`).
- `MAX_BATCH_PROPOSALS` exported const in `agent.ts` (default 4), overridable via `maxBatch` arg in tests.

---

## 11. Implementation Guide

### 11.1 File Structure
```
src/
  types/advisor.ts                      (M: ProgressEvent, AdvisorTurnResult.proposals)
  types/advisor-action.ts               (M: AdvisorActionRecord.batchId, BatchActionRequest)
  lib/advisor/agent.ts                  (M: onProgress, capped batch, finalizeProposalBatch)
  lib/advisor/citation-href.ts          (C: pure deep-link resolver)
  lib/db/advisor-action-repo.ts         (M: recordBatch, undoBatch)
  app/api/advisor/route.ts              (M: progress relay + token-replay + proposals[])
  app/api/advisor/actions/route.ts      (M: subset + cumulative gate + rollback + recordBatch)
  app/api/advisor/actions/[id]/undo/route.ts (M: batch-aware)
  components/advisor/AdvisorPanel.tsx        (M: progress strip + proposals[])
  components/advisor/ActionProposalCard.tsx  (M: N actions + per-action toggle)
  components/advisor/ProvenanceChips.tsx     (M: deep-link)
  components/stack/StackItemRow.tsx          (M: attached-product badge)
supabase/migrations/0005_advisor_batch.sql   (C: additive batch_id)
tests/                                        (C/M: unit + e2e per §8)
```

### 11.2 Implementation Order
1. Types + `0005` migration.
2. Domain: `agent.ts` (onProgress + batch) + `citation-href.ts` + unit tests.
3. Infra: `advisor-action-repo` (`recordBatch`/`undoBatch`) + tests.
4. Application: `route.ts` streaming, `actions/route.ts` batch + rollback, `undo` route + L1 tests.
5. UI: progress strip, multi-action card, deep-link chips, attached-product badge + L2/L3.

### 11.3 Session Guide

| Module | Scope key | Files | Depends on |
|--------|-----------|-------|------------|
| **module-1** Domain + schema | `module-1` | types, `agent.ts`, `citation-href.ts`, `0005` | — |
| **module-2** Application + repo | `module-2` | `advisor-action-repo`, all 3 API routes | module-1 |
| **module-3** Presentation | `module-3` | AdvisorPanel, ActionProposalCard, ProvenanceChips, StackItemRow | module-2 |

Recommended: 3 sessions (`/pdca do advisor-experience --scope module-1` → `module-2` → `module-3`).

---

## Version History

| Date | Author | Change |
|------|--------|--------|
| 2026-06-30 | benhwang121@gmail.com | Initial design — Architecture C (Pragmatic) over Approach A. Refines Plan: no Claude streaming API needed (progress derived from loop, gated answer token-replayed); one additive `0005` (`batch_id`) replaces the Plan's "target zero migration" to enable grouped atomic undo. |
