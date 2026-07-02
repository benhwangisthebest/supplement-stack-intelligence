# Plan — Identity Cards (v9)

> **Feature**: `identity-cards`
> **Milestone**: v9
> **Method**: Plan Plus (Brainstorming-Enhanced PDCA)
> **Level**: Dynamic
> **Created**: 2026-07-01

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Eight milestones built a deep, evidence-first intelligence stack (interactions, biomarkers, lab-trends, evidence-grading) and a grounded advisor over it — but the platform never reflects *the user* back to themselves. A health nerd invests hours curating a profile and multiple intent-driven stacks, yet the product has no premium, identity-level mirror of *"who am I as a supplement thinker."* CLAUDE.md names gamification as a future direction but sets a hard guardrail: **subtle, identity-based, premium — not childish.** The risk in any identity feature is the horoscope trap: an archetype that feels *assigned by vibes* would betray the platform's entire evidence-first, deterministic ethos. |
| **Solution** | A new pure-function module `lib/identity` **derives** a stable, explainable archetype from signals the platform already owns — stack intents, the resolved evidence grades of the user's items, foundational-vs-experimental mix, risk profile, and breadth. The identity is *earned, not guessed*: the card carries the exact evidence trail that produced it. Architecture is **Option C (additive)** — identical to v5 evidence-grading: deterministic, unit-testable, **no LLM, no new tables, no new dependency, no migration** (derived on the fly from existing repos/engines). Trait axes, per-stack archetypes, a signal-richness confidence guard, and Library-level supplement archetypes round out a full identity release. |
| **Function/UX Effect** | On **Profile**, the user sees a premium **Identity Card**: an archetype (e.g. *Longevity Architect*, *Evidence Minimalist*), a few trait bars (Evidence Rigor, Risk Appetite, Breadth, Foundational Focus), a confidence chip, and a "why this archetype" trail that **deep-links** into the Library effects that earned it. Each **stack** in Stack Lab shows its own archetype read by intent ("this Sleep stack reads as *Foundational Purist*"). Each **Library** supplement shows its compound archetype (*Foundational Staple*, *Experimental Edge*…). Thin data never over-claims — the card says *"add labs to sharpen"* instead of inventing certainty. |
| **Core Value** | The platform stops being only a *tool the user operates* and becomes a *mirror that reflects their evidence-literate identity back* — the emotional payoff of all that curation — **without spending a single point of the trust budget.** Every archetype is a provable, deterministic function of real data, expressed in non-diagnostic language, defensible line-by-line. Premium gamification that deepens engagement precisely *because* it refuses to cheapen the science. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | The advisor arc (v6 read → v7 guarded write → v8 UX finish) is complete; the intelligence and conversation layers are mature. What the platform has never done is reflect the *user's* identity back to them. The data to do so already exists (multi-stack, intents, resolved evidence grades, risk profile), and the Cal.com design-system overhaul (landed pre-v8) gives a premium surface to render a card on. A subtle, identity-based layer is the exact gamification CLAUDE.md sanctions. |
| **WHO** | The established evidence-literate audience (biohacker / longevity / athlete / power user) who has already invested in a rich Profile and multiple stacks — the users with enough signal for an archetype to feel *earned*, and the ones who most want an identity mirror that is premium rather than childish. |
| **RISK** | The **horoscope trap** — an archetype that feels arbitrary or unearned would corrode the evidence-first brand; **over-claiming** an identity on thin data (a user with one supplement should not be crowned an *Architect*); **medicalizing identity** — an archetype must describe *supplement-thinking style*, never health status ("you are deficient/at-risk"); **taxonomy gaps** — an archetype set where some users match nothing, or everyone collapses into one bucket; a **non-deterministic** or unstable identity that reshuffles on refresh; scope creep into full achievement/points gamification. |
| **SUCCESS** | A pure, deterministic `lib/identity` derives a user archetype + trait axes + evidence trail from real signals; every archetype is reachable and traits are bounded [0,1]; a confidence guard prevents over-claim on thin data; per-stack and per-supplement archetypes render; all identity copy is non-diagnostic (honesty sweep); **0 engine/table files modified, no migration, no new dependency**; `GET /api/identity` is auth-guarded via existing RLS repos; all prior unit + build suites green. |
| **SCOPE** | `lib/identity` engine (`traits` · `classify` · `confidence` · `archetypes` taxonomy · `stack-archetypes` · `supplement-archetypes`) · identity context loader over existing repos/engines · `GET /api/identity` · Library SSR supplement-archetype wiring · `IdentityCard` + `TraitBars` + `StackArchetypeBadge` + `SupplementArchetypeBadge` components · surfacing on Profile / Stack Lab / Library · deep-link reuse of v8 `citationHref` · unit + L1 + L2/L3 tests. **No** LLM, **no** new table/migration, **no** new dependency, **no** snapshot/history, **no** shareable-image export, **no** achievement badges, **no** evidence-literacy or standalone stack-quality scores (deferred). |

---

## 1. User Intent Discovery

### 1.1 Core Problem
The platform can *evaluate* a stack, *build* a protocol, *match* a product, and *converse* about all of it — but it has never told the user **who they are** as a supplement thinker. After eight milestones of tooling, the identity layer is the missing emotional payoff. The chosen purpose is explicitly **self-image / identity reflection** (not completeness-nudging, not stack-quality scoring, not evidence-literacy progression). The governing constraint from CLAUDE.md is that this must be **premium and identity-based, not childish** — which, combined with the platform's deterministic evidence-first ethos, means the archetype must be **derived and explainable**, never assigned by vibes.

### 1.2 Target Users

| User Type | Usage Context | Key Need |
|-----------|---------------|----------|
| Evidence-literate biohacker | Has multiple intent-driven stacks + a rich profile | A premium, *earned* identity that reflects their curation back — with the evidence trail to prove it isn't arbitrary |
| Longevity / foundational user | Curates conservative, high-grade stacks | An archetype that recognizes rigor and restraint (e.g. *Foundational Purist* / *Evidence Minimalist*) rather than rewarding sheer supplement count |
| Newer / thin-profile user | Only a few items, sparse profile | To *not* be over-crowned — a confidence guard that says "add labs to sharpen" instead of faking certainty |

### 1.3 Success Criteria

| # | Criterion | Measure |
|---|-----------|---------|
| SC1 | Pure deterministic engine | `lib/identity` is pure (no I/O, no LLM); identical inputs yield identical archetype + traits; fully unit-tested |
| SC2 | Derived, explainable user archetype | `deriveUserIdentity(ctx)` returns an archetype + the contributing signals (evidence trail) drawn from real stack/profile/evidence data — no arbitrary assignment |
| SC3 | Trait breakdown | ≥4 trait axes (Evidence Rigor, Risk Appetite, Breadth, Foundational Focus; + Data Depth) each bounded [0,1], each with a derivation |
| SC4 | Per-stack archetype | `deriveStackArchetype(stack, ctx)` classifies each stack by its intent + composition, distinct from the user-level card |
| SC5 | Confidence / honesty guard | Card exposes a confidence level from signal richness and emits "sharpen" suggestions; thin data yields low confidence, never an over-claimed archetype |
| SC6 | Supplement archetypes | `deriveSupplementArchetype(supplement)` classifies compounds in the Library (e.g. *Foundational Staple / Targeted Specialist / Experimental Edge / Broad-Spectrum*), pure over seed data |
| SC7 | Non-diagnostic tone | All identity copy routes through `lib/safety` conventions; a banned-language honesty sweep proves no health-status / diagnostic framing |
| SC8 | Additive / zero-regression | **0 engine/table files modified; no migration; no new dependency**; all prior unit suites + `next build` green |
| SC9 | Auth-guarded API | `GET /api/identity` loads context server-side via existing RLS repos; unauthenticated access is rejected (L1 auth-guard tests) |
| SC10 | Taxonomy integrity | Integrity test: every user archetype is reachable by some trait-profile; no trait axis is unbounded; classifier is total (always returns a best match or an explicit low-confidence "emerging" state) |

### 1.4 Constraints
- **Deterministic, no LLM** — identity is a *status* surface; it must be stable across refreshes and provable, so it is a pure function of existing data (contrast v6–v8's LLM surfaces). Rejected Approach B for exactly this reason.
- **Identity ≠ medical status** — an archetype describes supplement-*thinking* style; it must never imply a health condition, deficiency, or diagnosis. All copy through `lib/safety`.
- **Additive Option C** — reads existing repos/engines only; **0 engine files modified, target 0 migration, no new dependency** (mirrors the v5 evidence-grading discipline).
- **No over-claim** — the confidence guard is a hard requirement, not polish: thin signal must degrade to low confidence, not a confident-but-hollow archetype.

---

## 2. Alternatives Explored

### Approach A — Derived archetype engine (pure `lib/identity`) — **SELECTED**
A new pure-function module classifies the user into a stable archetype from deterministic signals already in the system (stack intents, resolved evidence grades, foundational-vs-experimental mix, risk profile, breadth). The card carries the evidence trail that earned it.
- **Pros**: deterministic, unit-testable, explainable, on-brand (evidence-first), reuses every engine, additive Option C, no new deps/tables — matches the exact pattern of v2–v8.
- **Cons**: archetype taxonomy is the hard design work (must feel meaningful, not arbitrary); bounded to signals already owned.
- **Best for**: keeping identity gamification premium, stable, and defensible. ✅

### Approach B — LLM-authored identity narrative (via the existing advisor)
Reuse the grounded Claude adapter to generate an archetype + narrative from the user's data.
- **Pros**: rich, personalized prose; reuses advisor infra.
- **Cons**: non-deterministic — identity would reshuffle every refresh (fatal for a *status* surface); needs safety/honesty gating + token budget; against the deterministic ethos.
- **Rejected**: instability + trust risk outweigh the prose flavor.

### Approach C — Static badge / achievement checklist
Predefined badges unlocked by thresholds (profile 100%, 5 papers read, first lab upload).
- **Pros**: trivial, low risk.
- **Cons**: this is the *completeness* purpose the user did **not** pick; achievement-hunting is the exact "childish" vibe CLAUDE.md warns against; delivers no "who am I" mirror.
- **Rejected**: off-target for identity/self-image.

---

## 3. YAGNI Review

### ✅ In scope (v9 v1)
**Baseline (always in):**
- Pure `lib/identity` archetype **engine** (traits · classify · confidence · taxonomy)
- **Identity Card UI** (premium render on Profile)
- Explainable **"why this archetype" evidence trail** (deep-linked to Library)

**Selected additions (all four kept):**
- **Trait dimension breakdown** — multi-axis traits (Evidence Rigor, Risk Appetite, Breadth, Foundational Focus, Data Depth), bounded [0,1]
- **Per-stack archetypes** — each stack classified by intent + composition, badge on Stack Lab
- **"Sharpen your card" confidence signal** — signal-richness honesty guard against over-claim on thin data
- **Supplement archetype cards (Library)** — compound-level archetypes, pure over seed data

### ⏸️ Deferred (Out of Scope → future)
- Identity **snapshot / history** table (track how identity evolves over time) — would require a new table; derive on-the-fly for v1
- **Shareable card / image export** (social)
- **Evidence-literacy score** progression (separate purpose)
- **Standalone stack-quality scores** (complexity / risk-awareness as their own gamified metric — these feed the archetype as *traits* instead)
- **Achievement badges** (Approach C, rejected)
- **Advisor integration** (the advisor referencing the user's archetype)

### Principle applied
No new table, no LLM, no new dependency. Traits reuse signals the engines already compute; the card is derived, not stored. Complexity/risk are *inputs to the archetype*, not standalone scored surfaces.

---

## 4. Architecture Overview

**Pattern: Option C (additive)** — identical to v5 evidence-grading. New pure domain module; existing engines/repos read-only; UI and API depend inward.

```
src/
  types/
    identity.ts                      # Archetype, IdentityTrait, IdentityCard,
                                     # StackArchetype, SupplementArchetype,
                                     # IdentitySignal, ConfidenceLevel
  lib/
    identity/
      archetypes.ts                  # curated USER archetype taxonomy (id, name,
                                     #   tagline, target trait-profile, description)
      traits.ts                      # pure: signals -> trait axes [0,1] + derivation
      classify.ts                    # pure: traits -> nearest archetype + evidence trail
                                     #   (+ explicit low-confidence "Emerging" fallback)
      confidence.ts                  # pure: signal richness -> ConfidenceLevel + "sharpen" tips
      stack-archetypes.ts            # pure: stack + ctx -> per-stack archetype (by intent)
      supplement-archetypes.ts       # pure: supplement -> compound archetype (over seed)
      context.ts                     # identity-context loader (reuses existing repos/engines)
      index.ts                       # deriveUserIdentity / deriveStackArchetype / deriveSupplementArchetype
      *.test.ts                      # unit + integrity tests
  app/
    api/identity/route.ts            # GET: auth-guarded, server-side context, RLS via existing repos
  components/
    identity/
      IdentityCard.tsx               # archetype + tagline + TraitBars + confidence chip + trail
      TraitBars.tsx                  # trait axes render
      StackArchetypeBadge.tsx        # per-stack read (Stack Lab)
      SupplementArchetypeBadge.tsx   # Library detail
```

- **No new business logic in the engines** — `context.ts` assembles inputs (stacks + items + profile + already-resolved evidence grades) from existing repos/engines, exactly as the advisor's context-loader does.
- **No LLM.** **No new DB table, no migration.** **No new dependency.**
- Supplement archetype is pure over public seed data → computed in **Library SSR** (no endpoint), the way evidence-grading is pre-resolved.
- Deep-linking reuses v8's `citationHref` (`#effect-…` / `#paper-…`) so the "why" trail navigates into the Library.
- All copy flows through `lib/safety` — identity = supplement-thinking style, never health status.

---

## 5. Data Flow

1. **Profile page (auth)** → server calls `GET /api/identity` → `context.ts` loads stacks + items + profile + resolved evidence grades via existing RLS repos → `deriveUserIdentity(ctx)` (pure) → `IdentityCard` renders archetype + `TraitBars` + confidence chip + evidence trail (deep-links via `citationHref`).
2. **Stack Lab / StackWorkspace** → `deriveStackArchetype(stack, ctx)` (pure) → `StackArchetypeBadge` on each stack.
3. **Library supplement detail (SSR)** → `deriveSupplementArchetype(supplement)` (pure over seed) → `SupplementArchetypeBadge`.

Determinism guarantee: identical data ⇒ identical card. No write path; identity is never persisted in v1.

---

## 6. Session Plan (3 modules)

| Module | Scope | Verification target |
|--------|-------|---------------------|
| **M1 — Engine & taxonomy** | `types/identity`, `lib/identity` (`archetypes`, `traits`, `classify`, `confidence`, `stack-archetypes`, `supplement-archetypes`, `index`) + full unit + integrity tests | tsc clean; full unit suite green (+N); pure domain, no build dependency; integrity: every archetype reachable, traits bounded, classifier total |
| **M2 — Context & API** | `lib/identity/context.ts` (reuse existing repos/engines), `GET /api/identity` (auth + RLS), Library SSR supplement-archetype wiring | tsc clean; unit green; `next build` OK; L1 auth-guard 2/2 live; authed identity flow gated on `E2E_LIVE` |
| **M3 — UI & surfacing** | `IdentityCard`, `TraitBars`, `StackArchetypeBadge`, `SupplementArchetypeBadge`; surface on Profile / Stack Lab / Library; deep-link reuse | tsc clean; `next build` OK; L2 (public Library supplement badge) live; L3 authed Profile card gated on `E2E_LIVE` |

---

## 7. Brainstorming Log

| Phase | Decision | Rationale |
|-------|----------|-----------|
| Direction (Q1) | **Gamification / identity layer** for v9 | User selected over adherence-tracking, advisor-hardening, and cost-economics; advisor arc (v6–v8) already complete |
| Core purpose (Q2) | **Reflect identity / self-image** | Chosen over reward-completeness, stack-quality-scoring, evidence-literacy; the "who am I" mirror is the missing emotional payoff |
| Approach (Phase 2) | **A — derived archetype engine** | Deterministic + explainable avoids the horoscope trap; matches evidence-first, additive Option C pattern of v2–v8; rejected LLM (unstable identity) and static badges (childish, off-target) |
| YAGNI (Phase 3) | **All four additions kept**; snapshot/history, share-image, literacy score, standalone quality scores, badges, advisor-integration **deferred** | Full identity release without a new table/LLM/dependency; complexity/risk become *traits*, not standalone scores |
| Design (Phase 4) | Architecture + modules/surfaces + data flow **approved as presented** | Pure `lib/identity`, `GET /api/identity` + Library SSR split, Profile/Stack/Library surfacing, 3-module M1/M2/M3 sequence |

---

## 8. Next Steps

```
Plan Plus completed
Document: docs/01-plan/features/identity-cards.plan.md
Next step: /pdca design identity-cards
```
