---
template: design
version: 1.3
feature: evidence-grading
date: 2026-06-16
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v5
---

# evidence-grading Design Document

> **Summary**: A dedicated pure `lib/evidence-grading` module that scores an effect's curated `evidenceProfile` across 5 dimensions, computes a deterministic composite, and **derives** the A/B/C/D grade. `lib/evidence` pre-resolves each effect's grade once when building `defaultLibrary`, so every v1–v4 consumer keeps reading `effect.grade` unchanged. Library effect cards gain a per-dimension breakdown with citations; ranking can use the finer composite. Architecture **Option C (Pragmatic)**.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v5 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-16
> **Status**: Draft
> **Planning Doc**: [evidence-grading.plan.md](../../01-plan/features/evidence-grading.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Single-letter effect grades are opaque and untraceable; the product's promise is evidence *navigability*, not a black-box score. |
| **WHO** | Evidence-literate health-nerd / biohacker / longevity users who scrutinize *why* a claim is graded as it is. |
| **RISK** | Derived grade disagreeing with curated intent; breaking the load-bearing `grade` 4 milestones consume; over-engineering the model; citations that don't support their dimension. |
| **SUCCESS** | Profiled effects expose an inspectable, citation-backed dimension breakdown; derived grade matches curated intent; all consumers keep working; ranking can use the composite; deterministic & unit-tested. |
| **SCOPE** | `evidenceProfile` model + pure `lib/evidence-grading` + grade resolution in `lib/evidence` + seed subset + Library breakdown UI + composite re-ranking + per-dimension citations. No population-adjusted grades, no AI drafting (v6). |

---

## 1. Overview

### 1.1 Design Goals
- Replace an opaque letter with a **transparent, multi-dimensional, traceable** evidence judgment — without rewriting the four shipped milestones that consume `grade`.
- Keep grading a **pure, deterministic, seed-as-code** concern, mirroring `lib/biomarkers` / `lib/lab-trends`.
- Make the derived grade **honest**: it must reproduce curated intent for every profiled effect (integrity-tested).

### 1.2 Design Principles
- **Single resolved grade**: `lib/evidence` resolves `grade` once (derive from profile if present, else literal); consumers are oblivious.
- **Additive, backward-compatible**: `evidenceProfile` is optional; profile-less effects behave exactly as today.
- **Determinism**: composite + derivation are pure functions of the profile.
- **Secondary-key ranking**: composite refines ordering but never overrides the grade contract (grade fallback).
- **Traceability**: each dimension cites the seed papers that justify its score.

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Grading logic** | inline in `lib/evidence` | dedicated module + service layer | dedicated `lib/evidence-grading` module |
| **Grade resolution** | lazy at each call site | explicit service | **pre-resolved once in `defaultLibrary`** |
| **New Files** | ~3 | ~7 | ~5 |
| **Consumer rewrite** | some | minimal | **none** |
| **Complexity** | Low | High | Medium |
| **Matches codebase pattern** | partial | yes | **yes** |
| **Risk** | Medium (scattered) | Low | **Low** |
| **Recommendation** | quick | over-structured | **Selected** |

**Selected**: Option C — **Rationale**: The codebase isolates each knowledge concern in a pure module (`lib/biomarkers`, `lib/interactions`, `lib/lab-trends`); a scoring rubric deserves the same — so `lib/evidence-grading` is its own module (rules out A's inline approach). But integration stays pragmatic: pre-resolving the grade once in `defaultLibrary` means zero consumer rewrite and the lowest regression surface, while B's full service layer is over-engineering for a pure function over seed data.

### 2.1 Component Diagram
```
seed-effects (+ evidenceProfile, subset)
        │
        ▼
┌────────────────────┐   resolveEffect()    ┌─────────────────────┐
│ lib/evidence       │ ───────────────────▶ │ lib/evidence-grading │ (PURE)
│ defaultLibrary     │   deriveGrade        │ compositeScore       │
│ effects pre-resolved│ ◀─────────────────── │ deriveGrade          │
│ effectComposite()  │   composite          │ gradeBreakdown       │
└─────────┬──────────┘                      └─────────────────────┘
          │ resolved grade (+ optional composite)
   ┌──────┴───────────────────────────────────┐
   ▼                  ▼                         ▼
stack-evaluator   protocol-builder      Library SupplementDetail
(evidence-fit)    (rank by composite,   EffectGradeBadge (letter)
                   grade fallback)      + EvidenceBreakdown (dims + citations)
```

### 2.2 Data Flow
```
seed effect (+ evidenceProfile?)
  → lib/evidence builds defaultLibrary: effects = SEED_EFFECTS.map(resolveEffect)
       resolveEffect: grade = profile ? deriveGrade(profile) : literal grade
  → consumers read effect.grade (resolved) exactly as before
  → lib/evidence-grading.gradeBreakdown(profile) → per-dimension view
  → Library renders breakdown + per-dimension citations
  → protocol-builder/stack-evaluator order by effectComposite(effect) (fallback grade)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/evidence-grading` | `@/types` only | Pure scoring; no I/O |
| `lib/evidence` | `lib/evidence-grading` | Resolve grade + expose composite |
| `protocol-builder` / `stack-evaluator` | `lib/evidence` (`effectComposite`) | Composite secondary ranking key |
| `EvidenceBreakdown` | `lib/evidence-grading` (`gradeBreakdown`), `lib/evidence` (`getPaperById`) | Render dimensions + citations |

---

## 3. Data Model

### 3.1 Entity Definition
```typescript
// src/types/evidence-grading.ts (or extend effect.ts)
export type EvidenceDimension =
  | "humanEvidence"      // human (vs animal/in-vitro) evidence strength
  | "studyQuality"       // RCT/blinding/size/risk-of-bias
  | "consistency"        // agreement of findings across studies
  | "effectSize"         // magnitude/practical relevance
  | "populationRelevance"; // applicability to general/target population

export const EVIDENCE_DIMENSIONS: readonly EvidenceDimension[] = [
  "humanEvidence", "studyQuality", "consistency", "effectSize", "populationRelevance",
] as const;

export type DimensionRating = 0 | 1 | 2 | 3; // none / weak / moderate / strong

export interface DimensionScore {
  score: DimensionRating;
  rationale: string;     // short, factual, non-diagnostic
  paperIds: string[];    // seed papers justifying THIS dimension (citations)
}

export interface EvidenceProfile {
  dimensions: Record<EvidenceDimension, DimensionScore>;
}

// Per-dimension view returned to the UI.
export interface DimensionBreakdown {
  dimension: EvidenceDimension;
  label: string;          // "Human evidence"
  score: DimensionRating;
  ratingLabel: string;    // none | weak | moderate | strong
  rationale: string;
  paperIds: string[];
}
```

### 3.2 Effect extension (additive)
```typescript
// src/types/effect.ts
export interface Effect {
  // …existing fields (grade, confidence, summary, studiedDose, paperIds, …)
  evidenceProfile?: EvidenceProfile;   // NEW — optional; absent = legacy behavior
}
```

### 3.3 Scoring rubric (pure, in `lib/evidence-grading/weights.ts`)
```typescript
export const DIMENSION_WEIGHTS: Record<EvidenceDimension, number> = {
  humanEvidence: 0.30, studyQuality: 0.25, consistency: 0.20,
  effectSize: 0.15, populationRelevance: 0.10,           // Σ = 1.0
};

// composite = Σ_d  weight[d] × (score[d] / 3)            ∈ [0, 1]
export const GRADE_THRESHOLDS: { min: number; grade: EvidenceGrade }[] = [
  { min: 0.75, grade: "A" }, { min: 0.55, grade: "B" },
  { min: 0.35, grade: "C" }, { min: 0.0,  grade: "D" },
];
```
> No DB. Evidence remains seed-as-code reference data (parity with `lib/biomarkers`).

---

## 4. API Specification

No new HTTP endpoints. Grading is a pure domain concern surfaced via existing Library Server Components and the existing `/api/protocol/generate` + `/api/stacks/:id/evaluate` routes (whose outputs now reflect composite-aware ranking). The module's public surface:

```typescript
// lib/evidence-grading
compositeScore(profile: EvidenceProfile): number;          // [0,1]
deriveGrade(profile: EvidenceProfile): EvidenceGrade;       // A/B/C/D
gradeBreakdown(profile: EvidenceProfile): DimensionBreakdown[];
validateProfile(profile: EvidenceProfile): boolean;         // shape + paperIds present

// lib/evidence (additions)
resolveEffect(effect: Effect): Effect;                      // grade = derived ?? literal
effectComposite(effect: Effect): number | null;             // composite if profiled, else null
```

---

## 5. UI/UX Design

### 5.1 Placement
The Library `SupplementDetail` → **Effects tab** already renders each effect with `EffectGradeBadge`. v5 adds an expandable `EvidenceBreakdown` beneath the badge for profiled effects.

```
Effects tab
  ┌──────────────────────────────────────────────┐
  │ Strength & power output   [A · Strong]        │  ← existing badge (resolved grade)
  │ summary…                                       │
  │ ▸ Evidence breakdown                           │  ← NEW, expandable (profiled only)
  │     Human evidence    ███ strong   [2 papers]  │
  │     Study quality     ███ strong   [2 papers]  │
  │     Consistency       ██  moderate [1 paper]   │
  │     Effect size       ██  moderate [1 paper]   │
  │     Population fit     ███ strong   [1 paper]   │
  └──────────────────────────────────────────────┘
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `EvidenceBreakdown` | `src/components/evidence/EvidenceBreakdown.tsx` | Render `gradeBreakdown(profile)` — per-dimension rating bar + rationale + citation links; hidden when no profile |
| `EffectGradeBadge` | (existing) | Unchanged — shows the resolved letter |
| `SupplementDetail` (EffectsTab) | (existing, modify) | Wire `EvidenceBreakdown` under each profiled effect |

### 5.4 Page UI Checklist

#### Library — Supplement detail, Effects tab
- [ ] Badge: existing `EffectGradeBadge` shows the **resolved** grade (derived when profiled)
- [ ] Section: "Evidence breakdown" appears **only** for effects with an `evidenceProfile`
- [ ] Per dimension (×5): label + rating bar (none/weak/moderate/strong) + rationale text
- [ ] Per dimension: citation chip(s) linking to the paper(s) backing that dimension
- [ ] Legacy effects (no profile): render exactly as today (no breakdown, no regression)

---

## 6. Error Handling

Pure module — failure modes are data-integrity, caught at test/validation time, not runtime HTTP:

| Case | Handling |
|------|----------|
| Profile missing a dimension | `validateProfile` fails → integrity test red (never ships) |
| `paperIds` referencing unknown papers | integrity test cross-checks against `SEED_PAPERS` |
| Derived grade ≠ curated intent | integrity test asserts equality per profiled effect |
| Effect with no profile | `resolveEffect` returns it unchanged (literal grade) |

---

## 7. Security Considerations
- No new endpoints, no user input, no DB, no PII. Pure functions over curated seed data.
- All dimension copy is curated and non-diagnostic (Plan FR-09); banned-language sweep extended to dimension rationales.

---

## 8. Test Plan

### 8.1 Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| Unit | `compositeScore`, `deriveGrade`, `gradeBreakdown`, `validateProfile` | Vitest | Do |
| Unit | `resolveEffect`, `effectComposite` in `lib/evidence` | Vitest | Do |
| Integrity | seeded profiles: shape, paperIds real, derived == curated grade | Vitest | Do |
| Unit | protocol/evaluator composite ranking (+ fallback) | Vitest | Do |
| L2 | Library breakdown renders for a profiled effect; absent for legacy | Playwright | Do |

### 8.2 Unit Test Scenarios

| # | Test | Expected |
|---|------|----------|
| 1 | `compositeScore` weighted sum | matches hand-computed value; ∈ [0,1] |
| 2 | `deriveGrade` thresholds | 0.95→A, 0.62→B, 0.37→C, 0.2→D (boundary-tested) |
| 3 | Determinism | identical profile → identical composite & grade |
| 4 | `resolveEffect` profiled | `grade === deriveGrade(profile)` |
| 5 | `resolveEffect` legacy | grade unchanged (literal) |
| 6 | `effectComposite` legacy | returns `null` |
| 7 | Integrity: every seeded profile | full dimensions; `paperIds ⊆ SEED_PAPERS`; derived == seeded grade |
| 8 | Protocol ranking | composite breaks ties within equal grade; grade still dominates across grades |
| 9 | Non-diagnostic | dimension rationales pass banned-language sweep |

### 8.3 L2 Scenarios

| # | Page | Action | Expected |
|---|------|--------|----------|
| 1 | `/library/[slug]` (profiled effect, e.g. creatine) | open Effects tab, expand breakdown | 5 dimensions + citations visible |
| 2 | `/library/[slug]` (legacy effect) | open Effects tab | grade badge only; no breakdown |

### 8.5 Seed Data Requirements

| Entity | Min | Key fields |
|--------|:---:|-----------|
| Profiled effects | ≥6 (across ≥4 supplements, spanning A/B/C) | full `evidenceProfile` with real `paperIds` |
| Papers | reuse `SEED_PAPERS` | each cited dimension references an existing paper |

---

## 9. Clean Architecture

### 9.4 Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `EvidenceDimension`, `EvidenceProfile`, `DimensionBreakdown` | Domain | `src/types/evidence-grading.ts` |
| `lib/evidence-grading` (composite/derive/breakdown/validate) | Domain (pure) | `src/lib/evidence-grading/` |
| grade resolution / `effectComposite` | Domain (pure) | `src/lib/evidence/index.ts` |
| seed profiles | Domain (data) | `src/data/seed-effects.ts` |
| `EvidenceBreakdown`, EffectsTab wiring | Presentation | `src/components/evidence/`, `library/` |

> Dependency rule honored: `lib/evidence-grading` imports only types; `lib/evidence` depends inward on it. No outward dependency.

---

## 10. Coding Convention Reference

| Item | Convention |
|------|-----------|
| Module naming | kebab-case folder, camelCase fns (`compositeScore`) |
| Components | PascalCase (`EvidenceBreakdown.tsx`) |
| Types | `src/types/evidence-grading.ts` |
| Comments | `// Design Ref: §N` + `// Plan SC: …` at module heads (matches v2–v4) |
| No new env vars / deps | grading is pure; the v4 SDK is NOT used in v5 |

---

## 11. Implementation Guide

### 11.1 File Structure
```
src/types/evidence-grading.ts            # dimensions, profile, breakdown
src/lib/evidence-grading/
  weights.ts                             # DIMENSION_WEIGHTS, GRADE_THRESHOLDS, labels
  index.ts                               # compositeScore, deriveGrade, gradeBreakdown, validateProfile
  evidence-grading.test.ts
src/types/effect.ts                      # + evidenceProfile?
src/data/seed-effects.ts                 # ≥6 effects gain evidenceProfile
Modify:
  src/lib/evidence/index.ts              # resolveEffect, pre-resolve defaultLibrary, effectComposite,
                                         #   getBestEffectForOutcome composite tiebreak
  src/lib/protocol-builder/index.ts+rules.ts   # composite secondary key in compareSuggestions
  src/lib/stack-evaluator/rules.ts       # evidence-fit composite-aware (optional, fallback grade)
  src/components/evidence/EvidenceBreakdown.tsx (new)
  src/components/library/SupplementDetail.tsx   # wire breakdown into EffectsTab
  src/lib/evidence/evidence.test.ts + protocol/evaluator tests  # extend
```

### 11.2 Implementation Order
1. [ ] `types/evidence-grading.ts` + `lib/evidence-grading` (weights, composite, derive, breakdown, validate) + unit tests
2. [ ] `Effect.evidenceProfile`; seed ≥6 profiles; integrity test (derived == curated, citations real)
3. [ ] `lib/evidence`: `resolveEffect`, pre-resolve `defaultLibrary`, `effectComposite`, composite tiebreak
4. [ ] Protocol/evaluator composite ranking (fallback grade) + extend tests
5. [ ] `EvidenceBreakdown` + SupplementDetail wiring + L2
6. [ ] tsc clean · next build green · full suite green (no v1–v4 regression)

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Est. Turns |
|--------|-----------|-------------|:---------:|
| Rubric engine + seed | `module-1` | `types/evidence-grading`, `lib/evidence-grading`, `Effect.evidenceProfile`, seed ≥6 + integrity test | 35–45 |
| Resolution + ranking | `module-2` | `lib/evidence` resolve/pre-resolve/`effectComposite`, protocol/evaluator composite ranking, tests | 30–40 |
| Library UI | `module-3` | `EvidenceBreakdown` + SupplementDetail wiring + per-dimension citations + L2 | 25–35 |

#### Recommended Session Plan

| Session | Phase | Scope |
|---------|-------|-------|
| 1 | Plan + Design | done |
| 2 | Do | `--scope module-1` |
| 3 | Do | `--scope module-2` |
| 4 | Do | `--scope module-3` |
| 5 | Check + QA + Report | full |

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-16 | Initial design (Option C — Pragmatic) for evidence-grading | benhwang121@gmail.com |
</content>
