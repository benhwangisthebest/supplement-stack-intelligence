---
template: plan-plus
version: 1.0
feature: protocol-builder
date: 2026-06-11
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
---

# protocol-builder Planning Document

> **Summary**: A rule-based generator that turns a user's Profile into evidence-graded, conflict-filtered supplement suggestions grouped by goal — which the user reviews and accepts (item-by-item or all) into an existing stack.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-11
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | After building a profile, users still have to manually figure out *which* supplements fit their goals — the platform knows the evidence and their context but doesn't proactively propose a strategy. |
| **Solution** | A pure, rule-based `lib/protocol-builder` that, per Profile goal, ranks seed-evidence supplements by grade, filters allergen/medication conflicts, and annotates each with tier, dose, timing, rationale, and lab signals — surfaced as an ephemeral, reviewable protocol the user accepts into a stack. |
| **Function/UX Effect** | On a stack's detail page, "Generate Protocol" produces goal-grouped suggestions (tier + grade badges, why-it-fits, lab-boosted markers, conflict warnings); users dismiss, accept individually, or accept-all into that stack, then re-evaluate. Suggestions already in the stack are flagged (protocol-vs-stack gap). |
| **Core Value** | Turns the Profile + evidence layers into a *proactive, explainable* supplement strategy — closing the loop from "here's the evidence" to "here's what makes sense for you," without ever locking the user in. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Users have a profile + evidence but no proactive, personalized strategy; building a sensible stack from scratch is hard. |
| **WHO** | Health nerds, biohackers, athletes, longevity users — with a filled-in Profile. |
| **RISK** | Suggestions feeling generic or "doctor-like"; recommending conflicting items; non-deterministic/opaque ranking; scope creep into persistence/AI. |
| **SUCCESS** | From a profile, generate grouped, evidence-graded, conflict-safe suggestions the user can accept into a stack and then evaluate. |
| **SCOPE** | Ephemeral generation + accept-into-existing-stack + rule-based engine. No Protocol persistence, no scoring model, no LLM. |

---

## 1. User Intent Discovery

### 1.1 Core Problem
The Profile and Library evidence exist, but the user must still translate "my goals + my constraints" into a concrete candidate stack by hand. Protocol Builder does that translation: it proposes an evidence-aware, personalized starting point grouped by goal, which the user remains free to edit or reject.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| Health nerds / biohackers | Have a profile, want a vetted starting strategy to tweak | Explainable, evidence-graded suggestions they can override |
| Athletes | Goal-driven (training/recovery) | Goal-grouped picks with dose/timing |
| Longevity / foundational users | Want sensible foundational coverage | Tiered suggestions (foundational → experimental) |

### 1.3 Success Criteria

- [ ] SC-1: From a Profile with goals, `generateProtocol` returns suggestions grouped by goal, each with grade, tier, dose, timing, and a plain-English rationale.
- [ ] SC-2: Suggestions never include items conflicting with the user's allergies; medication-caution items are flagged (reuse safety rules).
- [ ] SC-3: User can dismiss a suggestion, accept one, or accept-all into a chosen (current) stack via the existing items API.
- [ ] SC-4: Lab markers visibly influence prioritization (e.g. low Vitamin D boosts/marks the D suggestion).
- [ ] SC-5: Suggestions already present in the target stack are flagged (protocol-vs-stack gap); user can regenerate after profile edits.
- [ ] SC-6: All advisory copy is non-diagnostic (via `lib/safety`); generation is deterministic and unit-tested without a DB.

### 1.4 Constraints

| Constraint | Details | Impact |
|------------|---------|--------|
| Determinism / trust | Rule-based only; no LLM; reproducible output | High |
| Non-diagnostic | All copy through `lib/safety` | High |
| Reuse over rebuild | Must reuse `lib/evidence`, `lib/safety`, stacks/items API, Profile layer | Medium |
| Ephemeral | No Protocol table; the accepted stack is the saved artifact | Medium |

---

## 2. Alternatives Explored

### 2.1 Approach A: Pure rule-based ranking over seed effects — **Selected**

| Aspect | Details |
|--------|---------|
| **Summary** | Per goal: candidates via `getEffectsByOutcome` → rank by grade → filter conflicts → annotate tier/dose/timing/rationale/lab signal. Pure `lib/protocol-builder`. |
| **Pros** | Deterministic, unit-testable without DB; reuses evidence + safety; consistent with `stack-evaluator`; explainable ranking. |
| **Cons** | Simple grade-first ranking (no weighted nuance). |
| **Effort** | Medium |
| **Best For** | This MVP — trustworthy and fast. |

### 2.2 Approach B: Weighted scoring model

| Aspect | Details |
|--------|---------|
| **Summary** | Composite score: grade × confidence × profile-fit × lab − redundancy. |
| **Pros** | Smarter ordering, better tie-breaking. |
| **Cons** | Weight tuning/justification; harder to test and explain. |
| **Effort** | High |
| **Best For** | A v2 upgrade once the baseline is validated. |

### 2.3 Approach C: LLM-assisted generation

| Aspect | Details |
|--------|---------|
| **Summary** | Model composes the protocol. |
| **Pros** | Flexible rationale. |
| **Cons** | Non-deterministic, costly, hard to keep evidence-bound/non-diagnostic, not unit-testable. |
| **Effort** | High |
| **Best For** | Not this product's trust model. |

### 2.4 Decision Rationale
**Selected**: Approach A — it matches the proven pure-engine architecture, reuses `lib/evidence` + `lib/safety`, and keeps generation deterministic and testable, upholding the platform's evidence-first/trust principle. B is the natural future enhancement.

---

## 3. YAGNI Review

### 3.1 Included (v1 Must-Have)

Locked essentials:
- [ ] Per-goal, grade-ranked suggestions
- [ ] Allergen + medication conflict filtering
- [ ] Dose + timing (from seed)
- [ ] "Why it fits" explanation
- [ ] Grouped-by-goal UI
- [ ] Accept item → chosen (current) stack via existing items API
- [ ] Safety disclaimer

Selected enrichments:
- [ ] Tier tagging (foundational / targeted / advanced / experimental)
- [ ] "What would raise confidence" note per item
- [ ] Lab-informed prioritization (boost/flag from lab markers)
- [ ] Reject / dismiss items (ephemeral)
- [ ] Compare protocol vs current stack (already-in-stack flag)
- [ ] Accept-all bulk add
- [ ] Regenerate button

### 3.2 Deferred (v2+)

| Feature | Reason for Deferral | Revisit When |
|---------|---------------------|--------------|
| Risk-tolerance / experience-level filtering | Useful but adds branching; profile already informs conflicts | After v1 feedback |
| Weighted scoring model (Approach B) | Grade-ranking sufficient to validate value | Once baseline proven |
| Persisted Protocol entity + history/diff | Ephemeral chosen; stack is the artifact | If users want to revisit past suggestions |
| Auto-create-new-stack on accept | Accept-into-existing chosen | If demand emerges |

### 3.3 Removed (Won't Do — this version)

| Feature | Reason |
|---------|--------|
| LLM-assisted generation | Breaks determinism/trust/testability |
| Cross-goal global optimization | Over-engineering for v1 |

---

## 4. Scope

### 4.1 In Scope
- [ ] `lib/protocol-builder` pure generator (grouped, ranked, conflict-filtered, annotated)
- [ ] `POST /api/protocol/generate` `{ stackId }` (auth-guarded; loads profile + labs; returns annotated groups)
- [ ] Protocol panel on stack detail page: generate/regenerate, grouped suggestions, accept / dismiss / accept-all, in-stack flags
- [ ] Tier tagging, raise-confidence note, lab-informed prioritization
- [ ] Unit tests for the generator (deterministic, ≥80%)

### 4.2 Out of Scope
- Risk/experience filtering — (deferred, §3.2)
- Persisted protocols, history, diff — (deferred)
- Weighted scoring, LLM — (removed)
- New stack auto-creation on accept — (deferred)

---

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Generate suggestions per Profile goal, grade-ranked | High | Pending |
| FR-02 | Exclude allergen-conflicting items; flag medication-caution items | High | Pending |
| FR-03 | Annotate each: tier, dose, timing, why-it-fits, what-would-raise-confidence | High | Pending |
| FR-04 | Lab markers influence prioritization (boost/flag) | Medium | Pending |
| FR-05 | `POST /api/protocol/generate` returns grouped suggestions, auth-guarded | High | Pending |
| FR-06 | Flag suggestions already in the target stack (compare) | Medium | Pending |
| FR-07 | Accept one → add to chosen stack (reuse items API) | High | Pending |
| FR-08 | Accept-all → add all non-dismissed suggestions | Medium | Pending |
| FR-09 | Dismiss a suggestion (ephemeral) | Medium | Pending |
| FR-10 | Regenerate after profile edits | Medium | Pending |
| FR-11 | All copy non-diagnostic via `lib/safety` | High | Pending |

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Determinism | Same profile → same output | Unit tests |
| Testability | Generator pure, no DB | Vitest ≥80% on `lib/protocol-builder` |
| Architecture | Domain-pure; API orchestrates; UI in presentation | Code review / import rules |
| Trust | Explainable + non-diagnostic | Safety banned-phrase tests |

---

## 6. Success Criteria

### 6.1 Definition of Done
- [ ] FR-01–FR-03, FR-05, FR-07, FR-11 implemented
- [ ] Generator unit-tested (grouping, ranking, conflict exclusion, lab boost, tier)
- [ ] L1 (generate endpoint) + L2/L3 (panel: generate → accept → stack updates → evaluate) specs
- [ ] `tsc` clean · `next build` green

### 6.2 Quality Criteria
- [ ] ≥80% coverage on `lib/protocol-builder`
- [ ] Zero lint errors; no business logic in UI

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Suggestions feel generic | Medium | Medium | Tier + lab signals + why-it-fits make them feel personalized |
| Conflicting item slips through | High | Low | Reuse evaluator's allergen/medication logic; unit-test exclusion |
| Opaque ranking | Medium | Low | Grade-first + explicit rationale string per item |
| Scope creep (persistence/scoring) | Medium | Medium | Hard boundary: ephemeral, rule-based only |

---

## 8. Architecture Considerations

### 8.1 Project Level
Dynamic (consistent with mvp-core-loop). Selected: ✅ Dynamic.

### 8.2 Key Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Persistence | ephemeral / persisted / persisted+diff | Ephemeral | Stack is the artifact; least scope |
| Acceptance target | existing stack / new stack / both | Existing (current) stack | Reuses items API; protocol stays advisory |
| Engine | rule-based / scoring / LLM | Rule-based (A) | Deterministic, testable, trustworthy |
| Placement | stack detail panel / dedicated route | Stack detail panel | Chosen-stack = current; tight loop |

### 8.3 Component Overview
```
src/lib/protocol-builder/      # PURE: generateProtocol(profile, labs, library) → ProtocolGroup[]
  index.ts, rules.ts (tier, ranking, conflict, lab-boost), protocol-builder.test.ts
src/app/api/protocol/generate/route.ts   # auth + load profile/labs → generate → annotate vs stack
src/components/stack/ProtocolPanel.tsx    # generate/regenerate, groups, accept-all
src/components/stack/SuggestionCard.tsx   # tier+grade badges, dose/timing, rationale, accept/dismiss
src/types/protocol.ts                     # ProtocolSuggestion, ProtocolGroup, Tier
```

### 8.4 Data Flow
```
Profile + LabMarkers (Supabase) + seed evidence
   └─→ generateProtocol() [pure] ─→ ProtocolGroup[] (annotated alreadyInStack vs target)
         └─→ ProtocolPanel ─→ Accept / Accept-all ─→ POST /api/stacks/:id/items
               └─→ stack updates ─→ existing Evaluate/Compare
```

---

## 9. Convention Prerequisites
- [ ] Follow established conventions from mvp-core-loop (pure `lib/`, `{data,error}` envelope, RLS, Zod)
- [ ] `lib/protocol-builder` imports only `lib/evidence`, `lib/safety`, types

---

## 10. Next Steps
1. [ ] `/pdca design protocol-builder`
2. [ ] Define tier rules + lab-boost thresholds + ranking tie-breaks in Design
3. [ ] Implement + test → `/pdca do protocol-builder`

---

## Appendix: Brainstorming Log

| Phase | Question | Answer | Decision |
|-------|----------|--------|----------|
| Intent | Persistence model? | Ephemeral | No Protocol table; stack is the artifact |
| Intent | Acceptance target? | Existing chosen stack | Reuse items API |
| Alternatives | Generation engine? | Rule-based (A) over scoring (B) / LLM (C) | Deterministic, testable, trustworthy |
| YAGNI (richness) | tier / confidence-note / lab / risk-filter? | tier + note + lab IN; risk-filter OUT | Personalization without branching complexity |
| YAGNI (interactions) | dismiss / compare / accept-all / regenerate? | All IN | Full review UX, all ephemeral/cheap |
| Design | Architecture & placement OK? | Yes — panel on stack detail | Anchor Plan to pure generator + 1 endpoint |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-06-11 | Initial draft (Plan Plus) | benhwang121@gmail.com |
