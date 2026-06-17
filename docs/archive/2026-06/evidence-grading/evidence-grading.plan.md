---
template: plan-plus
version: 1.0
feature: evidence-grading
date: 2026-06-16
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v5
---

# evidence-grading Planning Document

> **Summary**: Effect-level, **multi-dimensional** evidence grading — each effect gains an optional `evidenceProfile` (human-evidence strength, study quality, consistency, effect size, population relevance), scored by a pure deterministic `lib/evidence-grading` rubric that **derives** the existing single-letter grade. Backward-compatible (profile-less effects keep their literal grade), so no v1–v4 consumer is rewritten. Adds composite-based ranking and per-dimension citations.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v5 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-16
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | The trust layer grades each effect with a single letter (A/B/C/D). The CLAUDE.md north star is to grade *across dimensions* (human-evidence strength, study quality, consistency, effect size, population relevance) — so a "B" is opaque about *why*. The grade can't be inspected, compared on its merits, or traced to the studies that justify it. |
| **Solution** | An optional, curated **`evidenceProfile`** per effect + a pure, deterministic **`lib/evidence-grading`** module that computes a weighted **composite score** and **derives** the A/B/C/D grade from it. The literal grade stays the single resolved value every existing consumer reads, so nothing is rewritten; profiled effects gain an inspectable, citation-backed breakdown. |
| **Function/UX Effect** | Library effect cards keep the familiar grade badge but expand into a per-dimension breakdown (rating + the papers backing each dimension); Protocol/Stack ranking can order by the finer composite instead of the coarse letter. Seeded incrementally — a few effects fully profiled first. |
| **Core Value** | Turns an opaque letter into a transparent, explainable, traceable evidence judgment — the natural deepening of the trust moat — with zero new infra, full editorial control, and the same proven pure-engine/seed-as-code architecture. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Single-letter effect grades are opaque and untraceable; the product's promise is evidence *navigability*, not a black-box score. |
| **WHO** | The established health-nerd / biohacker / longevity audience — especially evidence-literate users who scrutinize *why* a claim is graded as it is. |
| **RISK** | A rubric that disagrees with curated intent (derived grade ≠ seeded grade); breaking the load-bearing `grade` that 4 milestones consume; over-engineering the dimension model; citations that don't actually support their dimension. |
| **SUCCESS** | Profiled effects expose an inspectable, citation-backed dimension breakdown; the derived grade matches curated intent; all existing consumers keep working; ranking can use the composite; deterministic & unit-tested. |
| **SCOPE** | `evidenceProfile` model + pure `lib/evidence-grading` (composite + derive + breakdown) + grade resolution in `lib/evidence` + seed subset + Library breakdown UI + composite re-ranking + per-dimension citations. **No** population-adjusted grades, **no** AI drafting (v6). |

---

## 1. User Intent Discovery

### 1.1 Core Problem
Every `Effect` carries `grade: "A"|"B"|"C"|"D"` — a single ordinal that powers evidence-fit flags, protocol tiers/ranking, and lab-signal weighting. But it collapses several independent questions (Is there *human* evidence? Are the *studies* good? Are findings *consistent*? Is the *effect size* meaningful? Does it apply to *this population*?) into one letter. v5's purpose is **effect-level grading rigor**: make those dimensions explicit, scored, and citation-backed, while the letter becomes a *derived, explainable summary*.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| Evidence-literate biohacker | Scrutinizes a supplement's effect claims | See *why* a grade is what it is, traced to studies |
| Longevity / cautious user | Weighs strength vs uncertainty | A breakdown that separates "strong studies" from "big effect" |
| Curator (project author) | Seeds/maintains evidence | A rubric that turns judgment into a reproducible grade |

### 1.3 Success Criteria
1. An `EvidenceProfile` models ≥5 dimensions, each with an ordinal score + rationale + citing `paperIds`.
2. `lib/evidence-grading.compositeScore(profile)` returns a deterministic `[0,1]` weighted score.
3. `deriveGrade(profile)` maps the composite to A/B/C/D via fixed thresholds; pure & deterministic.
4. `lib/evidence` resolves each effect's grade = derived (if profiled) else the literal seed grade — a single resolved value for all consumers.
5. A subset of seed effects carry full profiles; an integrity test asserts each profiled effect's derived grade equals its curated intent.
6. Library effect display shows a per-dimension breakdown (rating + per-dimension citations) alongside the existing grade badge.
7. Protocol Builder / Stack Evaluator can order by `compositeScore` when available, falling back to the existing `GRADE_RANK`.
8. No regression: all v1–v4 grade consumers (biomarkers weight, protocol tier, evidence-fit, badges) keep working unchanged.

### 1.4 Constraints

| Constraint | Details | Impact |
|------------|---------|--------|
| Backward compatibility | The load-bearing `grade` must keep working for 4 shipped milestones | High |
| Determinism | Composite + derivation are pure functions; identical profile → identical grade | High |
| Curation honesty | Derived grade must match curated intent (integrity-tested); citations must be real seed papers | High |
| No new infra | Evidence is seed-as-code reference data — no DB table, no LLM in v5 | Medium |
| Non-diagnostic | Dimension rationales describe evidence, never prescribe | Medium |

---

## 2. Alternatives Explored

### 2.1 Approach A: Additive dimension model + derived composite — **Selected**

| Aspect | Details |
|--------|---------|
| **Summary** | Optional `evidenceProfile` per effect; pure `lib/evidence-grading` derives the composite + grade; `lib/evidence` resolves a single grade; consumers unchanged. |
| **Pros** | Backward-compatible (no consumer rewrite); deterministic single source of truth; explainable per-dimension UI; incremental seeding; on-brand pure-engine/seed-as-code. |
| **Cons** | Needs a curated scoring rubric + per-effect seeding effort. |
| **Effort** | Medium |
| **Best For** | Real dimensional rigor while protecting v1–v4. |

### 2.2 Approach B: Full replacement (dimensions as the only source)

| Aspect | Details |
|--------|---------|
| **Summary** | Remove `grade`; refactor evaluator/protocol/biomarkers to consume the composite. |
| **Pros** | One clean model, no dual representation. |
| **Cons** | Rewrites load-bearing code across 4 milestones (high regression risk); every effect needs a full profile or it breaks. |
| **Effort** | High |
| **Best For** | A greenfield evidence layer (not this codebase's reality). |

### 2.3 Approach C: Confidence overlay (minimal)

| Aspect | Details |
|--------|---------|
| **Summary** | Keep the letter; add a light confidence/quality note per effect, no full rubric. |
| **Pros** | Smallest, lowest risk. |
| **Cons** | Doesn't deliver the multi-dimensional north star — the core problem stays unsolved. |
| **Effort** | Low |

### 2.4 Decision Rationale
**Selected: Approach A.** It is the only option that delivers genuine dimensional rigor while keeping the derived single grade as a compatibility + sorting key — preserving determinism and avoiding a risky rewrite of four shipped milestones. Because the engine is pure and data-driven, it upgrades later (population-adjusted grades, AI-assisted drafting) with no consumer rework. B endangers v1–v4; C re-labels the problem without solving it.

---

## 3. YAGNI Review

### 3.1 Included (v5 Must-Have)

| # | Item | Why essential |
|---|------|---------------|
| 1 | `EvidenceProfile` dimension model | The feature itself |
| 2 | Pure `lib/evidence-grading` (composite + derive + breakdown) | Deterministic scoring engine, parity with `lib/biomarkers` |
| 3 | Grade resolution in `lib/evidence` (derive if profiled, else literal) | Single resolved grade; zero consumer rewrite |
| 4 | Seed subset of effects with full profiles + integrity test | Curated knowledge; rubric honesty |
| 5 | Library per-dimension breakdown UI | Where the rigor becomes visible |
| 6 | **Composite-based re-ranking** (protocol/evaluator) | Finer ordering than A/B/C/D, with grade fallback |
| 7 | **Per-dimension citations** | Each dimension traces to the studies that justify it |

> Items 6–7 confirmed via YAGNI multiSelect.

### 3.2 Deferred (v6+)

| Feature | Reason for Deferral | Revisit When |
|---------|---------------------|--------------|
| AI-assisted dimension drafting (SDK) | Curation aid, not user value; adds an LLM authoring path | When seeding volume demands it |
| Population/context-adjusted grades | Largest modeling jump (grades become context-dependent) | After the flat rubric is validated |
| Profiling *every* effect | Incremental seeding proves value first | Ongoing curation |
| "Evidence literacy" gamification score | Out of the trust-layer core | If gamification is prioritized |

### 3.3 Removed (Won't Do — this version)

| Feature | Reason |
|---------|--------|
| Live paper ingestion / PubMed pipeline | Different feature (real-ingestion); v5 is grading rigor on curated data |
| Removing or restructuring the `grade` field | Breaks 4 milestones of consumers |
| Diagnostic/prescriptive dimension copy | Violates the safety principle |

---

## 4. Scope

### 4.1 In Scope
- New pure module `src/lib/evidence-grading/` (types, composite, derive, breakdown, tests).
- Extend `src/types/effect.ts` with optional `evidenceProfile`.
- Grade resolution in `src/lib/evidence` (derive when profiled, else literal).
- Seed a subset of `src/data/seed-effects.ts` effects with full profiles (+ Zod/integrity validation).
- `components/evidence/EvidenceBreakdown.tsx` on supplement/effect display; wire into `SupplementDetail`.
- Composite-aware ordering in `lib/protocol-builder` + `lib/stack-evaluator` (fallback to `GRADE_RANK`).
- Per-dimension `paperIds` rendered as citations.

### 4.2 Out of Scope
- AI-assisted drafting; population-adjusted grades; profiling all effects; evidence-literacy score — (deferred, §3.2)
- Live paper ingestion; removing `grade`; prescriptive copy — (removed, §3.3)
- DB tables — evidence stays seed-as-code

---

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `EvidenceProfile` with ≥5 dimensions, each `{score:0..3, rationale, paperIds}` | High | Pending |
| FR-02 | `compositeScore(profile)` → deterministic `[0,1]` weighted average | High | Pending |
| FR-03 | `deriveGrade(profile)` maps composite → A/B/C/D via fixed thresholds | High | Pending |
| FR-04 | `gradeBreakdown(profile)` → per-dimension view (label, score, rationale, papers) | High | Pending |
| FR-05 | `lib/evidence` returns each effect with a resolved grade (derived if profiled, else literal) | High | Pending |
| FR-06 | Subset of seed effects carry full profiles; integrity test: derived == curated intent | High | Pending |
| FR-07 | `EvidenceBreakdown` renders dimensions + per-dimension citations in the Library | High | Pending |
| FR-08 | Protocol/Evaluator order by composite when available, else `GRADE_RANK` | Medium | Pending |
| FR-09 | Dimension copy is descriptive/non-diagnostic | Medium | Pending |

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Determinism | `lib/evidence-grading` pure, DB-agnostic | Unit tests; identical profile → identical grade |
| Compatibility | All existing grade consumers unchanged & green | Full suite stays green (147 baseline) |
| Integrity | Profiled effects' derived grade == seeded intent; citations reference real papers | Integrity/Zod tests |
| Build/Test | tsc clean, next build green, suite green | CI / local |

---

## 6. Success Criteria

### 6.1 Definition of Done
- [ ] `lib/evidence-grading` (composite, derive, breakdown) implemented + unit-tested.
- [ ] `Effect.evidenceProfile` added; subset seeded; integrity test green.
- [ ] `lib/evidence` resolves grade; consumers unchanged.
- [ ] `EvidenceBreakdown` in Library; composite re-ranking in protocol/evaluator.
- [ ] tsc clean · next build green · full suite green (no v1–v4 regression).

### 6.2 Quality Criteria
- Determinism: identical profile → identical composite & grade.
- Honesty: derived grade matches curated intent (test-asserted); per-dimension citations are real seed papers.
- Backward-compat: profile-less effects render exactly as today.

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Derived grade ≠ curated intent | High (trust) | Medium | Integrity test per profiled effect; tune weights/thresholds against curated set |
| Breaking load-bearing `grade` | High | Low | Additive only; resolved-grade indirection; full suite must stay green |
| Over-engineered dimension model | Medium | Medium | Fix at 5 ordinal dimensions (0–3); no free-form scales |
| Citations don't support their dimension | Medium | Medium | `paperIds` validated against seed papers; curator rationale required |
| Composite re-ranking shifts existing protocol output unexpectedly | Medium | Medium | Composite as a *secondary* key; grade fallback; snapshot tests on ordering |

---

## 8. Architecture Considerations

### 8.1 Project Level
Dynamic. Continues the Clean-Architecture, pure-engine, seed-first posture of v1–v4.

### 8.2 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Grade source | Derive from profile when present, else literal | Single resolved value; backward-compatible |
| Dimension scale | 5 dimensions, ordinal 0–3 | Reproducible, low-ambiguity curation |
| Composite | Weighted average → threshold map | Deterministic, explainable, tunable |
| Storage | Seed-as-code (no DB) | Reference data, like `lib/biomarkers` |
| Ranking | Composite secondary key, grade fallback | Finer ordering without destabilizing consumers |
| Citations | `paperIds` per dimension | Traceability to the trust layer's papers |

### 8.3 Component Overview
```txt
src/lib/evidence-grading/
  index.ts      # compositeScore, deriveGrade, gradeBreakdown
  weights.ts    # DIMENSION_WEIGHTS, GRADE_THRESHOLDS
  types.ts      # EvidenceDimension, DimensionScore, EvidenceProfile
  evidence-grading.test.ts
src/types/effect.ts            # + evidenceProfile?: EvidenceProfile
src/data/seed-effects.ts       # subset gains evidenceProfile (+ integrity test)
Integrations:
  lib/evidence/index.ts        # resolve grade (derive if profiled)
  lib/protocol-builder         # compositeScore in compareSuggestions (fallback grade)
  lib/stack-evaluator          # composite-aware evidence-fit ordering
  components/evidence/EvidenceBreakdown.tsx  # per-dimension bars + citations
  components/library/SupplementDetail.tsx    # wire breakdown in
```

### 8.4 Data Flow
```txt
seed effect (+ evidenceProfile, subset)
  -> lib/evidence resolves grade (deriveGrade if profiled, else literal)
  -> lib/evidence-grading: compositeScore + gradeBreakdown
  -> Library SupplementDetail: EffectGradeBadge (letter) + EvidenceBreakdown
       (per-dimension rating + papers backing each dimension)
  -> protocol-builder / stack-evaluator: rank by composite (fallback GRADE_RANK)
```

---

## 9. Convention Prerequisites
- Reuse v1–v4 conventions (PascalCase components, camelCase utils, kebab-case folders, Zod schemas, Design-ref comments).
- New types in `src/types/effect.ts` (or `src/types/evidence-grading.ts`). No new env vars / external services.

---

## 10. Next Steps
```
Plan Plus completed
Document: docs/01-plan/features/evidence-grading.plan.md
Next step: /pdca design evidence-grading
```

1. [ ] Write design document (`/pdca design evidence-grading`)
2. [ ] Review + approve (esp. rubric weights/thresholds, backward-compat)
3. [ ] Start implementation (`/pdca do evidence-grading`)

---

## Appendix: Brainstorming Log

| Phase | Question | Answer | Decision |
|-------|----------|--------|----------|
| Q1 — v5 Direction | AI layer / adherence / finish-lab / content depth | **Content & evidence depth** | Scale the trust moat |
| Q2 — Core Problem | grading rigor / breadth / ingestion / per-supplement depth | **Evidence grading rigor** | Effect-level multi-dimensional grading |
| Phase 2 — Approach | A additive / B replace / C overlay | **A: Additive + derived composite** | Rigor without rewriting v1–v4 |
| Phase 3 — YAGNI | re-ranking / citations / AI-drafting / population-adjusted | **Re-ranking + citations** (AI-draft + population deferred) | Finer ordering + traceability |
| Phase 4 — Design | architecture / rubric / data flow | **Approved as-is** | Proceed to Plan generation |

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-16 | Initial v5 plan-plus document for evidence-grading | benhwang121@gmail.com |
</content>
