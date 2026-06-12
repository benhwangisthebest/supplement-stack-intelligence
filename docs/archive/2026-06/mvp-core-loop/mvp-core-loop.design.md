---
template: design
version: 1.3
feature: mvp-core-loop
date: 2026-06-11
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0 (pre-init)
---

# MVP Core Loop Design Document

> **Summary**: Technical design for the seed-first, three-pillar MVP that lets a user search the Library, build a profile-aware stack, and receive an evidence-aware evaluation — built on Option C (Pragmatic) architecture with a pure-function `lib/` engine.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 (pre-init)
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-11
> **Status**: Draft
> **Planning Doc**: [mvp-core-loop.plan.md](../../01-plan/features/mvp-core-loop.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A (defined inline §3) |
| Phase 2 | Coding Conventions | N/A (defined inline §10) |
| Phase 3 | Mockup | ❌ (deferred; build directly with shadcn/ui) |
| Phase 4 | API Spec | ✅ (defined inline §4) |

---

## Context Anchor

> Synthesized from the Plan (plan-plus did not carry an explicit anchor). Ensures strategic context survives Design→Do.

| Key | Value |
|-----|-------|
| **WHY** | Health-conscious users can't tell if their supplement stack actually makes sense; evidence is fragmented and tools ignore personal context. |
| **WHO** | Health nerds, biohackers, athletes, longevity-focused users who want depth + control, not a quiz. |
| **RISK** | Seed-data quality is the trust layer; trivial/wrong evaluation flags; accidental diagnostic language; scope creep (all 8 optional items kept). |
| **SUCCESS** | A demoable end-to-end loop: search → build stack → evaluate → compare, with non-trivial flags a biohacker respects. |
| **SCOPE** | Library (seed) + Profile + Stack Lab + evaluation engine + safety layer. Protocol Builder & Product Match OUT. |

---

## 1. Overview

### 1.1 Design Goals

- Deliver the North Star loop (search → stack → evaluate → compare) end-to-end on seeded data.
- Keep **all advisory logic in pure functions** (`lib/evidence`, `lib/stack-evaluator`, `lib/safety`) so it is unit-testable without a DB (Plan NFR, ≥80% coverage on the evaluator).
- Make **evidence effect-level**, not supplement-level, with explicit uncertainty.
- Centralize all user-facing advisory phrasing in `lib/safety` to prevent diagnostic language.
- Keep Supabase a thin infrastructure layer behind typed repositories.

### 1.2 Design Principles

- **Pure core, thin shell**: domain logic depends on nothing external; UI and DB depend inward.
- **Evaluate, don't block**: the engine emits graded flags; it never prevents a user action (except rendering strong safety warnings).
- **Explainability**: every flag carries `title + explanation + recommendation + evidenceLevel`.
- **Seed-as-code**: Library data is typed TS, validated by Zod at module load in dev.
- **Progressive disclosure**: summary → details → mechanism → evidence → papers.

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | Logic in route files | Strict 4-layer + DI | Feature folders + pure `lib/` engine + thin data layer |
| **New Files** | ~25 | ~70 | ~45 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | Couples logic to UI (NFR violation) | Over-engineered for MVP | Low |
| **Recommendation** | Hotfixes | Long-term enterprise | **Default choice** |

**Selected**: Option C — **Rationale**: Satisfies the Plan's hard NFR (logic isolated + testable without DB) while avoiding the over-engineering that would slow the "working demo" success metric. Matches Plan §8.3.

### 2.1 Component Diagram

```
┌──────────────────────────────┐     ┌───────────────────────────┐     ┌──────────────┐
│  Presentation (Next.js App)  │────▶│  Application (services +   │────▶│ Supabase     │
│  app/library, profile,       │     │  route handlers)          │     │ (Postgres +  │
│  stack-lab + components/     │◀────│  loads seed + repos,      │◀────│  Auth)       │
└──────────────────────────────┘     │  calls pure lib/ engine   │     └──────────────┘
            │                         └───────────┬───────────────┘
            │                                     │ (pure, no I/O)
            ▼                                     ▼
   data/seed-*.ts (TS) ───────────────▶  lib/evidence · lib/stack-evaluator · lib/safety
```

### 2.2 Data Flow (North Star loop)

```
Seed Library (read) ─┐
                     ├─→ Stack Lab builds Stack (Supabase) ─→ POST /api/stacks/:id/evaluate
Profile (Supabase) ──┘                                              │
                                                                    ▼
                            evaluateStack(stack, profile, library)  ← pure
                                                                    │
                                          EvaluationFlag[] (persisted) ─→ Report UI
                                                                       └→ Compare Mode (vs goals)
            lib/safety wraps every advisory string
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `app/stack-lab` | `services/stack`, `services/evaluation` | Build stacks, trigger evaluation |
| `services/evaluation` | `lib/stack-evaluator`, repos, `data/seed-*` | Orchestrate: load → evaluate → persist flags |
| `lib/stack-evaluator` | `lib/evidence`, `types/*` | Pure rule engine (no I/O) |
| `lib/evidence` | `data/seed-*`, `types/*` | Supplement→effect lookups, grade resolution |
| repos (`lib/db/*`) | `@supabase/supabase-js` | Typed CRUD for Profile/Stack/Flags |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// ===== SEED (TypeScript modules, read-only) =====

type EvidenceGrade = 'A' | 'B' | 'C' | 'D';          // A=strong human … D=preliminary/mechanistic
type OutcomeCategory =
  | 'sleep' | 'focus' | 'training' | 'recovery' | 'stress'
  | 'gut' | 'metabolic' | 'longevity' | 'foundational' | 'mood' | 'deficiency';
type SupplementForm = 'capsule' | 'powder' | 'gummy' | 'liquid' | 'tablet' | 'softgel';

interface Supplement {
  id: string; slug: string; name: string; aliases: string[];
  category: string; description: string;          // plain-English overview
  commonForms: SupplementForm[];
  mechanismSummary: string;
  sideEffects: string[]; contraindications: string[];
  allergenTags: string[];                          // e.g. ['fish','shellfish','soy']
  generalDose: { min: number; max: number; unit: string };
  relatedSupplementIds: string[];
  tags: string[];
}

interface Effect {
  id: string; supplementId: string;
  name: string;                                    // e.g. "Strength & power output"
  outcomeCategory: OutcomeCategory;
  grade: EvidenceGrade;                            // EFFECT-LEVEL grade (core to trust layer)
  confidence: 'high' | 'moderate' | 'low';
  summary: string;
  relevantPopulation: string;                      // e.g. "trained adults"
  studiedDose: { min: number; max: number; unit: string };
  paperIds: string[];
}

interface Paper {
  id: string; title: string; authors: string; year: number; journal: string; link: string;
  studyType: 'meta-analysis' | 'RCT' | 'cohort' | 'observational' | 'animal' | 'in-vitro';
  population: string; sampleSize: number;
  intervention: string; dose: string; duration: string;
  outcomes: string; limitations: string; summary: string;
}

// ===== PERSISTED (Supabase) =====

interface UserProfile {
  id: string; userId: string;
  goals: OutcomeCategory[];
  diet: string | null; riskTolerance: 'low' | 'moderate' | 'high' | null;
  allergies: string[]; medications: string[]; avoidedIngredients: string[];
  formPreferences: SupplementForm[];
  caffeineSensitivity: boolean | null;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  notes: string | null;
  createdAt: string; updatedAt: string;
}

interface LabMarker {
  id: string; userId: string;
  marker: string; value: number; unit: string;
  referenceLow: number | null; referenceHigh: number | null;
  date: string | null; notes: string | null;
}

interface Stack {
  id: string; userId: string;
  name: string;
  intent: OutcomeCategory | 'experimental';
  mode: 'current' | 'planned';                     // Planned Stack mode
  description: string | null;
  createdAt: string; updatedAt: string;
}

interface StackItem {
  id: string; stackId: string;
  supplementId: string | null; customName: string | null;
  dose: number; unit: string;
  timing: 'morning' | 'midday' | 'evening' | 'pre-workout' | 'with-meal' | 'bedtime' | null;
  frequency: 'daily' | 'workout-days' | 'as-needed' | 'weekly' | null;
  reason: string | null; notes: string | null;
}

type FlagSeverity = 'info' | 'warning' | 'critical';
type FlagCategory =
  | 'evidence-fit' | 'dose-fit' | 'timing-fit' | 'redundancy'
  | 'allergy-conflict' | 'medication-caution' | 'lab-relevance'
  | 'goal-alignment' | 'cost-efficiency' | 'complexity';

interface EvaluationFlag {
  id: string; stackId: string; stackItemId: string | null;
  severity: FlagSeverity; category: FlagCategory;
  title: string; explanation: string; recommendation: string;
  evidenceLevel: EvidenceGrade | 'n/a';
  createdAt: string;
}
```

### 3.2 Entity Relationships

```
[auth.users] 1 ── 1 [UserProfile] 1 ── N [LabMarker]
      │
      └── 1 ── N [Stack] 1 ── N [StackItem]
                   │
                   └── 1 ── N [EvaluationFlag] ── 0..1 [StackItem]

[Supplement] 1 ── N [Effect] N ── N [Paper]      (seed; StackItem.supplementId → Supplement.id)
```

### 3.3 Database Schema (Supabase / Postgres)

```sql
-- RLS enabled on every table; policy: user_id = auth.uid()
create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  goals text[] not null default '{}',
  diet text, risk_tolerance text,
  allergies text[] not null default '{}',
  medications text[] not null default '{}',
  avoided_ingredients text[] not null default '{}',
  form_preferences text[] not null default '{}',
  caffeine_sensitivity boolean, experience_level text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table lab_markers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marker text not null, value numeric not null, unit text not null,
  reference_low numeric, reference_high numeric, date date, notes text
);

create table stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  intent text not null,
  mode text not null default 'current',           -- 'current' | 'planned'
  description text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table stack_items (
  id uuid primary key default gen_random_uuid(),
  stack_id uuid not null references stacks(id) on delete cascade,
  supplement_id text, custom_name text,            -- supplement_id references seed (no FK)
  dose numeric not null, unit text not null,
  timing text, frequency text, reason text, notes text
);

create table evaluation_flags (
  id uuid primary key default gen_random_uuid(),
  stack_id uuid not null references stacks(id) on delete cascade,
  stack_item_id uuid references stack_items(id) on delete cascade,
  severity text not null, category text not null,
  title text not null, explanation text not null, recommendation text not null,
  evidence_level text not null default 'n/a',
  created_at timestamptz default now()
);
```

> Supplement / Effect / Paper are **not** in Postgres — they live in `data/seed-*.ts`. `stack_items.supplement_id` is a soft reference resolved against seed at evaluation time.

---

## 4. API Specification

Next.js Route Handlers (App Router) under `app/api/`. Auth via Supabase server client; every handler enforces `auth.uid()`. Library reads happen directly from seed in Server Components (no API needed) — only persisted entities and evaluation get endpoints.

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET/PUT | /api/profile | Get / upsert current user's profile | Required |
| GET/POST | /api/lab-markers | List / create lab markers | Required |
| DELETE | /api/lab-markers/:id | Delete a lab marker | Required |
| GET/POST | /api/stacks | List / create stacks | Required |
| GET/PUT/DELETE | /api/stacks/:id | Get (w/ items + flags) / update / delete | Required |
| POST | /api/stacks/:id/items | Add stack item | Required |
| PUT/DELETE | /api/stacks/:id/items/:itemId | Update / remove item | Required |
| POST | /api/stacks/:id/evaluate | Run evaluation, persist + return flags | Required |
| GET | /api/stacks/:id/compare | Compare stack vs profile goals (gap view) | Required |

### 4.2 Detailed Specification

#### `POST /api/stacks/:id/evaluate`

Loads the stack + items + profile + lab markers, resolves seed supplements/effects, runs `evaluateStack()`, replaces prior flags for the stack, returns the new set.

**Response (200 OK):**
```json
{
  "data": {
    "stackId": "uuid",
    "flags": [
      {
        "id": "uuid", "stackItemId": "uuid",
        "severity": "warning", "category": "dose-fit",
        "title": "Dose exceeds common studied range",
        "explanation": "Your magnesium dose (800 mg) is above the commonly studied range (200–400 mg).",
        "recommendation": "Consider lowering toward the studied range unless directed otherwise.",
        "evidenceLevel": "B"
      }
    ],
    "summary": { "critical": 0, "warning": 2, "info": 3 }
  },
  "error": null
}
```

**Error Responses:** `400` invalid stack id · `401` unauthorized · `404` stack not found / not owned.

#### `GET /api/stacks/:id/compare`

**Response (200 OK):**
```json
{
  "data": {
    "goals": ["sleep","focus"],
    "coveredGoals": ["sleep"],
    "uncoveredGoals": ["focus"],
    "itemsByGoal": { "sleep": ["magnesium","glycine"], "focus": [] }
  },
  "error": null
}
```

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌────────────────────────────────────────────┐
│  TopNav: Library · Profile · Stack Lab      │  (auth state, user menu)
├────────────────────────────────────────────┤
│  Page content (dense, card-based)           │
│  Global medical disclaimer in footer        │
└────────────────────────────────────────────┘
```

### 5.2 User Flow

```
Landing → Sign up/Login → (Library search │ Profile setup) → Stack Lab: new stack
        → add items → Evaluate → Report (flags) → Compare vs goals
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `SupplementSearch` | `components/library/` | Search box + result list over seed |
| `SupplementDetail` | `components/library/` | Tabbed detail: summary/dose/effects/papers/related |
| `EffectGradeBadge` | `components/evidence/` | Renders A–D grade + confidence |
| `PaperSummaryCard` | `components/evidence/` | Seeded study summary |
| `ProfileForm` | `components/profile/` | Core fields, progressive sections |
| `LabMarkerTable` | `components/profile/` | Manual lab marker entry/list |
| `StackEditor` | `components/stack/` | Add/edit/remove items, intent, mode |
| `StackItemRow` | `components/stack/` | Dose/unit/timing/frequency/reason |
| `EvaluationReport` | `components/stack/` | Flags grouped by severity |
| `FlagCard` | `components/stack/` | One flag: title/explanation/recommendation |
| `CompareView` | `components/stack/` | Goals vs coverage gap |
| `Disclaimer` | `components/ui/` | Standardized safety/medical disclaimer |

### 5.4 Page UI Checklist

#### Library — Search (`/library`)
- [ ] Input: search box (filters by name + aliases)
- [ ] List: result cards (name, category, top effect grade badge)
- [ ] Empty state: "No matches in current dataset"
- [ ] Link: each card → detail page

#### Library — Detail (`/library/[slug]`)
- [ ] Tabs: Summary · Dose · Effects · Papers · Related
- [ ] Section: plain-English overview + mechanism summary
- [ ] Table: effects with per-effect grade (A–D) + confidence + studied dose
- [ ] Table: general dose range (min–max + unit)
- [ ] List: side effects + contraindications
- [ ] List: allergen tags (badges)
- [ ] Cards: paper summaries (title, type, dose, outcomes, limitations)
- [ ] List: related supplements (links)
- [ ] Buttons: "Add to Current Stack" / "Add to Planned Stack"

#### Profile (`/profile`)
- [ ] Multi-select: goals (11 OutcomeCategory options)
- [ ] Inputs: diet, risk tolerance, experience level, caffeine sensitivity
- [ ] Tag inputs: allergies, medications, avoided ingredients
- [ ] Multi-select: form preferences (6 forms)
- [ ] Table: lab markers (marker, value, unit, ref range) with add/delete
- [ ] Button: Save profile
- [ ] Disclaimer: non-diagnostic notice near labs/medications

#### Stack Lab (`/stack-lab`)
- [ ] List: user's stacks (name, intent, mode badge)
- [ ] Button: New stack (name + intent + mode)
- [ ] Toggle/filter: Current vs Planned

#### Stack Lab — Detail (`/stack-lab/[stackId]`)
- [ ] Editor: add item (supplement picker or custom name)
- [ ] Row fields: dose, unit, timing, frequency, reason, notes
- [ ] Buttons: edit item, remove item
- [ ] Button: Evaluate stack
- [ ] Report: flags grouped by severity (critical/warning/info) with counts
- [ ] Flag card: title + explanation + recommendation + evidence level
- [ ] Compare panel: goals covered vs uncovered
- [ ] Disclaimer: educational, not medical advice

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | Invalid input | Zod validation failed | Show field errors inline |
| 401 | Unauthorized | No session | Redirect to /auth/login |
| 404 | Not found | Stack/marker not owned or missing | Show not-found state |
| 409 | Conflict | Duplicate profile row | Upsert instead of insert |
| 500 | Internal error | Unexpected | Log + generic toast |

### 6.2 Error Response Format

```json
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "fieldErrors": {} } } }
```

---

## 7. Security Considerations

- [ ] Supabase **RLS on every table** (`user_id = auth.uid()`) — primary authorization boundary.
- [ ] Server-side Zod validation on all write endpoints.
- [ ] Auth guard in every route handler (reject 401 before any query).
- [ ] No service-role key in client; anon key only client-side.
- [ ] Sanitize free-text (notes, custom names) on render (React escapes by default; no `dangerouslySetInnerHTML`).
- [ ] Rate limiting deferred (single-user MVP) — noted as post-MVP.
- [ ] Medical/legal disclaimer rendered on Profile, labs, and evaluation surfaces.

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L0: Unit | `lib/stack-evaluator`, `lib/evidence`, `lib/safety` (pure) | Vitest | Do |
| L1: API | Route handlers — status, shape, auth, validation | Playwright request | Do |
| L2: UI Action | Library search, profile save, stack build, evaluate | Playwright | Do |
| L3: E2E | Full loop: search → stack → evaluate → compare | Playwright | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test | Expected Status | Expected Response |
|---|----------|--------|------|:--------------:|-------------------|
| 1 | /api/stacks | GET | List own stacks | 200 | `.data` array |
| 2 | /api/stacks | POST | Create valid stack | 201 | `.data.id` exists |
| 3 | /api/stacks | POST | Missing intent | 400 | `.error.details.fieldErrors.intent` |
| 4 | /api/stacks/:id/evaluate | POST | Evaluate seeded stack | 200 | `.data.flags` array, `.data.summary` counts |
| 5 | /api/profile | GET | Unauthenticated | 401 | `.error.code` = "UNAUTHORIZED" |
| 6 | /api/stacks/:id | GET | Other user's stack | 404 | `.error.code` = "NOT_FOUND" |
| 7 | /api/stacks/:id/compare | GET | Goals vs coverage | 200 | `.data.uncoveredGoals` array |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result | Data Verification |
|---|------|--------|----------------|-------------------|
| 1 | /library | Type "magnesium" | Result card appears | Renders from seed |
| 2 | /library/[slug] | Open detail | All §5.4 elements visible | Effect grades render |
| 3 | /library/[slug] | Click "Add to Current Stack" | Item appears in stack | POST item 201 |
| 4 | /profile | Save with goals+allergy | Success state | Persisted (reload shows) |
| 5 | /stack-lab/[id] | Click Evaluate | Report renders w/ flags | POST evaluate 200 |
| 6 | /stack-lab/[id] | Add allergen-conflicting item | Allergy-conflict flag shown | severity warning/critical |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | Core loop | Register → Profile(goal=sleep, allergy=fish) → Library search → add Magnesium+Glycine → Evaluate → Compare | Flags render; sleep goal covered; no errors |
| 2 | Allergy safety | Add fish-oil to stack (allergy=fish) | allergy-conflict flag at warning+ severity |
| 3 | Dose flag | Add Magnesium @ 800mg | dose-fit "exceeds studied range" warning |
| 4 | Redundancy | Add two magnesium-category sleep items | redundancy flag emitted |
| 5 | Auth guard | Hit /stack-lab logged out | Redirect to login |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:------------:|---------------------|
| Supplement | 15 (Plan seed list) | slug, allergenTags, generalDose, relatedSupplementIds |
| Effect | ≥1 per supplement (≥25 total) | grade, outcomeCategory, studiedDose, paperIds |
| Paper | ≥1 per high-grade effect (≥15) | studyType, summary, limitations |

> Do phase: build `data/seed-supplements.ts` + `seed-effects.ts` + `seed-papers.ts` and `lib/db/seed.ts` (DB seed for a demo user) before writing tests.

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | Pages, components, hooks | `src/app/`, `src/components/` |
| **Application** | Orchestration, route handlers, services | `src/app/api/`, `src/services/` |
| **Domain** | Entities, types, pure rules | `src/types/`, `src/lib/evidence`, `src/lib/stack-evaluator`, `src/lib/safety` |
| **Infrastructure** | Supabase client, repositories | `src/lib/db/`, `src/lib/supabase/` |

### 9.2 Dependency Rules

```
Presentation → Application → Domain ← Infrastructure
                    └────────→ Infrastructure
Rule: Domain (lib/evidence, lib/stack-evaluator, lib/safety) imports NOTHING external — no Supabase, no React.
```

### 9.3 File Import Rules

| From | Can Import | Cannot Import |
|------|-----------|---------------|
| Presentation | Application, Domain types | Supabase directly |
| Application | Domain, Infrastructure | Presentation |
| Domain | Domain only (pure) | Supabase, React, services |
| Infrastructure | Domain types | Application, Presentation |

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `evaluateStack()` | Domain | `src/lib/stack-evaluator/index.ts` |
| `getEffectsForSupplement()` | Domain | `src/lib/evidence/index.ts` |
| `safetyMessage()` / phrasing map | Domain | `src/lib/safety/index.ts` |
| `evaluationService` | Application | `src/services/evaluation.ts` |
| `stackRepo`, `profileRepo` | Infrastructure | `src/lib/db/*.ts` |
| `StackEditor`, `EvaluationReport` | Presentation | `src/components/stack/` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase.tsx | `EvaluationReport.tsx` |
| Utilities/logic | camelCase.ts | `stack-evaluator/rules.ts` |
| Folders | kebab-case | `stack-lab/`, `stack-evaluator/` |
| Types | PascalCase | `EvaluationFlag` |
| Constants | UPPER_SNAKE_CASE | `DOSE_EXCEED_WARN_RATIO` |

### 10.2 Import Order

External → internal absolute (`@/`) → relative → type imports → styles.

### 10.3 Environment Variables

| Prefix | Purpose | Example |
|--------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_` | Client Supabase URL/anon key | `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_` | Server service role (server only) | `SUPABASE_SERVICE_ROLE_KEY` |

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| State management | Server Components for reads; React Query (or server actions) for mutations |
| Validation | Zod schemas shared between client form + server handler |
| Advisory copy | All strings via `lib/safety` — no inline medical phrasing |
| Engine purity | `lib/stack-evaluator` has zero imports outside `lib/evidence` + `types` |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── app/
│   ├── page.tsx                      # landing
│   ├── auth/                         # login / signup
│   ├── library/{page,[slug]/page}.tsx
│   ├── profile/page.tsx
│   ├── stack-lab/{page,[stackId]/page}.tsx
│   └── api/{profile,lab-markers,stacks}/...route.ts
├── components/{layout,library,profile,stack,evidence,ui}/
├── services/{evaluation,stack,profile}.ts
├── lib/
│   ├── evidence/        # supplement→effect lookups, grade resolution (PURE)
│   ├── stack-evaluator/ # rules.ts + index.ts evaluateStack() (PURE)
│   ├── safety/          # phrasing map + disclaimers (PURE)
│   ├── db/              # supabase repos
│   ├── supabase/        # client/server factories
│   └── validation/      # zod schemas
├── types/{supplement,effect,paper,profile,stack,evaluation}.ts
└── data/{seed-supplements,seed-effects,seed-papers}.ts
```

### 11.2 Implementation Order

1. [ ] Project init (Next.js + TS + Tailwind + shadcn/ui + Supabase client) + types + Zod schemas
2. [ ] Seed data modules + `lib/evidence` lookups (+ unit tests)
3. [ ] `lib/safety` phrasing map + `lib/stack-evaluator` rules (+ unit tests — the risk areas)
4. [ ] Supabase schema/migrations + RLS + repos
5. [ ] Auth + app shell + nav + disclaimers
6. [ ] Library (search + detail) reading seed
7. [ ] Profile (form + lab markers) + API
8. [ ] Stack Lab (editor + items) + API
9. [ ] Evaluation endpoint + Report UI + Compare Mode
10. [ ] L1–L3 Playwright tests + DB seed

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Est. Turns |
|--------|-----------|-------------|:---------:|
| Foundation | `module-1` | Init, types, Zod, seed data, `lib/evidence` (+unit tests) | 40-50 |
| Engine + Safety | `module-2` | `lib/stack-evaluator` rules + `lib/safety` (+unit tests) — the Plan-flagged risk | 35-45 |
| Data layer + Auth | `module-3` | Supabase schema, RLS, repos, auth, app shell | 35-45 |
| Library | `module-4` | Search + detail pages from seed | 30-40 |
| Profile | `module-5` | Profile form + lab markers + API | 30-40 |
| Stack Lab + Eval | `module-6` | Stack editor, evaluate endpoint, Report, Compare | 45-55 |
| QA | `module-7` | L1–L3 tests + DB seed | 30-40 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| 1 | Do | `--scope module-1,module-2` | 50-60 |
| 2 | Do | `--scope module-3` | 35-45 |
| 3 | Do | `--scope module-4,module-5` | 50-60 |
| 4 | Do | `--scope module-6` | 45-55 |
| 5 | Check + QA + Report | 전체 | 40-50 |

### 11.4 Key Algorithm — Evaluation Rule Thresholds (Plan risk area)

> Constants live in `lib/stack-evaluator/rules.ts`. `evaluateStack(stack, profile, library): EvaluationFlag[]`.

| Rule | Logic | Severity |
|------|-------|----------|
| **evidence-fit** | Item's supplement has an Effect whose `outcomeCategory` matches `stack.intent`. Grade A/B → no flag; C → info; D or none → info "limited evidence for this intent". | info |
| **dose-fit** | Let r = itemDose / effect.studiedDose.max. r ≤ 1.0 ok; r in (1.0, `DOSE_EXCEED_WARN_RATIO`=1.5] → warning "exceeds common studied range"; r > `DOSE_CRIT_RATIO`=2.5 → critical. Below `DOSE_LOW_RATIO`=0.5 of min → info "below studied range". | info/warning/critical |
| **redundancy** | ≥2 items sharing same primary `outcomeCategory` AND overlapping mechanism tag → info; ≥3 → warning. | info/warning |
| **allergy-conflict** | `supplement.allergenTags ∩ profile.allergies ≠ ∅` → warning; if also a medication-class allergy → critical. | warning/critical |
| **goal-alignment** | Item's effects share no `outcomeCategory` with `profile.goals` → info "not aligned with your stated goals". | info |
| **lab-relevance** | If a LabMarker is below `referenceLow` and a stack effect targets that deficiency category → info "supported by your labs"; if above and supplement raises it → warning. | info/warning |
| **medication-caution** | `profile.medications` non-empty AND supplement in static `MED_CAUTION_TAGS` set → warning placeholder "may interact with medications; discuss with a clinician". | warning |
| **complexity** | Stack item count > `COMPLEXITY_WARN`=12 → info "stack may be hard to adhere to". | info |

> All flag strings produced via `lib/safety` (non-diagnostic phrasing). Each rule is independently unit-tested against fixtures (Plan: ≥80% coverage on evaluator).

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-11 | Initial draft (Option C — Pragmatic) | benhwang121@gmail.com |
