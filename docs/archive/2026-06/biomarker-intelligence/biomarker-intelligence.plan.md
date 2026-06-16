---
template: plan-plus
version: 1.0
feature: biomarker-intelligence
date: 2026-06-15
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v3
---

# biomarker-intelligence Planning Document

> **Summary**: A pure, deterministic `lib/biomarkers` engine + curated biomarker registry & relevance datasets that replaces v1's naive lab-marker string-matching with a real biomarker→supplement knowledge layer — driving Stack Evaluation, lab-weighted Protocol ranking, and Library biomarker relevance.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v3 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-15
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v1 collects rich lab data but barely uses it: `ruleLabRelevance` and `isLabBoosted` only fire when a lab marker's *name* literally contains a supplement's name. So "low ferritin → iron" or "high LDL → berberine/fish oil" never trigger — the "personalized" promise is hollow. |
| **Solution** | A pure, deterministic `lib/biomarkers` engine driven by a curated **biomarker registry** (names, units, reference ranges) + **biomarker↔supplement relevance rules** (direction, relation, evidence). A normalizer canonicalizes free-text markers; a unit layer converts values before comparison. Replaces the naive lab rules; all copy via `lib/safety`. |
| **Function/UX Effect** | Stack Evaluation surfaces real lab-driven findings ("Your ferritin is low — iron may be relevant"); Protocol Builder ranks deficient-marker supplements higher with explainable lab rationale; Library supplement pages show their relevant biomarkers; Profile lab entry autocompletes markers and auto-fills unit + typical range. |
| **Core Value** | Turns labs from decoration into the engine of personalization — the natural successor to v2's safety layer — with zero new infra, full editorial control, and the same proven pure-engine architecture. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v1's lab handling is naive string-matching (`ruleLabRelevance`/`isLabBoosted`); real biomarker→supplement relevance never fires, so personalization is hollow. |
| **WHO** | Health nerds, biohackers, longevity users — especially the subset who track blood work and expect it to shape recommendations. |
| **RISK** | Wrong unit comparison (ng/mL vs nmol/L) → false flags; diagnostic-sounding language; curated coverage gaps read as "nothing relevant"; over-boosting on weak signals. |
| **SUCCESS** | From entered labs, produce accurate, unit-correct, explainable biomarker findings across Evaluation, Protocol ranking, and Library — deterministic & unit-tested. |
| **SCOPE** | Curated-seed biomarker engine + unit normalization + lab-weighted protocol ranking + Library biomarker section + Profile autocomplete. No DB table, no file parsing, no LOINC. |

---

## 1. User Intent Discovery

### 1.1 Core Problem
v1 has a `LabMarker` entity and two lab-aware rules, but both rely on substring matching between a free-text marker name and a supplement's name/aliases/tags. The valuable mappings (ferritin→iron, 25-OH-D→vitamin D, LDL/HbA1c→berberine, etc.) never fire because the names don't overlap. v3's purpose is **lab-informed intelligence**: a real biomarker knowledge layer.

### 1.2 Target Users
The established audience, sharpened for **lab-tracking users** — those who enter blood work and reasonably expect it to influence evaluation and protocol suggestions.

### 1.3 Success Criteria
1. Engine maps a free-text lab marker → canonical biomarker via an alias registry.
2. Engine converts a marker's value to the biomarker's canonical unit before any range comparison.
3. Engine determines low/high status (prefer user-entered `referenceLow/High`, else registry population ranges).
4. Biomarker↔supplement relevance rules (direction + relation) drive findings against stack supplements.
5. Findings surface in Stack Evaluation; lab signals weight Protocol Builder ranking (explainably); Library pages show a supplement's relevant biomarkers.
6. Profile lab entry autocompletes the marker name and auto-fills unit + typical reference range.
7. All language via `lib/safety` (non-diagnostic); engine is pure, deterministic, unit-tested.

### 1.4 Constraints
- **Architecture parity** with `lib/interactions` / `lib/stack-evaluator` (pure, DB-agnostic, seed-as-code, Zod-validated).
- **Unit correctness is safety-critical** — a mis-converted value produces a wrong flag.
- **Non-diagnostic** — findings describe relevance ("may be relevant"), never diagnose ("you are deficient").
- **No new infra** — no DB table (reference data), no file parsing, no external ontology.

---

## 2. Alternatives Explored

### 2.1 Approach A: Curated-seed biomarker engine — **Selected**
Pure `lib/biomarkers` module + curated `seed-biomarkers` registry + `seed-biomarker-relevance` rules + marker normalization + unit conversion. Replaces `ruleLabRelevance` and `isLabBoosted`.
- **Pros**: Exact mirror of the proven v2 interactions pattern; deterministic; full editorial control; zero infra; the valuable relevance mapping is curated where it belongs.
- **Cons**: Coverage limited to curated biomarkers; population-level (not lab-specific) reference ranges.
- **Best for**: Trustworthy, explainable lab intelligence consistent with the codebase.

### 2.2 Approach B: External ontology (LOINC + reference dataset)
Map markers to LOINC codes; pull metadata/units externally.
- **Pros**: Broad coverage, standardized codes/units.
- **Cons**: LOINC provides neither reference ranges nor supplement relevance (the actual value still must be curated); heavy, non-deterministic, licensing weight. Over-engineered.
- **Best for**: Later clinical-grade scale.

### 2.3 Approach C: Extend existing rules in place (minimal)
Replace the string-match inside `ruleLabRelevance`/`isLabBoosted` with an inline map.
- **Pros**: Fewest files.
- **Cons**: Logic trapped in two places; can't power a Library biomarker section; no normalization/unit layer — the minimal-option trap rejected in v2.

### 2.4 Decision Rationale
**Selected: Approach A.** It is the only option that builds a *reusable* knowledge layer (evaluator + protocol + Library) while preserving trust and determinism. Because the engine is pure and data-driven, it upgrades to B (LOINC) later with no consumer rework. C cannot serve the Library surface and re-creates the very coupling v2 avoided.

---

## 3. YAGNI Review

### 3.1 Included (v3 Must-Have)

| # | Item | Why essential |
|---|------|---------------|
| 1 | `lib/biomarkers` pure engine | The feature itself; parity with `lib/interactions` |
| 2 | `seed-biomarkers` registry + `seed-biomarker-relevance` rules | Curated knowledge (names, units, ranges, relevance) |
| 3 | Marker-name normalization (alias registry) | Free-text → canonical biomarker |
| 4 | Replace `ruleLabRelevance` (evaluator) + `isLabBoosted` (protocol) | Remove the naive string-match |
| 5 | `lib/safety` lab copy, non-diagnostic | Standardized, hedged wording |
| 6 | **Unit normalization** | Convert value to canonical unit before range comparison (safety-critical) |
| 7 | **Lab-weighted protocol ranking** | Deficient markers push relevant supplements up, explainably |
| 8 | **Library biomarker-relevance section** | Per-supplement "Relevant biomarkers" (brief item) |
| 9 | **Profile biomarker autocomplete** | Marker autocomplete + unit/range auto-fill |

> Items 6–9 confirmed essential via YAGNI multiSelect — v3 ships the full lab layer.

### 3.2 Deferred (v4+)

| Feature | Reason for Deferral | Revisit When |
|---------|---------------------|--------------|
| Lab/allergy **file parsing** (PDF/CSV import) | Separate, heavier infra (parsing/OCR); manual entry covers the loop | After engine validated |
| External LOINC ontology (Approach B) | Curated engine proves value first; A→B upgradeable | Clinical-grade scale needed |
| Lab-specific / age-sex-adjusted reference ranges | Population ranges sufficient for v3; user can override | On demand |
| Trend tracking (same marker over time) | Single-value relevance covers the loop | If users log repeated labs |
| Standalone "your X is out of range" insights (no supplement) | Risks diagnostic framing; keep findings supplement-anchored | After safety review |

### 3.3 Removed (Won't Do — this version)

| Feature | Reason |
|---------|--------|
| Diagnosing deficiency/disease from labs | Violates non-diagnostic safety principle |
| LLM-interpreted lab reports | Breaks determinism/trust/testability |
| Auto-ordering or integrating with lab providers | Out of scope; commerce/integration concern |

---

## 4. Scope

### 4.1 In Scope
- New pure module `src/lib/biomarkers/` (engine, normalize, units, types).
- New seed data: `src/data/seed-biomarkers.ts`, `src/data/seed-biomarker-relevance.ts`.
- Replace `ruleLabRelevance` in `stack-evaluator`; replace `isLabBoosted` with `labBoost` in `protocol-builder`.
- Library `BiomarkerRelevanceSection` on supplement detail pages.
- Profile lab entry: marker autocomplete + unit/range auto-fill against registry.
- `lib/safety` lab-copy extension; Zod dataset validation; unit + engine + integration tests.

### 4.2 Out of Scope
- Lab/allergy file parsing — (deferred, §3.2)
- External LOINC ontology — (deferred, §3.2)
- Lab-specific/adjusted ranges, trend tracking, standalone out-of-range insights — (deferred, §3.2)
- New DB tables/RLS — reference data stays seed-as-code
- Lab diagnosis, LLM interpretation, provider integration — (removed, §3.3)

---

## 5. Requirements

### 5.1 Functional Requirements
- **FR-1** `normalizeMarker(name)` resolves a free-text marker → canonical biomarker (alias registry); unknown markers pass through (no crash, optional "unrecognized marker" note).
- **FR-2** Unit conversion maps a marker's `(value, unit)` → canonical unit per biomarker; unknown/mismatched units are handled gracefully (skip range comparison, not a wrong flag).
- **FR-3** Low/high determination prefers the user's `referenceLow/referenceHigh`; falls back to registry population ranges.
- **FR-4** `assessLabMarkers({labMarkers, stackItems})` → `LabFinding[]`: for each marker, find relevance rules whose `biomarkerId` + `trigger` (low/high) match, against a stack supplement.
- **FR-5** Findings carry relation (support/caution), evidence grade, rationale; mapped to `lab-relevance` flags (low+support→info, high+caution→warning).
- **FR-6** `labBoost(supplementId, labMarkers)` returns an explainable ranking signal; integrated into Protocol Builder ordering.
- **FR-7** `biomarkersForSupplement(supplementId)` returns the biomarkers relevant to a supplement for the Library section.
- **FR-8** Profile lab entry autocompletes the marker name and auto-fills canonical unit + a suggested reference range.
- **FR-9** No finding implies diagnosis; absence of a finding never implies "everything is fine."

### 5.2 Non-Functional Requirements
- **NFR-1** Engine pure, deterministic, DB-agnostic (parity with `lib/interactions`).
- **NFR-2** Unit-tested incl. conversion correctness; `tsc` clean; `next build` green; existing suite stays green.
- **NFR-3** Datasets Zod-validated; relevance rules reference real seed supplements + registry biomarkers (integrity-tested).
- **NFR-4** All copy conforms to the safety/compliance language rules; banned-language sweep over curated copy.

---

## 6. Success Criteria

### 6.1 Definition of Done
- [ ] `lib/biomarkers` engine + normalize + units implemented and unit-tested.
- [ ] `seed-biomarkers` + `seed-biomarker-relevance` seeded and Zod-validated.
- [ ] `ruleLabRelevance` + `isLabBoosted` replaced by engine-backed logic.
- [ ] Findings in Evaluation; lab-weighted Protocol ranking; Library biomarker section; Profile autocomplete.
- [ ] `tsc` clean · `next build` green · full suite green.

### 6.2 Quality Criteria
- Unit correctness: multi-unit markers (e.g. 25-OH-D) compared correctly (test-asserted both directions).
- Determinism: identical inputs → identical findings.
- Coverage honesty: no finding never rendered as "you're fine"; non-diagnostic wording.
- No regression to v1/v2 features (87/87 baseline stays green).

---

## 7. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong unit comparison → false flag | High (trust/safety) | Dedicated `units.ts` with per-biomarker conversions; both-direction conversion tests; skip comparison on unknown unit |
| Diagnostic-sounding output | High (compliance) | All copy via `lib/safety`; "may be relevant" framing; banned-language sweep |
| Curated coverage gaps read as "nothing relevant" | Medium | Honest absence framing; never assert "fine"; disclaimer near lab findings |
| Over-boosting protocol on weak signals | Medium | Bounded `labBoost` weight; evidence-graded rules; explainable rationale |
| Naive replacement breaks existing lab tests | Medium | Update lab tests as code+test set; keep `lab-relevance` category + copy shape |

---

## 8. Architecture Considerations

### 8.1 Project Level
Dynamic. Continues the Clean-Architecture, pure-engine, seed-first posture of v1/v2.

### 8.2 Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Knowledge source | Curated seed-as-code (Approach A) | Trust, determinism, no infra; A→LOINC upgradeable |
| Storage | Seed-as-code (no DB table) | Reference data, not user data |
| Range precedence | User-entered range > registry population range | Respect user's lab's own ranges |
| Unit handling | Per-biomarker canonical unit + conversion map | Safety-critical correctness |
| Protocol signal | Bounded `labBoost` weight, evidence-graded | Explainable, non-dominating |
| Output shape | `lab-relevance` flag (existing category) | Reuses evaluator + flag UI |

### 8.3 Component Overview
```txt
src/lib/biomarkers/
  index.ts      # assessLabMarkers, labBoost, biomarkersForSupplement, normalizeMarker
  normalize.ts  # marker name -> canonical biomarker
  units.ts      # value+unit -> canonical unit
  types.ts      # Biomarker, BiomarkerRelevanceRule, LabFinding, direction
src/data/
  seed-biomarkers.ts            # registry: id, aliases, canonicalUnit, conversions, refLow/High
  seed-biomarker-relevance.ts   # biomarkerId -> supplementId, trigger, relation, grade, rationale
Integrations:
  lib/stack-evaluator/rules.ts  -> engine-backed ruleLabRelevance
  lib/protocol-builder          -> labBoost ranking signal
  components/library/BiomarkerRelevanceSection.tsx
  components/profile (lab entry) -> autocomplete + unit/range auto-fill
  lib/safety                    -> lab copy (extend labSupported/labCaution)
```

### 8.4 Data Flow
1. Profile lab entry (autocomplete canonicalizes marker, fills unit + suggested range).
2. Evaluate: engine normalizes marker → biomarker, converts value → canonical unit, decides low/high (user range first, else registry), matches relevance rules vs stack supplements → `LabFinding[]` → `lab-relevance` flags via `lib/safety`.
3. Protocol Builder: `labBoost` adds a bounded, explainable signal to ranking.
4. Library page: `biomarkersForSupplement(id)` → "Relevant biomarkers" section.

---

## 9. Convention Prerequisites
- Reuse v1/v2 conventions (PascalCase components, camelCase utils, kebab-case folders, Zod schemas, Design-ref comments).
- New types in `src/types/biomarker.ts`. No new env vars or external services.

---

## 10. Next Steps
```
Plan Plus completed
Document: docs/01-plan/features/biomarker-intelligence.plan.md
Next step: /pdca design biomarker-intelligence
```

---

## Appendix: Brainstorming Log

| Phase | Decision | Outcome |
|-------|----------|---------|
| Q1 — v3 Theme | Chose **Lab-informed intelligence** over smarter-scoring / data-at-scale / commerce | Make labs drive personalization |
| Q2 — Anchor | Chose **Biomarker knowledge engine** over file-parsing / unit-only / lab-weighted-only | Foundation that replaces naive string-matching |
| Phase 2 — Approach | Chose **A: Curated-seed engine** over LOINC / inline-minimal | Trust + determinism; A→LOINC upgradeable |
| Phase 3 — YAGNI | Selected all four optionals: unit normalization, lab-weighted ranking, Library section, profile autocomplete | Full lab layer; file parsing & LOINC deferred |
| Phase 4 — Design | Architecture / components / data flow approved as-is | Proceed to Plan generation |

---

## Version History
| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-06-15 | benhwang121@gmail.com | Initial v3 plan-plus document for biomarker-intelligence |
