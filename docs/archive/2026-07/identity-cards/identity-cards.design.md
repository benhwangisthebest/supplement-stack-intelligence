# identity-cards Design Document

> **Summary**: A pure, deterministic `lib/identity` engine that derives an explainable "supplement-thinking" archetype (+ trait axes, confidence, per-stack and per-supplement reads) from existing profile/stack/evidence data — surfaced as premium Identity Cards. No LLM, no new table, no new dependency.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0
> **Author**: bkit PDCA (plan-plus)
> **Date**: 2026-07-01
> **Status**: Draft
> **Planning Doc**: [identity-cards.plan.md](../../01-plan/features/identity-cards.plan.md)
> **Milestone**: v9

---

## Context Anchor

> Copied from Plan document. Ensures strategic context survives Design→Do handoff.

| Key | Value |
|-----|-------|
| **WHY** | The advisor arc (v6–v8) is complete; the platform tools the user but never reflects *them* back. Multi-stack, intents, resolved evidence grades, and risk profile already exist — enough to derive a premium, earned identity. Subtle identity-based gamification is the exact direction CLAUDE.md sanctions. |
| **WHO** | Evidence-literate biohacker / longevity / athlete / power users who have invested in a rich Profile + multiple stacks — the users for whom an archetype feels *earned*, and who want it premium, not childish. |
| **RISK** | The **horoscope trap** (arbitrary/unearned archetype); **over-claiming** on thin data; **medicalizing identity** (health-status framing); **taxonomy gaps** (users matching nothing, or all collapsing to one bucket); non-deterministic/unstable identity; scope creep into points/achievements. |
| **SUCCESS** | Pure deterministic `lib/identity` derives archetype + traits + evidence trail from real signals; every archetype reachable, traits bounded [0,1]; confidence guard prevents over-claim; per-stack + per-supplement archetypes render; all copy non-diagnostic (honesty sweep); **0 engine/table files modified, no migration, no new dependency**; `GET /api/identity` auth-guarded via existing RLS repos; all prior suites green. |
| **SCOPE** | `lib/identity` (traits · classify · confidence · archetypes · stack-archetypes · supplement-archetypes · context) · `GET /api/identity` · Library SSR supplement-archetype wiring · `IdentityCard` + `TraitBars` + `StackArchetypeBadge` + `SupplementArchetypeBadge` · surfacing on Profile / Stack Lab / Library · deep-link reuse of v8 `citationHref` · unit + L1 + L2/L3 tests. **No** LLM, table, migration, dependency, snapshot/history, share-image, badges, or standalone quality/literacy scores (deferred). |

---

## 1. Overview

### 1.1 Design Goals

- Derive a **stable, deterministic** archetype from data the platform already owns — identical inputs ⇒ identical card (a *status* surface must not reshuffle on refresh).
- Make every archetype **explainable**: the card carries the exact signals (stack items / effects) that earned it, deep-linked into the Library.
- **Guard against over-claim**: thin data degrades to low confidence and a `Emerging` state, never a confident-but-hollow archetype.
- Keep the domain **pure and additive** — reuse existing repos/engines read-only; touch **0 engine/write-logic/table files**; no migration, no new dependency.
- Keep identity strictly **non-diagnostic** — it describes supplement-*thinking* style, never health status.

### 1.2 Design Principles

- **Pure Domain (Clean Architecture)**: `lib/identity` is I/O-free and DB-agnostic — same discipline as `lib/evidence-grading` (v5).
- **Taxonomy as data, not code** (Option C): archetypes are declarative records with a target trait-profile; a single pure nearest-profile classifier matches them. New archetypes = new data, not new branches.
- **Derive, never store**: identity is computed on the fly per request; no persistence in v1 (snapshot/history deferred).
- **Total classifier**: always returns a best match *or* an explicit low-confidence `Emerging` state — never throws, never returns null.

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | Inline threshold `if/else` in one `index.ts` | Pluggable `Classifier` strategy + ports + DI | Data-driven taxonomy + one pure nearest-profile classifier |
| **New Files** | ~8 | ~16 | ~13 |
| **Modified Files** | 3 | 3 | 3 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium (taxonomy baked into conditionals) | High | High (archetypes declarative) |
| **Effort** | Low | High | Medium |
| **Risk** | Brittle as archetypes grow; "arbitrary" feel | Over-engineered for deterministic seed-scale | Low — matches proven v5 shape |
| **Recommendation** | Quick win | Long-term extensibility | **Default choice** |

**Selected**: **Option C — Pragmatic** — **Rationale**: mirrors the proven v5 evidence-grading shape (`weights` + `derive` + `index`); archetype taxonomy grows as declarative data (defends against the horoscope trap by making trait-profiles explicit and testable); each trait axis is unit-testable in isolation; no strategy-pattern ceremony for a fixed, deterministic archetype set. No new table/dependency.

### 2.1 Component Diagram

```
┌────────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────────┐
│   Presentation          │     │   Application / Infra     │     │   Domain (PURE)          │
│                         │     │                          │     │                         │
│  Profile page ──────────┼────▶│  GET /api/identity        │────▶│  lib/identity            │
│    └ IdentityCard        │     │    └ loadIdentityContext  │     │   traits → classify      │
│       └ TraitBars        │◀────┤       (existing repos)    │◀────┤   confidence             │
│  StackWorkspace          │     │                          │     │   stack-archetypes       │
│    └ StackArchetypeBadge │     │  Library SSR (server comp)│────▶│   supplement-archetypes  │
│  SupplementDetail        │◀────┤   deriveSupplementArche.  │◀────┤   archetypes (data)      │
│    └ SupplementArche…Badge│    └──────────────────────────┘     └─────────────────────────┘
└────────────────────────┘            reuses: db repos, lib/evidence(+grading)
```

### 2.2 Data Flow

```
Profile page (auth) → GET /api/identity
  → loadIdentityContext(supabase, userId)          [reuses getProfile/listStacks/listItems/listLabMarkers]
  → computeTraits(ctx)                              [pure → TraitVector ∈ [0,1]^5]
  → classify(traits, ARCHETYPES)                    [pure → archetype + score + evidence trail]
  → deriveConfidence(ctx)                           [pure → level + sharpen suggestions]
  → IdentityCard { archetype, traits, confidence, trail(citationHref) }

Stack Lab → deriveStackArchetype(stack, items, ctx) [pure] → StackArchetypeBadge
Library detail (SSR) → deriveSupplementArchetype(supplement) [pure over seed] → SupplementArchetypeBadge
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/identity/context.ts` | `lib/db/*repo` (read), `lib/evidence` | Assemble read-only inputs (no new business logic) |
| `lib/identity/traits.ts` | `lib/evidence` (`getBestEffectForOutcome`, `effectComposite`, `compareGrades`) | Grade→score for Evidence Rigor / Risk Appetite |
| `lib/identity/classify.ts` | `archetypes.ts`, `traits.ts` types | Nearest-profile match + evidence trail |
| `components/identity/IdentityCard` | `lib/advisor/citation-href` (`citationHref`) | Deep-link the "why" trail into the Library |
| all copy | `lib/safety` (`containsBannedLanguage`, `safetyCopy`) | Non-diagnostic tone enforcement |

---

## 3. Data Model

> **No database.** Identity is derived on the fly — no new table, no migration. All types are pure TS in `src/types/identity.ts`.

### 3.1 Entity Definition

```typescript
// src/types/identity.ts
import type { OutcomeCategory } from "./index";
import type { Citation } from "./advisor"; // reuse v6 provenance shape for deep-linking

// The five identity trait axes, each normalized to [0,1].
export type TraitAxis =
  | "evidenceRigor"      // how well-supported the user's chosen items are
  | "riskAppetite"       // tilt toward experimental / low-evidence / high risk-tolerance
  | "breadth"            // spread across distinct outcome domains
  | "foundationalFocus"  // tilt toward foundational vs targeted/experimental
  | "dataDepth";         // how much context the user has invested (also drives confidence)

export type TraitVector = Record<TraitAxis, number>; // each ∈ [0,1]

export interface IdentityTrait {
  axis: TraitAxis;
  label: string;         // "Evidence Rigor"
  value: number;         // [0,1]
  derivation: string;    // non-diagnostic, human-readable ("7/9 items grade B+ for their goal")
}

export type ArchetypeId =
  | "longevity-architect"
  | "evidence-minimalist"
  | "experimental-biohacker"
  | "foundational-purist"
  | "performance-optimizer"
  | "broad-explorer"
  | "emerging";          // explicit low-confidence fallback (classifier is total)

export interface ArchetypeDef {
  id: ArchetypeId;
  name: string;                       // "Longevity Architect"
  tagline: string;                    // one premium line, non-diagnostic
  description: string;
  target: TraitVector;                // the point in trait-space this archetype represents
  weights?: Partial<Record<TraitAxis, number>>; // per-axis distance weights (default 1)
}

export type ConfidenceLevel = "emerging" | "developing" | "established";

export interface IdentitySignal {   // one item of the evidence trail
  label: string;                     // "Creatine — grade A for training"
  detail: string;
  citation?: Citation;               // → citationHref() deep-link; absent = inert line
}

export interface IdentityCard {
  archetype: ArchetypeId;
  name: string;
  tagline: string;
  matchScore: number;                // [0,1] closeness to the winning archetype
  traits: IdentityTrait[];           // the five axes
  confidence: ConfidenceLevel;
  sharpen: string[];                 // "Add lab markers to sharpen your card"
  trail: IdentitySignal[];           // why this archetype (deep-linked)
  disclaimer: string;                // from lib/safety
}

export interface StackArchetype {
  stackId: string;
  stackName: string;
  intent: OutcomeCategory | "experimental";
  archetype: ArchetypeId;
  name: string;
  note: string;                      // "This Sleep stack reads as Foundational Purist"
}

export type SupplementArchetypeId =
  | "foundational-staple"
  | "targeted-specialist"
  | "experimental-edge"
  | "broad-spectrum";

export interface SupplementArchetype {
  supplementId: string;
  archetype: SupplementArchetypeId;
  name: string;
  rationale: string;                 // "Broad, high-grade evidence across 4 outcomes"
}
```

### 3.2 Trait Derivation Rules (deterministic)

> Grade→score map reuses evidence conventions: `A=1.0, B=0.66, C=0.33, D=0.0`. Where an effect has an `evidenceProfile`, `effectComposite()` ∈ [0,1] refines within-grade. Items with no supplement match / no graded effect for their goal count as low-evidence.

| Axis | Derivation (pure over context) | Bound |
|------|--------------------------------|-------|
| **evidenceRigor** | mean grade-score of each stack item's best effect for its stack intent (via `getBestEffectForOutcome`), composite-refined | [0,1] |
| **riskAppetite** | blend of: share of items that are experimental/ungraded/D-grade, `+` any `experimental`-intent stacks, `+` normalized `profile.riskTolerance` (low=0, moderate=0.5, high=1) | [0,1] |
| **breadth** | distinct count of `{stack intents} ∪ {profile.goals}` ÷ total `OUTCOME_CATEGORIES` (11) | [0,1] |
| **foundationalFocus** | share of items whose stack intent = `foundational` or whose best effect's `outcomeCategory = foundational/longevity/deficiency` | [0,1] |
| **dataDepth** | weighted completeness: profile fields filled (goals, diet, riskTolerance, allergies, meds, experience) + #stacks (cap) + #items (cap) + labs present | [0,1] |

### 3.3 Archetype Targets & Classification

- `classify(traits)` computes **weighted Euclidean distance** from `traits` to each `ArchetypeDef.target`; nearest wins; `matchScore = 1 - normalizedDistance`.
- **Deterministic tie-break**: lower `ARCHETYPES` array index wins (stable ordering).
- **Emerging guard**: if `confidence === "emerging"` (dataDepth below threshold, e.g. `< 0.25`) **or** `matchScore < MIN_MATCH` (e.g. `0.35`), the card resolves to `emerging` regardless of nearest neighbor — this is the anti-over-claim rule (Plan SC5/SC10).
- **Integrity invariant** (unit-tested): each non-`emerging` archetype is the unique nearest neighbor of its own `target` — i.e. every archetype is reachable and none is dominated.

| Archetype | Target emphasis (high axes) |
|-----------|-----------------------------|
| Longevity Architect | foundationalFocus↑, evidenceRigor↑, breadth~mid, riskAppetite~low |
| Evidence Minimalist | evidenceRigor↑↑, breadth↓, riskAppetite↓ |
| Experimental Biohacker | riskAppetite↑↑, breadth↑, evidenceRigor~mid |
| Foundational Purist | foundationalFocus↑↑, breadth↓, riskAppetite↓ |
| Performance Optimizer | evidenceRigor↑, riskAppetite~mid, training/recovery-weighted breadth |
| Broad Explorer | breadth↑↑, other axes~mid |
| Emerging | (fallback — not a target; selected by guard) |

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/identity` | Derive the current user's identity card + per-stack archetypes | Required |

> Supplement archetypes are **public/seed-derived** → computed in **Library SSR** (server component), **no endpoint** (mirrors how evidence-grading is pre-resolved). No POST/PUT/DELETE — identity is never written in v1.

### 4.2 Detailed Specification

#### `GET /api/identity`

**Response (200 OK):**
```json
{
  "data": {
    "card": {
      "archetype": "longevity-architect",
      "name": "Longevity Architect",
      "tagline": "You build for the long game — foundational, well-evidenced, low-drama.",
      "matchScore": 0.82,
      "traits": [
        { "axis": "evidenceRigor", "label": "Evidence Rigor", "value": 0.78, "derivation": "6/8 items grade B+ for their goal" }
      ],
      "confidence": "established",
      "sharpen": [],
      "trail": [
        { "label": "Creatine — grade A for training", "detail": "…", "citation": { "kind": "effect-grade", "refId": "eff_…" } }
      ],
      "disclaimer": "Educational context only — not a health assessment."
    },
    "stackArchetypes": [
      { "stackId": "…", "stackName": "Sleep", "intent": "sleep", "archetype": "foundational-purist", "name": "Foundational Purist", "note": "This Sleep stack reads as Foundational Purist" }
    ]
  }
}
```

**Response (200 OK, thin data):** `card.confidence = "emerging"`, `card.archetype = "emerging"`, `card.sharpen = ["Add your goals…", "Add lab markers…"]`.

**Error Responses:**
- `401 Unauthorized`: `.error.code = "UNAUTHORIZED"` — no session (auth guard, same pattern as `/api/advisor`).
- `500 Internal error`: unexpected failure; logged, generic message to client.

---

## 5. UI/UX Design

### 5.1 Screen Layout (Identity Card on Profile)

```
┌───────────────────────────────────────────────┐
│  🧬  Longevity Architect          [established] │  ← archetype name + confidence chip
│  "You build for the long game…"                │  ← tagline
├───────────────────────────────────────────────┤
│  Evidence Rigor    ███████░░  0.78             │
│  Foundational      ████████░  0.81             │  ← TraitBars (5 axes)
│  Breadth           ████░░░░░  0.42             │
│  Risk Appetite     ██░░░░░░░  0.22             │
│  Data Depth        ██████░░░  0.66             │
├───────────────────────────────────────────────┤
│  Why this archetype                            │
│   • Creatine — grade A for training      ↗     │  ← trail, deep-linked (citationHref)
│   • Magnesium — grade B for sleep        ↗     │
├───────────────────────────────────────────────┤
│  Educational context only — not a health…      │  ← lib/safety disclaimer
└───────────────────────────────────────────────┘
```

> **Emerging state**: hides trait bars' verdict emphasis, shows "Your card is still forming" + `sharpen[]` checklist instead of a confident archetype.

### 5.2 User Flow

```
Profile → (card auto-loads) → read archetype + traits → click a trail chip → Library effect (#effect-…)
Stack Lab → each stack shows its archetype badge
Library detail → supplement shows its compound archetype badge
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `IdentityCard` | `src/components/identity/` | Render archetype, tagline, confidence chip, TraitBars, trail (deep-links), disclaimer; emerging state |
| `TraitBars` | `src/components/identity/` | Render the 5 trait axes as labeled bars |
| `StackArchetypeBadge` | `src/components/identity/` | Compact per-stack archetype badge |
| `SupplementArchetypeBadge` | `src/components/identity/` | Compact compound archetype badge (Library) |

### 5.4 Page UI Checklist

#### Profile page (`/profile`)

- [ ] Card: archetype **name** (one of 7 ids incl. `emerging`)
- [ ] Card: **tagline** (non-diagnostic, from archetype def)
- [ ] Badge: **confidence chip** (`emerging` / `developing` / `established`)
- [ ] TraitBars: **5 axes** each with label + bar + numeric value ∈ [0,1] (Evidence Rigor, Foundational Focus, Breadth, Risk Appetite, Data Depth)
- [ ] List: **"Why this archetype" trail** — ≥1 signal when not emerging; each linkable signal is a clickable deep-link (`↗`), non-linkable signals render inert
- [ ] Emerging state: **"sharpen" checklist** shown instead of a confident archetype when `confidence = emerging`
- [ ] Text: **disclaimer** line from `lib/safety`

#### Stack Lab (`/stack-lab`, `/stack-lab/[stackId]`)

- [ ] Badge: per-stack **archetype name** + **note** ("This {Intent} stack reads as {Archetype}")

#### Library detail (`/library/[slug]`)

- [ ] Badge: **supplement archetype** (Foundational Staple / Targeted Specialist / Experimental Edge / Broad-Spectrum) + rationale tooltip/line

---

## 6. Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 401 | Unauthorized | No session on `/api/identity` | Client shows signed-out state / redirect (existing pattern) |
| 500 | Internal error | Repo/compute failure | Log; card area shows graceful "couldn't load your card" fallback (never a crash) |
| — | Emerging (not an error) | Thin data (dataDepth < 0.25 or matchScore < 0.35) | Render emerging state + sharpen checklist |
| — | Unresolved trail citation | `citationHref()` returns null | Render inert signal line (no dead link) — reuses v8 behavior |

**Error response format** (matches project convention):
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Sign in to view your identity card." } }
```

---

## 7. Security Considerations

- [x] **Auth guard**: `GET /api/identity` requires a Supabase session (401 otherwise) — identity is per-user private data.
- [x] **RLS via existing repos**: context assembly reuses `getProfile/listStacks/listItems/listLabMarkers`, all already RLS-scoped to `userId`; no new table, no new policy.
- [x] **No injection surface**: no request body, no query params trusted into logic (derivation is over server-loaded owned data only).
- [x] **No sensitive leakage**: supplement-archetype (public seed) is the only unauthenticated compute; the personal card requires auth.
- [x] **Non-diagnostic output**: all archetype/tagline/derivation/trail copy passes a `containsBannedLanguage` honesty sweep (test) — identity must never imply health status.

---

## 8. Test Plan (v2.3.0)

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L0: Unit | `lib/identity` pure functions + integrity | Vitest | Do |
| L1: API | `GET /api/identity` — auth guard, response shape | Playwright request | Do |
| L2: UI Action | Library supplement badge (public) + Profile card render | Playwright | Do |
| L3: E2E | Signed-in Profile card → trail deep-link → Library | Playwright (E2E_LIVE) | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test Description | Expected Status | Expected Response |
|---|----------|--------|-----------------|:--------------:|-------------------|
| 1 | `/api/identity` | GET | Blocks unauthenticated | 401 | `.error.code = "UNAUTHORIZED"` |
| 2 | `/api/identity` | GET | Authed user gets a card | 200 | `.data.card.archetype` present, `.data.card.traits.length = 5` |
| 3 | `/api/identity` | GET | Thin-data user → emerging | 200 | `.data.card.confidence = "emerging"`, `.data.card.sharpen.length > 0` |

> L1 #2/#3 are `E2E_LIVE`-gated (need an authed session + seeded data), consistent with prior milestones. #1 is always-on.

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result | Data Verification |
|---|------|--------|----------------|-------------------|
| 1 | `/library/[slug]` | Load a seed supplement (e.g. creatine) | SupplementArchetypeBadge visible | Archetype derived from seed effects (not skeleton) |
| 2 | `/profile` | Load signed-out | Card area shows signed-out/CTA, no crash | No 500 |
| 3 | `/profile` | Load signed-in (E2E_LIVE) | IdentityCard with 5 TraitBars + confidence chip | Values ∈ [0,1] render |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | Identity → Library deep-link (E2E_LIVE) | Sign in → Profile → click a trail chip → land on `/library/{slug}#effect-{id}` | Correct supplement page + anchor; no dead link |
| 2 | Public supplement archetype | Visit `/library/creatine` guest → badge renders | Archetype label + rationale present |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:------------:|---------------------|
| Supplement (seed) | existing | effects with grades (already seeded) — for supplement-archetype |
| Stack + items (authed test) | 1 stack, ≥3 items | supplementId, intent — for card traits |
| Profile (authed test) | 1 | goals, riskTolerance — for breadth/riskAppetite |

> Pure L0 unit tests use in-module fixtures (no DB) — the bulk of coverage, fully runtime-verified like v5.

---

## 9. Clean Architecture

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `types/identity.ts` | Domain | `src/types/identity.ts` |
| `lib/identity/{archetypes,traits,classify,confidence,stack-archetypes,supplement-archetypes}` | Domain (pure) | `src/lib/identity/` |
| `lib/identity/context.ts` | Infrastructure | `src/lib/identity/context.ts` (reads repos + evidence) |
| `GET /api/identity` route | Application/Infra | `src/app/api/identity/route.ts` |
| `IdentityCard`, `TraitBars`, `StackArchetypeBadge`, `SupplementArchetypeBadge` | Presentation | `src/components/identity/` |

**Dependency check**: Domain (`traits/classify/confidence/archetypes`) imports **nothing external** except pure `lib/evidence` helpers + types → satisfies "Domain independent". `context.ts` (Infra) may read repos; Presentation imports the API result + `citationHref`, never a repo directly. ✅

---

## 10. Coding Convention Reference

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase (`IdentityCard.tsx`) |
| Pure module files | camelCase (`traits.ts`, `classify.ts`) |
| Constants | UPPER_SNAKE_CASE (`ARCHETYPES`, `MIN_MATCH`, `EMERGING_DATA_DEPTH`) |
| Types | PascalCase, in `src/types/identity.ts` |
| Design ref comments | `// Design Ref: §{n}` + `// Plan SC: {n}` at module heads & key logic |
| Error handling | `{ error: { code, message } }`; 401 guard mirrors `/api/advisor` |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── types/identity.ts                         # Domain types (NEW)
├── lib/identity/
│   ├── archetypes.ts                         # user archetype taxonomy (data) (NEW)
│   ├── traits.ts                             # TraitVector derivation (pure) (NEW)
│   ├── classify.ts                           # nearest-profile + evidence trail (pure) (NEW)
│   ├── confidence.ts                         # dataDepth → level + sharpen (pure) (NEW)
│   ├── stack-archetypes.ts                   # per-stack read (pure) (NEW)
│   ├── supplement-archetypes.ts              # compound archetype over seed (pure) (NEW)
│   ├── context.ts                            # loadIdentityContext (reuses repos) (NEW)
│   ├── index.ts                              # deriveUserIdentity / deriveStackArchetype / deriveSupplementArchetype (NEW)
│   ├── traits.test.ts                        # (NEW)
│   ├── classify.test.ts                      # incl. integrity: every archetype reachable (NEW)
│   ├── confidence.test.ts                    # (NEW)
│   ├── supplement-archetypes.test.ts         # (NEW)
│   └── honesty.test.ts                       # banned-language sweep over all copy (NEW)
├── app/api/identity/route.ts                 # GET (auth + RLS) (NEW)
├── components/identity/
│   ├── IdentityCard.tsx                       # (NEW)
│   ├── TraitBars.tsx                          # (NEW)
│   ├── StackArchetypeBadge.tsx                # (NEW)
│   └── SupplementArchetypeBadge.tsx           # (NEW)
└── (modified surfaces)
    ├── app/profile/… (render IdentityCard)                (MODIFIED)
    ├── components/stack/StackWorkspace.tsx or StackList   (MODIFIED — badge)
    └── components/library/SupplementDetail.tsx            (MODIFIED — badge)

tests/e2e/identity-cards.spec.ts              # L1 auth-guard (+ L2/L3 gated) (NEW)
```

### 11.2 Implementation Order

1. [ ] `types/identity.ts` + archetype taxonomy data
2. [ ] Pure engine: `traits` → `classify` → `confidence` → `stack-archetypes` → `supplement-archetypes` → `index`, with unit + integrity + honesty tests
3. [ ] `context.ts` + `GET /api/identity` (auth guard) + L1 spec
4. [ ] Components + surface wiring (Profile / Stack Lab / Library) + Library SSR supplement archetype
5. [ ] L2/L3 specs (E2E_LIVE-gated)

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| Engine & taxonomy | `module-1` | `types/identity` + `lib/identity` pure (archetypes, traits, classify, confidence, stack-archetypes, supplement-archetypes, index) + full unit/integrity/honesty tests | 40–50 |
| Context & API | `module-2` | `lib/identity/context.ts` (reuse repos), `GET /api/identity` (auth + RLS), Library SSR supplement-archetype wiring, L1 auth-guard spec | 35–45 |
| UI & surfacing | `module-3` | `IdentityCard` + `TraitBars` + `StackArchetypeBadge` + `SupplementArchetypeBadge`; surface on Profile / Stack Lab / Library; deep-link reuse; L2/L3 specs | 40–50 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 | 30–35 |
| Session 2 | Do | `--scope module-1` | 40–50 |
| Session 3 | Do | `--scope module-2` | 35–45 |
| Session 4 | Do | `--scope module-3` | 40–50 |
| Session 5 | Check + QA + Report | 전체 | 30–40 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-07-01 | Initial draft — Option C (pragmatic, data-driven taxonomy + nearest-profile classifier) selected via Checkpoint 3 | bkit PDCA |
