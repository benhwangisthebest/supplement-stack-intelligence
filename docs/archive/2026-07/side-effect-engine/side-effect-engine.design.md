# side-effect-engine Design Document

> **Summary**: A pure, deterministic `lib/side-effects` engine that cross-references a **curated** commonly-reported-effects dataset against **structured user reports** to surface a **correlational, non-diagnostic** side-effect signal across Library, Stack Evaluation, Profile, and the Advisor.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: v11
> **Author**: bkit PDCA (Plan-Plus → Design)
> **Date**: 2026-07-14
> **Status**: Draft
> **Planning Doc**: [side-effect-engine.plan.md](../../01-plan/features/side-effect-engine.plan.md)

---

## Context Anchor

> Synthesized from the Plan Executive Summary + Risk sections (Plan predates Context-Anchor emission; derived here).

| Key | Value |
|-----|-------|
| **WHY** | v10 captures adherence + goal ratings but treats side-effects as an unstructured, display-only note — disconnected from the supplement science already curated. Close the safety loop honestly. |
| **WHO** | Existing end users (health nerds / biohackers / longevity), no new persona. |
| **RISK** | Correlation misread as causation. Mitigated *by construction*: non-diagnostic copy through `lib/safety`, honesty sweep, min-sample gating, and a no-signal regression proof. |
| **SUCCESS** | Pure engine + curated seed + structured capture + 4 surfaces (Library / Evaluation / Profile / Advisor); honesty invariant *proven*; all prior suites green; `next build` OK. |
| **SCOPE** | Additive Option C. In: correlational cross-reference. Out (v12): dechallenge/rechallenge, onset-window timing, protocol-ranking influence, wearable import. |

---

## 1. Overview

### 1.1 Design Goals

- Add a **pure, DB-agnostic** `lib/side-effects` engine that is a structural sibling to `lib/interactions` and `lib/biomarkers`.
- Turn v10's display-only side-effect note into **structured, canonical-vocabulary capture**.
- Surface a **correlational, non-diagnostic** signal in four places with **zero rewrites of existing engines**.
- Prove — not assert — that the signal never asserts causation and never changes existing output ordering.

### 1.2 Design Principles

- **Additive Option C** — new sibling module; existing engine files gain only *optional* inputs (mirrors how `labMarkers`/`trends` were added to `EvalContext`).
- **Findings → `to-flags` → `DraftFlag`** — reuse the exact interactions/biomarkers rendering pipeline; no new evaluation surface.
- **Correlational by construction** — the engine emits *observations*, never causal claims; all copy flows through `lib/safety`.
- **Evidence-subordinate & non-blocking** — side-effect flags are `info`/`warning` only, never `critical`, and never feed protocol ranking in v11.

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | Fold into seed + rules + checkin | Engine + dedicated repo + service + tool module + components | New pure `lib/side-effects` sibling mirroring `interactions`/`biomarkers` |
| **New Files** | ~3 | ~13 | ~9 |
| **Modified Files** | ~6 (couples) | ~5 | ~5–6 (additive) |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Low | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | Medium (coupling) | Low | Low |
| **Recommendation** | Hotfix only | Over-engineered here | **Default choice** |

**Selected**: **Option C — Pragmatic** — **Rationale**: reproduces the proven `lib/interactions` shape (pure `index.ts` engine + `to-flags.ts` → `DraftFlag`), extends `EvalContext` with an optional field + one new rule exactly as `trends`/`labMarkers` were added, adds one additive `0007` table + repo, and reuses the v4 sparkline + v6 tool registry. Seventh consecutive additive Option-C milestone. Option B's extra repo/service/tool-module layering exceeds any prior feature's needs.

### 2.1 Component Diagram

```
                         ┌───────────────────────────────────────┐
                         │  Domain (PURE)  src/lib/side-effects/  │
 curated seed ──────────▶│  index.ts   curatedWatchList()        │
 src/data/               │             correlateReports()        │
 seed-side-effects.ts    │  vocab.ts   normalizeSideEffect()     │
                         │  to-flags.ts → DraftFlag[]            │
                         └───────┬───────────────────┬───────────┘
                                 │                   │
             ┌───────────────────▼──┐         ┌──────▼───────────────┐
             │ stack-evaluator/rules │         │ advisor/tools.ts (+1)│
             │  + ruleSideEffect     │         │  read-only tool      │
             └───────────────────────┘         └──────────────────────┘
                                 ▲
        reports (infra) ─────────┘
 side-effect-repo.ts ◀── 0007_side_effects.sql (side_effect_reports, RLS)
        ▲                                    │
        │ POST /api/checkins (+sideEffects)  ▼
 Check-in capture UI          Library "What to watch" · Profile timeline (SVG)
```

### 2.2 Data Flow

```
Capture:   Check-in → pick canonical effects (+severity) → POST /api/checkins
           → server normalizeSideEffect() + re-validate → upsert side_effect_reports (RLS)

Correlate: evaluation.ts loads stack + reports → evaluateStack(ctx.sideEffectReports)
           → ruleSideEffect: curatedWatchList() ∪ correlateReports(minReports)
           → toSideEffectFlags() → DraftFlag[] (info/warning) → existing flag UI

Library:   curatedWatchList(supplement) → "What to watch" (public, no user data)
Profile:   side_effect_reports over time → SVG timeline (v4 pattern) + "insufficient data"
Advisor:   read-only tool → curated + reported (grounded, correlational) → Citation[]
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/side-effects` | `lib/safety`, `types/side-effect`, `data/seed-side-effects` | Pure correlation + copy |
| `ruleSideEffect` | `lib/side-effects`, `EvalContext` | Compose flags into `evaluateStack` |
| `side-effect-repo` | Supabase client | Persist/read reports (RLS) |
| Advisor tool | `lib/side-effects` | Grounded conversational read |

No new npm dependencies.

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// src/types/side-effect.ts

/** Controlled vocabulary — the join key between reported and curated effects. */
export type CanonicalSideEffect = string; // one of SIDE_EFFECT_VOCAB (branded set)

export type FrequencyTier = "common" | "infrequent" | "rare";

/** Curated: what a supplement is commonly reported to be associated with. */
export interface SideEffectProfileEntry {
  label: CanonicalSideEffect;
  frequencyTier: FrequencyTier;
  paperIds: string[];        // citations (reuse seed-papers)
  watchNote: string;         // curated, non-causal ("commonly reported with …")
}
export interface SideEffectProfile {
  supplementId: string;
  entries: SideEffectProfileEntry[];
}

/** Structured user report (one canonical effect on one date). */
export interface ReportedSideEffect {
  effectLabel: CanonicalSideEffect;
  severity?: 1 | 2 | 3;      // optional, display-only ordinal
  note?: string;             // free text, DISPLAY-ONLY (never parsed for logic)
}

/** Persisted row (Supabase). */
export interface SideEffectReport extends ReportedSideEffect {
  id: string;
  userId: string;
  date: string;              // YYYY-MM-DD
  createdAt: string;
}

/** Correlational engine output — an OBSERVATION, never a causal claim. */
export interface SideEffectFinding {
  supplementId: string;
  label: CanonicalSideEffect;
  frequencyTier: FrequencyTier;
  kind: "curated-watch" | "reported-match";
  reportedDays?: number;     // TRUE co-occurrence |reportDates ∩ takenDates|, ≥ MIN_REPORTS
  takenDays?: number;        // total days logged taken (the copy's denominator), ≥ MIN_TAKEN_DAYS
  paperIds: string[];
}

/** Minimal dated report the engine needs (a persisted row satisfies it). */
export interface DatedSideEffectReport {
  effectLabel: CanonicalSideEffect;
  date: string; // YYYY-MM-DD
}
```

> **Act-1 (G1/G2)**: `reportedDays` is a **true co-occurrence**, computed by
> intersecting report dates with the days the supplement was logged as taken
> (v10 adherence). It is never inferred from stack membership. Dates are therefore
> load-bearing — the original `ReportedSideEffect[]` (undated) could not support a
> truthful co-occurrence claim, which is exactly how gap G1 arose.

### 3.2 Entity Relationships

```
[User] 1 ──── N [SideEffectReport]   (RLS: user_id = auth.uid())
[Supplement] 1 ──── 1 [SideEffectProfile] (curated, static seed)
[SideEffectReport.effectLabel] ──match(canonical)──▶ [SideEffectProfileEntry.label]
```

### 3.3 Database Schema — `supabase/migrations/0007_side_effects.sql` (ADDITIVE)

```sql
-- v11 side-effect-engine. Additive: new table only; 0006 checkins untouched.
create table if not exists side_effect_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  effect_label text not null,                     -- canonical (server-normalized)
  severity     smallint check (severity between 1 and 3),
  note         text,                              -- display-only
  created_at   timestamptz not null default now(),
  unique (user_id, date, effect_label)
);
alter table side_effect_reports enable row level security;

create policy "own_select" on side_effect_reports
  for select using (auth.uid() = user_id);
create policy "own_insert" on side_effect_reports
  for insert with check (auth.uid() = user_id);
create policy "own_update" on side_effect_reports
  for update using (auth.uid() = user_id);
create policy "own_delete" on side_effect_reports
  for delete using (auth.uid() = user_id);

create index if not exists side_effect_reports_user_date
  on side_effect_reports (user_id, date);
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/checkins | Create/upsert daily check-in **+ optional `sideEffects[]`** | Required |
| GET | /api/checkins?days=90 | Existing check-in read (unchanged) | Required |
| GET | /api/side-effects?days=90 | Read the user's side-effect reports (for Profile timeline) | Required |

> No new *write* endpoint: side-effect capture piggybacks the existing check-in POST (same date semantics). One additive **read** endpoint for the timeline.

### 4.2 Detailed Specification

#### `POST /api/checkins` (extended)

**Request (additive field):**
```json
{
  "date": "2026-07-14",
  "takenItemIds": ["item-1"],
  "goalRatings": [{ "goal": "sleep", "rating": 4 }],
  "sideEffects": [
    { "effectLabel": "nausea", "severity": 2, "note": "mild, morning only" }
  ]
}
```
**Server rules (trust boundary):**
- Re-authenticate; `user_id` from session (never client).
- `normalizeSideEffect(effectLabel)` → canonical or **reject** (`400`) if unrecognized (free text never fabricates a correlation).
- `severity` validated `∈ {1,2,3}` via Zod; `note` stored verbatim, never parsed.
- Upsert into `side_effect_reports` on `(user_id, date, effect_label)`.

**Response (201):** `{ "data": { "checkin": {...}, "sideEffects": [...] } }`

**Errors:** `400` VALIDATION_ERROR (bad severity / unrecognized label — `.error.details.fieldErrors`), `401` UNAUTHORIZED.

#### `GET /api/side-effects?days=90`

**Response (200):** `{ "data": { "reports": SideEffectReport[] } }` (RLS-scoped to the user).

> Revised in Act-1 (G4) to match the implementation and the house envelope
> convention — `GET /api/checkins` likewise returns a **named** payload
> (`{ checkins, consistency }`), not a bare array. A named key leaves room to add
> derived fields later without breaking the contract.

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
Library › Supplement page                 Profile › Side-effect timeline
┌────────────────────────────┐            ┌────────────────────────────┐
│ Effects · Evidence · …     │            │ Reported side-effects      │
│ �​ What to watch            │            │  ▁▂▅▂▁  nausea (SVG)       │
│   • nausea   [common]  📎   │            │  ── insufficient data ──   │
│   • headache [infrequent]📎 │            │  (honest empty state)      │
│   disclaimer (sideEffect)  │            └────────────────────────────┘
└────────────────────────────┘
Stack Lab › Evaluation           Stack Lab › Daily Check-in
  side-effect-caution flag         [+] Log a side-effect (canonical picker + 1–3 severity)
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `WhatToWatch` | `src/components/library/` | Curated commonly-reported effects + tier chips + citation links (public) |
| `SideEffectCapture` | `src/components/checkin/` | Canonical-vocab multi-select + optional severity, inside the check-in form |
| `SideEffectTimeline` | `src/components/profile/` | SVG sparkline over reports (reuses v4 lab-timeline pattern) + insufficient-data state |
| *(reused)* flag card | `src/components/stack/` | Renders `side-effect-caution` `DraftFlag`s — **no new component** |

### 5.4 Page UI Checklist

#### Library — Supplement page (`/library/[slug]`)
- [ ] Section: **"What to watch"** heading (only if the supplement has a curated profile)
- [ ] List row: effect label + frequency-tier badge (`common` / `infrequent` / `rare`)
- [ ] Row copy: the curated `watchNote` (non-causal, "commonly reported with…")
- [ ] Disclaimer: `DISCLAIMERS.sideEffect` rendered under the section
- [ ] Empty state: section hidden when no curated profile (no hollow section)

> **Citations (revised, Act-1/G3)**: this checklist originally required a citation
> chip per entry (`#paper-{id}`). `seed-papers` contains **no side-effect papers**,
> so every chip would have had to cite a paper that does not support the claim —
> fabricated provenance, which this feature exists to prevent. The `paperIds` field
> is retained (all `[]`) as the extension point; entries are **curated-dataset
> backed** and say so via `DISCLAIMERS.sideEffect`. **Deferred to v12**: seed real
> side-effect literature, then render chips through v8 `citationHref`.

#### Stack Lab — Daily Check-in (`/stack-lab`)
- [ ] Control: "Log a side-effect" canonical-vocab combobox (autocomplete over `SIDE_EFFECT_VOCAB`)
- [ ] Control: severity selector (1–3, optional)
- [ ] Input: optional free-text note (display-only)
- [ ] Rejects free text not resolving to a canonical label (inline validation)

#### Stack Lab — Evaluation (`/stack-lab/[stackId]`)
- [ ] Flag: `side-effect-caution` category renders in existing flag list
- [ ] Copy: "commonly reported with" / "you reported X on N days you logged taking Y" — never causal
- [ ] Severity: `info` (curated-watch) or `warning` (reported-match); **never `critical`**

#### Profile — Side-effect timeline (`/profile`)
- [ ] Chart: per-effect SVG sparkline over the reporting window
- [ ] State: honest "insufficient data" when below `MIN_REPORTS`
- [ ] Copy: correlational, non-diagnostic

### 5.2 User Flow

```
Check-in → log canonical side-effect (+severity) → saved (RLS)
   → Stack Evaluation shows correlational caution (min-sample gated)
   → Profile shows trajectory; Library shows "what to watch"; Advisor can discuss
```

---

## 6. Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | VALIDATION_ERROR | Bad severity / unrecognized effect label | `fieldErrors` returned; UI shows inline error, keeps combobox open |
| 401 | UNAUTHORIZED | No session | Redirect to login |
| 500 | Internal error | Repo/DB failure | Log; non-blocking — surfaces omit the side-effect section rather than break the page |

Absence of a finding is **never** rendered as "safe" (mirrors the interactions disclaimer).

---

## 7. Security Considerations

- [x] **RLS** on `side_effect_reports` (user-scoped select/insert/update/delete).
- [x] **Server-authoritative** `user_id` + canonical normalization; client labels never trusted (platform invariant).
- [x] Zod validation of `severity`/`date`/`effectLabel`; `note` stored but never parsed into logic.
- [x] Advisor tool is **read-only**; no write path introduced.
- [x] No PII in URLs; `days` is the only query param.

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L0 unit | engine (correlate, curatedWatchList, vocab), to-flags, honesty, no-signal regression | Vitest | Do |
| L1 API | `POST /api/checkins` (+sideEffects), `GET /api/side-effects` | Playwright request | Do |
| L2 UI | What-to-watch, capture combobox, eval flag, timeline | Playwright | Do |
| L3 E2E | report → evaluate → see correlation → profile timeline | Playwright (`E2E_LIVE`) | Do |

### 8.2 L1 Scenarios

| # | Endpoint | Method | Test | Expected | Response |
|---|----------|--------|------|:--------:|----------|
| 1 | /api/checkins | POST | Valid check-in + sideEffects | 201 | `.data.sideEffects[0].effectLabel` canonical |
| 2 | /api/checkins | POST | Unrecognized effect label | 400 | `.error.code=VALIDATION_ERROR` |
| 3 | /api/checkins | POST | severity = 9 | 400 | `fieldErrors.severity` |
| 4 | /api/side-effects | GET | Unauthenticated | 401 | `.error.code=UNAUTHORIZED` |
| 5 | /api/side-effects | GET | Authed read | 200 | `.data` is array, RLS-scoped |

### 8.3 L0 Key Unit Assertions (load-bearing)

- **Copy↔computation binding (Act-1/G1, MANDATORY)**: every number a copy builder
  renders must be a fact the engine computed. Assert the correlation copy cites
  `reportedDays` of `takenDays` verbatim, never the raw report count; assert no flag
  is emitted when co-occurrence is zero; assert curated-watch copy makes no claim
  about the user's own logs. **Rationale**: the honesty sweep checks *phrases* and
  cannot detect a fluent, hedged sentence that is simply **untrue** — that is how G1
  shipped through a fully green suite.
- **Honesty sweep**: every string from `toSideEffectFlags` + `WhatToWatch` copy + advisor tool passes `!containsBannedLanguage(...)` and contains no causal token (`causes`, `caused by`, `side effect of`, `because you took`).
- **No-signal regression**: `evaluateStack(input)` output is **byte-identical** with `sideEffectReports` omitted vs `[]`; a maximal side-effect signal **never** changes flag ordering severity classes of *other* rules, and **never** emits `critical`.
- **Protocol untouched**: `generateProtocol` output byte-identical regardless of side-effect data (v11 does not feed protocol ranking).
- **Min-sample gate**: `correlateReports` emits no `reported-match` below `MIN_REPORTS`; curated-watch requires stack membership only.
- **Vocab totality**: `normalizeSideEffect` returns canonical-or-null and never throws; unknown → null (→ 400 upstream).

### 8.5 Seed Data

| Entity | Minimum | Key fields |
|--------|:------:|-----------|
| `SideEffectProfile` | ≥ 8 supplements | `entries[]` with `label` ∈ vocab, `frequencyTier`, `paperIds` |
| `SIDE_EFFECT_VOCAB` | ≥ 15 canonical labels | resolves common aliases (e.g. "stomach ache" → "nausea") |

---

## 9. Clean Architecture

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `SideEffectProfile`, `ReportedSideEffect`, `SideEffectFinding` | Domain | `src/types/side-effect.ts` |
| `curatedWatchList`, `correlateReports`, `normalizeSideEffect`, `toSideEffectFlags` | Domain | `src/lib/side-effects/*` |
| `seed-side-effects` | Domain (data) | `src/data/seed-side-effects.ts` |
| `ruleSideEffect` | Domain | `src/lib/stack-evaluator/rules.ts` (additive) |
| side-effect advisor tool | Domain | `src/lib/advisor/tools.ts` (additive, +1 tool) |
| `side-effect-repo` | Infrastructure | `src/lib/db/side-effect-repo.ts` |
| `/api/checkins` (extended), `/api/side-effects` | Application | `src/app/api/...` |
| `WhatToWatch`, `SideEffectCapture`, `SideEffectTimeline` | Presentation | `src/components/...` |

Dependency rule preserved: Domain imports nothing outward; the engine is unit-testable without a DB.

---

## 10. Coding Convention Reference

Follows existing conventions (PascalCase components, camelCase functions, `UPPER_SNAKE` constants, kebab-case folders). New copy builders live **only** in `lib/safety` (`safetyCopy.sideEffectWatch`, `safetyCopy.sideEffectCorrelation`, `DISCLAIMERS.sideEffect`). `BANNED_PHRASES` gains causal clauses (`"is caused by"`, `"causes your"`, `"side effect of"`) — phrased as clauses to avoid false-positives on hedged copy; guarded by the honesty sweep.

Design-reference comments during Do:
- `// Design Ref: §2.1 — pure sibling engine`
- `// Plan SC7: correlational, non-diagnostic — proven by honesty + no-signal regression`

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── types/side-effect.ts                      (new)
├── data/seed-side-effects.ts                 (new)
├── lib/side-effects/
│   ├── index.ts        curatedWatchList, correlateReports, MIN_REPORTS   (new)
│   ├── vocab.ts        SIDE_EFFECT_VOCAB, normalizeSideEffect            (new)
│   ├── to-flags.ts     toSideEffectFlags → DraftFlag[]                   (new)
│   └── side-effects.test.ts                                             (new)
├── lib/db/side-effect-repo.ts                (new)
├── lib/safety/index.ts                       (modify: +copy, +disclaimer, +banned)
├── lib/stack-evaluator/rules.ts              (modify: +ruleSideEffect, +ctx field)
├── lib/advisor/tools.ts                      (modify: +1 read-only tool)
├── services/evaluation.ts                    (modify: load + pass reports)
├── app/api/checkins/route.ts                 (modify: accept sideEffects[])
├── app/api/side-effects/route.ts             (new: GET reports)
├── components/library/WhatToWatch.tsx        (new)
├── components/checkin/SideEffectCapture.tsx  (new)
├── components/profile/SideEffectTimeline.tsx (new)
└── supabase/migrations/0007_side_effects.sql (new)
```

### 11.2 Implementation Order

1. [ ] Types + vocab + curated seed (Domain foundation)
2. [ ] Engine (`curatedWatchList`, `correlateReports`) + safety copy + unit tests (incl. honesty + no-signal regression)
3. [ ] `to-flags` + `ruleSideEffect` wired into `EvalContext`/`ALL_RULES`
4. [ ] Migration + repo + `/api/checkins` extension + `/api/side-effects` (L1 tests)
5. [ ] UI surfaces: WhatToWatch, SideEffectCapture, SideEffectTimeline (L2/L3)
6. [ ] Advisor read-only tool + honesty cases

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Est. Turns |
|--------|-----------|-------------|:---------:|
| Engine + seed + vocab + safety copy + unit tests | `module-1` | Pure Domain core + honesty/no-signal proofs | 40–50 |
| Migration + repo + API + capture wiring | `module-2` | Infra + Application (0007, repo, `/api/checkins`, `/api/side-effects`) | 35–45 |
| Surfaces + advisor tool | `module-3` | Library / Profile / Evaluation UI + read-only advisor tool | 35–45 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| 1 | Plan + Design | full | ✅ done |
| 2 | Do | `--scope module-1` | 40–50 |
| 3 | Do | `--scope module-2` | 35–45 |
| 4 | Do | `--scope module-3` | 35–45 |
| 5 | Check + QA + Report | full | 30–40 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-07-14 | Initial draft — Option C selected (Checkpoint 3) | bkit PDCA |
