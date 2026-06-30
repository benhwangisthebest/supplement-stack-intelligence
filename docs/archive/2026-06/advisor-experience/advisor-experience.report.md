---
template: report
version: 1.1
feature: advisor-experience
date: 2026-06-30
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
milestone: v8
---

# advisor-experience Completion Report

> **Status**: Complete
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v8
> **Author**: benhwang121@gmail.com
> **Completion Date**: 2026-06-30
> **PDCA Cycle**: v8 (advisor-experience)

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | advisor-experience (the advisor UX finishing release) |
| Start Date | 2026-06-30 (Plan-Plus) |
| Method | Plan-Plus → PDCA (Design Option C · Approach A; Do ×3 modules; Check 98→99% after Act-1; QA PASS) |
| Architecture | Option C (Pragmatic) — Approach A (progress-stream + buffered-safe) |
| Match Rate | **99%** (runtime-verified static + L1/L2; authed L1–L3 `E2E_LIVE`-gated) |
| Success Criteria | **10/10 met** |

### 1.2 Results Summary

| Perspective | Result |
|-------------|--------|
| **Problem** | The v6/v7 advisor was functionally complete but experientially unfinished in four places the v7 report flagged: faked streaming, single-action proposals, inert provenance chips, invisible attached products. |
| **Solution** | All four shipped on Approach A: live tool-progress events → token-streamed *gated* answer; capped batch proposals with selective confirm + all-or-nothing apply + grouped undo; pure `citationHref` deep-links with hash→tab auto-open; attached-product badge. Additive throughout — one migration (`0005`), no new dependency, safety gate untouched. |
| **Function/UX Effect** | `/advisor` shows "Checking interactions… / Composing…" then types the answer in live; a multi-part request yields one confirm card listing N toggleable actions with a cumulative safety heads-up, applied atomically with a single Undo; provenance chips jump to the exact Library effect (auto-opening its tab); stack items show their matched product. |
| **Core Value** | The advisor stops *feeling* like a stalled prototype and becomes a finished, trustworthy collaborator — responsive, multi-step, navigable — **without spending a point of the safety budget**: engines remain the only writers, the LLM stays behind one isolated port, and no unsafe/ungrounded token can reach the client. |

### 1.3 Value Delivered

| Metric | Planned | Delivered |
|--------|---------|-----------|
| Deferred items closed | 4 (streaming, batch, chips, product UI) | **4/4** |
| Success criteria | 10 | **10/10 met** |
| Unit tests | extend 268 | **282** (+14: progress-order, batch-cap, drop-ungrounded, `MAX_BATCH` const, `citation-href` ×8) |
| Migrations | "target 0" → 1 additive | **`0005`** (nullable `batch_id` + partial index only; no CHECK/RLS change) |
| New dependencies | 0 | **0** |
| Engine/write-logic files modified | 0 | **0** |
| Build | OK | `next build` OK (`/advisor` 4.99 kB) |
| Match Rate | ≥ 90 | **99** |

## 1.4 Success Criteria Final Status

| # | Criterion | Status | Evidence |
|---|-----------|:------:|----------|
| SC1 | Live tool-progress events | ✅ | `agent.ts` `onProgress`; route `progress` SSE; progress strip; unit progress-order |
| SC2 | Gate before any answer token | ✅ | `finalize` unchanged; `token` enqueued only after gated result; progress carries no prose |
| SC3 | Token-streaming of gated answer | ✅ | `chunkAnswer` multi-token deltas (Approach A; off-the-wire streaming out of scope) |
| SC4 | Batch ≤ cap, overflow dropped | ✅ | capped collection; `MAX_BATCH_PROPOSALS=4`; cap + drop-ungrounded unit tests |
| SC5 | Selective per-action confirm | ✅ | `ActionProposalCard` checkboxes; submits subset; L2 toggle (LIVE) |
| SC6 | Cumulative gate + atomic apply | ✅ | `cumulativeRecheck`; `SAFETY_BLOCK`; `executeBatch` compensating rollback |
| SC7 | Combined grouped undo | ✅ | `recordBatch` shared `batch_id`; batch-aware undo route; L1 (LIVE) |
| SC8 | Chip deep-linking (graceful) | ✅ | `citationHref` + anchors + `Tabs` hash-sync (Act-1); href unit 8/8; L2 auto-open 2/2 |
| SC9 | Attached-product surfacing | ✅ | `StackItemRow` badge via `getProductById`; `productId` in `toStackItem` |
| SC10 | Additive / zero-regression | ✅ | 1 additive `0005`; 0 engine/write files changed; 282/282; no new dep |

**Overall Success Rate: 10/10.**

## 1.5 Decision Record Summary

| Decision | Followed? | Outcome |
|----------|:---------:|---------|
| Approach A (progress-stream + buffered-safe) over B/C | ✅ | Safety invariant preserved exactly; latency win in the tool phase |
| Option C (additive; reuse repo; `batch_id`) | ✅ | One nullable-only migration; grouped atomic undo via existing inverse machinery |
| Design refinement: **no Claude streaming API** (progress loop-derived, answer replayed) | ✅ | `claude-adapter.ts` untouched — smaller blast radius than the Plan assumed |
| Engines/repos the only writers; LLM behind one port | ✅ | `executeBatch` writes only via existing repos; no DB in `lib/advisor` |
| Plan "target 0 migration" → corrected to 1 additive `0005` | ✅ | Honest correction surfaced at Design step-0 gate (CHECK constraint blocked a single batch row) |

## 2. Related Documents

- [Plan](../01-plan/features/advisor-experience.plan.md)
- [Design](../02-design/features/advisor-experience.design.md)
- [Analysis](../03-analysis/advisor-experience.analysis.md)
- [QA Report](../05-qa/advisor-experience.qa-report.md)

## 3. Completed Items

### 3.1 Functional
- **Streaming**: `agent.ts` `onProgress` sink (turn-start/tool-call/composing); `route.ts` streams live `progress` during the loop then token-streams the gated answer; `error` SSE on failure; key pre-check preserves 503.
- **Batch**: capped collection (`MAX_BATCH_PROPOSALS`), `finalizeProposalBatch`, pure `cumulativeRecheck` (folds projections to catch combination-only flags); `executeBatch` sequential apply + compensating-inverse rollback; `recordBatch`/`getActionsByBatch`; batch-aware undo.
- **Chips**: pure `citationHref(kind,refId)`; `#effect-{id}`/`#paper-{id}` anchors; `Tabs` `anchorTabMap` hash-sync (Act-1).
- **Product UI**: read-only `productId` on `StackItem` + mapper; `getProductById`; `StackItemRow` badge.

### 3.2 Non-Functional
- Safety invariant preserved (gate-around, never gate-through); engines the only writers; LLM behind one port; additive `0005`; no new dependency; Clean-Architecture layers respected (Domain emits events via injected sink, no I/O).

### 3.3 Deliverables
- 1 migration, 2 new pure modules (`citation-href`, batch helpers), 3 routes updated, repo + execute extended, 6 components updated, 2 e2e specs + 14 unit tests.

## 4. Incomplete Items

### 4.1 Carried Over (v9 candidates)
- **True off-the-wire token streaming** (G3) — intentionally out of scope (Approach A; B rejected on safety grounds).
- **Authed live E2E** (G2) — batch/undo/streaming specs are `E2E_LIVE`-gated; run once `0005` is applied + `E2E_LIVE=1 … --workers=1`.
- Cross-action batch dependencies (e.g. attach-product to an item *added in the same batch*) — batch operates on the current snapshot by design.

### 4.2 Cancelled/On Hold
- None.

## 5. Quality Metrics

### 5.1 Final Analysis Results
- Match Rate **99%** = Structural 100 × .15 + Functional 100 × .25 + Contract 100 × .25 + Runtime 97 × .35.
- Contract 3-way exact: 6 SSE events emitted == 6 handled; `{actions[]}` ↔ `confirmSchema`; batch-aware undo.
- QA: e2e 4 passed / 4 skipped (gated) / 0 failed; unit 282/282; tsc clean; build OK.

### 5.2 Notable Engineering Decisions Resolved During Do
- **No adapter change for streaming** — Approach A makes progress loop-derived + answer replayed, so `ClaudeAdapter` stayed untouched (design refinement of the Plan).
- **`cumulativeRecheck` placed in `safety-recheck`** (pure domain), reused by both the agent's pre-apply display and the route's authoritative gate — one source of truth.
- **`batch_id` (additive) over a `'batch'` action_type** — avoids altering the 0004 CHECK; each row stays a valid single action; grouped undo by `batch_id`.
- **Optional `productId`** on `StackItem` — read-only surfacing with zero ripple to the domain's many item constructors/fixtures.

## 6. Lessons Learned & Retrospective

### 6.1 What Went Well (Keep)
- Design step-0 gate caught the migration reality early (honest "zero → one additive" correction).
- Module split (Domain → App → UI) kept each session's blast radius small; 0 regressions across all three.
- Reusing v7's inverse machinery made all-or-nothing batch rollback nearly free.

### 6.2 What Needs Improvement (Problem)
- Deep-link tab-hash (G1) was missed at design time and surfaced only in Check — a UI-target dependency worth listing in the design's UI checklist next time.
- Authed flows remain unverifiable without provisioning — the live-E2E gap recurs every advisor release.

### 6.3 What to Try Next (Try)
- A seeded local Supabase + `0005` in CI so authed L1–L3 run automatically.
- Add "anchor/tab target exists" to the design Page-UI checklist for any deep-linking feature.

## 7. Process Improvement Suggestions
- Capture deep-link/anchor targets as explicit design deliverables (not just the chip resolver).
- Keep the "no Claude streaming API" note prominent — future contributors may assume streaming requires an adapter change.

## 8. Next Steps

### 8.1 Immediate
- `/pdca archive advisor-experience` → file under `docs/archive/2026-06/` and update the index.
- When a live backend is available: apply `0005`, then `E2E_LIVE=1 npm run test:e2e -- advisor-experience --workers=1`.

### 8.2 Next PDCA Cycle (v9 candidates)
- Evidence depth (profile remaining ~19 effects, AI-assisted dimension drafting) or clinical/lab depth (LOINC, external interaction API) — the two directions deferred at v8 planning.

## 9. Changelog

### v8 (2026-06-30) — advisor-experience
- Live tool-progress streaming + token-streamed gated answer (safety gate unchanged).
- Batch multi-action proposals: capped collection, selective confirm, cumulative safety gate, all-or-nothing apply with compensating rollback, grouped one-click undo.
- Provenance chip deep-linking (`citationHref` + anchor ids + `Tabs` hash-sync).
- Attached-product UI badge on stack items.
- Additive migration `0005` (`batch_id`); +14 unit tests (282 total); no new dependency.

## Version History

| Date | Author | Change |
|------|--------|--------|
| 2026-06-30 | benhwang121@gmail.com | v8 completion report. Match Rate 99% (Act-1 closed G1); 10/10 success criteria; QA PASS (authed L1–L3 `E2E_LIVE`-gated). |
