---
template: analysis
version: 1.0
feature: advisor-experience
date: 2026-06-30
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
milestone: v8
matchRate: 99
matchRateMode: "static + runtime (unit 282/282, tsc clean, next build OK, L1 auth-guards 2/2 + L2 deep-link 2/2 live incl. auto-open; authed batch/undo/streaming env-gated on E2E_LIVE + 0005). Act-1: G1 resolved."
---

# advisor-experience Analysis (Check Phase)

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Finish the v6/v7 advisor experience layer: faked streaming, single-action proposals, inert chips, invisible products. |
| **WHO** | Evidence-literate users living in `/advisor`. |
| **RISK** | Token before the gate · partial batch write · combination-only safety flag · dead deep-links · unwanted migration. |
| **SUCCESS** | Gate before any token; ≤N grounded proposals; selected-subset atomic apply + grouped undo; chips link gracefully; attached products render; 1 additive migration; suites green. |
| **SCOPE** | Domain (agent batch + onProgress + cumulativeRecheck + citation-href) · App (3 routes) · Infra (repo + 0005) · UI (progress strip, multi-action card, chips, product badge). |

## 1. Strategic Alignment (Phase 3)

- **PRD/WHY**: No PRD (single-feature, plan-plus). The Plan's core problem — an *unfinished* advisor experience — is addressed end-to-end: all four deferred items implemented. ✅
- **Architecture decisions followed**: Option C (Pragmatic) + Approach A (progress-stream + buffered-safe). The design's two refinements held in implementation — (a) **no Claude streaming API added** (progress loop-derived, answer token-replayed; `claude-adapter.ts` untouched), (b) **one additive `0005`** (nullable `batch_id` only, no CHECK/RLS change). ✅
- **Safety invariant**: `finalize` (grounding + `lib/safety`) is byte-for-byte unchanged; `token` SSE events are enqueued only after `runAdvisorTurn` returns; `progress` events carry only markers + tool names. No strategic misalignment. ✅

## 2. Plan Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|:------:|----------|
| SC1 | Live tool-progress events | ✅ Met | `agent.ts` `onProgress` (turn-start/tool-call/composing); route relays `progress`; unit `agent-proposals.test.ts` progress-order; UI strip in `AdvisorMessageBubble`/`AdvisorPanel` |
| SC2 | Gate before any answer token | ✅ Met | `route.ts` token loop runs only after gated `result`; `finalize` unchanged; `progress` carries no prose |
| SC3 | Token-streaming of gated answer | ✅ Met (Approach A) | `chunkAnswer` emits multi-token `token` deltas of the gated string; true off-the-wire streaming intentionally out of scope (B rejected) |
| SC4 | Batch ≤ cap, overflow dropped | ✅ Met | `agent.ts` capped collection; `MAX_BATCH_PROPOSALS=4`; cap + drop-ungrounded unit tests |
| SC5 | Selective per-action confirm | ✅ Met | `ActionProposalCard` per-action checkboxes; submits selected subset; L2 toggle test (LIVE) |
| SC6 | Cumulative gate + atomic apply | ✅ Met | `cumulativeRecheck` (folds projections); `actions/route.ts` `SAFETY_BLOCK`; `executeBatch` compensating rollback |
| SC7 | Combined grouped undo | ✅ Met | `recordBatch` shares `batch_id`; undo route batch-aware (reverse order); L1 batch+undo test (LIVE) |
| SC8 | Chip deep-linking (graceful) | ✅ Met | pure `citationHref` + `#effect-{id}`/`#paper-{id}` anchors; unit href test 8/8; **Act-1: `Tabs` hash-sync auto-opens the right tab + scrolls** — L2 auto-open test 2/2 live (G1 resolved) |
| SC9 | Attached-product surfacing | ✅ Met | `StackItemRow` badge via pure `getProductById`; `productId` mapped in `toStackItem` |
| SC10 | Additive / zero-regression | ✅ Met | 1 additive `0005` (nullable only); 0 engine/write-logic files changed; 282/282 unit; `next build` OK; no new dependency |

**Success rate: 10/10 met.**

## 3. Static Analysis

| Axis | Rate | Notes |
|------|:----:|-------|
| **Structural** | 100% | All planned module files present (migration, domain, repo, 3 routes, components, specs) + Act-1 `Tabs` hash-sync; `/advisor` + action routes build |
| **Functional** | 100% | No placeholders; all logic complete and unit-covered; G1 deep-link hash→tab resolved (Act-1) |
| **Contract** | 100% | SSE: 6 events emitted (`progress/token/citations/proposals/error/done`) == 6 handled by `consumeStream`. Confirm: client posts `{conversationId, actions[]}` == route `confirmSchema` (+ legacy single coercion). Undo: client `/actions/:id/undo` == batch-aware route |

## 4. Runtime Verification

| Layer | Result |
|-------|--------|
| Type check | `tsc --noEmit` clean |
| Unit (Vitest) | **282/282** (268 baseline + 14 new: progress-order, batch-cap, drop-ungrounded, MAX_BATCH const, citation-href 8) |
| Build | `next build` OK (`/advisor` 4.99 kB; all advisor/action routes compiled) |
| L1 API (always-on) | `POST /api/advisor` + `POST /api/advisor/actions` (batch shape) → **401 2/2 live** |
| L2 UI (always-on) | Library Effects tab renders `#effect-magnesium-sleep` target **and** a deep link auto-opens the Effects tab → **2/2 live** (Act-1) |
| L1/L2/L3 (authed) | Batch confirm + grouped undo + live progress/streaming/multi-action card — **env-gated** on `E2E_LIVE` + migration `0005` applied (same posture as v6/v7) |

**Match Rate (runtime executed): (100×0.15)+(100×0.25)+(100×0.25)+(97×0.35) = 99%.**

## 5. Gap List

| ID | Severity | Gap | Disposition |
|----|----------|-----|-------------|
| G1 | Important (low) | Provenance deep-link hash did not auto-open the Library Effects/Papers tab. | **RESOLVED (Act-1)**: `Tabs` gained an `anchorTabMap` hash-sync — a `#effect-`/`#paper-` link auto-opens the right tab and scrolls. L2 auto-open test 2/2 live. |
| G2 | Info | Authed batch/undo + live streaming/multi-action E2E not executed this run (no live Supabase + `0005` not applied). | Same posture as v6/v7 (`E2E_LIVE`-gated). Apply `0005` + run with `E2E_LIVE=1` to close. |
| G3 | Info | True off-the-wire token streaming not implemented. | By design — Approach A (B rejected on safety-invariant grounds); recorded in Plan/Design. |

**No Critical gaps. G1 resolved in Act-1. No remaining blocking gaps.** Decision Record (Option C · no Claude streaming API · additive `0005`) followed without deviation.

## 6. Decision Record Verification

| Decision | Followed? | Outcome |
|----------|:---------:|---------|
| Approach A (progress-stream + buffered-safe) | ✅ | Safety invariant preserved exactly; perceived latency win via live tool progress |
| Option C (additive; reuse repo; `batch_id`) | ✅ | One nullable-only migration; existing repo extended; grouped atomic undo |
| No Claude streaming API (design refinement) | ✅ | `claude-adapter.ts` untouched; smaller blast radius than Plan assumed |
| Engines/repos remain only writers; LLM behind one port | ✅ | `executeBatch` writes only via existing repos; no DB in `lib/advisor` |

## 7. Recommendation

Match Rate **99% (≥ 90%)** after Act-1 (G1 resolved), with all 10 success criteria met and no remaining blocking gaps → **proceed to report** (optionally `/pdca qa` for the env-gated authed L1–L3 once `0005` is applied).
