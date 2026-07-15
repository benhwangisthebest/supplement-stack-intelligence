# side-effect-engine (v11) — Plan

> Built with **Plan-Plus** (brainstorming-enhanced PDCA planning).
> Milestone: **v11** — first feature beyond v10 `daily-checkin`.
> Architecture posture: **Option C (additive)**, evidence-subordinate, non-diagnostic.

---

## Executive Summary

| Perspective | Summary |
|---|---|
| **Problem** | The platform captures *adherence + goal ratings* (v10) but treats reported side-effects as a **display-only note** — unstructured, uncorrelated, and disconnected from the supplement science it already curates. Users can't see what a supplement is *commonly reported to cause*, nor whether an effect they're feeling lines up with what they're taking. |
| **Solution** | A pure, deterministic `lib/side-effects` engine backed by a **curated seed dataset** (commonly-reported effects per supplement, with frequency tiers + citations) **cross-referenced** against **structured user reports**. It surfaces a **correlational, non-diagnostic** signal — never causal, never evidence-overriding — mirroring the v2 interactions / v3 biomarkers / v10 feedback formula. |
| **Function / UX effect** | (1) Structured side-effect capture in the daily check-in; (2) a Library **"What to watch"** section per supplement; (3) an **evidence-subordinate caution flag** in Stack Evaluation; (4) a **Profile side-effect timeline**; (5) a **read-only advisor tool**. |
| **Core value** | Closes the safety loop: the platform can finally connect *"what you're taking"* → *"what's commonly reported"* → *"what you actually reported"* — honestly, correlationally, and without ever claiming causation or overriding evidence. |

---

## 1. User Intent Discovery (Phase 1)

- **Core problem:** Deepen the safety layer by turning v10's display-only side-effect note into a real, engine-backed, correlational side-effect capability.
- **Target users:** End users (health nerds / biohackers / longevity-focused) — the platform's established audience. No new persona.
- **Success criteria (derived):**
  1. A pure `lib/side-effects` engine + curated seed dataset ships, unit-tested, DB-agnostic.
  2. Users can capture **structured** side-effect reports (controlled vocabulary + optional severity) during the daily check-in.
  3. Library surfaces a curated **"What to watch"** section per supplement (public, no user data).
  4. Stack Evaluation surfaces a **correlational, non-diagnostic caution** when a reported effect matches a commonly-reported effect of a stack item.
  5. Profile shows a **side-effect history timeline** (SVG, reusing the v4 pattern).
  6. The advisor gains a **read-only, grounded** side-effect tool.
  7. **Honesty invariant proven:** banned-causal-language sweep passes; a **no-signal regression test** shows evaluation/protocol ordering is byte-identical without side-effect data.
  8. `next build` OK; all prior suites (v2/v3/v5/v9/v10) remain green; L1 auth-guards runtime-verified.

## 2. Alternatives Explored (Phase 2)

| Approach | Summary | Verdict |
|---|---|---|
| **A. Additive pure engine (mirroring v2/v3/v10)** | New `lib/side-effects` engine + curated seed + structured capture + Library/Evaluation surfacing. | ✅ **Selected** — proven formula, self-contained, strong honesty story, additive. |
| B. Reference-first, tracking-light | Curated dataset + educational surfacing now; defer user-reported correlation to v12. | Rejected — under-uses the v10 loop; the correlation *is* the interesting part. |
| C. Advisor-integrated (proactive proposals) | A + a detector turning reported effects into suggest-then-confirm proposals. | Rejected for v11 — largest scope, touches v7/v8, arguably two features; the proactive-advisor candidate stays a separate future milestone. |

## 3. YAGNI Review (Phase 3)

**Non-negotiable core (included, not up for cutting):**
- Pure `lib/side-effects` engine
- Curated `sideEffectProfiles` seed dataset
- Structured capture replacing v10's display-only note
- Additive `0007_side_effects.sql` migration
- Honesty-sweep test (banned causal language)

**Discretionary surfaces — all four selected → in scope:**
- ✅ Library **"What to watch"** section
- ✅ Stack Evaluation **caution flag** (`ruleSideEffect`, evidence-subordinate)
- ✅ Profile **side-effect history** timeline (SVG, v4 pattern)
- ✅ Advisor **read-only tool**

**Out of scope → deferred to v12:**
- Dechallenge/rechallenge detection (stopped X → effect resolved)
- Onset-window timing logic (effect appeared N days after adding X)
- Severity-trend analytics beyond a simple timeline
- Any proactive advisor change-proposals (Approach C)
- Wearable/external side-effect import
- Authed live-E2E provisioning (env-gated, consistent with prior milestones)

## 4. Architecture (Phase 4 — validated)

**Option C (additive).** New pure module `src/lib/side-effects/` — sibling to `lib/interactions` and `lib/biomarkers`:

```
src/lib/side-effects/
  types.ts          # SideEffectProfile, ReportedSideEffect, SideEffectSignal, SideEffectFinding
  engine.ts         # pure cross-reference + min-sample-gated aggregate
  seed/profiles.ts  # curated commonly-reported effects per supplement
  index.ts
```

- **Controlled vocabulary** of canonical effect labels is the **join key** between user-reported effects and curated profiles (a reported label only correlates when it resolves to a canonical label present in a stack item's curated profile).
- **Zero existing engine files modified.** One additive migration `0007_side_effects.sql` adds an RLS-guarded, user-scoped `side_effect_reports` table — it never touches v10's `checkins` table.

## 5. Key Components / Integration Points

| # | Component | Layer | Notes |
|---|---|---|---|
| 1 | `lib/side-effects` engine + curated `sideEffectProfiles` seed | Domain | supplement → commonly-reported effects (frequency tier `common`/`infrequent`/`rare` + citations). Pure, unit-tested. |
| 2 | `0007_side_effects.sql` → `side_effect_reports` (user_id, date, effect_label, severity?, note?, created_at) | Infra | Additive, RLS, `unique(user, date, effect_label)`. |
| 3 | Structured capture: extend `lib/checkin` input + check-in UI + `POST /api/checkins` | App | Controlled-vocab autocomplete + optional 1–3 severity. **Server re-validates; client canonical values never trusted** (platform invariant). |
| 4 | Library **"What to watch"** section | UI | Curated profiles only — public, no auth, no user data. |
| 5 | Stack Evaluation caution flag (`ruleSideEffect`) | Domain→UI | Correlational, **evidence-subordinate**, **informational only** (never blocks, never reorders). Composed additively into `evaluateStack` output. |
| 6 | Profile **side-effect history** timeline | UI | SVG sparkline/timeline reusing the v4 `lab-timeline` pattern + honest "insufficient data" state. |
| 7 | Advisor **read-only tool** | Domain | Thin grounded wrapper over the engine (v6 registry); refuse-when-empty; honesty cases added to the sweep. |

## 6. Data Flow (Phase 4 — validated)

- **Capture:** daily check-in → pick reported effects (controlled-vocab autocomplete) + optional severity → `POST /api/checkins` → server validates & normalizes to canonical labels → writes `side_effect_reports` (RLS).
- **Correlate (Stack Lab):** load stack + recent reports + v10 adherence → engine (a) cross-references reported effects against curated profiles of stack items and (b) computes a **min-sample-gated** taken-vs-not aggregate → emits `SideEffectSignal` → renders as a **non-diagnostic caution** in Stack Evaluation.
- **Library (public):** curated profiles → "What to watch," no auth, no user data.
- **Profile:** user's reports over time → SVG timeline.
- **Advisor:** read-only grounded tool → correlational, non-diagnostic answers.

## 7. Safety Invariant (load-bearing)

The side-effect signal is **correlational and non-diagnostic by construction**:
- **Never** asserts causation ("causes", "caused by", "side effect of" → reframed to "commonly reported with" / "you reported on days you took").
- **Never** overrides evidence grade or reorders protocol/evaluation output.
- **Never** blocks (unlike the interactions critical flag — this is informational).

**Proven, not asserted:**
1. **Honesty sweep** — a banned-causal-language test over all generated side-effect copy (extends the v2/v6/v10 sweep).
2. **No-signal regression test** — `evaluateStack` and `generateProtocol` outputs are **byte-identical** with side-effect data absent, and a maximal side-effect signal never changes ordering (the exact technique v10 used to prove feedback subordination).
3. **Min-sample gating** — taken-vs-not aggregates suppress until a minimum observation count is met (honest "insufficient data" instead of hollow correlation).

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Perceived causation from correlation | Non-diagnostic copy through `lib/safety` + honesty sweep; UI language "commonly reported with" / "you reported on days you took". |
| Curated seed accuracy | Frequency tiers + citations per effect; start with a bounded, well-sourced set of supplements (mirroring v2's 17-rule seed). |
| Reported↔curated mismatch | Controlled vocabulary as the join key; free-text captured but non-canonical labels never fabricate a correlation. |
| Scope creep into causal inference | Dechallenge/onset-window explicitly deferred to v12. |
| Regression in prior engines | 0 engine files modified + no-signal regression + full prior-suite green gate. |

## 9. Brainstorming Log (Phases 1–4)

- **Phase 1:** Chose *side-effect engine* over proactive-advisor / longitudinal-charts / reminders. Source of truth = **both curated + user-reported** (seed-backed, mirrors v2/v3).
- **Phase 2:** Chose **Approach A** (additive pure engine) over reference-first (B) and advisor-integrated (C).
- **Phase 3:** Kept **all four** discretionary surfaces; deferred advanced causal-correlation mechanics to v12.
- **Phase 4:** Architecture, components, and data flow validated in one pass ("all three look right").

## 10. Next Step

```
/pdca design side-effect-engine
```
