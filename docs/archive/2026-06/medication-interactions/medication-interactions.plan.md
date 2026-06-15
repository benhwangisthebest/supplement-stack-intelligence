---
template: plan-plus
version: 1.0
feature: medication-interactions
date: 2026-06-15
author: benhwang121@gmail.com
project: Supplement Stack Intelligence Platform
version_project: 0.1.0
milestone: v2
---

# medication-interactions Planning Document

> **Summary**: A pure, deterministic `lib/interactions` engine + curated seed dataset that replaces v1's placeholder medication flags with real supplement↔drug and supplement↔supplement interaction detection — surfaced (safety-framed) inside Stack Evaluation, Protocol Builder, and Library pages.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: 0.1.0 → v2 milestone
> **Author**: benhwang121@gmail.com
> **Date**: 2026-06-15
> **Status**: Draft
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | v1 proved the core loop, but its safety layer is hollow where it matters most: medication conflicts are *placeholders*, not real detection. A platform built on "trust over monetization" can't credibly evaluate a stack while ignoring the user's drugs. |
| **Solution** | A pure, deterministic `lib/interactions` engine driven by a curated, editorially-controlled `seed-interactions` dataset. It normalizes the user's medications to generic names + drug classes, matches supplement↔drug-class and supplement↔supplement rules, grades severity, and routes every message through the existing `lib/safety` layer. |
| **Function/UX Effect** | Real interaction findings appear under the existing "Interaction Risk" category in Stack Evaluation; Protocol Builder pre-checks each suggested item against the user's meds and demotes/flags conflicts; Library supplement pages gain an "Interactions" section; high-severity findings trigger a clinician-escalation banner. |
| **Core Value** | Turns the safety pillar from aspirational to real — the single highest-trust upgrade available — without taking on external data licensing, non-determinism, or loss of control over safety language. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v1's medication conflict detection is a placeholder; the most consequential safety question ("does this supplement clash with my drugs?") is unanswered. |
| **WHO** | Health nerds, biohackers, athletes, longevity users — especially those on at least one medication, the segment most exposed to interaction risk. |
| **RISK** | Curated coverage gaps read as false reassurance; over-flagging erodes trust / violates "don't be uselessly conservative"; brittle exact-name matching; presenting findings as medical advice. |
| **SUCCESS** | From a user's meds + stack, generate accurate, severity-graded, safety-framed interaction findings across Stack Evaluation, Protocol Builder, and Library — deterministic and unit-tested. |
| **SCOPE** | Curated-seed engine (Approach A) + drug-class matching & med normalization + supplement↔supplement + Protocol Builder integration + Library display. No external API, no DB table, no condition-based engine. |

---

## 1. User Intent Discovery

### 1.1 Core Problem
v1 is runtime-verified and complete, but its evaluation engine emits *placeholder* medication flags (per v1 design: "Detecting medication warning placeholders"). The deepest trust question — supplement–drug safety — is not actually answered. v2's purpose is **deeper intelligence**: make the advice genuinely safer, not add new surface area.

### 1.2 Target Users
The established audience (health nerds, biohackers, athletes, longevity-focused), with sharpened relevance for the **medicated subset** — users with one or more drugs in their Profile, who carry the real interaction risk and for whom a placeholder is worse than nothing.

### 1.3 Success Criteria
1. The engine detects curated supplement↔drug-class interactions from a user's Profile medications + stack.
2. Medication normalization resolves brand→generic→drug-class (e.g., Coumadin → warfarin → anticoagulant).
3. Supplement↔supplement interactions within a stack are detected.
4. Findings surface in Stack Evaluation under "Interaction Risk", in Protocol Builder (flag/demote conflicting suggestions), and on Library supplement pages.
5. All language flows through `lib/safety`; high-severity → clinician-escalation banner + disclaimer.
6. Engine is a pure function — deterministic and unit-tested (parity with existing engines).

### 1.4 Constraints
- **Architecture parity**: must follow the proven pure-function, DB-agnostic, seed-as-code pattern of `lib/stack-evaluator` / `lib/protocol-builder`.
- **Trust/safety**: editorial control of all wording; never diagnostic; conservative-but-useful balance.
- **No external dependency**: no licensed API, no new RLS table (reference data, not user data).
- **Coverage honesty**: absence of a finding must never be presented as "safe" — frame as "no known interaction in our dataset".

---

## 2. Alternatives Explored

### 2.1 Approach A: Curated-seed interaction engine — **Selected**
Pure `lib/interactions` module + curated `seed-interactions` dataset (supplement↔drug-class and supplement↔supplement rules), keyed off Profile meds + stack, safety-framed via `lib/safety`.
- **Pros**: Matches proven architecture (deterministic, unit-testable, DB-agnostic); full control of safety language; zero external/licensing dependency; ships fast; trust-first.
- **Cons**: Coverage limited to what's curated; ongoing manual maintenance.
- **Best for**: A genuinely trustworthy, explainable v2 safety upgrade.

### 2.2 Approach B: External interaction dataset / API
Integrate a licensed third-party source (RxNorm normalization + interactions API).
- **Pros**: Broad coverage; medication-name normalization; less manual curation.
- **Cons**: Licensing cost & legal exposure; strong on drug↔drug but **weak on supplement↔drug** (the core need); loss of safety-wording control; external dependency, rate limits, non-deterministic, harder to test; liability of re-presenting clinical data as advice.
- **Best for**: Later, once catalog scale + budget justify it.

### 2.3 Approach C: Hybrid — curated engine now, pluggable source adapter
Approach A's engine behind an explicit data-source interface for a future external provider.
- **Pros**: Ships trustworthy version now; no later migration; isolates external risk.
- **Cons**: Extra interface design up front; adapter unused until B is funded (mild YAGNI).

### 2.4 Decision Rationale
**Selected: Approach A.** It is the only option that deepens *trust* (the product's north star) without importing licensing, non-determinism, or loss of safety-language control. Critically, because v1's engines are already pure and data-driven, A **naturally evolves into C** later — slotting in an external source behind the same `lib/interactions` API requires no rework — so building an explicit adapter now (C) would be premature. B is the eventual scale path, not a v2 need.

---

## 3. YAGNI Review

### 3.1 Included (v2 Must-Have)

| # | Item | Why essential |
|---|------|---------------|
| 1 | `lib/interactions` pure engine | The feature itself; parity with existing engines |
| 2 | Curated `seed-interactions` dataset | Supplement↔drug-class + supplement↔supplement rules |
| 3 | Supplement↔drug matching vs Profile meds | The core safety question |
| 4 | Severity + mechanism + management note | Explainable, graded findings (not binary) |
| 5 | `lib/safety` integration | Standardized, non-diagnostic wording; high-severity escalation |
| 6 | Surface findings in Stack Evaluation | Reuses existing "Interaction Risk" category & flag UI |
| 7 | **Drug-class matching + medication normalization** | Brand→generic→class; without it the engine is brittle/exact-name-only |
| 8 | **Supplement↔supplement interactions** | Same engine + dataset shape; catches in-stack pairings beyond v1 redundancy |
| 9 | **Protocol Builder integration** | Pre-check suggested items vs meds; closes the auto-suggestion safety loop |
| 10 | **Library page interaction display** | Per-supplement "Interactions" section (fulfills v1 brief's "Medication interaction warnings") |

> Items 7–10 confirmed essential via YAGNI multiSelect — v2 ships the full layer; nothing from the optional set deferred.

### 3.2 Deferred (v3+)

| Feature | Reason for Deferral | Revisit When |
|---------|---------------------|--------------|
| External interaction API / RxNorm (Approach B) | Curated engine proves value first; A→C path is free | Catalog/scale + budget justify it |
| Supplement↔medical-condition cautions | Distinct rule type + dataset; meds are the higher-risk axis | After interaction engine validated |
| Pregnancy / population-specific interaction rules | Sensitive; needs careful curation & framing | Post-v2 with clinical review |
| Persisted interaction-acknowledgement / dismissals | Findings are recomputed; no persistence need yet | If users want to mute known findings |
| Admin CMS for interaction rules | Seed-as-code sufficient at this scale | When dataset outgrows code review |

### 3.3 Removed (Won't Do — this version)

| Feature | Reason |
|---------|--------|
| LLM-generated interaction assessments | Breaks determinism/trust/testability; unsafe for safety-critical output |
| Blocking the user from adding a flagged supplement | Violates "user freedom first" — warn strongly, never hard-block |
| Numeric "interaction risk score" rollup | Over-engineering; severity-graded findings are clearer than a single number |

---

## 4. Scope

### 4.1 In Scope
- New pure module `src/lib/interactions/` (engine, normalization, types).
- New seed data: `src/data/seed-interactions.ts`, `src/data/medication-aliases.ts` (brand→generic + drug-class membership).
- Integration into `lib/stack-evaluator` (merge findings under "Interaction Risk").
- Integration into `lib/protocol-builder` (flag/demote conflicting suggestions).
- Library supplement detail page: "Interactions" section.
- Profile medication entry: normalization/autocomplete against the alias map.
- `lib/safety` extension: interaction-severity → standardized phrasing + escalation.
- Unit tests for engine + normalization; integration coverage for evaluator/protocol surfacing.

### 4.2 Out of Scope
- External interaction API / RxNorm integration — (deferred, §3.2)
- Supplement↔condition and pregnancy/population rules — (deferred, §3.2)
- New DB tables / RLS for interactions — reference data stays seed-as-code
- Persisted dismissals, admin CMS — (deferred, §3.2)
- Hard-blocking flagged supplements, LLM assessments, numeric risk score — (removed, §3.3)

---

## 5. Requirements

### 5.1 Functional Requirements
- **FR-1** Given a list of Profile medications + stack supplements, the engine returns `InteractionFinding[]`.
- **FR-2** Medications normalize through an alias map: brand → generic → drug class(es); unresolved meds are handled gracefully (no crash, optional "unrecognized medication" note).
- **FR-3** Rules match at the **drug-class** level (e.g., supplement vs anticoagulants) and at exact-generic level where curated.
- **FR-4** Detect supplement↔supplement interactions among items in the same stack.
- **FR-5** Each finding carries: severity (e.g., info / caution / warning / serious), mechanism, management note, evidence grade, and the participating entities.
- **FR-6** `lib/safety` produces the user-facing wording; high-severity findings attach a clinician-escalation banner + disclaimer.
- **FR-7** Stack Evaluation merges findings under the existing "Interaction Risk" category.
- **FR-8** Protocol Builder runs each candidate suggestion through the engine vs Profile meds and flags/demotes conflicts (never silently drops without explanation).
- **FR-9** Library supplement detail page renders all dataset rules involving that supplement.
- **FR-10** No finding implies "safe"; the UI distinguishes "no known interaction in our dataset" from "checked and clear".

### 5.2 Non-Functional Requirements
- **NFR-1** Engine is a pure function: deterministic, side-effect-free, DB-agnostic (parity with `lib/stack-evaluator`).
- **NFR-2** Fully unit-tested; `tsc --noEmit` clean; `next build` green; existing 47 unit / 12 e2e suite stays green.
- **NFR-3** Dataset is typed (Zod-validated shape) and reviewable in code.
- **NFR-4** All copy conforms to the safety/compliance language rules in the project brief.

---

## 6. Success Criteria

### 6.1 Definition of Done
- [ ] `lib/interactions` engine + normalization implemented and unit-tested.
- [ ] `seed-interactions` + `medication-aliases` datasets seeded and Zod-validated.
- [ ] Findings surface in Stack Evaluation, Protocol Builder, and Library pages.
- [ ] Safety wording + high-severity escalation wired through `lib/safety`.
- [ ] `tsc` clean · `next build` green · full test suite green.

### 6.2 Quality Criteria
- Determinism: identical inputs → identical findings (test-asserted).
- Coverage honesty: "no known interaction" never rendered as "safe".
- No regression to v1's 99% runtime-verified core loop.
- Over-flagging guard: findings only fire on curated rules, not heuristic guesses.

---

## 7. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Curated coverage gaps read as false reassurance | High (safety/trust) | Explicit "no known interaction in our dataset" framing; never claim "safe"; disclaimer near findings |
| Over-flagging erodes usefulness | Medium | Severity tiers; only fire on curated rules; "warn, don't block" |
| Brittle exact-name med matching | Medium | Drug-class matching + alias normalization (FR-2/3) as core, not optional |
| Findings perceived as medical advice | High (compliance) | All wording via `lib/safety`; non-diagnostic language; clinician escalation on high severity |
| Dataset maintenance burden | Low/Med | Seed-as-code with typed/validated shape; reviewable in PRs; admin CMS deferred |
| Scope creep into conditions/pregnancy | Medium | Explicitly deferred (§3.2); meds-only axis for v2 |

---

## 8. Architecture Considerations

### 8.1 Project Level
Dynamic (per `.bkit-memory.json`). Continues v1's Clean-Architecture, pure-engine, seed-first posture.

### 8.2 Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Knowledge source | Curated seed-as-code (Approach A) | Trust, determinism, no licensing; A→C upgradeable for free |
| Storage | Seed-as-code (no new DB table) | Reference data, not user data; no RLS needed |
| Matching strategy | Drug-class + exact-generic, via alias map | Robust coverage without brittle exact-name-only |
| Output shape | `InteractionFinding` (mirrors `EvaluationFlag`) | Reuses existing flag UI + "Interaction Risk" category |
| User-freedom stance | Warn/demote, never hard-block | Upholds "user freedom first" principle |

### 8.3 Component Overview
```txt
src/lib/interactions/
  engine.ts        # findInteractions({ medications, stackItems }) -> InteractionFinding[]
  normalize.ts     # medication -> generic -> drug-class resolution
  types.ts         # InteractionRule, InteractionFinding, Severity
src/data/
  seed-interactions.ts   # supplement<->drug-class + supplement<->supplement rules
  medication-aliases.ts  # brand->generic + drug-class membership
src/lib/safety/          # extended: interaction-severity -> phrasing + escalation
Integrations:
  lib/stack-evaluator  -> merges findings ("Interaction Risk")
  lib/protocol-builder -> pre-checks suggestions vs meds
  app/library/[...]    -> renders supplement "Interactions" section
  components/profile   -> medication entry normalization/autocomplete
```

### 8.4 Data Flow
1. Profile medications (alias-autocompleted) + stack supplements → engine input.
2. `normalize.ts` resolves meds → generics → drug classes.
3. `engine.ts` matches supplement↔drug-class and supplement↔supplement rules → findings + severity.
4. `lib/safety` frames wording; high-severity attaches clinician-escalation banner.
5. Stack Evaluator merges findings into the evaluation report; Protocol Builder flags/demotes conflicting candidates; Library page renders per-supplement rules.

---

## 9. Convention Prerequisites
- Reuse existing conventions (PascalCase components, camelCase utils, kebab-case folders, `NEXT_PUBLIC_`/server env split) per v1 Design.
- New types added to `src/types/` (e.g., `interaction.ts`); Zod schema for dataset validation.
- No new env vars or external services.

---

## 10. Next Steps
```
Plan Plus completed
Document: docs/01-plan/features/medication-interactions.plan.md
Next step: /pdca design medication-interactions
```

---

## Appendix: Brainstorming Log

| Phase | Decision | Outcome |
|-------|----------|---------|
| Q1 — v2 Theme | Chose **Deeper intelligence** over data-at-scale / commerce / engagement | Sharpen trust & advice quality, not new surface area |
| Q2 — Anchor | Chose **Medication-interaction layer** over weighted scoring / lab engine / risk tuning | Highest safety/trust payoff |
| Phase 2 — Approach | Chose **A: Curated-seed engine** over external API / explicit hybrid adapter | Trust + determinism; A→C upgradeable for free |
| Phase 3 — YAGNI | Selected all four optionals: drug-class matching, supp↔supp, Protocol Builder integration, Library display | Full layer ships in v2; conditions/pregnancy/API deferred |
| Phase 4 — Design | Architecture / components / data flow all approved as-is | Proceed to Plan generation |

---

## Version History
| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-06-15 | benhwang121@gmail.com | Initial v2 plan-plus document for medication-interactions |
