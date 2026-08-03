# context-adjusted-evidence (v13) — Plan

> Built with **Plan-Plus** (brainstorming-enhanced PDCA planning).
> Milestone: **v13** — first feature beyond v12 `food-pairings`.
> Architecture posture: **Approach A (two-track)**, display-only, additive, Library-universal.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: v13
> **Date**: 2026-07-16
> **Status**: Draft — awaiting approval
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | Evidence grades are **universal**. Creatine's cognitive evidence is stronger in vegetarians and older adults; vitamin D's evidence is far stronger if you're actually deficient — but every user sees the same letter. The platform holds demographics (v1), biomarkers (v3), lab trends (v4), adherence (v10), and side-effect reports (v11), and **none of it reaches the grade**. Deferred twice already: v5 ("population-adjusted grades") and v6 ("personalization: context-adjusted grades"). |
| **Solution** | **Two tracks, never merged.** Track 1: a new pure `lib/evidence-context` module adjusts the grade using **population-selection facts only** — demographics + biomarker baseline — because those change *which curated evidence applies to you*. Track 2: adherence/outcomes (v10) and side-effect findings (v11) render as a **separate, labeled personal signal** beside the grade, because those are n=1 facts about *you*, not evidence about the supplement. **Display-only**: no ranking path changes. |
| **Function / UX Effect** | Stack Lab and Profile show `universalGrade` + `adjustedGrade` + a **"why adjusted for you"** trail, with the personal signal panel alongside. The advisor gains a read-only 8th grounded tool. **The Library is untouched and stays byte-identical for every user** — enforced by two invariant tests, not by convention. |
| **Core Value** | The platform can finally say *"B generally — A for you, because the trials were in deficient adults and your 25-OH D is 18 ng/mL"* — while the grade remains a claim about **the evidence**, never a claim about **the user**. Personalization deepens without the trust layer paying for it. |

---

## 1. User Intent Discovery (Phase 1)

### 1.1 Core Problem

Make the evidence layer **personal without making it private-truth**. Grades today are a single universal letter per effect; the science they summarize is not universal. The platform already owns the context needed to say which evidence applies to whom, and has deferred using it twice.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|---|---|---|
| Health nerds / biohackers / longevity-focused | Existing audience; no new persona | Know whether a grade *applies to them* — not just that it exists |
| Users with lab data (v4 adopters) | Have uploaded biomarkers | See their labs actually change what the evidence means for them |

### 1.3 Success Criteria

- [ ] **SC-1** — A pure `lib/evidence-context` module ships: `adjustForContext(effect, ctx)`, unit-tested, DB-agnostic, zero I/O.
- [ ] **SC-2** — Curated modifiers on **two axes** (demographic + biomarker), integrity-tested to reference only IDs present in `SEED_EFFECTS` / `SEED_SUPPLEMENTS`.
- [ ] **SC-3** — **I1 proven**: `lib/evidence` never imports user/context types.
- [ ] **SC-4** — **I2 proven**: the Library route never imports `lib/evidence-context`; `/library/[slug]` remains SSG and byte-identical across users.
- [ ] **SC-5** — **I3 proven**: `adjustForContext` is pure — never mutates the input effect; identical inputs yield identical outputs.
- [ ] **SC-6** — **I4 proven**: `AdjustedEffectView` never reaches `compareSuggestions` or `stack-evaluator/rules.ts`; all v5/v10 ranking tests unchanged and green.
- [ ] **SC-7** — **I5 proven**: with an empty context, `adjustedGrade === universalGrade` and the rendered output is byte-identical (mirrors v10's no-feedback regression test).
- [ ] **SC-8** — Stack Lab + Profile render adjusted grade + explain trail; **every numeric claim in the copy is bound by a test to the computation that produced it** (v11 lesson L1).
- [ ] **SC-9** — Personal signal track renders beside the grade, never inside it; **no call edge** from `PersonalSignal` into `adjustForContext`.
- [ ] **SC-10** — Advisor tool #8 ships read-only + grounded; honesty sweep passes.
- [ ] **SC-11** — `next build` OK (**not** `typecheck` alone — see Risk R5); prior suites green; **live suite verified with `E2E_LIVE=1 --workers=1`**, including the new surfaces.

### 1.4 Constraints

| Constraint | Details | Impact |
|---|---|---|
| **Library universality** | *User-specified.* Grades in the Library must be identical for all users. Personalization is confined to Stack Lab + Profile. | **High** — I1 + I2; shapes the entire module boundary |
| **Display-only** | *User-specified.* Adjusted grade must not change protocol/stack-eval recommendations. | **High** — I4; keeps v10's evidence-dominant guarantee intact |
| **Grade ≠ claim about the user** | n=1 signal (adherence, side-effects) may not enter the grade. Reverses nothing; upholds v10's design. | **High** — I4/I5, track separation by type |
| **Non-diagnostic** | Adjusted grade is educational context, never a deficiency finding or medical claim. | **High** — honesty sweep |
| **Additive** | Target 0 migrations, 0 engine rewrites, 0 new dependencies (v5/v9/v12 posture). | Medium |
| **Naming collision** | `EvidenceProfile` (evidence dimensions) vs `UserProfile` (the person); `Effect.evidenceProfile` already exists. New type is `UserEvidenceContext`. | Medium — a known footgun, named deliberately |

---

## 2. Alternatives Explored (Phase 2)

### 2.1 Approach A: Two-track — adjusted grade + personal signal layer — **Selected**

| Aspect | Details |
|---|---|
| **Summary** | Grade adjusted by demographics + baseline only; adherence/side-effects render as a separate labeled layer beside it. |
| **Pros** | Delivers the full context picture on one screen; preserves the honesty invariant and v10's evidence-subordinate decision without special-casing; each track testable in isolation; reuses v3/v4 and v10/v11 — mostly wiring, not new engines. |
| **Cons** | Two numbers on screen; needs real design care so they read as complementary, not competing. No single "personalized grade". |
| **Effort** | Medium-High (curation on two axes is the cost) |
| **Best For** | Keeping the trust layer trustworthy while surfacing everything. |

### 2.2 Approach B: Single blended personalized grade

| Aspect | Details |
|---|---|
| **Summary** | One grade per effect per user, all four signal classes weighted into the composite. |
| **Pros** | One number; maximum felt personalization; simple to the user. |
| **Cons** | The grade becomes a claim about *you*, near the diagnostic line the brief forbids; reverses v10's architecture; **unexplainable** — "why is my creatine a B?" mixes study dimensions with personal logs, and the brief requires every recommendation be explainable. Wants central resolution → structurally pressures Library universality. |
| **Effort** | High |
| **Best For** | A product optimizing engagement over trust. Not this product. |

### 2.3 Approach C: Adjusted grade only

| Aspect | Details |
|---|---|
| **Summary** | Demographics + baseline adjust the grade; adherence/side-effects stay on their existing v10/v11 surfaces. |
| **Pros** | Smallest, safest, cleanest cycle; full reuse of the existing `populationRelevance` dimension. |
| **Cons** | Doesn't deliver "everything the platform knows" in one place. |
| **Effort** | Medium |
| **Best For** | A fallback if scope becomes the binding constraint. |

### 2.4 Decision Rationale

**Selected: Approach A.** The user asked for every signal the platform holds to reach them. A delivers that, and refuses only one thing: laundering n=1 data through a word ("grade A") that users trust to mean something about the science. The signals are **two different kinds of fact** — demographics and baseline answer *"which study population do you belong to?"* (still curated science); adherence and side-effects answer *"what happened to you?"* (not evidence about the supplement at all). B collapses that distinction; C ignores half the ask. The user's Library-universality constraint is Approach A's thesis restated, and independently rules out B.

---

## 3. YAGNI Review (Phase 3)

### 3.1 Non-negotiable core (not up for cutting)

- [ ] `lib/evidence-context` — pure adjusting module; context passed explicitly; seed grade never mutated
- [ ] Curated population modifiers — the actual science data; without it there is nothing to adjust
- [ ] **Invariant tests I1–I5** — *these are the Library constraint.* Everything else is negotiable; these are not
- [ ] Stack Lab surfacing + "why adjusted for you" trail — the brief requires every adjustment be explainable

### 3.2 Included (all four discretionary items selected)

- [ ] ✅ **Baseline/biomarker adjustment** — reuses v3 normalization + v4 trends; where evidence diverges most
- [ ] ✅ **Personal signal layer** (v10 adherence/outcomes + v11 side-effect findings) — the second track
- [ ] ✅ **Profile surface** — cheap once Stack Lab exists; a second consumer of the same module
- [ ] ✅ **Advisor integration** — read-only 8th grounded tool; deferred once already in v9

> **Honest note:** this YAGNI review **cut nothing**. Mitigating factor: the *display-only* ranking choice makes v13 a presentation layer over engines that already exist (v3/v4/v10/v11), so four surfaces × display-only is materially less risky than two surfaces × ranking. The scope remains larger than any prior cycle — see Risk R1.

### 3.3 Deferred (v14+)

| Feature | Reason for Deferral | Revisit When |
|---|---|---|
| Adjusted grade feeds ranking (bounded, v10-style ±cap) | Display-only chosen; makes the adjustment load-bearing for recommendations | Once adjusted grades are proven in the wild and the curation is trusted |
| Population-adjusted **dose** ranges | Different curation axis; dose is not a grade | v14+ |
| Context-adjusted **evidence-literacy score** (v9 deferral) | Separate concern | Still deferred |
| Wearable-derived context signals | No ingestion path exists | When wearable import lands |

### 3.4 Removed (Won't Do)

| Feature | Reason for Removal |
|---|---|
| Personalized grades in the **Library** | *User-specified.* The Library is the trust layer; a grade that shifts per viewer can't be cited or compared between users |
| Single blended personalized grade (Approach B) | Makes the grade a claim about the user; unexplainable; structurally pressures Library universality |
| Mutating `defaultLibrary` / `resolveEffect` to be user-aware | **Would be a real bug**: `defaultLibrary` is a module-level const resolved once in a server process shared across all users → cross-user grade contamination, plus Library leakage |

---

## 4. Scope

### 4.1 In Scope

- [ ] **M0** — spec repair (prerequisite): fix 2 rotted L3s; diagnose 2 remaining failures; add `ANTHROPIC_API_KEY`
- [ ] **M1** — pure domain: types, curated modifiers (2 axes), `adjustForContext`, explain trail, invariant tests
- [ ] **M2** — context assembly: `UserEvidenceContext` from `getProfile()` + `listLabMarkers()`; `PersonalSignal` from `listCheckins()`/`analyzeCheckins()` + `listSideEffectReports()`/`correlateReports()`
- [ ] **M3** — surfaces: Stack Lab, Profile, advisor tool #8

### 4.2 Out of Scope

- Any Library change (§3.4)
- Any ranking change (§3.3) — `runEvaluation`, `evaluateStack`, `compareSuggestions`, `generateProtocol` all untouched
- New migrations, new dependencies, engine rewrites

---

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-01 | `adjustForContext(effect, ctx)` returns `AdjustedEffectView { universalGrade, adjustedGrade, reasons[] }` | High | Pending |
| FR-02 | `universalGrade` is always carried, never dropped or overwritten | High | Pending |
| FR-03 | Curated demographic modifiers (age, sex, training status, diet) keyed to `UserProfile` fields | High | Pending |
| FR-04 | Curated biomarker modifiers keyed to v3 canonical markers; reuse v3 unit normalization | High | Pending |
| FR-05 | Explain trail: every adjustment lists the context fact(s) that caused it | High | Pending |
| FR-06 | **Downgrade copy** (`adjustedGrade < universalGrade`) designed deliberately, not template-generated | High | Pending |
| FR-07 | Partial context (the common case) degrades gracefully — adjust on what exists, state what's missing | High | Pending |
| FR-08 | `PersonalSignal` aggregates v10 adherence/outcomes + v11 findings in a distinct shape | Medium | Pending |
| FR-09 | Stack Lab + Profile render both tracks side by side, visually distinct | High | Pending |
| FR-10 | Advisor tool #8: read-only, grounded, cites the explain trail | Medium | Pending |

### 5.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|---|---|---|
| **Purity** | `lib/evidence-context` performs zero I/O; `adjustForContext` never mutates input | I3 test + review |
| **Isolation** | `lib/evidence` user-free; Library never imports the adjuster | I1 + I2 import-assertion tests |
| **Regression safety** | Empty context ⇒ byte-identical output | I5 test (v10 pattern) |
| **Honesty** | No banned causal/diagnostic language; every numeric claim bound to its computation | Honesty sweep + claim-binding tests |
| **Security** | Context is per-request, never module-scoped; RLS unchanged | I3 + live authed specs |
| **Build** | `next build` succeeds | `npm run build` — **not** `typecheck` (R5) |

---

## 6. Success Criteria

### 6.1 Definition of Done

- [ ] SC-1 … SC-11 met
- [ ] All invariants I1–I5 have a test **proven to fail when the invariant is violated** (mutation-checked — v11 lesson: a guard not proven to fail is decoration)
- [ ] Design doc reconciled with any Do-phase deviations before Report

### 6.2 Quality Criteria

- [ ] Full unit suite green (v12 baseline 374 + v11 388 → v13 target ≥ prior + new)
- [ ] `npm run build` green
- [ ] `E2E_LIVE=1 npx playwright test --workers=1` — new surfaces covered, **no new gated-and-forgotten specs**
- [ ] Zero lint errors

---

## 7. Risks and Mitigation

| ID | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| **R1** | **Scope exceeds any prior cycle.** New module + curation on 2 axes + 4 surfaces. v11 was 4 surfaces/3 modules and still shipped 2 Criticals through a green suite. | High | High | Display-only shrinks blast radius; M0 first; fall back to Approach C (drop personal layer) if M1 curation overruns |
| **R2** | **Curation cost underestimated.** v12's L3: seed data must be curated against the *real* catalog. 15 supplements × multiple effects × 2 axes ≫ v12's 10 pairings. | High | Medium | Integrity test constrains modifiers to existing IDs; curate against `SEED_EFFECTS` from day 1; partial coverage is acceptable and must render an honest empty state |
| **R3** | **Downgrade UX reads as a bug.** "B generally, C for you" is the most valuable and most jarring output. | Medium | High | FR-06 — deliberate copy; explain trail carries the weight; claim-binding test per v11 L1 |
| **R4** | **Cross-user contamination** if the adjuster is ever hoisted to module scope (`defaultLibrary` precedent). | **Critical** | Low | I3 purity test + explicit context argument; §3.4 records this as a Won't-Do |
| **R5** | **`npm run typecheck` is not trustworthy in this repo** (v12 L4 — stale `tsconfig.tsbuildinfo` masked errors that `build` caught). | Medium | Medium | Gate on `npm run build`; never on `typecheck` alone |
| **R6** | **Gated specs rot silently.** Two L3s asserted on `/stack-lab` while the banner moved to `/stack-lab/[stackId]`; skipped for months, nothing noticed. | High | Medium | M0 repairs them first; v13 adds no spec that is gated-and-unrun; a skipped test is an **unknown**, not a pass |
| **R7** | Two-track UI reads as competing numbers rather than complementary. | Medium | Medium | Design-phase validation; distinct components + copy (v12 L2's `mapSeverity` guard is the precedent) |

---

## 8. Architecture Considerations

### 8.1 Project Level

| Level | Selected |
|---|:--:|
| Starter | |
| **Dynamic** | ✅ |
| Enterprise | |

### 8.2 Key Decisions

| Decision | Options | Selected | Rationale |
|---|---|---|---|
| Signal partition | Blend all / population-only / population + separate personal track | **Population-only in grade; personal track beside** | Demographics+baseline = *which evidence applies*; adherence/side-effects = *what happened to you*. Different kinds of fact |
| Ranking reach | Display-only / feeds ranking / bounded | **Display-only** | Zero risk to v10's evidence-dominant regression; every existing engine test stays valid |
| Module boundary | Extend `lib/evidence` / new `lib/evidence-context` | **New module** | Extending would leak to Library **and** risk cross-user contamination (R4) |
| Track separation | Convention / types | **Distinct types, no call edge** | Structural enforcement survives future contributors; convention doesn't |
| Context type name | `UserContext` / `EvidenceContext` / `UserEvidenceContext` | **`UserEvidenceContext`** | Avoids collision with existing `EvidenceProfile` / `Effect.evidenceProfile` |
| Render strategy | SSR-compute / self-fetch | **SSR-compute** | v9 precedent (Profile IdentityCard) |

### 8.3 Component Overview

```
lib/evidence  ← UNIVERSAL, user-free. SSG Library reads this. UNCHANGED.
     │ seed grade, never mutated
     ▼
lib/evidence-context  ← NEW, pure
     adjustForContext(effect, UserEvidenceContext) → AdjustedEffectView
     ├── demographic modifiers  (curated seed)
     └── biomarker modifiers    (curated seed, reuses v3 normalization + v4 trends)
     ▼
Stack Lab · Profile · advisor tool #8
     ║
     ╠═ personal signal track: v10 adherence/outcomes + v11 side-effect findings
        rendered BESIDE the grade — never merged into it
```

**Invariants (each test-enforced, each mutation-checked):**

| ID | Invariant | Guards |
|---|---|---|
| **I1** | `lib/evidence` never imports user/context types | Library universality |
| **I2** | The Library route never imports `lib/evidence-context` | Library universality |
| **I3** | `adjustForContext` is pure: no mutation, deterministic | Cross-user contamination (R4) |
| **I4** | `AdjustedEffectView` never reaches `compareSuggestions` / stack-eval ranking | Display-only |
| **I5** | Empty context ⇒ adjusted view byte-identical to universal | Regression safety |

### 8.4 Data Flow

```
═══ FLOW 1 — Library (universal) ══════════════════ [UNCHANGED]

build time
  generateStaticParams()                app/library/[slug]/page.tsx
    └─ getAllSupplements() ─────────────┐
  SupplementDetailPage(slug)            │
    ├─ getSupplementBySlug() ───────────┤  lib/evidence → defaultLibrary
    ├─ getEffectsForSupplement() ───────┤  = SEED_EFFECTS.map(resolveEffect)
    └─ getPapersForEffect() ────────────┘    resolved ONCE at module load
  → static HTML · identical bytes for every user
  ✗ UserEvidenceContext is not in scope here — I1 + I2


═══ FLOW 2 — Stack Lab / Profile: adjusted grade ══ [NEW]

authed request → requireUser()
  │
  ├─ M2 assemble ─────────────────────────────────────────────
  │    getProfile()       db/profile-repo    → age, sex, training, diet
  │    listLabMarkers()   db/lab-marker-repo → baseline (v3 norm · v4 trends)
  │      └──→ UserEvidenceContext
  │
  ├─ M1 adjust (pure) ────────────────────────────────────────
  │    getEffectsForSupplement()  lib/evidence → Effect (seed grade)
  │      └──→ adjustForContext(effect, ctx)
  │             └──→ AdjustedEffectView {
  │                    universalGrade,   ← always carried, never dropped
  │                    adjustedGrade,
  │                    reasons[]         ← the explain trail
  │                  }
  └─ M3 render  StackLabClient → StackWorkspace  (SSR-computed, v9 pattern)


═══ FLOW 3 — personal signal track ════════════════ [REUSE, parallel]

  listCheckins()          db/checkin-repo
    └─ analyzeCheckins()      lib/checkin      → adherence · outcomes
  listSideEffectReports() db/side-effect-repo
    └─ correlateReports()     lib/side-effects → findings
      └──→ PersonalSignal          (new shape, existing engines)

  rendered BESIDE AdjustedEffectView — own component, own copy
  ✗ never enters adjustForContext — no call edge, no shared type


═══ FLOW 4 — advisor tool #8 ══════════════════════ [NEW, read-only]

  agent loop → tool → adjustForContext(...) → grounded citations


═══ RANKING PATH ══════════════════════════════════ [UNTOUCHED — I4]

  runEvaluation()      services/evaluation → evaluateStack
    └─ stack-evaluator/rules.ts → getBestEffectForOutcome()  ← universal
  generateProtocol()   lib/protocol-builder
    └─ compareSuggestions() → labSignal → grade → feedback → composite → name
                                          ↑ universal; v10 feedback stays subordinate
  ✗ AdjustedEffectView reaches neither — I4 asserts the absent import
```

### 8.5 Module Plan

| Module | Contents | Files modified | Risk |
|---|---|---|---|
| **M0** — spec repair | Fix `medication-interactions` L3 + `biomarker-intelligence` L3 (drive the real flow against `/stack-lab/[stackId]`); diagnose `lab-timeline-actions` L2 + `advisor-actions` L1; add `ANTHROPIC_API_KEY` | tests only | Low |
| **M1** — pure domain | `types/evidence-context.ts`, `lib/evidence-context/{modifiers,adjust,explain,index}.ts` + `adjust.test.ts`, modifiers integrity, `invariants.test.ts` (I1–I5), `honesty.test.ts` | **0** | **High** (curation) |
| **M2** — context assembly | `UserEvidenceContext` + `PersonalSignal` assembly (v9 `lib/identity/context.ts` pattern); read-only | few | Medium |
| **M3** — surfaces | Stack Lab, Profile, advisor tool #8 | several UI | Medium |

> **M2 note:** `checkins` and `side_effect_reports` are currently **empty** on the live project — M2's live specs must create their own rows.

---

## 9. Convention Prerequisites

- [x] Existing conventions verified — pure `lib/*` domain, seed-as-code, additive posture (v2/v3/v5/v9/v10/v11/v12)
- [x] Naming confirmed — `UserEvidenceContext` chosen against the `evidenceProfile` collision
- [x] Folder structure confirmed — `lib/evidence-context` sits as a sibling to `lib/evidence`, `lib/interactions`, `lib/biomarkers`, `lib/side-effects`
- [x] Business logic stays out of UI components

---

## 10. Next Steps

1. [ ] Approve this Plan
2. [ ] `/pdca design context-adjusted-evidence` — must resolve: **downgrade copy** (FR-06), **partial-context** degradation (FR-07), two-track visual language (R7), and per v12's L1, **enumerate every existing caller and test affected by any shared default change**
3. [ ] `/pdca do context-adjusted-evidence` — M0 → M1 → M2 → M3

---

## Appendix: Brainstorming Log

| Phase | Question | Answer | Decision |
|---|---|---|---|
| Intent | What core problem should v13 solve? | Context-adjusted evidence | Picked the item deferred in both v5 and v6 |
| Intent | Which context signals adjust the grade? | "Everything the platform knows" | Honored — but split across two tracks, since demographics/baseline and n=1 logs are different kinds of fact |
| Constraint | Does the adjusted grade change the Library? | **No** — Library universal; Stack Lab + Profile only | Became I1 + I2. Investigation showed the architecture *already* enforces this (lib/evidence is user-free; `/library/[slug]` is SSG) — the job is to protect it, not build it |
| Alternatives | A (two-track) / B (blended) / C (adjusted-only) | **A** | B makes the grade a claim about the user and pressures Library universality; C ignores half the ask |
| YAGNI | Which discretionary items? | **All four selected** | Nothing cut — flagged honestly (§3.2, R1). Display-only materially offsets the risk |
| YAGNI | Does the adjusted grade feed ranking? | **Display-only** | Zero risk to v10's evidence-dominant regression |
| Verification | How to handle the personal layer's dead-backend dependency? | "Restore backend first" — **then invalidated** | **User challenged the premise and was right.** Backend is alive; all 7 migrations applied; v11 authed specs pass 7/7 live; full suite 61/71. The restore cycle was deleted and replaced by M0 (spec repair) |

---

## Appendix B: Verification Findings (2026-07-16)

Investigated during Phase 4 after the user challenged the stored "backend is gone" claim.

| Check | Result |
|---|---|
| Bogus project ref | NXDOMAIN → resolution *is* project-specific; no wildcard |
| Real project ref | Resolves; GoTrue **v2.193.0** answers `/auth/v1/health` |
| Migrations `0001`–`0007` | **All applied** — incl. `side_effect_reports` (`0007`) |
| v11 authed side-effect specs | **7/7 pass live**, both L3 round-trips included |
| Full live suite (`--workers=1`) | **61 passed / 10 failed** (~5 min) |

**The 10 failures are not product bugs:**
- **6 advisor specs** — `ANTHROPIC_API_KEY` absent from `.env.local`. Environmental.
- **`medication-interactions` L3 + `biomarker-intelligence` L3** — **rotted.** Both assert evaluation copy on `/stack-lab`, but that copy lives in `StackWorkspace`, which mounts via `StackLabClient` from `/stack-lab/[stackId]`. Both tests' comments describe "build a stack, then evaluate" steps the code never performs; they lean on demo-account state. The `[stackId]` route arrived later and moved the target; being `E2E_LIVE`-gated, nothing noticed.
- **`lab-timeline-actions` L2 + `advisor-actions` L1** — undiagnosed → M0.

**Consequences:** the prior session's memory was wrong on every count and had propagated into v11's report and into v13 planning. Memory corrected 2026-07-16. **A skipped test is not a passing test — it is an unknown, and the unknown compounds silently.**

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 0.1 | 2026-07-16 | Initial draft (Plan Plus) — Approach A, display-only, Library-universal; v13.0 restore cycle removed after live verification disproved the dead-backend premise |
