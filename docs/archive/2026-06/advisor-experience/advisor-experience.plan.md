---
template: plan-plus
version: 1.0
feature: advisor-experience
date: 2026-06-30
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v8
---

# advisor-experience Planning Document

> **Summary**: Complete the v6/v7 advisor arc as a **UX + agent-loop finishing release** — no new domain, no new engine. Four deferred items land: (1) **true LLM token-streaming** that preserves the project's non-negotiable invariant *"no unsafe/ungrounded token ever leaves the server"*; (2) **batch multi-action proposals** — the advisor can propose several stack/protocol/product changes at once, the user selectively confirms a subset, and they apply **all-or-nothing** with a combined one-click undo; (3) **provenance chip deep-linking** from answers into the relevant Library effect / evidence breakdown; and (4) **attached-product UI surfacing** of the `product_id` v7 added to stack items. Additive throughout (Architecture Option C, in the v4/v6/v7 lineage): the LLM stays isolated behind the existing `ClaudeAdapter`, the engines remain the only writers, the final answer still flows through the existing grounding + `lib/safety` gate **unchanged**, and the target is **zero schema migration**.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v8 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-30
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v6 made the engines conversational and v7 let the advisor *propose* a guarded write — but the experience is unfinished in four places the v7 report itself flagged. Streaming is **faked**: the route runs the whole turn to completion, then slices the finished string into word-chunks, so the user stares at a dead screen during the slow multi-turn tool loop. The advisor can propose only **one** action at a time, so a multi-part critique ("remove the redundant item *and* add magnesium *and* save it") forces three separate confirm round-trips. The provenance chips on every answer are **inert** — they cite an effect but don't take you to it. And the matched `product_id` v7 began persisting on stack items is **invisible** in the UI. |
| **Solution** | A finishing release built on Approach A (**progress-stream + buffered-safe**). The agent loop emits **live named progress events** during the slow tool phase, then the *already-gated* answer is token-streamed — the safety gate is untouched. The proposal-halt is generalized into **capped batch collection**; the confirm card lets the user toggle individual actions and applies the selected subset **all-or-nothing** via sequential execute + **compensating-inverse rollback**, audited as one row for one-click undo. Citation chips become deep-links; attached products surface on the stack item. No new engine, no new dependency, target zero migration. |
| **Function/UX Effect** | Inside `/advisor`: while the advisor works, the user sees *"checking interactions… grading evidence… composing…"* instead of a frozen pane, then watches the answer type in live. A multi-part request yields **one confirm card listing N actions**, each with a checkbox and editable dose/timing, plus the cumulative new-safety-flag heads-up; Confirm applies the checked set atomically, and a single Undo reverses the whole batch. Provenance chips are now clickable into the exact Library effect + evidence breakdown. Stack items show their matched product. |
| **Core Value** | The advisor stops *feeling* like a stalled prototype and becomes a **finished, trustworthy collaborator** — responsive, multi-step, and navigable — **without spending a single point of the project's safety budget**. Every prior invariant holds: engines are the only writers, the LLM stays behind one isolated port, and no unsafe or ungrounded token can reach the client. Polish without compromise. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v6 (read) and v7 (guarded write) proved the hard parts; what remains is the experience layer the v7 report explicitly deferred to v8. The Cal.com design-system overhaul just landed, so a UX-completion release is the natural next beat. |
| **WHO** | The established evidence-literate audience (biohacker / longevity / power user) who already lives in `/advisor` — exactly the users who feel the frozen-pane latency, the one-action-at-a-time friction, and the dead chips most acutely. |
| **RISK** | Streaming a token *before* the grounding/banned-language gate has run (the cardinal sin); a partial batch write leaving the stack half-changed; the cumulative safety re-check missing an interaction that only emerges from the *combination* of selected actions; the client tampering with proposed values across a batch; an over-large batch blowing the turn/token budget; deep-link chips pointing at a non-existent effect; the audit `inverse` column not actually being array-capable (forcing an unwanted migration). |
| **SUCCESS** | The final answer passes the **existing** gate before any token streams; live progress events fire during the tool loop; the advisor proposes up to N grounded actions in one turn; the user confirms a **selected subset**, re-validated and cumulative-safety-gated server-side, applied **all-or-nothing** with combined undo; chips deep-link correctly; attached products render; **zero engine/write-logic files changed**, target **zero migration**, all prior suites green. |
| **SCOPE** | Streaming path on the `ClaudeAdapter` port + `onProgress` sink in the agent loop · `ProgressEvent` type · capped batch collection + `finalizeProposalBatch` + cumulative `recheckForProposal` · `/api/advisor/route` live-progress + token-stream of the gated answer · `/api/advisor/actions` selected-subset re-validate + compensating rollback + combined audit · multi-action ConfirmCard with per-action toggles · deep-link citation chips · attached-product stack row · tests extending the 268-suite. **No** new engine/domain, **no** autonomous (no-confirm) execution, **no** new dependency, **no** stream reconnect/resume (deferred), **no** sentence-level token gating (Approach B, rejected). |

---

## 1. User Intent Discovery

### 1.1 Core Problem
The advisor is functionally complete (v6 read, v7 guarded write) but experientially unfinished. The v7 report named four gaps; this release closes them. The unifying theme: every gap is a **UX or agent-loop** shortfall over **already-proven** domain logic — none requires a new engine, table, or dependency. The pivotal constraint is that the most-wanted item (true token-streaming) directly threatens the project's most sacred invariant, so it must be delivered in a way that keeps that invariant *exactly* intact.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| Evidence-literate biohacker | Lives in `/advisor`, asks multi-part questions | One confirm card for a multi-step change, not three round-trips; responsive feedback while it thinks |
| Cautious / longevity user | Worried about combined effects of several changes | A **cumulative** safety re-check over the whole proposed batch before applying, and a single undo if wrong |
| Time-pressed power user | Wants speed and navigability | Live streaming (no frozen pane) + clickable provenance to verify a claim in one tap |

### 1.3 Success Criteria

| # | Criterion | Measure |
|---|-----------|---------|
| SC1 | Live progress during tool loop | The route emits ordered `progress` SSE events naming each tool as it runs, before the answer streams |
| SC2 | Safety invariant preserved | The final answer passes the **existing** grounding + banned-language gate **before** the first answer token is streamed; proven by route + agent tests |
| SC3 | True token-streaming of the gated answer | The gated-safe answer streams as live token deltas (not a single buffered blob), via the streaming `ClaudeAdapter` path |
| SC4 | Batch proposals | The advisor can return up to `MAX_BATCH_PROPOSALS` (configurable const, default 4) grounded proposals in one turn; over-cap proposals are dropped, not errored |
| SC5 | Selective confirm | The confirm card lets the user toggle individual actions; only the selected subset is submitted |
| SC6 | Cumulative safety gate + atomic apply | The selected subset is re-validated and re-checked over the **projected combined** stack server-side; a new critical flag blocks the whole batch (`SAFETY_BLOCK` 409); applied **all-or-nothing** (compensating rollback on any failure) |
| SC7 | Combined undo | The batch writes one `advisor_actions` row whose inverse reverses **all** applied actions via the existing undo endpoint |
| SC8 | Chip deep-linking | Provenance chips link to the correct Library effect / evidence breakdown; an unresolved target degrades gracefully (no dead link) |
| SC9 | Attached-product surfacing | A stack item with a `product_id` renders its matched product in the UI |
| SC10 | Additive / zero-regression | 0 engine/write-logic files modified; **target 0 migration** (verified JSONB `inverse`); all prior unit + E2E suites green; no new dependency |

### 1.4 Constraints
- **Engines are the only writers** and the **LLM stays behind the single `ClaudeAdapter` port** — non-negotiable, unchanged from v6/v7.
- The grounding + `lib/safety` gate on the final answer is **not modified** — streaming is layered *around* it, never *through* it.
- Additive only; **target zero migration** (reuse v7's `0004` JSONB columns + nullable `product_id`). If a migration proves unavoidable it must be additive (`0005`, nullable/new-table only).
- Reuse the existing `@anthropic-ai/sdk` — **no new dependencies**.
- All copy routes through `lib/safety`.

---

## 2. Alternatives Explored

### Approach A: Progress-stream + buffered-safe answer — **Chosen**
- **Streaming**: live `progress` events during the multi-turn tool loop (the genuinely slow part); the final answer is buffered, passed through the **existing** gate, then token-streamed.
- **Batch**: sequential `executeProposal` + **compensating-inverse rollback**; combined audit row.
- **Pros**: safety invariant preserved *exactly* (gate stays per-answer); no new DB primitive; smallest blast radius; reuses v7's inverse machinery; deterministically unit-testable.
- **Cons**: final-answer tokens are "replayed" from the gated string rather than literally live off the wire (the *tool phase* is genuinely live). Acceptable — the perceived-latency win lives in the tool loop, not the final text.
- **Best for**: a safety-first project that treats "no unsafe token leaves the server" as sacred.

### Approach B: True live token-stream + sentence-gate
- Stream Claude's real final-turn tokens; gate grounding *before* the final turn; run banned-language on a rolling **sentence buffer**, aborting + swapping to fallback on the first violating sentence. Batch atomic via a new Postgres RPC.
- **Pros**: genuinely live final tokens; DB-level atomicity.
- **Cons**: **weakens the invariant from per-answer to per-sentence**; abort/replace + RPC are fiddly and harder to unit-test deterministically; the RPC is the first non-additive DB surface. Rejected — costs safety/clarity for a marginal liveness gain.

### Approach C: UX-only, defer streaming
- Keep the faked stream; ship only chips + attached-product UI + a non-atomic multi-proposal list.
- **Pros**: lowest risk/effort.
- **Cons**: drops the two headline deferred items the user prioritized. Rejected — under-delivers the release's purpose.

---

## 3. YAGNI Review

### 3.1 In Scope (v8)
- **True LLM token-streaming** (Approach A: progress-stream + buffered-safe).
- **Batch multi-action proposals**, capped, with **selective per-action confirm** and **all-or-nothing** apply + combined undo.
- **Configurable batch size** (`MAX_BATCH_PROPOSALS` const, default 4).
- **Named tool-call progress events** (`tool-call {name}`, not a generic spinner).
- **Provenance chip deep-linking** into Library effect / evidence breakdown.
- **Attached-product UI surfacing** on stack items.

### 3.2 Deferred / Out of Scope (v9+)
- **Stream reconnect/resume** on a dropped SSE connection (a failed stream can just re-ask) — explicitly deferred.
- **Sentence-level / true off-the-wire final-token gating** (Approach B) — rejected on safety-invariant grounds.
- **Autonomous (no-confirm) execution** — never; violates the project's writer invariant.
- **Postgres transaction RPC** for batch atomicity — compensating rollback suffices; revisit only if rollback proves insufficient.
- **New engine / domain logic, new DB tables, new dependencies** — none.

---

## 4. Design Direction (validated in brainstorming)

### 4.1 Architecture (additive — Option C lineage; 0 engine/write-logic files modified)
- **Streaming is layered around the gate, never through it.** `runAdvisorTurn` accepts an injected `onProgress` sink and emits `ProgressEvent`s as tools dispatch; its return value and the `finalize` → grounding + `lib/safety` path are **unchanged**. The route relays progress live, then token-streams the gated-safe answer.
- **Batch generalizes the proposal-halt.** The loop collects up to `MAX_BATCH_PROPOSALS` grounded proposals instead of halting on the first; `finalizeProposalBatch` runs `recheckForProposal` per proposal over the **cumulative projected** stack.
- **Target zero migration.** v7's `0004` audit table uses JSONB `payload`/`inverse`, and `stack_items.product_id` is already nullable — so a batch audit row can store an array of actions + a combined inverse, and attached-product UI reads existing data. *(Design step 0: confirm `inverse` is JSONB; if not, add additive `0005` only.)*

### 4.2 Components
| Layer | File(s) | Change |
|-------|---------|--------|
| Types | `types/advisor.ts` | `ProgressEvent` union (`turn-start` · `tool-call {name}` · `composing`); optional stream on `ClaudeAdapter`; `AdvisorTurnResult.proposals: ActionProposal[]` |
| Domain | `lib/advisor/agent.ts` | `onProgress` sink; capped batch collection; `finalizeProposalBatch` w/ cumulative re-check |
| Infra | `lib/advisor/claude-adapter.ts` | streaming `next` via SDK `messages.stream`; pure mapping cores untouched |
| App | `app/api/advisor/route.ts` | live `progress` SSE → token-stream gated answer → `proposals[]` event |
| App | `app/api/advisor/actions/route.ts` | accept selected subset + `edits[]`; per-action re-validate; cumulative gate; sequential execute + compensating rollback; one combined `recordAction` |
| App | `lib/advisor/actions/execute.ts` | batch execute helper composing inverses (or route-composed) |
| UI | `app/advisor/page.tsx`, `components/advisor/*` | named progress; multi-action ConfirmCard w/ per-action toggles; deep-link chips |
| UI | `components/stack/*` | attached-product row |
| Tests | `lib/advisor/*.test.ts`, E2E | progress-sequence, batch-cap, cumulative-gate, compensating-rollback, selective-subset, chip-href |

### 4.3 Data flow (multi-action: stream → batch confirm → atomic apply → undo)
1. POST `/api/advisor` → auth → budget + context + history (parallel, unchanged).
2. Bounded loop runs; each tool dispatch → `onProgress` → **live** `progress` SSE event.
3. Loop yields 0..N grounded proposals (cap N) **or** a final answer.
4. Final answer → **existing** grounding + banned-language gate → safe string; persist turn + meter usage (unchanged) → **token-stream** answer + `citations` + (`proposals[]` if batch) + `done`.
5. Client renders the live stream; if proposals present, ConfirmCard shows per-action toggles + cumulative new-flag heads-up.
6. User selects a subset + edits → POST `/api/advisor/actions` `{ proposals: subset, edits[] }`.
7. Server re-loads context, re-validates each selected action, runs **cumulative** `recheckForProposal` over the projected combined stack; a new critical flag → `SAFETY_BLOCK` 409 (whole batch blocked).
8. Sequential `executeProposal` via existing repos; **on any failure → run accumulated inverses (compensating rollback)** → 500; on success → one `recordAction` with combined inverse → 201.
9. Existing `/api/advisor/actions/[id]/undo` applies the combined inverse → reverts the entire batch.

---

## 5. Brainstorming Log

| Phase | Decision | Rationale |
|-------|----------|-----------|
| Intent (Q1) | v8 = **complete the advisor UX** (over evidence-depth / clinical-depth) | Natural successor to the just-landed design-system overhaul; closes the four items the v7 report explicitly deferred |
| Intent (Q2) | **All four** deferred items in scope (streaming, batch, chips, attached-product) | User confirmed the full bundle rather than a subset |
| Alternatives | **Approach A** (progress-stream + buffered-safe) over B (live + sentence-gate) and C (UX-only) | Only A delivers all four items while keeping the per-answer safety invariant exactly intact and adding no DB primitive |
| YAGNI | Keep: named progress events, selective per-action confirm, configurable batch size. Defer: stream reconnect/resume | Lean release; reconnect is premature, the other three are low-cost high-value |
| Design §1 | Streaming layered **around** the unchanged gate; batch via compensating rollback; **target zero migration** | Approved |
| Design §2 | Module/file + test breakdown across types/domain/infra/app/UI | Approved |
| Design §3 | stream → batch confirm → cumulative gate → atomic apply → combined undo | Approved |

---

## 6. Next Steps

```
Plan Plus completed
Document: docs/01-plan/features/advisor-experience.plan.md
Next step: /pdca design advisor-experience
```

- **Design step 0 (gate):** confirm `advisor_actions.inverse` is JSONB and array-capable — keeps the zero-migration target; otherwise add additive `0005` only.
- Then proceed through `/pdca design → do → analyze → report` in the established v2–v7 cadence.
