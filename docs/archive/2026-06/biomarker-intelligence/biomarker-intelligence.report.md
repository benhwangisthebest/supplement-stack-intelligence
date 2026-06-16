---
template: report
version: 1.0
feature: biomarker-intelligence
date: 2026-06-15
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v3
cycle_number: 5
---

# biomarker-intelligence Completion Report

> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v3
> **Author**: benhwang121@gmail.com
> **Completion Date**: 2026-06-15
> **PDCA Cycle**: #5 (first v3 feature)

---

## Executive Summary

### 1.1 Project Overview

| | |
|--|--|
| Feature | biomarker-intelligence |
| Start Date | 2026-06-15 |
| End Date | 2026-06-15 |
| Duration | 1 session (Plan→Design→Do×2→Check→Act-1→QA→Report) |
| Method | Plan Plus + PDCA, Architecture Option C (pragmatic) |

### 1.2 Results Summary

| Metric | Result |
|--------|--------|
| Match Rate | **98%** (runtime-verified) |
| Success Criteria | **7/7 met** |
| Unit tests | 110/110 green (+23 new: 22 biomarker + 1 unrecognized-marker) |
| Runtime | L1 (4) + L2 (2) green on live server; L3 authed gated by `E2E_LIVE` |
| Build / Types | `next build` green (15 SSG pages), `tsc --noEmit` clean |
| QA Gate | **QA_PASS** |

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | v1 collected lab data but barely used it — `ruleLabRelevance`/`isLabBoosted` only fired when a marker's *name* literally contained a supplement's name, so "low ferritin → iron" or "high LDL → berberine" never triggered. Personalization was hollow. |
| **Solution** | A pure, deterministic `lib/biomarkers` engine + curated biomarker registry (13) & relevance rules (15) that normalize markers (alias registry), **convert values to a canonical unit** before any range comparison, prefer the user's reference range, and match curated biomarker↔supplement rules. All copy via `lib/safety`. |
| **Function/UX Effect** | Stack Evaluation surfaces real lab-driven `lab-relevance` flags (support→info, caution→warning) and an honest "not recognized" note for unknown markers; Protocol Builder ranks supplements by a bounded `labSignal` (deficient boosts, replete/high-caution demotes) with explainable rationale; every Library page shows its "Relevant biomarkers"; Profile lab entry autocompletes markers and auto-fills unit + range. Verified live: vitamin-d/berberine sections render; l-theanine shows the honest empty state; evaluate route enforces 401. |
| **Core Value** | Labs went from decoration to the engine of personalization — the natural successor to v2's safety layer — with zero new infra, full editorial control, and a unit-correct, deterministic core. |

---

## 1.4 Success Criteria Final Status

| # | Criterion | Status | Evidence |
|---|-----------|:------:|----------|
| SC-1 | Marker → canonical biomarker | ✅ Met | `normalize.ts`; test "Serum Magnesium → magnesium-serum" |
| SC-2 | Unit conversion to canonical | ✅ Met | `units.ts`; test "75 nmol/L → 30.045 ng/mL", unknown→null |
| SC-3 | Range precedence (user > registry) | ✅ Met | `statusOf`; test "prefers user reference range" |
| SC-4 | Relevance rules drive findings | ✅ Met | `assessLabMarkers`; 15 curated rules |
| SC-5 | Surface in Eval + Protocol + Library | ✅ Met | engine-backed `ruleLabRelevance`, `labBoost` ranking, `BiomarkerRelevanceSection` (live) |
| SC-6 | Profile autocomplete + unit/range fill | ✅ Met | `LabMarkerTable` datalist + `markerCatalogEntry` |
| SC-7 | Pure / deterministic / unit-tested | ✅ Met | 22 L0 tests incl. determinism + banned-language sweep; 110/110 |

**Success Rate: 7/7 (100%).**

---

## 1.5 Decision Record Summary

| Source | Decision | Followed | Outcome |
|--------|----------|:--------:|---------|
| [Plan] | Approach A — curated-seed engine (no external ontology) | ✅ | Trust + determinism; the valuable biomarker→supplement mapping curated where it belongs. A→LOINC upgrade path preserved. |
| [Plan] | Anchor on biomarker knowledge engine | ✅ | Replaced naive string-match; labs now drive evaluation + ranking + Library. |
| [Design] | Architecture C — pure module, bounded `labSignal`, reuse `lab-relevance` flag | ✅ | One engine, three surfaces; existing flag UI + "✦ lab" badge untouched. |
| [Design] | Seed-as-code, no DB table | ✅ | Reference data in `src/data`; zero migration. |
| [Design] | Unit correctness (safety-critical) | ✅ | `units.ts` returns null on unknown unit; both-direction tests. |
| [Design] | Boost AND demote | ✅ | numeric `labSignal`; comparator sorts on it. |

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [biomarker-intelligence.plan.md](../01-plan/features/biomarker-intelligence.plan.md) | ✅ Finalized |
| Design | [biomarker-intelligence.design.md](../02-design/features/biomarker-intelligence.design.md) | ✅ Finalized |
| Check | [biomarker-intelligence.analysis.md](../03-analysis/biomarker-intelligence.analysis.md) | ✅ Complete (98%) |
| QA | [biomarker-intelligence.qa-report.md](../05-qa/biomarker-intelligence.qa-report.md) | ✅ QA_PASS |

---

## 3. Completed Items

### 3.1 Functional Requirements

| # | Requirement | Status |
|---|-------------|:------:|
| FR-1 | `normalizeMarker` w/ graceful unknown handling | ✅ |
| FR-2 | Unit conversion → canonical (null on unknown) | ✅ |
| FR-3 | Low/high status, user range preferred | ✅ |
| FR-4 | `assessLabMarkers` relevance matching | ✅ |
| FR-5 | Findings → `lab-relevance` flags (info/warning) | ✅ |
| FR-6 | `labBoost` bounded ranking signal | ✅ |
| FR-7 | `biomarkersForSupplement` for Library | ✅ |
| FR-8 | Profile autocomplete + unit/range auto-fill | ✅ |
| FR-9 | No finding implies "fine"; unrecognized markers surfaced | ✅ (Act-1) |

### 3.2 Non-Functional Requirements

| # | Requirement | Status |
|---|-------------|:------:|
| NFR-1 | Pure, deterministic, DB-agnostic engine | ✅ |
| NFR-2 | Tests green; tsc clean; build green; no regression | ✅ (110/110, 15 SSG pages) |
| NFR-3 | Zod-validated + referential-integrity-tested datasets | ✅ |
| NFR-4 | Safety/compliance language (banned-language sweep) | ✅ |

### 3.3 Deliverables

| Type | Location | Status |
|------|----------|:------:|
| Domain types | `src/types/biomarker.ts`, `src/types/protocol.ts` (additive) | ✅ |
| Engine | `src/lib/biomarkers/{index,normalize,units,to-flags,schema,marker-catalog}.ts` | ✅ |
| Datasets | `src/data/{seed-biomarkers,seed-biomarker-relevance}.ts` | ✅ |
| Safety copy | `src/lib/safety/index.ts` | ✅ |
| Evaluator wiring | `src/lib/stack-evaluator/rules.ts` | ✅ |
| Protocol wiring | `src/lib/protocol-builder/{index,rules}.ts` | ✅ |
| UI | `components/library/BiomarkerRelevanceSection.tsx`, `components/profile/LabMarkerTable.tsx` | ✅ |
| Tests | `lib/biomarkers/biomarkers.test.ts`, `tests/e2e/biomarker-intelligence.spec.ts` | ✅ |

---

## 4. Incomplete Items

### 4.1 Carried Over

| Item | Reason | Target |
|------|--------|--------|
| Run L3 authed e2e (lab → evaluate → flag) under `E2E_LIVE=1` | No demo creds in environment | When Supabase demo user is seeded |

### 4.2 Deferred (v4, per Plan §3.2)

Lab/allergy file parsing (PDF/CSV import), external LOINC ontology, lab-specific/adjusted reference ranges, trend tracking, standalone out-of-range insights.

---

## 5. Quality Metrics

### 5.1 Final Analysis

| Axis | Rate |
|------|:----:|
| Structural | 100% |
| Functional | 100% (post Act-1) |
| Contract | 100% |
| Runtime | 95% (L3 authed pending) |
| **Overall** | **98% (runtime-verified)** |

### 5.2 Resolved Issues

| ID | Issue | Resolution |
|----|-------|-----------|
| IMP-1 | Unrecognized lab markers not surfaced | Act-1: `ruleLabRelevance` emits an info flag per unresolved marker via `safetyCopy.unrecognizedMarker()` + test |
| Env | Stale `.next` cache broke a dev server | Cleared `.next`, restarted; not a code defect |
| QA test-precision | vitamin-d had two 25-OH-D headings | Scoped assertion with `.first()`; implementation unchanged |

---

## 6. Lessons Learned & Retrospective

### 6.1 What Went Well (Keep)
- The v2 pure-engine + curated-seed pattern transferred cleanly: same `DraftFlag` reuse meant the engine swap needed **zero new flag UI**, and the existing lab tests passed unchanged.
- Making `units.ts` a first-class, separately-tested component paid off — the safety-critical conversion was proven both directions before any surface used it.
- Changing the protocol lab signal from boolean to a bounded number unlocked **demote** (replete/high-caution) without breaking the existing "deficient ranks first" test.

### 6.2 What Needs Improvement (Problem)
- IMP-1 (unrecognized-marker honesty) recurred — the *identical* gap to v2's IMP-1. A reusable "surface unresolved inputs" checklist item in Do would prevent the third occurrence.
- Running `next build` while a dev server was live corrupted its `.next` cache and produced a confusing first QA failure. Tear down dev servers before building.

### 6.3 What to Try Next (Try)
- Seed the demo Supabase user so the authed L3 lab→evaluate→flag journey is part of standard QA, not gated (closes the same carry-item as v2).
- Consider a shared `lib/normalization` convention for the recurring "free-text → canonical id + surface unresolved" pattern now used by both interactions and biomarkers.

---

## 7. Next Steps

- `/pdca archive biomarker-intelligence` — archive to `docs/archive/2026-06/biomarker-intelligence/`.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-15 | Completion report — 98% runtime-verified, QA_PASS, SC 7/7 | benhwang121@gmail.com |
