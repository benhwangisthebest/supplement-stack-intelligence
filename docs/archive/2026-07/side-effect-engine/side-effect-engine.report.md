# side-effect-engine Completion Report

> **Status**: **Complete (with one unverified surface)** — engine + wiring proven; authed paths never executed against a live DB.
>
> **Project**: Supplement Stack Intelligence Platform
> **Version**: **v11**
> **Author**: bkit PDCA (Plan-Plus → Design → Do ×3 → Check → Act-1 → QA → Act-2)
> **Completion Date**: 2026-07-15
> **PDCA Cycle**: #11

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | side-effect-engine (v11) |
| Start Date | 2026-07-14 |
| End Date | 2026-07-15 |
| Duration | 2 days (1 session) |
| Cycle shape | Plan-Plus → Design → Do ×3 modules → Check (88%) → **Act-1** → QA (CONDITIONAL PASS) → **Act-2** |

### 1.2 Results Summary

```
┌─────────────────────────────────────────────┐
│  Success Criteria:  8 / 8 met               │
├─────────────────────────────────────────────┤
│  ✅ Delivered:      4 / 4 surfaces          │
│  🔴 Criticals:      2 found → 2 fixed       │
│  🟠 Important:      3 found → 3 fixed       │
│  🟡 Unverified:     authed runtime (infra)  │
└─────────────────────────────────────────────┘
```

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | v10 captured adherence + goal ratings but treated side-effects as an unstructured, display-only note — disconnected from the curated supplement science the platform already had. |
| **Solution** | A pure `lib/side-effects` engine (sibling to `interactions`/`biomarkers`) cross-referencing a curated 12-supplement / 27-entry seed against **dated** user reports, intersected with v10 adherence. Additive Option C: 0 existing engines rewritten, 1 additive migration, 0 new dependencies. |
| **Function/UX effect** | 4 surfaces shipped: Library "What to watch" (public, verified on real renders), Stack Evaluation correlational caution (`warning`, never `critical`), Profile SVG timeline, read-only advisor tool (7th in registry). **388 unit tests** (+48), `next build` OK, full e2e 41 passed / 0 failed. |
| **Core value** | The platform can now connect *what you take* → *what's commonly reported* → *what you actually logged* — **correlationally, and only where a true co-occurrence exists**. The honesty invariant is enforced by construction and proven by tests that bind claims to computations. |

---

## 1.4 Success Criteria Final Status

| # | Criteria | Status | Evidence |
|---|---------|:------:|----------|
| SC1 | Pure `lib/side-effects` engine + curated seed, unit-tested, DB-agnostic | ✅ Met | `src/lib/side-effects/*`; 26 tests; 12 profiles / 27 entries (design floor ≥8) |
| SC2 | Structured capture (canonical vocab + optional severity) in check-in | ✅ Met | `DailyCheckinForm.tsx`; `schemas.ts:reportedSideEffectSchema`; `side-effect-repo.ts` |
| SC3 | Library "What to watch" per supplement (public) | ✅ Met *(revised)* | QA-verified on real renders of `/library/berberine`; empty state correct on `/library/vitamin-d`. Citation chips **removed by design** (see 1.5) |
| SC4 | Stack Evaluation correlational, non-diagnostic caution | ✅ Met | `ruleSideEffect`; **reachability proven** by `services/evaluation.test.ts` (Act-2) |
| SC5 | Profile side-effect history timeline (SVG, v4 pattern) | ✅ Met | `SideEffectTimeline.tsx` + `profile/page.tsx` |
| SC6 | Advisor read-only grounded tool | ✅ Met | `tools.ts:sideEffectWatch`; refuse-when-empty; 3 tests |
| SC7 | **Honesty invariant proven** | ✅ Met | Copy↔computation binding + no-signal regression; **independently re-verified in QA by reading the engine, not trusting the sweep** |
| SC8 | `next build` OK; prior suites green; runtime-verified | ⚠️ **Met with qualification** | 388/388 unit, build OK, e2e 41/0. **Authed L3 never executed** — backend gone (see §4.1) |

**Success Rate: 8/8 met** — SC8 carries a standing qualification that is *environmental*, not a code defect.

## 1.5 Decision Record Summary

| Source | Decision | Followed? | Outcome |
|--------|----------|:---------:|---------|
| [Plan] | Side-effect engine over proactive-advisor / charts / reminders | ✅ | Deepened the safety layer; closed v10's loop |
| [Plan] | Source of truth = **both** curated + user-reported | ✅ | Enabled the cross-reference that is the feature's whole point |
| [Plan] | Approach A — additive pure engine | ✅ | Held; no engine rewrites |
| [Plan] | Keep all 4 surfaces (YAGNI kept nothing back) | ✅ | All 4 shipped; largest v11 scope, justified |
| [Design] | Option C — sibling engine mirroring `interactions` | ✅ | `index.ts` + `to-flags.ts` shape reproduced exactly |
| [Design] | Additive `0007`; `checkins` untouched | ✅ | Held |
| [Design] | Evidence-subordinate; never `critical`; never reorders | ✅ | Proven by no-signal regression |
| [Design] | §2.2 min-sample-gated **taken-vs-not aggregate** | ❌→✅ | **Missed in Do** (gap G2); restored in Act-1. Root cause of G1 |
| [Design] | §5.4 citation chip per entry | ❌ **reversed** | `seed-papers` has no side-effect literature — chips would fabricate provenance. Design revised; deferred to v12 |
| [Anchor] | Correlation never overclaimed | ❌→✅ | **Violated in Do** (G1); fixed in Act-1; now test-enforced |

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [side-effect-engine.plan.md](../01-plan/features/side-effect-engine.plan.md) | ✅ Finalized |
| Design | [side-effect-engine.design.md](../02-design/features/side-effect-engine.design.md) | ✅ Finalized (revised in Act-1) |
| Check | [side-effect-engine.analysis.md](../03-analysis/side-effect-engine.analysis.md) | ✅ Complete (88% → 99%) |
| QA | [side-effect-engine.qa-report.md](../05-qa/side-effect-engine.qa-report.md) | ✅ CONDITIONAL PASS + Act-2 addendum |
| Act | Current document | ✅ Complete |

---

## 3. Completed Items

### 3.1 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| Pure engine + vocab + to-flags | `src/lib/side-effects/` | ✅ |
| Curated seed (12 supplements, 27 entries) | `src/data/seed-side-effects.ts` | ✅ |
| Types + controlled vocabulary | `src/types/side-effect.ts` | ✅ |
| Migration (RLS, additive) | `supabase/migrations/0007_side_effects.sql` | ✅ (applied: **unverified**) |
| Repo + API read endpoint | `src/lib/db/side-effect-repo.ts`, `src/app/api/side-effects/route.ts` | ✅ |
| Library / Profile / check-in UI | `WhatToWatch.tsx`, `SideEffectTimeline.tsx`, `DailyCheckinForm.tsx` | ✅ |
| Advisor tool (7th) | `src/lib/advisor/tools.ts` | ✅ |
| Reachability guard | `src/services/evaluation.test.ts` | ✅ (Act-2) |

### 3.2 Non-Functional

| Item | Target | Achieved | Status |
|------|--------|----------|--------|
| Unit tests | prior suites green | **388/388** (+48 this cycle) | ✅ |
| Typecheck / build | clean | `tsc` clean; `next build` OK | ✅ |
| E2E | no regressions | 41 passed / 30 skipped / **0 failed** | ✅ |
| New dependencies | 0 | **0** | ✅ |
| Existing engines rewritten | 0 | **0** | ✅ |
| Authed runtime verification | live L3 | **not executed** | ⛔ |

---

## 4. Incomplete Items

### 4.1 Blocked — authed runtime verification

`cyjofigfvcqarxruqkfl.supabase.co` → **NXDOMAIN**. General connectivity is fine, so the
project itself is gone (deleted or paused past retention). Consequences:

- `0007_side_effects.sql` exists locally but **cannot be confirmed applied**.
- The authed half — capture → persist → correlate → evaluate → timeline — has **never
  executed against a live database in any phase** (not Do, not Check, not QA).
- RLS on `side_effect_reports`, the per-day idempotent replace, and the
  canonical-normalization 400 have only ever run against mocks.

This is a **genuine gap, not the env-gating convention** prior milestones used: v4/v10 at
least ran live once. The memory note claiming v4 authed flows were live-verified is now
stale — that project no longer exists.

**To clear**: new Supabase project → apply all 7 migrations → `npm run db:seed` →
`E2E_LIVE=1 npx playwright test --workers=1`.

### 4.2 Deferred to v12

| Item | Reason |
|------|--------|
| Dechallenge/rechallenge detection | Causal-inference territory; out of scope by design |
| Onset-window timing | Same |
| Side-effect literature in `seed-papers` → citation chips | Would have required fabricating provenance (G3) |
| Protocol-ranking influence | Deliberately excluded — keeps evidence supremacy trivial |
| Wearable import | Out of scope |
| Committing the out-of-scope locator fix | `tests/e2e/mvp-core-loop-actions.spec.ts` modified by QA, uncommitted |

---

## 5. Quality Metrics

### 5.1 Final Analysis

| Metric | Target | Check-1 | Final | Note |
|--------|--------|:-------:|:-----:|------|
| Design Match Rate | 90% | 88% | **99%** | after Act-1 |
| Criticals | 0 | 2 | **0** | G1, G6 |
| Important | 0 | 3 | **0** | G2, G3, G4 |
| Unit tests | green | 385 | **388** | +3 reachability |

> **Honest caveat on the 99%.** Check-2 scored Runtime 99% citing "5/5 runnable e2e" — but
> *runnable* excluded the two authed tests that mattered most, and "prior suites green" was
> asserted while only the side-effect specs had been run. QA caught both. The engine and its
> wiring are genuinely proven; **the authed surface is not**. Read the 99% as *static +
> public-surface* confidence only.

### 5.2 Resolved Issues

| Issue | Severity | Resolution | Result |
|-------|:--------:|------------|--------|
| **G1** Copy asserted an uncomputed co-occurrence | 🔴 Critical | Engine intersects report dates ∩ adherence dates; copy cites `{reportedDays} of {takenDays}` | ✅ Test-enforced |
| **G6** `runEvaluation` never passed reports → rule was dead code | 🔴 Critical | Wired reports + checkins into `evaluateStack` | ✅ Mutation-proven guard |
| **G2** Design §2.2 taken-vs-not aggregate missing | 🟠 | Implemented with dual gates (`MIN_REPORTS`, `MIN_TAKEN_DAYS`) | ✅ |
| **G3** Citation chips promised but unciteable | 🟠 | Design revised — chips removed rather than fabricated | ✅ |
| **G4** GET contract mismatch | 🟠 | Design corrected to `{data:{reports}}` (house convention) | ✅ |
| **QA-1** G6 had no regression guard | 🟠 High | `services/evaluation.test.ts` + mutation verification | ✅ |
| **QA-2** Pre-existing ambiguous e2e locator | 🟡 | Scoped to `<main>` (out-of-scope, uncommitted) | ✅ |

---

## 6. Lessons Learned & Retrospective

### 6.1 What Went Well (Keep)

- **Plan-Plus alternatives + YAGNI** produced a scope the user could reason about; Option C held from design through delivery with zero engine rewrites — the 7th consecutive additive milestone.
- **Reusing the `interactions`/`biomarkers` shape** meant the engine needed almost no novel design; `to-flags → DraftFlag` dropped into the existing pipeline for free.
- **Refusing to fabricate citations** (G3). The honest move was to change the *design*, not to seed papers that don't support the claims.
- **The Check phase did its job** — it caught a Critical that three green module gates had waved through.

### 6.2 What Needs Improvement (Problem)

- **A green suite proved nothing about truth.** 385 tests passed while two Criticals shipped. The honesty sweep validated *vocabulary* (`containsBannedLanguage`), not whether a fluent, hedged sentence was **true**. G1's copy was hedged, non-causal, banned-phrase-free — and false.
- **Unit tests validated the engine in isolation while nothing asserted it was ever called.** G6 made the flagship surface dead code for every real user; 385 tests and `tsc` both stayed clean because every test called `evaluateStack` *directly* and both context fields were optional.
- **I recommended a guard and didn't write it.** Act-1's analysis argued for "an integration assertion that each new rule is reachable from its production caller," then closed without one. QA proved the gap by mutation. *Writing the recommendation is not doing the work.*
- **I over-reported my own verification.** "Runtime 99% / 5-5 runnable e2e" excluded the tests that mattered; "prior suites green" was asserted from a partial run. Both were caught by QA, not by me.
- **Design specified a data flow (§2.2) that Do silently dropped** — and the copy was written to the *design's* intent rather than the *code's* behavior. That mismatch is exactly where G1 lived.

### 6.3 What to Try Next (Try)

- **Bind claims to computations, not to vocabulary.** Any copy builder citing a number must have a test asserting that number came from the engine. Adopted for v11; extend to `checkinCopy` + `protocolRationale` in v12.
- **Every new rule needs a reachability test through its production caller.** Optional context fields mean the compiler can *never* catch omission — only a test can.
- **Write the guard in the same commit as the fix.** A recommendation in a document decays; a failing test doesn't.
- **Mutation-test the guard.** A guard not proven to fail on the bug is decoration. Re-introducing G6 and watching the new test go red is what made it trustworthy.
- **Verify infrastructure before claiming runtime coverage.** The backend had been gone the whole cycle and no phase noticed until QA ran DNS.

---

## 7. Process Improvement Suggestions

### 7.1 PDCA Process

| Phase | Current | Improvement Suggestion |
|-------|---------|------------------------|
| Do | Module gates ran unit tests only | Add "is this reachable from production?" to each module's exit criteria |
| Check | Static + specs for the feature under test | Run the **full** suite before asserting "prior suites green"; treat skipped tests as *unverified*, never as passing |
| Check | Match Rate can score 99% on unexecuted paths | Weight Runtime by *executed* coverage; a skipped authed L3 should cap the runtime axis |
| QA | Caught what Check missed — kept | Keep the "independently re-verify, don't trust green" posture; it paid for itself twice this cycle |

### 7.2 Tools/Environment

| Area | Improvement Suggestion | Expected Benefit |
|------|------------------------|------------------|
| Supabase | Restore a project; apply 7 migrations; seed | Unblocks L3–L5 for v11 **and** the stale v4/v10 claims |
| QA harness | `scripts/qa/pre-release-check.sh` absent | Either install the scanners or drop the gate from the project's QA definition |
| CI | No automated run of the full suite | Would have caught the ambiguous locator four features ago |

---

## 8. Next Steps

### 8.1 Immediate

- [ ] Restore Supabase + apply `0001`–`0007`, seed, then run `E2E_LIVE=1 --workers=1` to clear §4.1
- [ ] Commit the out-of-scope locator fix in `tests/e2e/mvp-core-loop-actions.spec.ts`
- [ ] Decide on `.claude/launch.json` (created during QA; harmless, reusable)
- [ ] Update the stale memory note re: v4 live verification

### 8.2 Next PDCA Cycle

| Item | Priority | Note |
|------|----------|------|
| `food-pairings` (v12) | — | Already in flight in the working tree (plan + `FlagCategory` present) |
| Side-effect literature → citation chips | Medium | Closes the G3 deferral honestly |
| Extend copy↔computation binding to v10/v1 copy | High | Same bug class likely exists elsewhere |

---

## 9. Changelog

### v11.0.0 (2026-07-15)

**Added:**
- Pure `lib/side-effects` engine: `curatedWatchList`, `correlateReports` (adherence-intersected, dual-gated), `normalizeSideEffect`, `toSideEffectFlags`
- Curated seed: 12 supplements / 27 commonly-reported effects with frequency tiers
- `side_effect_reports` table (`0007`, additive, RLS) + repo + `GET /api/side-effects`
- Structured canonical capture in the daily check-in; `POST /api/checkins` accepts `sideEffects[]`
- Library "What to watch"; Profile side-effect SVG timeline; `sideEffectWatch` advisor tool
- `side-effect-caution` flag category; `side-effect` citation kind
- **Copy↔computation binding** + **reachability** test suites

**Changed:**
- `EvalContext`/`EvaluateStackInput` gain optional `sideEffectReports` + `checkins`
- `runEvaluation` loads and passes both (previously omitted — the rule was dead)
- `BANNED_PHRASES` += causal side-effect clauses; `DISCLAIMERS.sideEffect` added
- Design revised: citation chips removed (G3); GET contract corrected (G4)

**Fixed:**
- **G1** — evaluation copy claimed a co-occurrence the engine never computed
- **G6** — side-effect rule unreachable from production caller

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-07-15 | Completion report — v11 side-effect-engine | bkit PDCA |
