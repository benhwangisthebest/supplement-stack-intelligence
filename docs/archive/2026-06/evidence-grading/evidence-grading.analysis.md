---
template: analysis
version: 1.3
feature: evidence-grading
date: 2026-06-16
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v5
---

# evidence-grading Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation) — **runtime-verified** (unit + L2 live)
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v5
> **Analyst**: benhwang121@gmail.com
> **Date**: 2026-06-16
> **Design Doc**: [evidence-grading.design.md](../02-design/features/evidence-grading.design.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Single-letter effect grades are opaque and untraceable; the product's promise is evidence navigability, not a black-box score. |
| **WHO** | Evidence-literate health-nerd / biohacker / longevity users who scrutinize why a claim is graded as it is. |
| **RISK** | Derived grade disagreeing with curated intent; breaking the load-bearing `grade`; over-engineering; citations that don't support their dimension. |
| **SUCCESS** | Profiled effects expose an inspectable, citation-backed dimension breakdown; derived grade matches curated intent; all consumers keep working; ranking can use composite; deterministic & unit-tested. |
| **SCOPE** | dimension model + pure `lib/evidence-grading` + grade resolution + seed subset + Library breakdown UI + composite re-ranking + per-dimension citations. No population-adjusted grades / AI drafting (v6). |

---

## Strategic Alignment Check

### Success Criteria Status (from Plan §1.3)

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | `EvidenceProfile` models ≥5 dimensions (score+rationale+paperIds) | ✅ Met | `src/types/evidence-grading.ts`; `EVIDENCE_DIMENSIONS` (5) |
| SC-2 | `compositeScore` → deterministic [0,1] weighted score | ✅ Met | `lib/evidence-grading/index.ts`; tests (weighted sum, determinism) |
| SC-3 | `deriveGrade` maps composite → A/B/C/D via fixed thresholds | ✅ Met | `weights.ts` GRADE_THRESHOLDS; boundary tests |
| SC-4 | `lib/evidence` resolves a single grade (derived if profiled, else literal) | ✅ Met | `resolveEffect`, pre-resolved `defaultLibrary`; tests |
| SC-5 | Seed subset profiled + integrity test (derived == curated) | ✅ Met | 8 effects / 7 supplements / A·B·C; integrity test green |
| SC-6 | Library breakdown + per-dimension citations | ✅ Met | `EvidenceBreakdown.tsx`; **L2 2/2 live** |
| SC-7 | Protocol/Evaluator order by composite (fallback grade) | ✅ Met | `compareSuggestions` composite key; `getBestEffectForOutcome` tiebreak; tests |
| SC-8 | No regression (v1–v4 grade consumers unchanged) | ✅ Met | full suite 170/170; resolution is a no-op on current seeds |

**Success Rate**: **8/8 met**, runtime-verified.

### Decision Record Verification

| Source | Decision | Followed? | Note |
|--------|----------|:---------:|------|
| [Plan] | Approach A — additive + derived composite | ✅ | `evidenceProfile` optional; grade derived; consumers untouched |
| [Design] | Option C — dedicated module + pre-resolve in `defaultLibrary` | ✅ | `lib/evidence-grading` isolated; `SEED_EFFECTS.map(resolveEffect)` |
| [Design] | Composite as secondary ranking key, grade fallback | ✅ | tests assert grade dominates across grades; composite breaks ties within |
| [Design] | Honesty: derived == curated (integrity-tested) | ✅ | integrity test green for all 8 |

---

## 2. Gap Analysis

### 2.1 Module surface (no HTTP endpoints — pure domain + SSR)

| Design surface | Implementation | Status |
|----------------|---------------|--------|
| `compositeScore` / `deriveGrade` / `gradeBreakdown` / `validateProfile` | `lib/evidence-grading/index.ts` | ✅ |
| `resolveEffect` / `effectComposite` | `lib/evidence/index.ts` | ✅ |
| composite ranking key | `compareSuggestions` + `getBestEffectForOutcome` | ✅ |

### 2.2 Data Model

| Element | Design | Impl | Status |
|---------|--------|------|--------|
| `EvidenceDimension`/`DimensionScore`/`EvidenceProfile`/`DimensionBreakdown` | §3.1 | `types/evidence-grading.ts` | ✅ |
| `Effect.evidenceProfile?` (additive) | §3.2 | `types/effect.ts` | ✅ |
| Rubric weights + thresholds | §3.3 | `weights.ts` (Σ=1.0 asserted) | ✅ |
| Seed profiles | §8.5 | 8 effects (≥6 req.), A·B·C | ✅ |

### 2.3 Component Structure

| Design Component | File | Status |
|------------------|------|--------|
| `EvidenceBreakdown` | `components/evidence/EvidenceBreakdown.tsx` | ✅ |
| SupplementDetail EffectsTab wiring | `components/library/SupplementDetail.tsx` | ✅ |

**Structural Match Rate: 100%** (all designed files present; zero placeholders).

### 2.4–2.5 Functional Depth + Page UI Checklist (Design §5.4)

| Element | Implemented | Evidence |
|---------|:-----------:|----------|
| Badge shows resolved grade | ✅ | EffectsTab `EffectGradeBadge grade={e.grade}` (pre-resolved) |
| "Evidence breakdown" only for profiled effects | ✅ | `{e.evidenceProfile && …}`; L2 legacy-absent test |
| Per-dimension label + rating bar + rationale (×5) | ✅ | `gradeBreakdown` + `RatingBar`; L2 dimension assertion |
| Per-dimension citation links | ✅ | `paperById` chips → `paper.link` |
| Legacy effects render as before | ✅ | L2 l-theanine no-breakdown |

**Functional Match Rate: 100%** · Shallow files: 0.

### 2.6 Contract (module ↔ consumers)

`lib/evidence-grading` (pure) ↔ `lib/evidence` (resolve/composite) ↔ `protocol-builder`/`stack-evaluator` (ranking) ↔ `EvidenceBreakdown` (UI). All wired and exercised by unit + L2 tests. **Contract: 100%.**

### 2.7 Runtime Verification

| Layer | Result |
|-------|:------:|
| Unit (Vitest) | **170/170** (incl. 23 evidence-grading: rubric, resolution, ranking, integrity, non-diagnostic) |
| L1 (API) | N/A — feature has no HTTP endpoints (pure domain + Library SSR) |
| L2 (Library UI, live) | **2/2** — breakdown shows+expands (creatine), absent for legacy (l-theanine) |
| L3 (E2E) | N/A — single-page interaction fully covered by L2 |

**Runtime Match Rate: 100%** (L2 executed live; L1/L3 not applicable to this feature).

### 2.8 Match Rate Summary (runtime-executed formula)

```
┌─────────────────────────────────────────────┐
│  Structural:  100%                           │
│  Functional:  100%                           │
│  Contract:    100%                           │
│  Runtime:     100%  (unit + L2 live)         │
│  ─────────────────────────────────────────── │
│  Overall:     100%                           │
│  = .15·100 + .25·100 + .25·100 + .35·100     │
└─────────────────────────────────────────────┘
```

---

## 3. Code Quality
- **tsc** clean; **next build** green (Library pages prerender).
- **Determinism**: `lib/evidence-grading` pure (types-only imports); identical profile → identical composite & grade.
- **No new deps**: rating bars hand-rolled; native `<details>`; the v4 SDK is not used.
- **Backward-compat**: `resolveEffect` is a no-op on current seeds (derived == literal) — full suite green confirms zero behavioral drift.

---

## 5. Test Coverage

| Area | Evidence |
|------|----------|
| Rubric (composite/derive/breakdown/validate) | 9 unit tests + boundary checks |
| Seed integrity | derived==curated (8), citations ⊆ SEED_PAPERS, non-diagnostic sweep |
| Resolution + composite | 5 evidence tests (resolveEffect, effectComposite, tiebreak) |
| Ranking | 4 compareSuggestions tests (composite within grade; grade/labSignal dominance) |
| Library UI | L2 2/2 live |

---

## 6. Clean Architecture

| Layer | Component | Status |
|-------|-----------|--------|
| Domain (pure) | `types/evidence-grading`, `lib/evidence-grading`, resolution in `lib/evidence` | ✅ |
| Domain (data) | seed profiles | ✅ |
| Presentation | `EvidenceBreakdown`, EffectsTab | ✅ |

`lib/evidence-grading` imports only types — strictly inward. **Architecture: 100%.**

---

## 8. Overall

```
Design Match:    100% (runtime-verified)
Success Criteria: 8/8
Unit + L2:        170 unit + 2 L2 live
Critical gaps:    0
Important gaps:   0
```

---

## 9. Recommended Actions
None required. Optional future work (already deferred to v6 in the Plan): profile the remaining ~19 effects, AI-assisted dimension drafting, population/context-adjusted grades.

---

## 11. Next Steps
- [ ] `/pdca qa evidence-grading` (L1-L5; L2 already green live)
- [ ] `/pdca report evidence-grading`

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-16 | Initial Check — 100% runtime-verified, SC 8/8, 0 gaps | benhwang121@gmail.com |
</content>
