---
template: design
version: 1.3
feature: medication-interactions
date: 2026-06-15
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v2
---

# medication-interactions Design Document

> **Summary**: A pure, deterministic `lib/interactions` engine + curated seed dataset that replaces v1's placeholder medication/interaction logic with real supplement↔drug and supplement↔supplement detection, surfaced (safety-framed) across Stack Evaluation, Protocol Builder, and Library.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v2
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-15
> **Status**: Draft
> **Planning Doc**: [medication-interactions.plan.md](../../01-plan/features/medication-interactions.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema (entities in `src/types`) | ✅ (extends existing) |
| Phase 2 | Coding Conventions (v1 established) | ✅ |
| Phase 3 | Mockup | N/A (reuses existing flag/card UI) |
| Phase 4 | API Spec | §4 below |

---

## Context Anchor

> Copied from Plan document. Ensures strategic context survives Design→Do handoff.

| Key | Value |
|-----|-------|
| **WHY** | v1's medication conflict detection is a placeholder (`MED_CAUTION_IDS` set + generic copy); the most consequential safety question is unanswered. |
| **WHO** | Health nerds, biohackers, athletes, longevity users — especially the medicated subset, most exposed to interaction risk. |
| **RISK** | Curated gaps read as false reassurance; over-flagging erodes trust; brittle exact-name matching; findings perceived as medical advice. |
| **SUCCESS** | From meds + stack, generate accurate, severity-graded, safety-framed interaction findings across Stack Evaluation, Protocol Builder, and Library — deterministic & unit-tested. |
| **SCOPE** | Curated-seed engine + drug-class matching & med normalization + supp↔supp + Protocol Builder integration + Library display. No external API, no DB table, no condition engine. |

---

## 1. Overview

### 1.1 Design Goals

- Replace the two v1 placeholders (`stack-evaluator` `ruleMedicationCaution` + `protocol-builder` `hasMedicationCaution`) with a single real engine.
- Keep the engine **pure, deterministic, DB-agnostic, unit-tested** — parity with `lib/stack-evaluator`, `lib/protocol-builder`, `lib/product-matcher`.
- Reuse the existing flag pipeline + UI (`DraftFlag`/`EvaluationFlag`) so Stack Evaluation needs no new rendering layer.
- Make interaction knowledge curated **seed-as-code** (typed, Zod-validated), no new DB table / RLS.
- Never imply "safe": absence of a finding renders as "no known interaction in our dataset."

### 1.2 Design Principles

- **Single source of interaction truth** — one engine, consumed by three surfaces (evaluator, protocol-builder, library).
- **Safety language centralized** — all user-facing copy flows through `lib/safety` (extends `safetyCopy`); high-severity attaches a clinician-escalation disclaimer.
- **Warn, never block** — upholds v1's "user freedom first"; findings inform, they don't gate.
- **Pure & upgradeable** — data-driven seed today; an external source can slot behind the same engine API later with no consumer change (Plan §2.4).

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | Upgrade `ruleMedicationCaution` inline | Module + external-source adapter + service | Standalone pure module + thin finding→flag mapper |
| **New Files** | ~2 | ~7 | ~5 |
| **Modified Files** | ~5 | ~5 | ~5 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium | High | High |
| **Reusable in Protocol Builder + Library** | No | Yes | Yes |
| **Matches Plan §8** | No | Partial (adapter deferred) | Yes |
| **Recommendation** | Hotfix | Premature | **Default choice** |

**Selected**: **Option C — Pragmatic** — **Rationale**: Matches Plan §8 exactly and the `option-c-pragmatic` pattern all three v1 features used. Only low-churn option where one engine feeds all three surfaces. No explicit external-source adapter (kept pure/data-driven → upgradeable for free per Plan §2.4).

### 2.1 Component Diagram

```
                    ┌────────────────────────────┐
                    │  src/lib/interactions/     │   (Domain — PURE)
 Profile.meds  ───▶ │  normalize.ts → engine.ts  │ ──▶ InteractionFinding[]
 Stack items   ───▶ │  types.ts                  │
                    └─────────────┬──────────────┘
                                  │ reads
                    ┌─────────────▼──────────────┐
                    │ src/data/seed-interactions  │
                    │ src/data/medication-aliases │  (curated, Zod-validated)
                    └────────────────────────────┘
        findings → lib/safety (copy + escalation) → consumers:
   ┌───────────────┬──────────────────────┬────────────────────┐
   │ stack-evaluator│ protocol-builder     │ library/[slug]     │
   │ (finding→flag) │ (flag/demote suggest)│ ("Interactions")   │
   └───────────────┴──────────────────────┴────────────────────┘
```

### 2.2 Data Flow

```
meds[] + stackItems[]
  → normalize.ts (brand → generic → drug-class[])
  → engine.findInteractions() (match supp↔drug-class & supp↔supp rules)
  → InteractionFinding[] (severity, mechanism, management, evidence)
  → lib/safety (frame copy; high severity → escalation disclaimer)
  → { evaluator: map→DraftFlag | protocol: annotate | library: render }
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/interactions/engine` | `lib/interactions/normalize`, `seed-interactions`, types | Match rules |
| `lib/interactions/normalize` | `medication-aliases` | Resolve meds → drug classes |
| `lib/stack-evaluator` | `lib/interactions`, `lib/safety` | Merge findings as flags |
| `lib/protocol-builder` | `lib/interactions` | Flag/demote conflicting suggestions |
| `app/library/[slug]` | `lib/interactions`, `seed-interactions` | Render per-supplement interactions |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// src/types/interaction.ts — Domain layer (pure). No DB persistence (seed-as-code).

export type InteractionSeverity = "info" | "caution" | "warning" | "serious";

export type InteractionKind = "supplement-drug" | "supplement-supplement";

/** A curated rule in the seed dataset. */
export interface InteractionRule {
  id: string;
  kind: InteractionKind;
  supplementId: string;                 // FK → seed-supplements
  // supplement-drug: target a drug class (preferred) or a specific generic.
  drugClass?: string;                   // e.g. "anticoagulant"
  drugGeneric?: string;                 // e.g. "warfarin"
  // supplement-supplement: the other supplement.
  otherSupplementId?: string;
  severity: InteractionSeverity;
  mechanism: string;                    // short, factual
  management: string;                   // hedged guidance
  evidenceGrade: "A" | "B" | "C" | "D";
}

/** A finding produced by the engine for a specific user context. */
export interface InteractionFinding {
  ruleId: string;
  kind: InteractionKind;
  severity: InteractionSeverity;
  supplementId: string;
  // participant that triggered the match (drug class/generic name or other supplement name)
  counterpart: string;
  mechanism: string;
  management: string;
  evidenceGrade: "A" | "B" | "C" | "D";
}

/** Medication alias map entry. */
export interface MedicationAlias {
  canonical: string;                    // generic name, e.g. "warfarin"
  brands: string[];                     // e.g. ["coumadin", "jantoven"]
  drugClasses: string[];                // e.g. ["anticoagulant"]
}
```

### 3.2 Entity Relationships

```
[Supplement] 1 ──── N [InteractionRule] N ──── (drugClass | drugGeneric | otherSupplement)
[Profile.medications: string[]] ──normalize──▶ [MedicationAlias] ──▶ drugClasses[]
```

### 3.3 Database Schema

**None.** Interaction rules and medication aliases are **reference data**, stored as typed seed modules (`src/data/seed-interactions.ts`, `src/data/medication-aliases.ts`) and validated by a Zod schema at module load (dev/test). No Supabase table, no RLS — consistent with v1's seed-first decision and Plan §8.2. (`Profile.medications` remains the existing `string[]` column; no schema change.)

### 3.4 Type Extensions to Existing Entities

```typescript
// src/types/evaluation.ts — add ONE category for supplement↔supplement.
export type FlagCategory =
  | ...existing...
  | "medication-caution"   // reused for supplement↔drug findings
  | "interaction-risk";    // NEW — supplement↔supplement findings
```
`Protocol.medicationCaution: boolean` (existing) is retained; the engine now drives its value (and adds an optional `interactionNote?: string` for the demote rationale — additive, non-breaking).

---

## 4. API Specification

> No new HTTP endpoints. Interaction detection runs **server-side inside existing flows** (stack evaluate, protocol generate, library page render) — the engine is a pure function called by existing services/route handlers, mirroring how `stack-evaluator` and `protocol-builder` are invoked today.

### 4.1 Engine Surface (internal API)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `findInteractions` | `(input: { medications: string[]; stackItems: StackItem[] }) => InteractionFinding[]` | Core entry; supp↔drug + supp↔supp |
| `interactionsForSupplement` | `(supplementId: string) => InteractionRule[]` | Library page: all rules involving a supplement |
| `normalizeMedications` | `(meds: string[]) => { canonical: string; drugClasses: string[] }[]` | brand→generic→class; unresolved passthrough |

### 4.2 Existing endpoints affected (behavior change, contract stable)

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/stacks/[id]/evaluate` | Response `flags[]` now includes real `medication-caution` + `interaction-risk` flags (same `EvaluationFlag` shape) |
| POST | `/api/protocols/generate` (existing protocol flow) | Suggested items carry engine-driven `medicationCaution` + optional demote note |

**Error handling**: unresolved medication names never throw — they pass through and may surface an `info` "unrecognized medication" note; dataset load failure in dev throws via Zod (caught by tests), prod ships validated data.

---

## 5. UI/UX Design

### 5.1 Placement

- **Stack Evaluation** (`/stack-lab/[stackId]`): findings appear in the existing flag list — no new component. `interaction-risk` gets a label/badge alongside existing categories.
- **Protocol Builder** (suggestion cards): existing `medicationCaution` badge now reflects real findings; demoted items show the hedged rationale.
- **Library detail** (`/library/[slug]`): new "Interactions" section listing rules for that supplement.

### 5.2 User Flow

```
Profile (add meds, normalized autocomplete) → Stack Lab (build) → Evaluate
  → see Interaction Risk / Medication caution flags (severity-sorted)
Library → open supplement → "Interactions" section (drug classes + supp pairs)
Protocol generate → conflicting suggestions flagged/demoted with reason
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `InteractionSection` | `src/components/library/` | Render `interactionsForSupplement()` on detail page |
| (reuse) flag list | `src/components/stack/` | Already renders `EvaluationFlag[]`; gains `interaction-risk` label |
| (enhance) medication input | `src/components/profile/` | Autocomplete/normalize against alias map |

### 5.4 Page UI Checklist (v2.1.0)

#### Library supplement detail (`/library/[slug]`)
- [ ] Section: "Interactions" header (hidden if zero rules)
- [ ] List item per rule: counterpart name (drug class / generic / supplement)
- [ ] Badge: severity (info / caution / warning / serious) with distinct color
- [ ] Text: mechanism (factual, ≤1 line)
- [ ] Text: management note (hedged)
- [ ] Badge: evidence grade (A/B/C/D)
- [ ] Empty state: "No known interactions in our dataset" (NOT "safe")

#### Stack Evaluation flag list (`/stack-lab/[stackId]`)
- [ ] Flag card: `medication-caution` (supp↔drug) with severity, explanation, recommendation
- [ ] Flag card: `interaction-risk` (supp↔supp) with both supplement names
- [ ] Disclaimer banner: clinician-escalation rendered when any `critical` interaction flag present
- [ ] Severity sort: critical-first (existing behavior preserved)

#### Profile medications
- [ ] Input: medication add with alias-based suggestions (brand→generic hint)
- [ ] Indicator: unrecognized medication note (does not block save)

---

## 6. Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| n/a (pure) | — | Unresolved medication name | Pass through; optional `info` note; never throw |
| dev/test | Zod validation error | Malformed seed rule | Fail fast in dev/test; prod ships validated |
| 500 | Internal error | Engine called with bad input upstream | Existing route error envelope (unchanged) |

> The engine is side-effect-free and total: any input returns a (possibly empty) `InteractionFinding[]`. No new error envelope is introduced.

---

## 7. Security Considerations

- [x] Input validation — medications are user free-text; normalization is lookup-only (no injection surface); Zod-typed dataset.
- [x] No new auth surface — runs inside already-authenticated evaluate/protocol flows; reference data is non-sensitive (no RLS needed).
- [x] No PII leaves the server — engine is pure, in-process.
- [x] Safety/compliance — all copy via `lib/safety`; `containsBannedLanguage()` guard extended to new copy; high-severity → escalation disclaimer.
- [x] No external calls / no new env vars / no rate-limit surface.

---

## 8. Test Plan (v2.3.0)

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L0: Unit (core) | engine, normalize, finding→flag mapper, safety copy | Vitest | Do |
| L1: API | evaluate + protocol routes include real findings | Playwright request | Do |
| L3: E2E | meds → evaluate → see flags; library interactions section | Playwright | Do |

### 8.2 L0 Unit Scenarios (core — deterministic)

| # | Target | Scenario | Expected |
|---|--------|----------|----------|
| 1 | normalize | "Coumadin" → generic + class | `{canonical:"warfarin", drugClasses:["anticoagulant"]}` |
| 2 | normalize | unknown med | passthrough, no throw, flagged unresolved |
| 3 | engine | supp↔drug-class match (e.g. fish oil + anticoagulant) | one finding, correct severity/mechanism |
| 4 | engine | supp↔supplement match within stack | one `supplement-supplement` finding |
| 5 | engine | no meds, no pairs | `[]` (empty, not error) |
| 6 | engine | determinism | same input → identical output (deep-equal) |
| 7 | mapper | finding→DraftFlag | severity maps (serious/warning→critical|warning, caution→warning, info→info); category correct |
| 8 | safety | all new copy | `containsBannedLanguage()` === false |
| 9 | protocol | suggestion vs conflicting med | `medicationCaution===true`, item still present (not blocked) |

### 8.3 L1 API

| # | Endpoint | Test | Expected |
|---|----------|------|----------|
| 1 | POST `/api/stacks/[id]/evaluate` | stack+meds with known interaction | 200, `flags` contains `medication-caution` real finding |
| 2 | POST `/api/stacks/[id]/evaluate` | supp↔supp pair | 200, `flags` contains `interaction-risk` |
| 3 | protocol generate | profile with conflicting med | 200, suggested item flagged, not dropped |

### 8.4 L3 E2E

| # | Scenario | Steps | Success |
|---|----------|-------|---------|
| 1 | Interaction surfaced | Add med (Profile) → build stack → evaluate | Interaction flag visible, severity-sorted |
| 2 | Library interactions | Open supplement with rules | "Interactions" section renders rows + badges |
| 3 | Empty honesty | Open supplement with no rules | "No known interactions in our dataset" shown |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:------------:|---------------------|
| InteractionRule (supp↔drug) | ≥ 8 | supplementId, drugClass, severity, mechanism, management, evidenceGrade |
| InteractionRule (supp↔supp) | ≥ 3 | supplementId, otherSupplementId, severity, mechanism |
| MedicationAlias | ≥ 10 | canonical, brands[], drugClasses[] (cover meds referenced by rules) |

> Cover the 15 seed supplements where real interactions exist (e.g., fish oil/anticoagulants, berberine/antidiabetics, St. John's-class examples kept to seeded set, magnesium↔zinc absorption, caffeine↔theanine info-level, etc.). Curate conservatively — only well-documented pairs.

---

## 9. Clean Architecture

### 9.1 Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `InteractionRule`, `InteractionFinding`, `MedicationAlias` | Domain | `src/types/interaction.ts` |
| `engine.ts`, `normalize.ts` | Domain (pure) | `src/lib/interactions/` |
| `seed-interactions.ts`, `medication-aliases.ts` | Domain data | `src/data/` |
| finding→flag mapper | Domain (pure) | `src/lib/interactions/to-flags.ts` |
| safety copy extension | Domain (pure) | `src/lib/safety/index.ts` |
| `InteractionSection` | Presentation | `src/components/library/` |
| evaluate/protocol service wiring | Application | existing services / route handlers |

### 9.2 Dependency Rule

`lib/interactions` (Domain) imports **only** types + seed data — no DB, no React, no Supabase. Consumers (evaluator, protocol-builder, library) depend inward on it. Matches v1's rule: Domain is independent.

---

## 10. Coding Conventions

Reuse v1 conventions: PascalCase components, camelCase utils, kebab-case folders, `NEXT_PUBLIC_`/server env split, Zod for dataset validation, Design-ref comments (`// Design Ref: §N`) on key logic, `// Plan SC:` on safety-critical paths. No new env vars.

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── types/
│   └── interaction.ts              # NEW domain types
│   └── evaluation.ts               # MOD: add "interaction-risk" category
├── lib/
│   ├── interactions/               # NEW pure module
│   │   ├── index.ts                # findInteractions, interactionsForSupplement
│   │   ├── normalize.ts            # medication normalization
│   │   ├── to-flags.ts             # InteractionFinding[] → DraftFlag[]
│   │   ├── schema.ts               # Zod validation of seed data
│   │   └── interactions.test.ts    # L0 unit
│   ├── safety/index.ts             # MOD: interaction copy + escalation
│   ├── stack-evaluator/rules.ts    # MOD: replace ruleMedicationCaution placeholder
│   └── protocol-builder/rules.ts   # MOD: replace hasMedicationCaution / MED_CAUTION_IDS
├── data/
│   ├── seed-interactions.ts        # NEW
│   └── medication-aliases.ts       # NEW
├── components/
│   └── library/InteractionSection.tsx   # NEW
│   └── profile/ (med input)        # MOD: normalization hint
└── app/library/[slug]/page.tsx     # MOD: render InteractionSection
```

### 11.2 Implementation Order

1. [ ] `types/interaction.ts` + `evaluation.ts` category extension
2. [ ] `data/medication-aliases.ts` + `data/seed-interactions.ts` + `lib/interactions/schema.ts` (Zod)
3. [ ] `lib/interactions/normalize.ts` + unit tests
4. [ ] `lib/interactions/index.ts` (engine) + unit tests
5. [ ] `lib/interactions/to-flags.ts` + `lib/safety` copy + unit tests
6. [ ] Wire `stack-evaluator/rules.ts` (replace placeholder) + `protocol-builder/rules.ts`
7. [ ] `InteractionSection` + library page + profile med input hint
8. [ ] L1/L3 Playwright specs

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| Engine core | `module-1` | types, datasets, schema, normalize, engine, to-flags, safety copy + all L0 unit tests | 40-50 |
| Surface integration | `module-2` | evaluator + protocol-builder wiring, Library section, profile input, L1/L3 tests | 40-50 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | full | done |
| Session 2 | Do | `--scope module-1` | 40-50 |
| Session 3 | Do | `--scope module-2` | 40-50 |
| Session 4 | Check + Report | full | 30-40 |

### 11.4 Key Algorithm — `findInteractions` (`lib/interactions/index.ts`)

```
1. normalized = normalizeMedications(input.medications)
     → for each med: lower/trim, match brands → canonical, gather drugClasses
2. supp↔drug: for each stackItem.supplementId:
     for each rule where kind="supplement-drug" && rule.supplementId matches:
       if (rule.drugClass ∈ normalized.drugClasses) OR
          (rule.drugGeneric ∈ normalized.canonicals) → emit finding(counterpart=class/generic)
3. supp↔supp: for each unordered pair of stack supplementIds:
     for each rule where kind="supplement-supplement" matching the pair → emit finding
4. dedupe by ruleId; sort by severity (serious→info)
5. return InteractionFinding[]   // pure, deterministic
```
Severity → flag mapping (`to-flags.ts`): `serious → critical`, `warning → critical` (supp↔drug warning is safety-relevant) / `warning → warning` (supp↔supp), `caution → warning`, `info → info`. Any `critical` flag triggers the clinician-escalation disclaimer in the evaluator summary.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-15 | Initial Design (Option C selected) | benhwang121@gmail.com |
