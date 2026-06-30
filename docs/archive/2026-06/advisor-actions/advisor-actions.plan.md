---
template: plan-plus
version: 1.0
feature: advisor-actions
date: 2026-06-22
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v7
---

# advisor-actions Planning Document

> **Summary**: Turn the v6 read-only AI Advisor into a **suggest-then-confirm actor**. The advisor can now *propose* concrete stack/protocol/product changes — add a supplement, remove or edit a stack item, generate-and-save a protocol, attach a matched product — but it **never writes**. Each proposal is a Zod-validated `ActionProposal` grounded in prior tool results, runs through a **pre-apply safety re-check** (the projected stack re-evaluated by `interactions` + `biomarkers` + `stack-evaluator`), is surfaced as an **editable confirm card**, and only executes — on explicit user confirmation — through the **existing v1–v4 write paths**. Every applied action is audited with a stored inverse for **one-click undo**. Additive throughout (Architecture Option C, in the v4/v6 lineage): the LLM stays isolated behind the existing `ClaudeAdapter`, and the engines remain the only writers.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v7 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-22
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v6 made every engine *conversationally readable*, but the advisor is a dead end for action: it can tell a user "this item is redundant with that one" or "your labs support adding magnesium," yet the user must then leave the chat, find the right screen, and re-enter the change by hand. The synthesis the advisor just produced is thrown away at the moment it becomes actionable. |
| **Solution** | A **suggest-then-confirm** layer. The advisor proposes a structured, validated action; the system re-checks safety on the *projected* result, shows an **editable diff card**, and writes only on explicit confirm — through the same engines/APIs that already own writes. The LLM proposes; it never commits. Every applied action is audited and reversible. |
| **Function/UX Effect** | Inside `/advisor`, an answer can now carry an **Action Proposal card**: a human-readable diff (e.g. "Add Magnesium glycinate · 300mg · bedtime → *Sleep* stack"), any new safety flags the change would introduce, editable dose/timing fields, and Confirm / Reject. After applying, an **Undo** toast can reverse it. Four action types: add item, remove/edit item, generate-&-save protocol, attach product. |
| **Core Value** | The advisor stops being a read-only oracle and becomes a **safe collaborator** — closing the loop from *understanding* to *doing* without surrendering the project's non-negotiable invariant: **engines are the only writers**. The LLM gains no write authority; it gains the ability to *draft* a write that the user and the deterministic safety layer must both approve. Trust over autonomy, exactly like every prior version. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | The advisor can synthesize a recommendation but cannot act on it; the user must manually re-enter every change the advisor just reasoned out. The read path is trust-proven (v6) — the obvious, pre-documented next step is a *guarded* write path. |
| **WHO** | The established evidence-literate audience (biohacker / longevity / power user) who already has a stack, profile, meds, and labs entered — exactly the users for whom "apply this fix" is higher-value than re-reading it. |
| **RISK** | The LLM gaining write authority or fabricating an action (a supplement/dose/ID not present in tool results); a proposal applying a change that *introduces* a new interaction/allergy/dose risk; the client tampering with proposed values before apply; partial/duplicate writes; un-reversible actions; RLS leaking one user's audit/undo to another; proposal schemas drifting from the real write APIs. |
| **SUCCESS** | The advisor proposes any of the four action types, grounded only in prior tool results; each proposal is re-checked for safety on the projected stack *before* the confirm card renders; the server re-validates on confirm (never trusts client values); writes go exclusively through existing engines/APIs; every applied action is audited with a working undo; a sweep test asserts no fabricated/ungrounded action can be proposed; existing engine/write files are unmodified. |
| **SCOPE** | `lib/advisor/actions/` (proposal tool defs + Zod schemas + pure `applyProposal` dispatcher) · `lib/advisor/safety-recheck.ts` (projected-stack re-evaluation) · proposal-halt state in the existing agent loop · `app/api/advisor/actions` (confirm-execute + undo, server re-validation) · additive `0004_advisor_actions.sql` (RLS, inverse payload) · `ActionProposalCard` + `UndoToast` in `AdvisorPanel` · 4 proposal tools · grounding/no-fabrication sweep extended to proposals. **No** batch multi-action proposals, **no** autonomous (no-confirm) execution, **no** new write business logic, **no** v6 streaming/deep-link polish (all v8+). |

---

## 1. User Intent Discovery

### 1.1 Core Problem
v6 turned five milestones of deterministic engines into a grounded, conversational read surface. But the advisor is *read-only by design* — and that design has a sharp edge: the moment its synthesis becomes actionable ("remove this redundant item," "your B12 is low — add methyl-B12," "save this protocol as a stack"), the user has to abandon the conversation, navigate to the correct screen, and manually reconstruct the change. The reasoning the advisor just did is discarded exactly when it's most useful. v7 closes that loop **without** handing the LLM write authority.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| Evidence-literate biohacker | Has stack + profile + labs entered; asks the advisor to critique the stack | "Apply the fix you just described" without re-typing it on another screen |
| Cautious / longevity user | Worried about safety; wants the advisor to tidy redundancy or fill a gap | A change that is **re-checked for new risks** before it's applied, and reversible if wrong |
| Time-pressed power user | Knows the screens but wants speed | Conversational write-shortcut into the engines, with a clear confirm gate |

### 1.3 Success Criteria

| # | Criterion | Measure |
|---|-----------|---------|
| SC1 | Four proposal tools work | `propose_add_item`, `propose_remove_item`, `propose_edit_item`, `propose_generate_protocol`, `propose_attach_product` each produce a valid `ActionProposal` |
| SC2 | LLM never writes | All writes flow through existing v1–v4 APIs/engines; no DB access in `lib/advisor`; proven by code structure + tests |
| SC3 | Grounding enforced | A proposal referencing a supplement/product/stack ID or dose **absent from prior tool results** is refused; asserted by sweep test |
| SC4 | Pre-apply safety re-check | The projected stack is re-evaluated (`interactions` + `biomarkers` + `stack-evaluator`); any *new* flag is surfaced on the confirm card before the user can apply |
| SC5 | Edit-before-confirm | User can adjust proposed dose/timing in the card; edited values are server-re-validated on confirm |
| SC6 | Server re-validation | The confirm endpoint re-derives/validates the action server-side and never trusts client-supplied canonical values |
| SC7 | Audit + undo | Every applied action writes an `advisor_actions` row with an inverse payload; undo reverses it; RLS-scoped per user |
| SC8 | Additive / zero-regression | 0 existing engine/write/table files modified; all prior unit + E2E suites still green |

### 1.4 Constraints
- **Engines are the only writers** (project rule #6/#8 lineage) — non-negotiable.
- LLM remains isolated behind the existing `ClaudeAdapter`; no second LLM surface.
- All advisory/action copy routes through `lib/safety` (non-diagnostic language).
- Additive migration only (`0004`); legacy rows and the v6 read path keep working unchanged.
- Reuse the existing `@anthropic-ai/sdk` dependency — **no new dependencies**.

---

## 2. Alternatives Explored

### Approach A: Proposal-Tool pattern — **Chosen**
Extend the v6 tool registry with a second class of **action-proposal tools**. Calling one returns a validated `ActionProposal` (no write); the proposal is safety-re-checked, surfaced as an editable confirm card, and executed on confirm through the **existing write APIs**. The LLM never touches the DB.
- **Pros**: Maximal v6 reuse (bounded loop, isolated adapter, provenance, honesty sweep). Preserves "engines are the only writers." Each action = one thin proposal tool + one existing write path. Trust guarantee stays unit-testable against a mock adapter.
- **Cons**: Proposal schemas must mirror each write API; the agent loop needs a proposal-halt state.
- **Best for**: This project — lowest-risk path that keeps every architectural invariant.

### Approach B: Deterministic action-synthesizer
Advisor stays read-only; a pure `lib/advisor-actions` module derives proposals deterministically from existing engine findings only (e.g. a "redundant" flag → a remove proposal).
- **Pros**: Strongest trust story — proposals 100% deterministic, fully unit-testable, zero new LLM surface.
- **Cons**: Rigid — no conversational "add 400mg magnesium glycinate to my sleep stack"; only canned proposals tied to existing findings. Forfeits the natural-language leverage that made v6 valuable.

### Approach C: Guarded full-agent execution
Agent calls real write tools directly inside the loop; a confirm interrupt gates each commit.
- **Pros**: Most flexible/powerful; fewest new abstractions.
- **Cons**: LLM is now in the write path (the interrupt is the only guard); breaks "engines are the only writers"; hardest to trust-verify; largest QA surface. Over-powered for v7 — a candidate *after* suggest-then-confirm is proven.

> **Decision**: **A**. It is the same move that made v6 succeed — isolate the LLM behind a port, keep the engines authoritative, make the guarantee unit-testable — now applied to writes.

---

## 3. YAGNI Review

### 3.1 In Scope (v7)
- **Four proposal tools**: add item · remove item · edit item · generate-&-save protocol · attach product.
- **Editable confirm card** (`ActionProposalCard`) with human-readable diff.
- **Pre-apply safety re-check** on the projected stack (`lib/advisor/safety-recheck.ts`).
- **Edit-before-confirm** (adjust dose/timing in the card; server re-validates).
- **Applied-action audit + one-click undo** (`advisor_actions` table + stored inverse).
- **Server-side re-validation** at the confirm endpoint.
- **Grounding/no-fabrication sweep** extended to proposals.

### 3.2 Deferred / Out of Scope (v8+)
- **Batch multi-action proposals** (v7 = one action per confirm card) — explicit user trim.
- **Autonomous / no-confirm execution** — never without a confirm gate at this stage.
- **True LLM token-streaming**, **provenance chip deep-linking**, **atomic usage RPC** — v6 polish carry-overs.
- **New write business logic** — proposal dispatcher only calls existing engines/APIs.
- AI-assisted evidence drafting, personalization/context-adjusted grades, condition/pregnancy rules, external interaction API, LOINC — unrelated backlog threads.

> **YAGNI principle applied**: proposal tools add **no** new write logic — they validate, ground, and route to existing pure engines/APIs. No abstraction is introduced for hypothetical future action types beyond the proposal-tool + dispatcher pattern itself. Batch proposals are deferred precisely because one-action-per-confirm proves the model with far less diff/confirm complexity.

---

## 4. Design Direction (validated in brainstorming)

### 4.1 Architecture (additive — Option C lineage; 0 existing engine/write files modified)
- **`lib/advisor/actions/`** — proposal tool definitions + Zod `ActionProposal` schemas + a pure `applyProposal` dispatcher routing to existing write paths (items API, protocol accept, product attach). No new write logic.
- **`lib/advisor/safety-recheck.ts`** — pure composer that runs the projected stack through `interactions` + `biomarkers` + `stack-evaluator` and returns any newly-introduced flags.
- **`supabase/migrations/0004_advisor_actions.sql`** — additive, RLS-guarded audit table holding the applied action + inverse payload for undo.
- **Agent loop** gains a **proposal-halt state** — when a proposal tool is called, the loop returns the proposal instead of continuing; the `ClaudeAdapter` is untouched and stays isolated.
- **UI**: `ActionProposalCard` (diff + editable dose/timing + Confirm/Reject) and `UndoToast`, rendered inside the existing `AdvisorPanel`.

### 4.2 Components — the proposal tools
| Tool | Validates against | Executes via (on confirm) |
|------|-------------------|---------------------------|
| `propose_add_item` | supplement ID + dose from prior tool results | existing stack-items insert |
| `propose_remove_item` | stackItem ID present in the user's stack | existing stack-items delete |
| `propose_edit_item` | stackItem ID + new dose/timing | existing stack-items update |
| `propose_generate_protocol` | profile goals (protocol-builder output) | protocol accept → new stack |
| `propose_attach_product` | productId from product-matcher fit results | product link on stack item |

Each tool: Zod schema · ID/dose grounding check against prior tool results (refuse if ungrounded) · human-readable summary for the card.

### 4.3 Data flow (one action: suggest → confirm → apply → undo)
1. `/advisor` → v6 read tools run → agent calls a proposal tool → returns a validated `ActionProposal` (**no write**).
2. Server runs **pre-apply safety re-check** on the *projected* stack → attaches any new flags → SSE returns proposal + flags.
3. `ActionProposalCard` renders diff + editable fields + safety flags → user edits / confirms / rejects.
4. Confirm → `POST /api/advisor/actions` → **server re-validates** (re-derives canonical values; never trusts client) → executes via the existing write path → writes an `advisor_actions` audit row with inverse payload.
5. `UndoToast` → undo applies the stored inverse through the same existing write path.

> One action at a time; batch deferred to v8.

---

## 5. Brainstorming Log

| Phase | Decision | Rationale |
|-------|----------|-----------|
| Intent — theme | **Advisor becomes an actor** (suggest-then-confirm) | Highest user-visible leap; read path already trust-proven in v6; pre-documented as the obvious next step |
| Intent — action scope | All four action types (add / remove-edit / generate-save protocol / attach product) | User selected full action surface |
| Alternatives | **A: Proposal-Tool pattern** over B (deterministic) / C (full-agent) | Preserves "engines are the only writers"; maximal v6 reuse; trust guarantee stays unit-testable |
| YAGNI | Keep pre-apply safety re-check, edit-before-confirm, audit+undo; **defer batch proposals** | Safety + reversibility are the backbone of letting the advisor act; batch adds confirm complexity without proving anything new |
| Design validation | Architecture / Components / Data flow all approved on first pass | Direct continuation of the v4/v6 additive, LLM-isolated pattern |

---

## 6. Next Steps

```
Plan Plus completed
Document: docs/01-plan/features/advisor-actions.plan.md
Next step: /pdca design advisor-actions
```
