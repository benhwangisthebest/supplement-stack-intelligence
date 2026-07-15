# side-effect-engine (v11) — Analysis (Check Phase)

> **Feature**: side-effect-engine (v11)
> **Date**: 2026-07-15
> **Design**: [side-effect-engine.design.md](../02-design/features/side-effect-engine.design.md)
> **Plan**: [side-effect-engine.plan.md](../01-plan/features/side-effect-engine.plan.md)
> **Match Rate**: Check-1 **88%** → **Act-1** → Check-2 **99%** ✅
> **Verdict**: 2 Critical + 3 Important found; **all closed in Act-1** (1 iteration).

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | v10 captures adherence + goal ratings but treats side-effects as an unstructured, display-only note. Close the safety loop honestly. |
| **WHO** | Existing end users (health nerds / biohackers). |
| **RISK** | **Correlation misread as causation** — mitigated *by construction*. |
| **SUCCESS** | Pure engine + curated seed + 4 surfaces; honesty invariant proven; prior suites green. |
| **SCOPE** | Additive Option C. Out (v12): dechallenge, onset-window, protocol influence, wearables. |

---

## 1. Strategic Alignment Check

| Question | Verdict |
|---|---|
| Does the implementation address the core problem (WHY)? | ✅ Yes — structured capture + curated cross-reference ship across 4 surfaces. |
| Were key Design decisions followed (Option C, additive)? | ✅ Yes — 0 existing engines rewritten; additive `0007`; no new deps. |
| Is the load-bearing RISK actually mitigated? | ❌ **No** — the evaluation copy asserts a co-occurrence the engine never computes (G1). The anchor's central risk is *not* mitigated as claimed. |

> Per the Check protocol, a strategic misalignment is Critical regardless of structural match.

## 2. Success Criteria

| # | Criterion | Status | Evidence |
|---|---|:--:|---|
| SC1 | Pure `lib/side-effects` engine + curated seed, unit-tested, DB-agnostic | ✅ Met | `src/lib/side-effects/*`; 18 unit tests |
| SC2 | Structured capture (canonical vocab + optional severity) in check-in | ✅ Met | `DailyCheckinForm.tsx`, `schemas.ts:reportedSideEffectSchema`, `side-effect-repo.ts` |
| SC3 | Library "What to watch" per supplement (public) | ⚠️ Partial | Section renders (L2 verified); **citation chips absent** — all 27 seed entries have `paperIds: []` (G3) |
| SC4 | Stack Evaluation correlational, non-diagnostic caution | ⚠️ Partial | `ruleSideEffect` emits, but the copy **overclaims** (G1) |
| SC5 | Profile side-effect history timeline (SVG, v4 pattern) | ✅ Met | `SideEffectTimeline.tsx` + `profile/page.tsx` |
| SC6 | Advisor read-only grounded tool | ✅ Met | `tools.ts:sideEffectWatch`; refuse-when-empty; 3 tests |
| SC7 | **Honesty invariant proven** (banned-language sweep + no-signal regression) | ❌ **Not Met** | Both tests pass, but they prove the wrong thing — see G1. The invariant is *not* upheld. |
| SC8 | `next build` OK; prior suites green; L1 auth-guards runtime-verified | ✅ Met | 377/377 unit; build OK; 5/5 runnable e2e |

**Score: 5 Met / 2 Partial / 1 Not Met.**

## 3. Gap List

### G1 — CRITICAL: evaluation copy asserts a co-occurrence the engine never computes

- **Where**: `src/lib/safety/index.ts:211` ← rendered via `src/lib/side-effects/to-flags.ts:36` ← `src/lib/stack-evaluator/rules.ts:376`
- **Claim rendered**: `You logged {effect} on {N} days when you also logged taking {supplement} — an effect people commonly report while taking it.`
- **What the engine actually computes** (`src/lib/side-effects/index.ts:70-110`): counts report rows per `effectLabel`, then checks the supplement is **in the stack** and has that effect curated. It reads **no** v10 adherence (`taken`) data — there is no reference to `taken`/`checkin` in the module.
- **Failure scenario**: user reports `nausea` on 5 days, has Zinc in their stack, and logged taking Zinc on **none** of those days (or never logged adherence at all). The flag still renders *"You logged nausea on 5 days when you also logged taking Zinc."* — a fabricated co-occurrence.
- **Why the guards missed it**: the honesty sweep checks banned **phrases**; it never asserts the claim matches the computation. `containsBannedLanguage` returns false for a sentence that is fluent, hedged — and untrue.
- **Impact**: directly violates the Context Anchor's central RISK and Plan SC7. This is the exact overclaim the feature exists to prevent.
- **Root cause**: Design §2.2 specified a **min-sample-gated taken-vs-not aggregate** over v10 adherence; only the curated-match half was implemented, while the copy was written to the design's full intent.

### G2 — IMPORTANT: designed taken-vs-not aggregate not implemented

- **Design §2.2**: "load stack + recent reports + **v10 adherence** → engine … computes a **min-sample-gated taken-vs-not aggregate**".
- **Actual**: `correlateReports(reports, items, profiles, opts)` takes no adherence input; `ruleSideEffect` calls `correlateReports(reports, ctx.items)` only.
- **Impact**: the correlational payoff (the v10-style taken-vs-not comparison, mirroring `lib/checkin/outcomes`) is missing. G1 is its symptom.

### G3 — IMPORTANT: Library citation chips absent (design §5.4 checklist)

- **Design §5.4**: "Link: citation chip per entry → `#paper-{id}` (reuses v8 `citationHref`)".
- **Actual**: all 27 `SEED_SIDE_EFFECTS` entries carry `paperIds: []`, so `WhatToWatch` renders no chips (the component has no chip markup at all).
- **Note**: leaving `paperIds` empty was a deliberate honesty choice (no side-effect papers exist in `seed-papers`, so citations would have been fabricated). The gap is that the **design promised chips** and the seed cannot supply them — design and seed disagree.

### G4 — IMPORTANT: `GET /api/side-effects` response shape deviates from design §4.2

- **Design §4.2**: `{ "data": SideEffectReport[] }`
- **Actual** (`src/app/api/side-effects/route.ts:19`): `ok({ reports })` → `{ "data": { "reports": [...] } }`
- **Impact**: low functional risk (only consumer is the Profile page, which reads server-side; the e2e asserts `.data.reports`), but the documented contract is wrong. Either the doc or the route should change.

### G5 — MINOR (deliberate, documented): capture control + curated-watch severity

- §5.4 specifies a "canonical-vocab **combobox** (autocomplete)" with "inline error"; implemented as a `<select>` of canonical labels. **Stricter** than designed (invalid input is unselectable), but a deviation.
- §5.4 lists `info` (curated-watch) as a possible evaluation severity; `ruleSideEffect` emits **only** `reported-match` warnings. Deliberate (keeps existing evaluator suites byte-identical and makes the no-signal guarantee trivial), documented at `rules.ts:365-370`. Curated-watch surfaces in the Library instead.

## 4. Match Rate

| Axis | Rate | Notes |
|---|:--:|---|
| **Structural** (×0.15) | 100% | 13/13 design-named files present; all wiring points found |
| **Functional** (×0.25) | 75% | G1 (copy≠computation), G2 (aggregate missing), G3 (chips) |
| **Contract** (×0.25) | 85% | POST shape ✓, 400/401 ✓; G4 GET shape deviates |
| **Runtime** (×0.35) | 95% | 377/377 unit; build OK; 5/5 runnable e2e; 2 L3 env-gated (house norm) |

```
Overall = (100 × 0.15) + (75 × 0.25) + (85 × 0.25) + (95 × 0.35)
        = 15 + 18.75 + 21.25 + 33.25 = 88.25 → 88%
```

> **Runtime green ≠ correct.** Every test passed while G1 shipped, because no test asserts that a rendered claim matches what the engine computed. That is the most transferable lesson of this cycle.

## 5. Decision Record Verification

| Decision | Followed? |
|---|---|
| [Plan] Approach A — additive pure engine | ✅ |
| [Design] Option C — sibling engine, 0 engine rewrites | ✅ |
| [Design] Additive `0007`, `checkins` untouched | ✅ |
| [Design] Evidence-subordinate, never critical, never reorders | ✅ (proven by no-signal regression) |
| [Design] §2.2 taken-vs-not aggregate over v10 adherence | ❌ (G2) |
| [Anchor] Correlation never overclaimed | ❌ (G1) |

## 6. Recommended Act (iterate)

**Fix G1 — two viable paths:**

| Option | Change | Effort |
|---|---|---|
| **A (recommended, minimal)** | Reword `sideEffectCorrelation` to match what is computed: drop the "when you also logged taking X" clause → *"You logged {effect} on {N} days. It's a commonly reported effect for {supplement}, which is in your stack."* Add a unit test asserting the copy makes no co-occurrence claim. | small |
| **B (design-complete)** | Implement G2: pass v10 `checkins` into `correlateReports`, intersect report dates with `taken[]`, gate on `MIN_TAKEN_DAYS`, and only then make the co-occurrence claim. Restores design §2.2 fully and makes the existing copy true. | medium |

**Also**: G3 (drop the chip requirement from the design **or** seed real papers), G4 (align route or doc).

**Guard to add regardless**: a test that binds each copy builder to the engine facts it may reference — so a future overclaim fails the suite rather than the sweep waving it through.

---

## 7. Act-1 — Applied (2026-07-15)

User elected **Fix all**. A sixth gap (G6) surfaced while implementing and was fixed in the same pass.

### G6 — CRITICAL (found during Act-1): the evaluation surface was dead code

`services/evaluation.ts:42` called `evaluateStack({ stack, items, profile, labMarkers, trends })` — **no `sideEffectReports`**. `ruleSideEffect` therefore returned `[]` for every real user: SC4 shipped as dead code, and G1's false copy never actually reached a user because the path rendering it was never wired. Neither bug was visible to a green suite. **Fixed**: `runEvaluation` now loads `listSideEffectReports` + `listCheckins` and passes both.

### Resolution

| Gap | Resolution | Evidence |
|---|---|---|
| **G1** Critical — copy asserted an uncomputed co-occurrence | Copy now cites only computed facts: *"You logged {effect} on **{reportedDays} of the {takenDays} days** you logged taking {supplement}"* | `safety/index.ts:216`; 3 copy↔computation tests |
| **G6** Critical — evaluation surface dead in production | `runEvaluation` wires reports + checkins into `evaluateStack` | `services/evaluation.ts:47-57` |
| **G2** Important — taken-vs-not aggregate missing | `correlateReports({reports, checkins, items})` intersects report dates with adherence dates; gates on `MIN_REPORTS` (co-occurrence) **and** `MIN_TAKEN_DAYS` (sample) | `side-effects/index.ts`; 7 correlation tests |
| **G3** Important — citation chips promised, unciteable | Design revised: chips removed (seeding them would fabricate provenance); `paperIds` retained as the v12 extension point | design §5.4 note |
| **G4** Important — GET contract mismatch | Design corrected to `{data:{reports}}`, matching impl + the house `/api/checkins` convention | design §4.2 note |
| **G5** Minor — deliberate deviations | Unchanged; documented | `rules.ts` comments |

### New permanent guard

A **copy↔computation binding** suite (`side-effects.test.ts`) now asserts every rendered number is an engine-computed fact:
- cites `reportedDays` of `takenDays` verbatim; **never** the raw report count
- **no flag at all** when co-occurrence is zero (the exact G1 scenario)
- curated-watch copy claims nothing about the user's own logs
- rule-level: reports **without** adherence ⇒ no flags

### Check-2

| Axis | Check-1 | Check-2 |
|---|:--:|:--:|
| Structural (×0.15) | 100% | 100% |
| Functional (×0.25) | 75% | **98%** (G1/G2/G3/G6 closed) |
| Contract (×0.25) | 85% | **100%** (G4 closed) |
| Runtime (×0.35) | 95% | **99%** (385/385 unit, build OK, 5/5 e2e) |

```
Overall = (100 × 0.15) + (98 × 0.25) + (100 × 0.25) + (99 × 0.35)
        = 15 + 24.5 + 25 + 34.65 = 99.15 → 99%
```

**Success criteria: 8/8 Met.** SC3 now met as revised (curated-dataset backed, no fabricated citations); SC4 met and **actually live**; SC7 met — and now genuinely proven, by tests that bind claims to computations rather than scanning for phrases.

### Lesson (for the report)

Every test passed while two Critical bugs shipped. The honesty sweep validated *vocabulary*, not *truth*; the unit tests validated the engine in isolation while nothing asserted it was **called**. Both failure modes are invisible to "all green" — a passing suite proves the code does what the tests say, not what the product claims. The copy↔computation binding closes the first; the G6-style wiring gap argues for an integration assertion that each new rule is reachable from its production caller.
