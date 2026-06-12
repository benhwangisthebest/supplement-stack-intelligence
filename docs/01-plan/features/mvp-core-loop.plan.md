---
template: plan-plus
version: 1.0
description: Brainstorming-enhanced PDCA Plan for the Supplement Stack Intelligence MVP core loop
feature: mvp-core-loop
date: 2026-06-11
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0 (pre-init)
---

# MVP Core Loop — Planning Document

> **Summary**: A logged-in user can search a seeded supplement Library, build a profile-aware supplement stack, and receive an evidence-aware evaluation — proving the North Star loop end-to-end.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 (pre-init, greenfield)
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-11
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Health nerds, biohackers, and athletes can't easily tell whether their supplement stack actually makes sense — evidence is scattered, generic quizzes oversimplify, and existing tools don't combine personal context with effect-level evidence. |
| **Solution** | An MVP built on the three-pillar model (Library / Profile / Stack Lab) using **Approach A: Seed-first** — curated TS evidence data + Supabase-persisted profile/stacks + pure-function rule engine — to deliver a working core loop quickly without over-investing in infrastructure. |
| **Function/UX Effect** | Users search supplements with effect-level evidence grades and study summaries, fill a progressive profile (incl. manual lab markers), build multiple Current/Planned stacks, and get a non-trivial evaluation report (evidence/dose/redundancy/allergy/goal-fit flags) plus a Compare view against their goals — all wrapped in standardized safety language. |
| **Core Value** | Turns complex supplement science into a navigable, personalized, evidence-first decision-support tool that respects user freedom and earns trust before any monetization. |

---

## 1. User Intent Discovery

### 1.1 Core Problem

The product's North Star question is: **"Does my supplement stack actually make sense?"** Today, answering this requires manually cross-referencing fragmented research, ignoring one's own biological context, and trusting opinionated wellness apps. The MVP exists to make that question answerable in one coherent loop.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| Health nerds / biohackers | Self-experimenting, want depth and control | Effect-level evidence + freedom to customize, not a strict doctor |
| Athletes | Performance/recovery stacks | Dose/timing/redundancy clarity tied to goals |
| Longevity-focused users | Long-term foundational stacks | Trustworthy, evidence-graded guidance |
| Moderately health-interested | Want to understand, not be oversimplified | Layered depth (summary → mechanism → papers) |

### 1.3 Success Criteria

- [ ] A user can sign up, search a seeded supplement, and view a detail page with effect-level grades, dose ranges, side effects, paper summaries, and related supplements.
- [ ] A user can create a profile (goals, diet, allergies, medications, preferences, manual lab markers) that persists.
- [ ] A user can build one or more stacks (Current + Planned) with full item detail (dose/unit/timing/frequency/purpose).
- [ ] Running an evaluation produces **non-trivial, useful flags** (evidence fit, dose fit, redundancy, allergy conflict, goal alignment) that a biohacker would respect.
- [ ] The full loop (search → stack → evaluation → compare) is demoable end-to-end on seeded data.

### 1.4 Constraints

| Constraint | Details | Impact |
|------------|---------|--------|
| Educational / non-diagnostic | No diagnosis, treatment, or cure claims; standardized cautionary language required | High |
| Seed-data-only evidence | No live PubMed / external APIs in MVP; curated dataset must be high quality | Medium |
| User freedom | App evaluates rather than blocks; only strong warnings for genuine safety issues | High |
| Trust before monetization | No affiliate/product logic influencing recommendations (Product Match deferred entirely) | Medium |

---

## 2. Alternatives Explored

### 2.1 Approach A: Seed-first, persistence-light — **Selected**

| Aspect | Details |
|--------|---------|
| **Summary** | Curated TS seed modules for Library/evidence/papers; Supabase (auth + tables) for Profile/Stacks; evaluation logic as pure functions in `lib/`. |
| **Pros** | Fastest path to a working demo; evidence stays curated/high-quality (matches the trust layer); business logic is DB-agnostic and unit-testable. |
| **Cons** | Library content not admin-editable yet (adding supplements requires code edits). |
| **Effort** | Medium |
| **Best For** | Validating the North Star loop quickly without over-investing in infrastructure. |

### 2.2 Approach B: Full Supabase from day one

| Aspect | Details |
|--------|---------|
| **Summary** | Entire data model (Library included) in Postgres with auth/RLS/ORM from the start. |
| **Pros** | No later migration; closest to production shape. |
| **Cons** | Heavy upfront schema + seeding before the loop is demoable; risks YAGNI violations (Product/Protocol/Lab tables before they're exercised). |
| **Effort** | High |
| **Best For** | Teams certain of the full model and not optimizing for fastest validation. |

### 2.3 Approach C: Fully local / no-auth prototype

| Aspect | Details |
|--------|---------|
| **Summary** | In-memory/localStorage only, single anonymous user, no Supabase. |
| **Pros** | Zero infra; pure UX/loop prototype. |
| **Cons** | No real persistence/multi-user; Profile↔Stack relationship feels fake; work is thrown away. |
| **Effort** | Low |
| **Best For** | A disposable UX sketch only. |

### 2.4 Decision Rationale

**Selected**: Approach A
**Reason**: It hits the chosen success metric (a working core-loop demo) fastest while preserving the two things that define product credibility — curated evidence quality and real, persistent personalization. It keeps the rule engine pure and testable, and defers infra (Product/Protocol tables, RLS-heavy modeling) until those features are actually built.

---

## 3. YAGNI Review

### 3.1 Included (v1 Must-Have)

Locked core-loop essentials:
- [ ] 3-pillar navigation + dashboard shell + landing page
- [ ] Auth (signup / login)
- [ ] Supplement search + detail pages
- [ ] Profile core fields (goals, diet, allergies, medications, preferences)
- [ ] Create stack + add/edit/remove items (dose/unit/timing/frequency/purpose/reason)
- [ ] Stack intent
- [ ] Rule-based stack evaluation (evidence/dose/allergy/redundancy/goal-fit)
- [ ] Evaluation report UI

Selected via YAGNI vote (all kept):
- [ ] Effect-level evidence grading (grade per effect, not per supplement)
- [ ] Paper summary cards (seeded studies)
- [ ] Related supplements
- [ ] Safety / disclaimer layer (standardized warning language + medical disclaimers)
- [ ] Multiple stacks per user
- [ ] Planned Stack mode (alongside Current Stack)
- [ ] Compare Mode (current stack vs profile goals)
- [ ] Manual lab marker entry (influences evaluation prioritization)

### 3.2 Deferred (v2+ Maybe)

| Feature | Reason for Deferral | Revisit When |
|---------|---------------------|--------------|
| Protocol Builder (rule-based protocol generation) | Not part of the minimal proof loop; user scoped MVP to "core loop only" | After core loop validated |
| Product Match (seeded mock) | Trust loop must prove value before product/affiliate surface | Post-MVP |
| Lab/allergy file upload UI placeholder | Manual lab entry covers the MVP need | When parsing is built |
| Medication interaction database | Flags use placeholders; real DB is a large dependency | Post-MVP |
| Admin CMS for Library content | Seed-as-code is sufficient at MVP scale | When dataset grows |

### 3.3 Removed (Won't Do — this version)

| Feature | Reason for Removal |
|---------|-------------------|
| Amazon API / live commerce | Out of MVP scope per brief; monetization gated behind trust |
| Automatic blood/allergy report parsing | Heavy; replaced by manual entry |
| Live PubMed ingestion / AI paper summaries | Seeded summaries only in MVP |
| Wearables, mobile app, payments, community, doctor portal, gamification | Explicitly out of scope in brief |

---

## 4. Scope

### 4.1 In Scope

- [ ] **Library** (seed-backed): search, detail pages, effect-level grading, paper summary cards, related supplements
- [ ] **Profile** (Supabase): core fields + manual lab markers, progressive completion
- [ ] **Stack Lab** (Supabase): multiple stacks, Current + Planned modes, item editor, stack intent, evaluation report, Compare Mode
- [ ] **Evaluation engine** (`lib/stack-evaluator`): evidence/dose/redundancy/allergy/goal-fit flags
- [ ] **Safety layer** (`lib/safety`): standardized warning language + disclaimer placement
- [ ] Auth + app shell + 3-pillar navigation

### 4.2 Out of Scope

- Protocol Builder — (deferred, YAGNI Review §3.2)
- Product Match / affiliate logic — (deferred)
- File upload parsing for labs/allergy reports — (deferred)
- Real medication-interaction DB, live research ingestion, integrations — (removed for v1)
- Gamification, mobile, payments, community — (per brief)

---

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | User can sign up / log in; session persists | High | Pending |
| FR-02 | User can search seeded supplements and open a detail page | High | Pending |
| FR-03 | Supplement detail shows effect-level evidence grades, dose ranges, side effects, paper summaries, related supplements | High | Pending |
| FR-04 | User can create/edit a profile (goals, diet, allergies, medications, preferences) | High | Pending |
| FR-05 | User can add manual lab markers that the evaluator can read | Medium | Pending |
| FR-06 | User can create multiple stacks with intent, in Current and Planned modes | High | Pending |
| FR-07 | User can add/edit/remove stack items (dose, unit, timing, frequency, purpose, reason) | High | Pending |
| FR-08 | Evaluator produces flags for evidence fit, dose fit, redundancy, allergy conflict, goal alignment | High | Pending |
| FR-09 | Evaluation report UI renders flags with severity, explanation, and recommendation | High | Pending |
| FR-10 | Compare Mode shows current stack vs profile goals (gap view) | Medium | Pending |
| FR-11 | Safety/disclaimer language appears near Profile, labs, and evaluation per the safety module | High | Pending |
| FR-12 | App evaluates rather than blocks; only strong warnings for genuine safety risks | High | Pending |

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | Library search + detail render perceived-instant on seed data (< 200ms client) | Manual / Lighthouse |
| Architecture | Business logic fully isolated from UI (pure functions in `lib/`) | Code review |
| Trustworthiness | No unsupported medical claims; all recommendations explainable (why + evidence + uncertainty) | Content review against safety module |
| Maintainability | Evaluation logic unit-testable without DB; seed data typed | Unit tests, `tsc` |
| Compliance | Non-diagnostic language; disclaimers present where appropriate | Safety checklist |

---

## 6. Success Criteria

### 6.1 Definition of Done

- [ ] All High-priority functional requirements (FR-01–FR-04, FR-06–FR-09, FR-11, FR-12) implemented
- [ ] End-to-end loop demoable: search → build stack → evaluate → compare
- [ ] Evaluation rule engine unit-tested
- [ ] Code review completed
- [ ] Seed dataset populated for the brief's seed supplements (Magnesium, Creatine, Vitamin D, Fish oil, L-theanine, Glycine, Melatonin, Ashwagandha, Berberine, Zinc, B12, Caffeine, Taurine, NAC, Protein)

### 6.2 Quality Criteria

- [ ] Zero lint errors; build succeeds (`next build`)
- [ ] Evaluation engine test coverage meaningful (target ≥ 80% on `lib/stack-evaluator`)
- [ ] No business logic in UI components

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Seed-data quality is the trust layer — poor curation undermines credibility | High | Medium | Curate from reputable sources; grade by effect with explicit uncertainty; small dataset done well |
| Scope creep — all 8 optional items kept | Medium | Medium | Hard boundary: Protocol Builder / Product Match stay out; depth over breadth |
| Evaluation rules produce trivial or wrong flags | High | Medium | Define rule thresholds explicitly in Design; unit-test each flag category against fixtures |
| Compliance — accidental diagnostic language | High | Low | Centralize all phrasing in `lib/safety`; review copy against banned-phrase list |
| Effort underestimate on effect-level grading | Medium | Medium | Model effect grading in Design first; allow per-supplement fallback grade if a seed item lacks effect data |

---

## 8. Architecture Considerations

### 8.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | |
| **Dynamic** | Feature-based modules, BaaS/Backend integration | Web apps with backend, SaaS MVPs, fullstack apps | ✅ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | |

### 8.2 Key Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Build strategy | Seed-first / Full Supabase / Local-only | Seed-first (A) | Fastest to validated loop; curated evidence; testable logic |
| Library data source | Seed TS modules / Postgres | Seed TS modules | High-quality curation, no admin CMS needed at MVP |
| Persistence | Supabase (auth + Postgres) | Supabase | Real, multi-user persistence for Profile/Stacks |
| Evaluation logic location | UI / `lib/` pure functions | `lib/` pure functions | DB-agnostic, unit-testable, upgradeable later |
| Stack tech | Next.js + TS + Tailwind + shadcn/ui + Zod | Per brief | Modular, AI/human navigable |

### 8.3 Component Overview

```
src/
  app/
    page.tsx                # landing
    library/                # search + detail
    profile/                # core fields + lab markers
    stack-lab/              # current/planned, multiple stacks, evaluation, compare
    auth/
    api/
  components/ { layout, library, profile, stack, evidence, ui }
  lib/
    evidence/         # supplement→effect mapping, grade lookups (seed-backed)
    stack-evaluator/  # rule engine → EvaluationFlag[]
    safety/           # standardized warnings + disclaimers
    data/ utils/
  types/ { supplement, effect, paper, profile, stack, evidence }
  data/  { seed-supplements, seed-papers }   # seed-products deferred

Persisted (Supabase): UserProfile, LabMarker, Stack, StackItem, EvaluationFlag
Seed (TS):            Supplement, Effect, Paper
Deferred:             Product, Protocol
```

### 8.4 Data Flow

```
Seed Library (read) ─┐
                     ├─→ Stack Lab: build stack ─→ stack-evaluator(stack + profile + seed evidence)
Profile (Supabase) ──┘                                      │
                                                            └─→ EvaluationFlag[] ─→ Report UI
                                                                                 └─→ Compare Mode (vs goals)
                          safety module wraps all advisory/flag language
```

---

## 9. Convention Prerequisites

### 9.1 Applicable Conventions

- [ ] Greenfield — conventions to be established in Phase 2 (`/pdca` convention step)
- [ ] Naming rules: confirm in Design (entities per brief data model)
- [ ] Folder structure rules: per §8.3 (logic out of UI, in `lib/`)

---

## 10. Next Steps

1. [ ] Write design document (`/pdca design mvp-core-loop`)
2. [ ] Define evaluation rule thresholds + effect-grading schema in Design
3. [ ] Team review and approval
4. [ ] Start implementation (`/pdca do mvp-core-loop`)

---

## Appendix: Brainstorming Log

| Phase | Question | Answer | Decision |
|-------|----------|--------|----------|
| Intent | Plan scope? | MVP core loop only | Defer Protocol Builder & Product Match |
| Intent | Success metric? | Working core-loop demo | Optimize Plan for fastest end-to-end validation |
| Alternatives | Build strategy? | Seed-first (A) over Full-Supabase (B) / Local (C) | Curated evidence + Supabase persistence + pure-function engine |
| YAGNI (Library) | Effect grading / papers / related / safety? | All kept IN | Depth-first trust layer |
| YAGNI (Stack) | Multiple stacks / planned / compare / lab markers? | All kept IN | Full-featured core loop |
| Design | Architecture & data-flow OK? | Yes, generate Plan | Anchor goals to seed-first 3-pillar shape |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-11 | Initial draft (Plan Plus) | benhwang121@gmail.com |
