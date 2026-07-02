# Plan — Daily Check-in & Feedback Loop (v10)

> **Feature**: `daily-checkin`
> **Milestone**: v10
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)
> **Level**: Dynamic
> **Created**: 2026-07-02

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | The platform can build, evaluate, and recommend a stack — but it's **open-loop**. Once a user takes their supplements, nothing comes back: no record of whether they actually took them, no sense of whether anything changed, and recommendations never learn from lived experience. Health nerds run n-of-1 experiments in their heads; the app gives them nowhere to log it and no way for that signal to sharpen what it suggests. The trap: naïvely attributing outcomes to supplements is causally fraught (placebo, confounders, regression to the mean), so the loop must be **correlational and non-diagnostic**, never "supplement Y works for you." |
| **Solution** | A **gamified daily check-in** captures adherence (which items were taken) + a quick 1–5 rating on the user's active goals. A pure `lib/checkin` engine turns that history into (a) a **consistency** metric + heatmap, (b) **correlational outcome aggregates** (avg goal rating on days an item was taken vs not), and (c) a **bounded feedback signal** that nudges the existing `generateProtocol` ranking — **evidence still dominates**, feedback is a min-sample-gated secondary nudge (same magnitude class as the v3 biomarker / v4 lab-trend nudges). Consistency also **feeds the v9 identity layer**, unifying the two gamification features. Architecture **Approach A (additive)** — one additive migration `0006_checkins`, additive/bounded hooks into two engines. |
| **Function/UX Effect** | In Stack Lab, a **Daily Check-in** section shows today's stack items to check off + goal sliders (+ optional note); a premium **consistency heatmap** (GitHub-contribution style) tracks the habit without childish points/badges. Protocol suggestions **re-rank within evidence bounds** as feedback accrues, and **insight cards** ("you rated sleep 4.2 on magnesium days vs 3.1 — correlational, N days") make the shift transparent. Consistency sharpens the user's v9 identity card. |
| **Core Value** | The app stops being a one-shot recommender and becomes a **closed-loop lab assistant** that learns from the user's own tracked experience — while holding the line on trust: every outcome statement is correlational and non-diagnostic, every recommendation change is bounded and evidence-dominant. It answers the natural next question after "does my stack make sense?" → **"is it actually working for me?"** — honestly. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | The platform is open-loop: it recommends but never learns from lived experience, and never tracks whether the user even takes their stack. v9 gave the platform a mirror; v10 gives it a feedback loop — the natural close of the core "does my stack make sense → is it working for me?" arc. |
| **WHO** | Evidence-literate biohackers / longevity / athletes who already run n-of-1 self-experiments and want a place to log adherence + outcomes and have it sharpen recommendations. |
| **RISK** | **Causal over-attribution** — implying a supplement caused an outcome (placebo/confounders/regression to mean); **directive/diagnostic language** ("this isn't working for you", "stop taking X"); **noisy feedback** overriding evidence on thin data; **childish gamification** (points/badges) violating CLAUDE.md; side-effect field drifting into medical territory. |
| **SUCCESS** | Idempotent daily check-in (adherence + goal ratings) persisted with RLS; pure deterministic `lib/checkin` (consistency + correlational aggregates + **bounded, min-sample-gated** feedback signal); `generateProtocol` re-ranks **within evidence bounds** (evidence-dominant, proven by a no-feedback regression test); premium consistency heatmap; correlational **non-diagnostic** insight cards; consistency feeds v9 identity; honesty sweep passes; auth + RLS. |
| **SCOPE** | `0006_checkins` migration · `types/checkin` · `lib/checkin` (consistency · outcomes · feedback · insights) · `checkin-repo` · `GET/POST /api/checkins` · bounded `generateProtocol` `feedbackSignal` hook + protocol-route wiring · v9 identity consistency feed · `DailyCheckinForm` + `ConsistencyHeatmap` + `InsightCards` · Stack Lab surfacing · side-effect/note field (display-only) · unit + L1 + L2/L3 tests. **No** proactive advisor proposals, side-effect *engine*, reminders/notifications, wearables, or longitudinal charts beyond the heatmap (deferred). |

---

## 1. User Intent Discovery

### 1.1 Core Problem
The recommendation loop is open. The app never learns from what the user actually experiences, and can't even tell whether they're taking their stack. Closing that loop is the natural next step after v9 — but it must be done **honestly**: self-reported outcomes are correlational signals, not proof of efficacy, and the platform's whole brand rests on not overstating evidence. The design's central constraint is therefore that feedback **informs** recommendations as a bounded, evidence-subordinate nudge and is **surfaced** as correlation, never causation.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| n-of-1 biohacker | Already self-experiments; wants a rigorous log | A structured place to log adherence + outcomes and have it *transparently* shape suggestions |
| Consistency-seeker | Struggles to take the stack daily | A premium (non-childish) habit surface — heatmap + consistency, not points |
| Evidence-first longevity user | Skeptical of hype | Assurance that feedback never overrides evidence and outcome claims stay correlational |

### 1.3 Success Criteria

| # | Criterion | Measure |
|---|-----------|---------|
| SC1 | Idempotent daily check-in persisted | `POST /api/checkins` upserts one row per `(user_id, date)`; adherence + goal ratings stored; RLS-scoped |
| SC2 | Pure consistency engine | `lib/checkin/consistency.ts` computes check-in rate + current streak + adherence rate deterministically; unit-tested |
| SC3 | Correlational outcome aggregation | `outcomes.ts` computes, per (goal × item), avg rating on taken-days vs not-taken-days + delta + sample counts; pure |
| SC4 | Bounded, gated feedback signal | `feedback.ts` emits a per-(supplement, outcome) signal **capped in magnitude** and **suppressed below a minimum sample size** (refuse-when-insufficient); unit-tested |
| SC5 | Evidence-dominant re-ranking | `generateProtocol` applies `feedbackSignal` as a bounded secondary key; a **regression test proves ranking is unchanged when no feedback is supplied**, and evidence grade still dominates within-goal |
| SC6 | Non-diagnostic insight cards | `insights.ts` produces correlational, hedged cards ("you rated … on days you took … — correlational, N days"); routed through `lib/safety` |
| SC7 | Premium consistency gamification | `ConsistencyHeatmap` (calendar) + a consistency metric; no points/badges/levels |
| SC8 | Feeds v9 identity | Consistency contributes to the v9 identity `dataDepth` (or an engagement input), additively |
| SC9 | Side-effect/note field (display-only) | Optional note/side-effect captured + displayed with a disclaimer; **not** consumed by any engine in v1 |
| SC10 | Additive + safe + zero-regression | One additive migration (`0006`, nullable/new-table only); engine hooks are additive + bounded; honesty sweep passes; `next build` OK; all prior suites green; auth + RLS enforced |

### 1.4 Constraints
- **Correlational, non-diagnostic** — no causal/efficacy claims; all outcome + side-effect copy through `lib/safety`; honesty sweep test.
- **Evidence-dominant** — feedback is a bounded, min-sample-gated secondary nudge (magnitude class ≈ v4 `trendAdjustment` ±0.2); evidence grade always dominates. Proven by a no-feedback regression test.
- **Additive** — one additive migration; `generateProtocol` + `lib/identity` hooks are **optional inputs**, backward-compatible (absent feedback ⇒ identical prior behavior).
- **Premium gamification** — heatmap + consistency only; no points/badges/levels (CLAUDE.md; consistent with v9).
- **Idempotent** — one check-in per user per day (unique constraint + upsert).

---

## 2. Alternatives Explored

### Approach A — Additive engine + one table + bounded protocol hook — **SELECTED**
Pure `lib/checkin` engine + additive `0006_checkins` + bounded `generateProtocol` hook + heatmap UI + v9 identity feed.
- **Pros**: deterministic, on-brand, mirrors the proven v4 lab-timeline shape (table + engine + bounded nudge); one clean migration; reuses `generateProtocol` + v9 identity.
- **Cons**: first schema addition in 6 milestones; modifies 2 engine files (both additive/bounded); outcome framing must be carefully non-diagnostic.
- **Best for**: closing the loop deterministically without over-building. ✅

### Approach B — Event-sourced log + separate analytics layer
Raw daily events + richer read-time analytics module.
- **Pros**: maximally flexible for future longitudinal analytics.
- **Cons**: over-engineered for v1 outcome averaging; more surface, slower to ship.
- **Rejected**: no committed analytics roadmap justifies event-sourcing now.

### Approach C — Advisor-mediated (LLM) feedback
Route feedback through the v6–v8 advisor for NL insights + proposals.
- **Pros**: rich, conversational.
- **Cons**: non-deterministic, larger safety surface; conflicts with the chosen bounded-deterministic re-ranking.
- **Rejected**: better as a *future* conversational layer atop A.

---

## 3. YAGNI Review

### ✅ In scope (v10 v1)
**Baseline (always in):**
- `0006_checkins` migration (adherence + goal ratings, idempotent per day)
- Pure `lib/checkin` engine (consistency · outcomes · feedback · insights)
- Daily capture UI + `GET/POST /api/checkins`
- Bounded feedback hook into `generateProtocol`

**Selected additions (all four kept):**
- **Consistency heatmap** — premium calendar viz + consistency metric (the visible gamification)
- **Feeds v9 identity** — consistency → `dataDepth`/archetype
- **Correlational insight cards** — transparent "why the ranking shifted" (upgrades the loop to bounded re-ranking **+** insights)
- **Side-effect / note field** — optional, **display-only** in v1 (engine does not act on it), with disclaimer

### ⏸️ Deferred (Out of Scope → future)
- **Proactive advisor change-proposals** (drop X / try Y via v7 confirm-flow) — v11 conversational layer
- **Side-effect *engine*** (acting on symptom data — safety-heavy)
- **Reminders / push notifications**
- **Wearable / device import**
- **Longitudinal trend charts** beyond the heatmap

### Principle applied
Feedback is a *bounded nudge*, not a new recommender. Insight math reuses the same aggregates as the feedback signal. Side-effects are captured but not acted upon (avoid premature medical-grade logic). No event-sourcing for simple averages.

---

## 4. Architecture Overview

**Approach A (additive)** — table + pure engine + bounded ranking nudge; mirrors v4 lab-timeline.

```
src/
  types/checkin.ts                     # DailyCheckin, GoalRating, CheckinConsistency,
                                       # OutcomeAggregate, FeedbackSignal, CheckinInsight
  lib/checkin/
    consistency.ts                     # pure: checkins[] -> rate + streak + adherence rate
    outcomes.ts                        # pure: checkins[] + stacks -> per (goal×item) taken-vs-not deltas
    feedback.ts                        # pure: aggregates -> bounded, min-sample-gated FeedbackSignal
    insights.ts                        # pure: aggregates -> non-diagnostic CheckinInsight[]
    index.ts
    *.test.ts
  lib/db/checkin-repo.ts               # getCheckin / upsertCheckin / listCheckins (RLS)
  app/api/checkins/route.ts            # GET (history) / POST (upsert today) — auth + RLS
  components/checkin/
    DailyCheckinForm.tsx               # today's items + goal sliders + optional note
    ConsistencyHeatmap.tsx             # calendar heatmap + consistency metric
    InsightCards.tsx                   # correlational insight cards

supabase/migrations/0006_checkins.sql  # checkins table (RLS, unique(user_id,date))

# Additive/bounded engine hooks (backward-compatible optional inputs):
  lib/protocol-builder/index.ts        # GenerateProtocolInput += feedbackSignal? ; bounded secondary key
  app/api/protocol/generate/route.ts   # load checkins -> feedbackSignal server-side
  lib/identity/{context,traits}.ts     # consistency contributes to dataDepth (v9)
```

- **New table** `checkins` (first since v4): `id, user_id, date, adherence(jsonb), goal_ratings(jsonb), note(text?), side_effect(text?/jsonb?), created_at, updated_at`; **RLS on `user_id`**; **UNIQUE `(user_id, date)`**.
- **Engine hooks are optional + bounded**: absent `feedbackSignal` ⇒ byte-for-byte prior `generateProtocol` behavior (regression-tested). Evidence grade dominates; feedback is a capped, min-sample-gated nudge.
- **All copy** through `lib/safety`; outcome/side-effect language is correlational + non-diagnostic (honesty sweep).

---

## 5. Data Flow

1. **Capture** — Stack Lab → Daily Check-in → today's stack items + active goals → check off taken + rate goals (+ optional note) → `POST /api/checkins` (idempotent upsert, RLS).
2. **Loop** — protocol generation server-side loads recent check-ins → `lib/checkin` computes `feedbackSignal` (bounded, gated) → `generateProtocol(input + feedbackSignal)` re-ranks **within evidence bounds** → `InsightCards` explain the shift.
3. **Gamification** — check-ins → `ConsistencyHeatmap` + consistency metric → contributes to v9 identity `dataDepth`.

Determinism: identical check-in history ⇒ identical consistency, aggregates, feedback signal, and ranking.

---

## 6. Session Plan (3 modules)

| Module | Scope | Verification target |
|--------|-------|---------------------|
| **M1 — Schema & engine** | `0006_checkins.sql`, `types/checkin`, `checkin-repo`, pure `lib/checkin` (consistency · outcomes · feedback · insights) + full unit tests (incl. bounded/min-sample + honesty sweep) | tsc clean; unit suite green (+N); pure engine; migration additive |
| **M2 — API & feedback hook** | `GET/POST /api/checkins` (auth+RLS), `generateProtocol` `feedbackSignal` hook + **no-feedback regression test**, `/api/protocol/generate` wiring, v9 identity consistency feed | tsc clean; unit green; `next build` OK; L1 auth-guard live; evidence-dominance regression proven |
| **M3 — UI & surfacing** | `DailyCheckinForm` + `ConsistencyHeatmap` + `InsightCards`; Stack Lab check-in section; side-effect/note field (display-only + disclaimer) | tsc clean; `next build` OK; L2 live; authed L3 gated on `E2E_LIVE` |

---

## 7. Brainstorming Log

| Phase | Decision | Rationale |
|-------|----------|-----------|
| Intent (Q1) | Check-in captures **adherence + goal outcome ratings** | Structured, deterministic-friendly signal to correlate with the stack |
| Intent (Q2) | **Bounded re-ranking** of suggestions | Evidence still dominates; mirrors the existing lab-trend/biomarker nudge; on-brand |
| Intent (Q3) | Gamification = **consistency streak/heatmap that feeds v9 identity** | Premium/non-childish; unifies the two gamification features |
| Approach (Phase 2) | **A — additive engine + table + bounded hook** | Mirrors proven v4 lab-timeline; deterministic; reuses `generateProtocol` + v9 identity |
| YAGNI (Phase 3) | **All four additions kept** (heatmap, identity-feed, insight cards, side-effect/note display-only); proactive proposals / side-effect engine / reminders / wearables / trend charts **deferred** | Full loop without over-building; side-effects captured but not acted on |
| Design (Phase 4) | Architecture + modules/surfaces + data flow **approved as presented** | `0006` table + pure `lib/checkin` + bounded engine hooks; Stack Lab surface; 3-module plan |

---

## 8. Next Steps

```
Plan Plus completed
Document: docs/01-plan/features/daily-checkin.plan.md
Next step: /pdca design daily-checkin
```
