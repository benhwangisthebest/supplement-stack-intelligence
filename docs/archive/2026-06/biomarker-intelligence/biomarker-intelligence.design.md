---
template: design
version: 1.3
feature: biomarker-intelligence
date: 2026-06-15
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v3
---

# biomarker-intelligence Design Document

> **Summary**: A pure, deterministic `lib/biomarkers` engine + curated biomarker registry & relevance datasets that replaces v1's naive lab string-matching with a real biomarker→supplement knowledge layer — driving Stack Evaluation, lab-weighted Protocol ranking, and a Library biomarker-relevance section.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v3
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-15
> **Status**: Draft
> **Planning Doc**: [biomarker-intelligence.plan.md](../../01-plan/features/biomarker-intelligence.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema (`src/types`) | ✅ (extends existing) |
| Phase 2 | Conventions (v1/v2 established) | ✅ |
| Phase 3 | Mockup | N/A (reuses flag UI; one new section) |
| Phase 4 | API Spec | §4 below |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v1's lab handling is naive string-matching (`ruleLabRelevance`/`isLabBoosted`); real biomarker→supplement relevance never fires, so personalization is hollow. |
| **WHO** | Health nerds/biohackers/longevity users — especially those who track blood work. |
| **RISK** | Wrong unit comparison (ng/mL vs nmol/L) → false flags; diagnostic language; coverage gaps read as "nothing relevant"; over-boosting on weak signals. |
| **SUCCESS** | Accurate, unit-correct, explainable biomarker findings across Evaluation, Protocol ranking, and Library — deterministic & unit-tested. |
| **SCOPE** | Curated-seed engine + unit normalization + lab-weighted protocol ranking + Library section + Profile autocomplete. No DB table, no file parsing, no LOINC. |

---

## 1. Overview

### 1.1 Design Goals
- Replace the naive lab logic (`ruleLabRelevance`, `isLabBoosted`) with one real, pure engine.
- Keep the engine **pure, deterministic, DB-agnostic, unit-tested** — parity with `lib/interactions`.
- **Unit correctness is safety-critical**: convert values to a biomarker's canonical unit before any range comparison.
- Reuse the existing `lab-relevance` flag pipeline (no new flag UI) and the existing "✦ lab" badge.
- Knowledge is curated **seed-as-code** (Zod-validated); no new DB table.

### 1.2 Design Principles
- **Single source of biomarker truth** — one engine for evaluator, protocol, Library.
- **Safety language centralized** — all copy via `lib/safety`; non-diagnostic ("may be relevant", never "you are deficient").
- **Boost and demote** — lab signal is a bounded number, not a boolean: deficient→positive, replete/high-caution→negative.
- **Honest absence** — no finding never implies "everything is fine."

---

## 2. Architecture Options (v1.7.0)

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | Rewire rules in place; `isLabBoosted` stays boolean | Engine + value objects + comparator refactor + adapters | Pure module; `labBoost` bounded signal; additive `labSignal`+`labRationale` |
| **New Files** | ~5 | ~9 | ~6 |
| **Modified Files** | ~4 | ~7 | ~6 |
| **Boost AND demote** | No | Yes | Yes |
| **Powers Library section** | Partial | Yes | Yes |
| **Matches Plan §8** | No | Over-built | Yes |
| **Recommendation** | — | — | **Default** |

**Selected**: **Option C — Pragmatic** — **Rationale**: Mirrors the `option-c-pragmatic` pattern of all four prior features and matches Plan §8. One engine feeds three surfaces; lab signal becomes a bounded number (enabling demote) while the existing `labBoosted` boolean is derived for the current badge, keeping `SuggestionCard` untouched.

### 2.1 Component Diagram

```
                     ┌─────────────────────────────┐
 Profile labMarkers ─│  src/lib/biomarkers/        │  (Domain — PURE)
 (value, unit,       │  normalize → units → engine │ ─▶ LabFinding[] / labBoost / registry
  refLow/High)       │  types                      │
 Stack supplements ─ └──────────────┬──────────────┘
                                    │ reads
                     ┌──────────────▼──────────────┐
                     │ data/seed-biomarkers         │
                     │ data/seed-biomarker-relevance│  (curated, Zod-validated)
                     └─────────────────────────────┘
   findings/signals → lib/safety (copy) → consumers:
   ┌────────────────┬──────────────────────┬─────────────────────────┐
   │ stack-evaluator│ protocol-builder      │ library/[slug]          │
   │ (ruleLabRel.)  │ (labBoost → ranking)  │ (BiomarkerRelevance)    │
   └────────────────┴──────────────────────┴─────────────────────────┘
```

### 2.2 Data Flow

```
labMarker (value, unit, refLow?, refHigh?)
  → normalize.ts (marker name → canonical biomarkerId)
  → units.ts (value+unit → canonical unit)
  → status: low | in-range | high  (prefer user refLow/High, else registry ranges)
  → engine: match relevance rules (biomarkerId + trigger) vs stack supplements
  → LabFinding[]  +  labBoost(supplementId) signal
  → lib/safety (copy) → { evaluator: lab-relevance flag | protocol: ranking | library: section }
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `lib/biomarkers/engine` | normalize, units, seed datasets, types | Findings + lab signal |
| `lib/biomarkers/units` | seed-biomarkers (conversions) | Canonical-unit conversion |
| `lib/stack-evaluator` | `lib/biomarkers`, `lib/safety` | Engine-backed `ruleLabRelevance` |
| `lib/protocol-builder` | `lib/biomarkers` | `labBoost` ranking signal |
| `app/library/[slug]` | `lib/biomarkers` | Biomarker-relevance section |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// src/types/biomarker.ts — Domain (pure). Seed-as-code, no DB persistence.
import type { EvidenceGrade } from "./index";

export type BiomarkerDirection = "low" | "high"; // which side triggers relevance
export type BiomarkerRelation = "support" | "caution";

/** Canonical biomarker registry entry. */
export interface Biomarker {
  id: string;                       // e.g. "ferritin", "vitamin-d-25oh", "ldl"
  name: string;                     // display name
  aliases: string[];                // free-text variants, e.g. ["serum ferritin"]
  canonicalUnit: string;            // e.g. "ng/mL"
  unitConversions: Record<string, number>; // unit → factor to canonical (canonicalUnit factor = 1)
  refLow: number | null;            // population reference (canonical unit)
  refHigh: number | null;
}

/** Curated biomarker↔supplement relevance rule. */
export interface BiomarkerRelevanceRule {
  id: string;
  biomarkerId: string;              // FK → seed-biomarkers
  supplementId: string;             // FK → SEED_SUPPLEMENTS
  trigger: BiomarkerDirection;      // low → marker below range; high → above
  relation: BiomarkerRelation;      // support (may help) | caution (may worsen)
  evidenceGrade: EvidenceGrade;
  rationale: string;                // short, factual, hedged
}

/** Per-context finding produced by the engine (evaluator surface). */
export interface LabFinding {
  ruleId: string;
  biomarkerId: string;
  biomarkerName: string;
  supplementId: string;
  status: "low" | "high";           // the user's marker status that triggered it
  relation: BiomarkerRelation;
  rationale: string;
  evidenceGrade: EvidenceGrade;
}

/** Bounded lab ranking signal for one supplement (protocol surface). */
export interface LabSignal {
  score: number;                    // bounded, e.g. [-1, 1]: + boost, − demote
  biomarkerName: string | null;     // top contributing marker
  rationale: string | null;         // explainable note
}
```

### 3.2 Entity Relationships

```
[Biomarker] 1 ── N [BiomarkerRelevanceRule] N ── 1 [Supplement]
[LabMarker.marker:string] ──normalize──▶ [Biomarker.id]
[LabMarker.(value,unit)] ──units──▶ canonical value ──vs ranges──▶ status
```

### 3.3 Database Schema

**None.** Biomarker registry and relevance rules are **reference data** in typed seed modules (`src/data/seed-biomarkers.ts`, `src/data/seed-biomarker-relevance.ts`), Zod-validated. The existing `lab_markers` table (user data, RLS) is unchanged. Consistent with v1/v2 seed-first.

### 3.4 Type Extensions to Existing Entities

```typescript
// src/types/protocol.ts — ProtocolSuggestion gains additive lab fields.
export interface ProtocolSuggestion {
  // ...existing...
  labBoosted: boolean;        // RETAINED — derived (labSignal.score > 0); keeps "✦ lab" badge
  labSignal?: number;         // NEW — bounded signal used for ranking (+boost / −demote)
  labRationale?: string | null; // NEW — explainable lab note
}
```
`LabMarker` (existing) is unchanged. The `lab-relevance` `FlagCategory` (existing) is reused.

---

## 4. API Specification

> No new HTTP endpoints. The engine runs **server-side inside existing flows** (stack evaluate, protocol generate, library page render) as a pure function — mirroring `lib/interactions`.

### 4.1 Engine Surface (internal API)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `assessLabMarkers` | `({ labMarkers: LabMarker[]; stackItems: StackItem[] }) => LabFinding[]` | Evaluator findings |
| `labBoost` | `(supplementId: string, labMarkers: LabMarker[]) => LabSignal` | Protocol ranking signal |
| `biomarkersForSupplement` | `(supplementId: string) => { biomarker: Biomarker; rule: BiomarkerRelevanceRule }[]` | Library section |
| `normalizeMarker` | `(name: string) => string \| null` | Marker name → canonical biomarkerId |
| `toCanonical` | `(value: number, unit: string, biomarker: Biomarker) => number \| null` | Unit conversion (null if unknown unit) |

### 4.2 Existing endpoints affected (behavior change, contract stable)

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/stacks/[id]/evaluate` | `flags[]` now includes real biomarker-driven `lab-relevance` flags (same shape) |
| POST | protocol generate | Suggestions ranked by `labSignal`; carry `labRationale` (additive fields) |

**Error handling**: unknown marker names or units never throw — they skip the comparison (no wrong flag) and may surface an `info` "unrecognized marker" note. Dataset load failure throws via Zod in dev/test only.

---

## 5. UI/UX Design

### 5.1 Placement
- **Stack Evaluation** (`/stack-lab/[stackId]`): lab findings appear in the existing flag list — no new component.
- **Protocol Builder** (suggestion cards): existing "✦ lab" badge now reflects the engine; ranking reflects `labSignal`; `labRationale` shown where present.
- **Library detail** (`/library/[slug]`): new "Relevant biomarkers" section.
- **Profile lab entry** (`LabMarkerTable`): marker autocomplete + unit/range auto-fill.

### 5.2 User Flow
```
Profile → add lab marker (autocomplete fills unit + suggested range)
  → Stack Lab → evaluate → see lab-relevance flags (low+support→info, high+caution→warning)
Library → open supplement → "Relevant biomarkers" section
Protocol generate → deficient-marker supplements ranked higher with lab rationale
```

### 5.3 Component List
| Component | Location | Responsibility |
|-----------|----------|----------------|
| `BiomarkerRelevanceSection` | `src/components/library/` | Render `biomarkersForSupplement()` |
| (enhance) `LabMarkerTable` | `src/components/profile/` | Marker autocomplete + unit/range auto-fill |
| (reuse) flag list | `src/components/stack/` | Renders `lab-relevance` flags already |
| (reuse) `SuggestionCard` | `src/components/stack/` | "✦ lab" badge from derived `labBoosted` |

### 5.4 Page UI Checklist (v2.1.0)

#### Library supplement detail (`/library/[slug]`)
- [ ] Section: "Relevant biomarkers" header (always shown)
- [ ] List item per rule: biomarker name
- [ ] Badge: trigger direction (when low / when high)
- [ ] Badge: relation (support / caution) with distinct color
- [ ] Text: rationale (hedged)
- [ ] Badge: evidence grade (A/B/C/D)
- [ ] Empty state: "No biomarkers linked to this supplement in our dataset" (NOT "nothing to check")

#### Profile lab entry (`LabMarkerTable`)
- [ ] Input: Marker field with datalist autocomplete from registry
- [ ] On known marker: unit field auto-fills canonical unit
- [ ] On known marker: ref low/high auto-fill from registry (user can override)

#### Stack Evaluation flag list
- [ ] Flag: `lab-relevance` info (low marker + support) — "supported by your labs"
- [ ] Flag: `lab-relevance` warning (high marker + caution) — "lab value worth reviewing"

---

## 6. Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| n/a (pure) | — | Unknown marker name | Skip; optional info note; never throw |
| n/a (pure) | — | Unknown/again unit | Skip range comparison (no wrong flag) |
| dev/test | Zod validation error | Malformed seed | Fail fast in dev/test |
| 500 | Internal error | Upstream bad input | Existing route envelope (unchanged) |

> The engine is total: any input returns a (possibly empty) `LabFinding[]` and a zero `LabSignal`.

---

## 7. Security Considerations

- [x] Input validation — marker/unit are user free-text; lookups only (no injection surface); Zod-typed datasets.
- [x] No new auth surface — runs inside authenticated evaluate/protocol flows; reference data non-sensitive (no RLS).
- [x] No PII leaves server — engine is pure, in-process.
- [x] Safety/compliance — all copy via `lib/safety`; `containsBannedLanguage()` guard extended; non-diagnostic.
- [x] No external calls / no new env vars.

---

## 8. Test Plan (v2.3.0)

### 8.1 Test Scope
| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L0: Unit | engine, normalize, **units (both directions)**, labBoost, finding→flag | Vitest | Do |
| L1: API | evaluate + protocol include real lab findings/ranking | Playwright request | Do |
| L3: E2E | Library biomarker section; profile autocomplete | Playwright | Do |

### 8.2 L0 Unit Scenarios (core — deterministic)
| # | Target | Scenario | Expected |
|---|--------|----------|----------|
| 1 | normalize | "Serum Ferritin" → "ferritin" | canonical id |
| 2 | normalize | unknown marker | null (no throw) |
| 3 | units | 25-OH-D 75 nmol/L → ng/mL | ~30 ng/mL (factor) |
| 4 | units | unknown unit | null → comparison skipped |
| 5 | engine | low ferritin + iron in stack | one `low`/`support` finding |
| 6 | engine | high LDL + berberine in stack | finding (support, high trigger) |
| 7 | engine | range precedence | user refLow used over registry |
| 8 | labBoost | deficient marker supports supplement | score > 0 + rationale |
| 9 | labBoost | replete/high-caution | score < 0 (demote) |
| 10 | engine | determinism | identical input → identical output |
| 11 | mapper | finding→DraftFlag | low+support→info, high+caution→warning |
| 12 | safety | all copy | `containsBannedLanguage()` === false |

### 8.3 L1 API
| # | Endpoint | Test | Expected |
|---|----------|------|----------|
| 1 | POST evaluate | stack+labs with known biomarker | 200, `flags` includes real `lab-relevance` |
| 2 | protocol generate | deficient marker | 200, relevant supplement ranked higher, `labRationale` present |

### 8.4 L3 E2E
| # | Scenario | Steps | Success |
|---|----------|-------|---------|
| 1 | Library biomarkers | open iron/fish-oil supplement | "Relevant biomarkers" section renders |
| 2 | Empty honesty | open a supplement with no rules | honest empty state shown |
| 3 | Autocomplete (authed) | Profile → type "Ferritin" | marker suggested; unit/range auto-fill |

### 8.5 Seed Data Requirements
| Entity | Minimum Count | Key Fields |
|--------|:------------:|-----------|
| Biomarker | ≥ 12 | id, aliases, canonicalUnit, unitConversions, refLow/High |
| BiomarkerRelevanceRule | ≥ 12 | biomarkerId, supplementId, trigger, relation, evidenceGrade, rationale |

> Cover biomarkers that map to the 15 seed supplements: 25-OH vitamin D→vitamin-d, ferritin→(iron n/a — use magnesium/zinc where seeded), RBC magnesium→magnesium, zinc→zinc, B12→vitamin-b12, HbA1c/fasting glucose & LDL→berberine/fish-oil, homocysteine→vitamin-b12, etc. Curate only well-supported links against the seeded supplement set.

---

## 9. Clean Architecture

### 9.1 Layer Assignment
| Component | Layer | Location |
|-----------|-------|----------|
| `Biomarker`, `BiomarkerRelevanceRule`, `LabFinding`, `LabSignal` | Domain | `src/types/biomarker.ts` |
| `engine.ts`, `normalize.ts`, `units.ts`, `to-flags.ts` | Domain (pure) | `src/lib/biomarkers/` |
| `seed-biomarkers.ts`, `seed-biomarker-relevance.ts` | Domain data | `src/data/` |
| safety copy extension | Domain (pure) | `src/lib/safety/index.ts` |
| `BiomarkerRelevanceSection` | Presentation | `src/components/library/` |
| evaluator/protocol wiring | Application | existing services |

### 9.2 Dependency Rule
`lib/biomarkers` imports only types + seed data — no DB, no React, no Supabase. Consumers depend inward. Domain stays independent (parity with `lib/interactions`).

---

## 10. Coding Conventions
Reuse v1/v2 conventions (PascalCase components, camelCase utils, kebab-case folders, Zod validation, `// Design Ref: §N` comments, `// Plan SC:` on the unit-conversion path). No new env vars.

---

## 11. Implementation Guide

### 11.1 File Structure
```
src/
├── types/
│   ├── biomarker.ts                  # NEW domain types
│   └── protocol.ts                   # MOD: additive labSignal + labRationale
├── lib/
│   ├── biomarkers/                   # NEW pure module
│   │   ├── index.ts                  # assessLabMarkers, labBoost, biomarkersForSupplement, normalizeMarker
│   │   ├── normalize.ts              # marker → canonical biomarker
│   │   ├── units.ts                  # value+unit → canonical
│   │   ├── to-flags.ts               # LabFinding[] → DraftFlag[]
│   │   ├── schema.ts                 # Zod validation
│   │   └── biomarkers.test.ts        # L0 unit
│   ├── safety/index.ts               # MOD: lab copy (extend labSupported/labCaution + biomarker note)
│   ├── stack-evaluator/rules.ts      # MOD: engine-backed ruleLabRelevance
│   └── protocol-builder/{index,rules}.ts  # MOD: labBoost ranking + comparator
├── data/
│   ├── seed-biomarkers.ts            # NEW
│   └── seed-biomarker-relevance.ts   # NEW
├── components/
│   ├── library/BiomarkerRelevanceSection.tsx  # NEW
│   └── profile/LabMarkerTable.tsx    # MOD: autocomplete + unit/range auto-fill
└── app/library/[slug]/page.tsx       # MOD: render BiomarkerRelevanceSection
```

### 11.2 Implementation Order
1. [ ] `types/biomarker.ts` + `protocol.ts` additive fields
2. [ ] `data/seed-biomarkers.ts` + `data/seed-biomarker-relevance.ts` + `schema.ts` (Zod)
3. [ ] `normalize.ts` + `units.ts` + unit tests (conversion both directions)
4. [ ] `index.ts` (engine: assessLabMarkers, labBoost, biomarkersForSupplement) + tests
5. [ ] `to-flags.ts` + `lib/safety` copy + tests
6. [ ] Wire `stack-evaluator/rules.ts` (replace ruleLabRelevance) + `protocol-builder` (labBoost + comparator)
7. [ ] `BiomarkerRelevanceSection` + library page + `LabMarkerTable` autocomplete
8. [ ] L1/L3 Playwright specs

### 11.3 Session Guide

#### Module Map
| Module | Scope Key | Description | Est. Turns |
|--------|-----------|-------------|:----------:|
| Engine core | `module-1` | types, datasets, schema, normalize, units, engine, to-flags, safety copy + all L0 unit tests | 45-55 |
| Surface integration | `module-2` | evaluator + protocol wiring (incl. comparator/type), Library section, LabMarkerTable autocomplete, L1/L3 tests | 40-50 |

#### Recommended Session Plan
| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | full | done |
| Session 2 | Do | `--scope module-1` | 45-55 |
| Session 3 | Do | `--scope module-2` | 40-50 |
| Session 4 | Check + Report | full | 30-40 |

### 11.4 Key Algorithm — `assessLabMarkers` + `labBoost`
```
status(marker, biomarker):
  v = toCanonical(marker.value, marker.unit, biomarker); if v === null → "unknown"
  low  = marker.referenceLow  ?? biomarker.refLow
  high = marker.referenceHigh ?? biomarker.refHigh   // user range wins
  if low  !== null && v < low  → "low"
  if high !== null && v > high → "high"
  else → "in-range"

assessLabMarkers({labMarkers, stackItems}):
  suppIds = set(stackItems.supplementId)
  for each marker: b = normalizeMarker(marker.marker); if !b continue
     s = status(marker, registry[b]); if s ∈ {in-range, unknown} continue
     for rule where rule.biomarkerId===b && rule.trigger===s && suppIds.has(rule.supplementId):
        emit LabFinding(status=s, relation, rationale, grade)
  → map to lab-relevance flags (low+support→info, high+caution→warning) via lib/safety

labBoost(supplementId, labMarkers):  // protocol ranking
  for marker: b=normalize; s=status
     for rule where biomarkerId===b && trigger===s && supplementId===supp:
        relation==="support" → +weight(grade);  relation==="caution" → −weight(grade)
  → LabSignal{ score: clamp(sum, -1, 1), biomarkerName, rationale }   // deterministic
```
`compareSuggestions` sorts by `labSignal` desc, then grade, then name. `labBoosted = labSignal > 0` (derived; keeps the badge + `SuggestionCard` unchanged).

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-15 | Initial Design (Option C selected) | benhwang121@gmail.com |
