# daily-checkin Design Document

> **Summary**: A gamified daily check-in (adherence + goal ratings) whose pure `lib/checkin` engine produces a consistency metric, correlational outcome aggregates, and a **bounded, evidence-subordinate** feedback signal that nudges `generateProtocol` — plus a heatmap, insight cards, and a v9-identity feed.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0
> **Author**: bkit PDCA (plan-plus)
> **Date**: 2026-07-02
> **Status**: Draft
> **Planning Doc**: [daily-checkin.plan.md](../../01-plan/features/daily-checkin.plan.md)
> **Milestone**: v10

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | The platform is open-loop: it recommends but never learns from lived experience, nor tracks whether the user takes their stack. v9 gave a mirror; v10 gives a feedback loop — closing the "does my stack make sense → is it working for me?" arc. |
| **WHO** | Evidence-literate biohackers / longevity / athletes who run n-of-1 self-experiments and want adherence + outcome logging that sharpens recommendations. |
| **RISK** | Causal over-attribution (placebo/confounders/regression to mean); directive/diagnostic language; noisy feedback overriding evidence on thin data; childish gamification; side-effect field drifting into medical territory. |
| **SUCCESS** | Idempotent daily check-in (adherence + goal ratings) with RLS; pure deterministic `lib/checkin` (consistency + correlational aggregates + **bounded, min-sample-gated** feedback); `generateProtocol` re-ranks **within evidence bounds** (proven by a no-feedback regression test); premium heatmap; correlational non-diagnostic insight cards; consistency feeds v9 identity; honesty sweep; auth + RLS. |
| **SCOPE** | `0006_checkins` · `types/checkin` · `lib/checkin` (consistency · outcomes · feedback · insights) · `checkin-repo` · `GET/POST /api/checkins` · **bounded feedback key below grade** in `generateProtocol` + route wiring · v9 identity consistency feed · `DailyCheckinForm` + `ConsistencyHeatmap` + `InsightCards` · Stack Lab surface · side-effect/note (display-only) · unit + L1 + L2/L3. **No** proactive proposals, side-effect engine, reminders, wearables, or longitudinal charts beyond the heatmap. |

---

## 1. Overview

### 1.1 Design Goals
- Persist an **idempotent** daily check-in (one row per user per day) with RLS.
- Turn check-in history into a **deterministic** consistency metric, **correlational** outcome aggregates, and a **bounded** feedback signal — pure, unit-testable, no I/O.
- Feed that signal into `generateProtocol` as an **evidence-subordinate** ranking key (Option C — cannot override grade), preserving all shipped v3/v4/v5 ranking behavior.
- Keep gamification **premium** (heatmap + consistency, no points/badges) and feed the v9 identity layer.
- Hold the trust line: every outcome/side-effect statement is **correlational and non-diagnostic**.

### 1.2 Design Principles
- **Pure Domain**: `lib/checkin` is I/O-free (same discipline as `lib/checkin` siblings `evidence`, `biomarkers`, `lab-trends`, `identity`).
- **Evidence-subordinate feedback**: a new ranking key strictly *below* grade — bounded and min-sample-gated (mirrors the v4 `trendAdjustment` magnitude class).
- **Additive & backward-compatible**: absent feedback ⇒ byte-for-byte prior `generateProtocol` output (regression-tested).
- **Correlational honesty**: no causal/efficacy claims; all copy through `lib/safety`.

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Feedback → ranking** | Fold into existing `labSignal` channel | Refactor `compareSuggestions` grade-primary | **New bounded key strictly below grade** |
| **New Files** | ~9 | ~11 | ~10 |
| **Modified Files** | 3 | 4 | 4 |
| **SC5 evidence-dominant** | ❌ feedback can outrank grade | ✅ (but reorders v3/v4) | ✅ feedback can't override grade |
| **Regression risk (v3/v4/v5)** | Medium | High | **Low** |
| **Complexity** | Low | High | Medium |
| **Recommendation** | — | — | **Default** |

**Selected**: **Option C** — **Rationale**: `compareSuggestions` currently sorts `labSignal → grade → composite → name` (lab signal is *primary*, a deliberate v3/v4 choice). Inserting feedback as a **new key between `grade` and `composite`** makes it *evidence-subordinate by construction* (satisfies SC5 — feedback can only break ties within an equal grade), leaves the existing `labSignal` and `grade` positions **untouched** (v3/v4/v5 ranking unchanged → regression-safe), and makes the no-feedback regression test trivially hold (feedback = 0 ⇒ identical order). Additive.

### 2.1 Component Diagram

```
┌──────────────────────────┐     ┌───────────────────────────┐     ┌──────────────────────────┐
│  Presentation             │     │  Application / Infra       │     │  Domain (PURE)            │
│  Stack Lab › Check-in      │     │                            │     │                          │
│   DailyCheckinForm ────────┼────▶│  POST /api/checkins ───────┼────▶│  checkin-repo (RLS)       │
│   ConsistencyHeatmap ◀─────┼─────┤  GET  /api/checkins        │     │                          │
│   InsightCards ◀───────────┤     │                            │     │  lib/checkin              │
│  Stack Lab › Protocol      │     │  POST /api/protocol/generate│───▶│   consistency / outcomes │
│   (re-ranked suggestions)◀─┼─────┤   loads checkins →feedback  │     │   feedback / insights    │
│  Profile › Identity Card   │◀────┤   generateProtocol(+fb)     │────▶│  generateProtocol (+key) │
└──────────────────────────┘     └───────────────────────────┘     │  lib/identity (dataDepth)│
                                    reuses: profile/stack/lab repos  └──────────────────────────┘
```

### 2.2 Data Flow

```
Capture: DailyCheckinForm → POST /api/checkins (upsert one row per user per day, RLS)
Loop:    POST /api/protocol/generate
           → listCheckins(window) → deriveFeedback(checkins) [pure, bounded, gated]
           → generateProtocol({profile, labs, trends, stackItems, feedbackSignal})
           → suggestions re-ranked (labSignal → grade → FEEDBACK → composite) → InsightCards explain
Gamify:  listCheckins → consistency(checkins) → ConsistencyHeatmap + metric → v9 identity dataDepth
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/checkin/outcomes` | check-in rows only | Per (supplement × goal) taken-vs-not rating deltas (pure) |
| `lib/checkin/feedback` | `outcomes` | Bounded, min-sample-gated `FeedbackSignal[]` |
| `generateProtocol` | `FeedbackSignal[]` (optional) | New evidence-subordinate ranking key |
| `/api/protocol/generate` | `checkin-repo` + `lib/checkin` | Loads history → feedback server-side |
| `lib/identity/context` | `checkin-repo` (count/rate) | Consistency contributes to `dataDepth` |
| all copy | `lib/safety` | Non-diagnostic, correlational language |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// src/types/checkin.ts
import type { OutcomeCategory } from "./index";

/** One day's check-in. Idempotent per (userId, date). */
export interface DailyCheckin {
  id: string;
  userId: string;
  date: string;                             // YYYY-MM-DD (local calendar day)
  ratings: Partial<Record<OutcomeCategory, 1 | 2 | 3 | 4 | 5>>; // per active goal
  taken: string[];                          // supplementIds taken that day
  scheduled: string[];                      // supplementIds in the active stack that day (adherence denom)
  note: string | null;                      // optional free-text (display-only)
  sideEffect: string | null;                // optional side-effect flag (display-only)
  createdAt: string;
  updatedAt: string;
}

export interface CheckinConsistency {
  windowDays: number;
  checkinRate: number;   // [0,1] days checked-in / window
  currentStreak: number; // consecutive days up to today
  adherenceRate: number; // [0,1] taken / scheduled across the window
}

/** Correlational aggregate for one (supplement × goal). */
export interface OutcomeAggregate {
  supplementId: string;
  outcome: OutcomeCategory;
  takenAvg: number | null;    // mean goal rating on days item was taken
  notTakenAvg: number | null; // mean goal rating on days item was NOT taken
  delta: number | null;       // takenAvg − notTakenAvg (null if insufficient)
  takenDays: number;
  notTakenDays: number;
}

/** Bounded, evidence-subordinate ranking nudge. */
export interface FeedbackSignal {
  supplementId: string;
  outcome: OutcomeCategory;
  delta: number;   // clamped to [-FEEDBACK_CAP, +FEEDBACK_CAP]
  sampleDays: number;
}

/** Non-diagnostic, correlational insight card. */
export interface CheckinInsight {
  supplementId: string;
  outcome: OutcomeCategory;
  text: string;         // "You rated sleep 4.2 on days you took magnesium vs 3.1 otherwise."
  qualifier: string;    // "Correlational, based on N days — not a measure of effectiveness."
}
```

### 3.3 Database Schema — `supabase/migrations/0006_checkins.sql` (ADDITIVE)

```sql
-- Migration 0006 — daily-checkin (v10). ADDITIVE ONLY. New table; no existing
-- table/engine altered. RLS scopes every row to its owner (mirrors 0003/0004).
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  ratings jsonb not null default '{}'::jsonb,   -- { outcomeCategory: 1..5 }
  taken jsonb not null default '[]'::jsonb,      -- supplementId[]
  scheduled jsonb not null default '[]'::jsonb,  -- supplementId[]
  note text,
  side_effect text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date)                 -- idempotent daily upsert
);

create index if not exists idx_checkins_user_date
  on public.checkins(user_id, checkin_date desc);

alter table public.checkins enable row level security;

create policy "own_checkins" on public.checkins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/checkins?days=N` | List recent check-ins (default window, e.g. 90d) | Required |
| POST | `/api/checkins` | Upsert today's check-in (idempotent) | Required |
| POST | `/api/protocol/generate` | **(extended)** now loads check-ins → feedback signal | Required |

### 4.2 Detailed Specification

#### `POST /api/checkins`
**Request** (Zod-validated):
```json
{
  "date": "2026-07-02",
  "ratings": { "sleep": 4, "focus": 3 },
  "taken": ["magnesium", "l-theanine"],
  "scheduled": ["magnesium", "l-theanine", "creatine"],
  "note": null,
  "sideEffect": null
}
```
**Response (200):** `{ "data": { "checkin": DailyCheckin }, "error": null }` (upsert on `(user_id, date)`).
**Errors:** `401 UNAUTHORIZED`; `400 VALIDATION_ERROR` (bad rating range / date); `500 INTERNAL_ERROR`.

#### `GET /api/checkins?days=90`
**Response (200):** `{ "data": { "checkins": DailyCheckin[], "consistency": CheckinConsistency }, "error": null }`.

---

## 5. UI/UX Design

### 5.1 Screen Layout (Stack Lab › Daily Check-in)

```
┌───────────────────────────────────────────────┐
│  Daily Check-in — Wed Jul 2                     │
│  Did you take these today?                      │
│   ☑ Magnesium   ☑ L-theanine   ☐ Creatine       │
│  How are your goals?                            │
│   Sleep  ○○○●○ (4)   Focus ○○●○○ (3)             │
│   Note (optional) [___________]  ⚠ not medical  │
│                                   [ Save today ] │
├───────────────────────────────────────────────┤
│  Consistency                                    │
│   ▨▨▨□▨▨▨ ▨□▨▨▨▨▨ …  (heatmap)  · 82% · 6-day    │
├───────────────────────────────────────────────┤
│  What you've noticed  (correlational)           │
│   • Sleep 4.2 on magnesium days vs 3.1 — N=14   │
└───────────────────────────────────────────────┘
```

### 5.4 Page UI Checklist

#### Stack Lab — Daily Check-in section (`/stack-lab`)
- [ ] Form: **today's stack items** as adherence checkboxes (from the active stack; supplementId + name)
- [ ] Form: **goal rating** control (1–5) for each active profile goal
- [ ] Form: optional **note** + **side-effect** text field, each with a **non-medical disclaimer**
- [ ] Button: **Save today** → POST /api/checkins (idempotent; re-save updates)
- [ ] Viz: **ConsistencyHeatmap** (calendar; intensity = checked-in / adherence) + **consistency %** + **streak**
- [ ] Cards: **InsightCards** — correlational deltas with an explicit "correlational, N days" qualifier (none shown when insufficient data)

#### Stack Lab — Protocol suggestions (existing panel)
- [ ] Suggestions reflect the feedback nudge; a suggestion nudged by feedback shows a subtle "based on your check-ins" note (evidence grade still dominates ordering)

### 5.2 User Flow
```
Stack Lab → check off taken items + rate goals → Save → heatmap updates → (over time) protocol re-ranks + insights appear
```

---

## 6. Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 401 | Unauthorized | No session | Redirect / signed-out state |
| 400 | Validation error | rating out of 1–5, bad date, unknown outcome | `fieldErrors` returned; form highlights |
| 500 | Internal error | repo failure | Logged; graceful fallback |
| — | Insufficient data (not an error) | < min sample for a (supplement,goal) | Feedback suppressed; no insight card; recommendations unchanged |

---

## 7. Security Considerations

- [x] **Auth**: both `/api/checkins` methods require a session (401 otherwise).
- [x] **RLS**: `own_checkins` policy scopes every row to `auth.uid()`; the protocol route reads check-ins via the same RLS repo.
- [x] **Validation**: Zod bounds ratings to 1–5, validates the date, and the outcome keys; `taken`/`scheduled` are supplementId string arrays.
- [x] **Non-diagnostic**: outcome/insight/side-effect copy passes a banned-language sweep; side-effect field is **display-only** (no engine consumes it in v1).
- [x] **No client-trusted ranking**: feedback is recomputed server-side from owned check-ins; the client cannot inject a feedback signal.

---

## 8. Test Plan (v2.3.0)

### 8.1 Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L0 Unit | `lib/checkin` (consistency/outcomes/feedback/insights) + **generateProtocol no-feedback regression** + honesty sweep | Vitest | Do |
| L1 API | `/api/checkins` GET/POST auth + validation | Playwright request | Do |
| L2 UI | Stack Lab check-in form + heatmap render | Playwright | Do |
| L3 E2E | Authed check-in → persisted → heatmap/insight (E2E_LIVE) | Playwright | Do |

### 8.2 L1 Scenarios

| # | Endpoint | Test | Expected |
|---|----------|------|----------|
| 1 | POST /api/checkins | anonymous | 401 `UNAUTHORIZED` |
| 2 | GET /api/checkins | anonymous | 401 `UNAUTHORIZED` |
| 3 | POST /api/checkins | rating = 9 (out of range) | 400 `VALIDATION_ERROR` (fieldErrors) |
| 4 | POST /api/checkins | authed valid (E2E_LIVE) | 200, `checkin.date` echoed, idempotent on re-POST |

### 8.3 L0 key unit assertions

| Suite | Assertion |
|-------|-----------|
| `consistency.test` | checkinRate/streak/adherenceRate correct on a fixture window; empty ⇒ zeros |
| `outcomes.test` | takenAvg/notTakenAvg/delta correct; null when a side is empty |
| `feedback.test` | delta **clamped** to ±FEEDBACK_CAP; **suppressed** below MIN sample; deterministic |
| `protocol regression` | `generateProtocol(input)` === `generateProtocol({...input, feedbackSignal: []})` (order + content identical); a positive feedback never lifts a lower grade above a higher grade |
| `honesty.test` | 0 banned phrases across insight/consistency/side-effect copy |

### 8.5 Seed Data
| Entity | Min | Fields |
|--------|:---:|--------|
| checkins (authed test) | ~14 days | ratings + taken/scheduled spanning ≥1 supplement taken/not-taken |

---

## 9. Clean Architecture

### 9.4 Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `types/checkin.ts` | Domain | `src/types/checkin.ts` |
| `lib/checkin/*` | Domain (pure) | `src/lib/checkin/` |
| `checkin-repo.ts` | Infrastructure | `src/lib/db/checkin-repo.ts` |
| `/api/checkins`, protocol route | Application | `src/app/api/**` |
| `DailyCheckinForm`, `ConsistencyHeatmap`, `InsightCards` | Presentation | `src/components/checkin/` |

Dependency check: `lib/checkin` imports only types + `lib/safety` (pure). `generateProtocol` gains an optional pure input (no new I/O). ✅

---

## 10. Coding Convention Reference

| Item | Convention |
|------|-----------|
| Constants | `FEEDBACK_CAP`, `MIN_TAKEN_DAYS`, `MIN_NOTTAKEN_DAYS`, `CONSISTENCY_WINDOW` (UPPER_SNAKE) |
| Components | PascalCase; pure modules camelCase |
| Copy | via `lib/safety` (add `checkin*` builders) |
| Design refs | `// Design Ref: §{n}` + `// Plan SC: {n}` |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── types/checkin.ts                          (NEW)
├── lib/checkin/
│   ├── consistency.ts  outcomes.ts  feedback.ts  insights.ts  index.ts   (NEW)
│   └── *.test.ts                              (NEW)
├── lib/db/checkin-repo.ts                     (NEW)
├── app/api/checkins/route.ts                  (NEW)
├── components/checkin/
│   ├── DailyCheckinForm.tsx  ConsistencyHeatmap.tsx  InsightCards.tsx     (NEW)
├── (modified)
│   ├── supabase/migrations/0006_checkins.sql                    (NEW migration)
│   ├── lib/protocol-builder/rules.ts     (feedback key in compareSuggestions)  (MOD)
│   ├── lib/protocol-builder/index.ts     (feedbackSignal input + attach)       (MOD)
│   ├── app/api/protocol/generate/route.ts (load checkins → feedback)           (MOD)
│   ├── lib/identity/context.ts + traits.ts (consistency → dataDepth)           (MOD)
│   └── app/stack-lab/page.tsx            (Daily Check-in section)               (MOD)
├── types/protocol.ts                     (ProtocolSuggestion += feedback?)      (MOD)
├── lib/safety/index.ts                   (checkin copy builders)                (MOD)
└── tests/e2e/daily-checkin.spec.ts                                 (NEW)
```

### 11.2 Implementation Order
1. Migration + `types/checkin` + `checkin-repo`
2. Pure `lib/checkin` (consistency → outcomes → feedback → insights) + unit tests
3. `generateProtocol` feedback key (Option C) + **no-feedback regression test** + protocol-route wiring
4. `/api/checkins` + v9 identity feed + L1
5. UI (form + heatmap + insights) + Stack Lab surface + L2/L3

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Turns |
|--------|-----------|-------------|:-----:|
| Schema & engine | `module-1` | `0006` migration, `types/checkin`, `checkin-repo`, pure `lib/checkin` (+safety copy) + unit tests | 40–50 |
| Feedback hook & API | `module-2` | `generateProtocol` feedback key (Option C) + no-feedback regression, protocol-route wiring, `GET/POST /api/checkins`, v9 identity feed, L1 | 40–50 |
| UI & surfacing | `module-3` | `DailyCheckinForm` + `ConsistencyHeatmap` + `InsightCards`, Stack Lab section, side-effect/note (display-only), L2/L3 | 40–50 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| 1 | Plan + Design | 전체 | 30–35 |
| 2 | Do | `--scope module-1` | 40–50 |
| 3 | Do | `--scope module-2` | 40–50 |
| 4 | Do | `--scope module-3` | 40–50 |
| 5 | Check + QA + Report | 전체 | 30–40 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-07-02 | Initial draft — Option C (feedback as an evidence-subordinate ranking key below grade) selected via Checkpoint 3 | bkit PDCA |
