---
template: report
version: 1.1
feature: evidence-grading
date: 2026-06-16
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v5
---

# evidence-grading Completion Report

> **Status**: Complete (100% runtime-verified)
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → **v5 milestone**
> **Author**: benhwang121@gmail.com
> **Completion Date**: 2026-06-16
> **PDCA Cycle**: evidence-grading (Plan-Plus → Design → Do ×3 → Check → QA → Report)

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | evidence-grading (v5 — effect-level multi-dimensional evidence grading) |
| Start / End | 2026-06-16 |
| Method | Plan-Plus + PDCA, 3-module incremental Do |
| Iterations | 0 (Check passed clean at 100%) |

### 1.2 Results Summary

```
┌─────────────────────────────────────────────┐
│  Completion: 8/8 Success Criteria met        │
├─────────────────────────────────────────────┤
│  ✅ Unit tests:     170 / 170                 │
│  ✅ L2 (live):      2 / 2 (public Library)    │
│  ✅ tsc / build:    clean / green             │
│  Match rate:        100% (runtime-verified)   │
│  Critical / Important gaps: 0 / 0             │
└─────────────────────────────────────────────┘
```

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | Each effect carried one opaque letter (A/B/C/D) that collapsed several independent questions — human-evidence strength, study quality, consistency, effect size, population relevance — into one symbol you couldn't inspect or trace. |
| **Solution** | An optional curated `evidenceProfile` per effect + a pure deterministic `lib/evidence-grading` rubric that computes a weighted composite and **derives** the letter. `lib/evidence` pre-resolves the grade once, so all v1–v4 consumers read it unchanged. |
| **Function/UX Effect** | Library effect cards keep the grade badge but expand into a per-dimension breakdown (rating bar + rationale + the papers backing each dimension); Protocol/Stack ranking refines within an equal grade by composite. 8 effects profiled across 7 supplements; 23 new tests. |
| **Core Value** | Turns an opaque letter into a transparent, traceable evidence judgment — deepening the trust moat with zero new infra, zero new runtime deps, and the proven pure-engine/seed-as-code architecture. |

---

## 1.4 Success Criteria Final Status

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | `EvidenceProfile` ≥5 dimensions (score+rationale+paperIds) | ✅ Met | `types/evidence-grading.ts` |
| SC-2 | `compositeScore` deterministic [0,1] | ✅ Met | `lib/evidence-grading`; tests |
| SC-3 | `deriveGrade` thresholds → A/B/C/D | ✅ Met | `weights.ts`; boundary tests |
| SC-4 | Single resolved grade (derive if profiled, else literal) | ✅ Met | `resolveEffect`, pre-resolved `defaultLibrary` |
| SC-5 | Seed subset + integrity (derived == curated) | ✅ Met | 8 profiles / 7 supplements / A·B·C; integrity test green |
| SC-6 | Library breakdown + per-dimension citations | ✅ Met | `EvidenceBreakdown.tsx`; **L2 2/2 live** |
| SC-7 | Composite re-ranking (fallback grade) | ✅ Met | `compareSuggestions` + `getBestEffectForOutcome` |
| SC-8 | No v1–v4 regression | ✅ Met | suite 170/170; resolution no-op on current seeds |

**Success Rate**: **8/8 (100%)**, runtime-verified.

## 1.5 Decision Record Summary

| Source | Decision | Followed? | Outcome |
|--------|----------|:---------:|---------|
| [Plan] | Approach A — additive + derived composite | ✅ | dimensions underneath, derived grade on top; no consumer rewrite |
| [Design] | Option C — dedicated module + pre-resolve in `defaultLibrary` | ✅ | `lib/evidence-grading` isolated; one-line resolution at the seam |
| [Design] | Composite secondary key, grade fallback | ✅ | tests assert grade dominates across grades; composite refines within |
| [Design] | Honesty gate — derived == curated (integrity-tested) | ✅ | green for all 8; v5 changed no trusted grade |
| [Do m3] | Pure/server `EvidenceBreakdown` (`<details>`, no client state) | ✅ | zero new deps; L2 verified expand + legacy-absent |

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [evidence-grading.plan.md](../01-plan/features/evidence-grading.plan.md) | ✅ Finalized |
| Design | [evidence-grading.design.md](../02-design/features/evidence-grading.design.md) | ✅ Finalized |
| Check | [evidence-grading.analysis.md](../03-analysis/evidence-grading.analysis.md) | ✅ 100% |
| QA | [evidence-grading.qa-report.md](../05-qa/evidence-grading.qa-report.md) | ✅ PASS |
| Report | Current document | ✅ |

---

## 3. Completed Items

### 3.1 Functional Requirements
All FR-01…FR-09 complete (rubric, composite, derive, breakdown, resolution, seed+integrity, Library UI, composite ranking, non-diagnostic copy).

### 3.2 Non-Functional
| Item | Target | Achieved |
|------|--------|----------|
| Determinism | pure rubric | ✅ types-only imports; identical profile → identical grade |
| Compatibility | consumers unchanged | ✅ 170/170; resolution no-op on current data |
| Integrity | derived == curated; citations real | ✅ integrity tests green |
| Build/Test | tsc + build + suite green | ✅ all green |
| New deps | none | ✅ hand-rolled bars + native `<details>` |

### 3.3 Deliverables

| Deliverable | Location |
|-------------|----------|
| Dimension types | `src/types/evidence-grading.ts` |
| Rubric engine | `src/lib/evidence-grading/{weights,index}.ts` |
| Seed profiles | `src/data/seed-effects.ts` (8 effects) |
| Resolution + ranking | `src/lib/evidence/index.ts`, `protocol-builder/{rules,index}.ts`, `types/protocol.ts` |
| Library UI | `src/components/evidence/EvidenceBreakdown.tsx`, `library/SupplementDetail.tsx` |
| Tests | 23 new unit + L2 spec |

---

## 4. Incomplete / Carried Over (deferred to v6 by Plan)

| Item | Reason | Priority |
|------|--------|----------|
| Profile the remaining ~19 effects | Incremental seeding proved value first | Medium |
| AI-assisted dimension drafting (v4 SDK) | Curation aid, not user value | Low |
| Population/context-adjusted grades | Largest modeling jump | Low |

---

## 5. Quality Metrics

| Metric | Target | Final |
|--------|--------|-------|
| Design Match Rate | ≥ 90% | **100% (runtime-verified)** |
| Success Criteria | — | 8/8 |
| Unit tests | green | 170/170 (147 prior + 23 new) |
| L2 (live) | green | 2/2 |
| Critical issues | 0 | 0 |
| Iterations needed | — | 0 |

---

## 6. Lessons Learned

### 6.1 Keep
- **Pre-resolving the derived grade at the `defaultLibrary` seam** delivered the whole "richer model, zero consumer rewrite" promise with one `.map()`.
- The **integrity test (derived == curated)** turned the biggest risk (silently changing trusted grades) into a green check, enabling a 0-iteration Check.
- **Public-Library feature ⇒ fully runtime-verifiable** — first cycle this arc to hit a true runtime 100% with no `E2E_LIVE`/DB gating (contrast v4).

### 6.2 Improve
- Profiling only 8/27 effects means most Library pages still show the bare letter; the curation backlog is now the main lever on user-visible value.

### 6.3 Try Next
- A lightweight authoring checklist (or the deferred AI-draft aid) to make profiling the remaining effects fast and consistent.

---

## 8. Next Steps

### 8.1 Immediate
- [ ] `/pdca archive evidence-grading`
- [ ] Commit v5 (own branch `feat/evidence-grading-v5`, per milestone convention) / open PR.

### 8.2 Next Cycle (v6 candidates)
| Item | Priority |
|------|----------|
| Expand profiled-effect coverage | High |
| AI-assisted dimension drafting | Medium |
| Population/context-adjusted grades | Low |

---

## 9. Changelog

### v5 — evidence-grading (2026-06-16)

**Added:**
- `EvidenceProfile` model (5 dimensions × ordinal 0–3, per-dimension rationale + citations).
- Pure `lib/evidence-grading` rubric: weighted composite + derived A/B/C/D grade + breakdown + validation.
- Grade resolution in `lib/evidence` (pre-resolved `defaultLibrary`) + `effectComposite`.
- Composite-aware ranking in Protocol Builder + Stack Evaluator (grade fallback).
- Library per-dimension `EvidenceBreakdown` (expandable, citation-linked) on supplement pages.
- 8 seeded effect profiles across 7 supplements (A·B·C), integrity-checked.

**Changed:**
- `Effect` gains optional `evidenceProfile`; `ProtocolSuggestion` gains optional `composite`.

**Dependencies:** none added.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-16 | v5 completion report — 8/8 SC, 100% runtime-verified, QA PASS, 0 iterations | benhwang121@gmail.com |
</content>
