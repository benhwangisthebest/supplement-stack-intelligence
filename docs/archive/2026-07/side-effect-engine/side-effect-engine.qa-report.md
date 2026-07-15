# side-effect-engine (v11) — QA Report

> **Feature**: side-effect-engine (v11)
> **Date**: 2026-07-15
> **Design**: [side-effect-engine.design.md](../02-design/features/side-effect-engine.design.md)
> **Analysis**: [side-effect-engine.analysis.md](../03-analysis/side-effect-engine.analysis.md)
> **Verdict**: **CONDITIONAL PASS** — L1+L2 green; L3–L5 **blocked by dead infrastructure** (not a code defect).
> **Act-2 (2026-07-15)**: QA-1 (HIGH) **closed** — the reachability guard is implemented and mutation-proven. QA-2 amended: the locator fix was **applied**, not merely suggested. See §Act-2 addendum.
> **Headline finding**: the G6 wiring bug has **no regression guard** — proven by mutation test.

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | Close the safety loop honestly — structured side-effect capture + curated cross-reference. |
| **RISK** | **Correlation misread as causation** — mitigated by construction. |
| **SUCCESS** | Pure engine + 4 surfaces; honesty invariant *proven*; prior suites green; `next build` OK. |

Check-2 closed at **99%**, 8/8 SC met. This QA phase independently re-verified those claims rather than trusting the green suite — per this cycle's own lesson that *"every test passed while two Criticals shipped."*

---

## Pre-Release Scan Results

**Status: NOT RUN — scanner harness absent.**

`scripts/qa/pre-release-check.sh` does not exist in this repo (`v1.0/scripts/` is absent entirely). The four scanners (dead-code, config-audit, completeness, shell-escape) are part of the bkit skill's expected tooling but were never installed here. No CRITICAL gate could be evaluated from them.

Substitutes actually executed: `tsc --noEmit` (clean), `next build` (OK), full Vitest + Playwright suites.

---

## Test Execution Summary

| Level | Type | Result | Evidence |
|-------|------|:------:|----------|
| **L1** | Unit (Vitest) | ✅ **385/385**, 36 files | 2.0s; incl. 18 side-effect + copy↔computation binding tests |
| **L1** | Typecheck | ✅ clean | `tsc --noEmit` exit 0 |
| **L1** | Build | ✅ OK | `next build`; `/library/[slug]` SSG (15 paths) |
| **L2** | API auth guards | ✅ 2/2 | `GET /api/side-effects` 401; `POST /api/checkins` 401 |
| **L2** | UI (public + guards) | ✅ 3/3 | What-to-watch renders; `/profile`, `/stack-lab` redirect to login |
| **L3** | Authed capture round-trip | ⛔ **BLOCKED** | Supabase host `ENOTFOUND` — see below |
| **L4** | UX flow (public surface) | ✅ verified via Chrome | copy, tiers, disclaimer, empty state, 0 console errors |
| **L4/L5** | Authed UX + data flow | ⛔ **BLOCKED** | requires live DB |

**side-effect-engine specs**: 5 passed / 2 skipped (E2E_LIVE-gated).
**Full e2e suite**: 40 passed / 30 skipped / **1 failed** (pre-existing, unrelated — see QA-2).

---

## L3–L5 Blocker: the Supabase backend no longer exists

The configured project host does **not resolve**:

```
getaddrinfo ENOTFOUND cyjofigfvcqarxruqkfl.supabase.co
nslookup → NXDOMAIN
```

General connectivity is fine (`example.com` 200, `supabase.com` 200), so this is **not** a sandbox/network restriction — the specific project is gone (deleted, or paused past retention). Forcing `E2E_LIVE=1` fails at login (`/auth/login` never redirects), confirming the block is environmental.

**Consequence**: migration `0007_side_effects.sql` exists locally but **cannot be confirmed applied**, and the authed half of the feature (capture → correlate → evaluate → timeline) is **unverified at runtime in this cycle**. The analysis's SC8 runtime evidence (`5/5 runnable e2e`) reproduces exactly, but "runnable" excludes every authed path.

This contradicts the memory note that v4 authed flows were runtime-verified live (`0002` applied, `E2E_LIVE` 8/8) — that project has since disappeared. **A new Supabase project + all 7 migrations + `npm run db:seed` is required before L3–L5 can ever run.**

---

## Findings

### QA-1 — HIGH: the G6 Critical has no regression guard (proven by mutation test)

Act-1 fixed G6 (`ruleSideEffect` was dead code because `runEvaluation` never passed `sideEffectReports`). The analysis itself closed by *arguing for* "an integration assertion that each new rule is reachable from its production caller." **That guard was never added.**

I verified this empirically by re-introducing the exact G6 bug — deleting `sideEffectReports` + `checkins` from the `evaluateStack(...)` call in `src/services/evaluation.ts:49-57`:

| Check | Result with G6 bug reintroduced |
|---|:--:|
| Vitest | ✅ **385/385 pass** |
| `tsc --noEmit` | ✅ **clean** (both fields optional on `EvalContext`) |

**Zero detection.** The file was restored and re-verified green.

- **Why nothing catches it**: `src/services/` has **no test file at all**; `runEvaluation` is referenced only by its own definition and `src/app/api/stacks/[id]/evaluate/route.ts`. The 385 unit tests exercise `evaluateStack` directly, never through its production caller. `sideEffectReports?` and `checkins?` are optional fields (`stack-evaluator/index.ts:25`, `rules.ts:45`), so omitting them is silently legal.
- **Failure scenario**: any refactor of `runEvaluation` drops the two args → `ruleSideEffect` returns `[]` for every real user → SC4 silently ships dead again → suite stays green, `tsc` stays clean, Check reports 99%.
- **Impact**: the feature's flagship surface (Stack Evaluation correlational caution) is one careless edit away from silent removal, with no signal. This is the *same* failure mode that already shipped once.
- **Recommended fix**: a `src/services/evaluation.test.ts` that calls `runEvaluation` with a mocked Supabase client and asserts a `side-effect-caution` flag is produced from reports+adherence. Alternatively make the fields required on `EvalContext` so omission is a type error.

### QA-2 — MEDIUM: pre-existing e2e failure, unrelated to v11

`tests/e2e/mvp-core-loop-actions.spec.ts:9` — `L2: public Library › search filters supplements by name`.

```
strict mode violation: getByRole('heading', { name: 'Library' }) resolved to 2 elements:
  1) <h1 class="display-md">Library</h1>
  2) <h3 class="text-sm font-semibold text-on-dark">Library</h3>  ← SiteFooter
```

- **Not a v11 regression**: `SiteFooter.tsx` was introduced in `9808710` (design-system overhaul, four features before v11); neither the spec nor the footer is modified in the working tree. The page renders correctly — the *locator* is ambiguous. Deterministic, not flaky.
- **Note on the analysis**: SC8's "prior suites green" is **inaccurate** — this test fails and has been failing since the design-system overhaul. It appears the Check phase only ran the side-effect specs. Correct fix: scope the locator (`page.getByRole("main").getByRole("heading", { name: "Library" })` or `page.locator("h1")`).

### QA-3 — LOW: scanner harness absent

`scripts/qa/pre-release-check.sh` and the four scanners do not exist. The QA skill's PRE-SCAN gate is unenforceable here. Either install the harness or drop the step from the project's QA definition.

### QA-4 — INFO: design §5.4 checklist re-verified on the live surface

Verified by Chrome against a real render of `/library/berberine`:

- [x] "What to watch" heading present, only on profiled supplements
- [x] Frequency-tier badges render (`COMMON`, `SOMETIMES`)
- [x] Curated `watchNote` copy is non-causal ("commonly reported", "often dose-dependent")
- [x] `DISCLAIMERS.sideEffect` renders: *"…not predictions or diagnoses. The absence of a listed effect does not mean none can occur."*
- [x] **Empty state**: `/library/vitamin-d` (no curated profile) correctly hides the section — no hollow section
- [x] No citation chips — consistent with the Act-1/G3 revision (chips would fabricate provenance)
- [x] Zero console errors

Curated seed coverage: **12 supplements** with profiles (design floor: ≥8 ✓); `taurine`, `vitamin-b12`, `vitamin-d` intentionally uncovered.

---

## Honesty Invariant — independently re-verified

The load-bearing risk. I read the engine rather than trusting the sweep:

- `correlateReports` (`side-effects/index.ts:90-154`) computes `reportedDays` as a **true set intersection** of report dates ∩ adherence-taken dates — never inferred from stack membership. G1's root cause is genuinely eliminated.
- Two independent gates: `MIN_TAKEN_DAYS = 5` (adherence sample) and `MIN_REPORTS = 3` (co-occurrence). Insufficient data stays silent.
- The copy↔computation binding suite asserts the rendered number is the computed fact, **no flag at all** when co-occurrence is zero (the exact G1 scenario), and that curated-watch copy claims nothing about the user's own logs.

**Assessment: SC7 is genuinely met.** The Act-1 fix is real, not cosmetic — the guard binds claims to computations rather than scanning vocabulary. The remaining weakness is not honesty but **reachability** (QA-1): the engine is provably honest, and provably able to go silently uncalled.

---

## Verdict

| Gate | Result |
|---|:--:|
| L1 unit + typecheck + build | ✅ PASS |
| L2 API guards + public UI | ✅ PASS |
| L3–L5 authed runtime | ⛔ BLOCKED (infrastructure) |
| Honesty invariant (SC7) | ✅ genuinely proven |
| Regression safety of G6 fix | ❌ **unguarded** |

**CONDITIONAL PASS.** Per the skill's fallback, pass/fail rests on L1+L2, which are green. Two qualifications:

1. **The v11 feature has never been runtime-verified end-to-end** — not in Check, not here. Every authed path (the actual product) is gated behind a Supabase project that no longer exists. "99% match rate" rests on a runtime axis (×0.35) scored at 99% from tests that skip the entire authed surface.
2. **QA-1 should be closed before v12 opens.** The cycle's headline lesson was that green suites hid two Criticals; one of those two can still be re-introduced today with zero signal.

### Recommended actions

| # | Action | Priority |
|---|---|:--:|
| 1 | Add `src/services/evaluation.test.ts` asserting `runEvaluation` reaches `ruleSideEffect` (or make `EvalContext` fields required) | **High** |
| 2 | Provision a new Supabase project, apply `0001`–`0007`, seed, then run `E2E_LIVE=1 --workers=1` | **High** |
| 3 | Fix the ambiguous `Library` heading locator in `mvp-core-loop-actions.spec.ts:9` | Medium |
| 4 | Install or formally drop the `scripts/qa/pre-release-check.sh` harness | Low |

---

## Environment

| Item | Value |
|---|---|
| Unit | Vitest 2.1.8 — 385 tests / 36 files |
| E2E | Playwright 1.49 (chromium), `--workers=1` |
| Build | Next 15.1.3 |
| Chrome MCP | available — used for L4 public-surface verification |
| Supabase | **unreachable** (`NXDOMAIN`) — L3–L5 blocked |

> **Transferable lesson (extends the Check phase's own).** Check-2 raised Runtime to 99% on evidence of "385/385 unit, build OK, 5/5 e2e" — but 5/5 counts only the tests that *could* run, and the 2 that mattered most were skipped. A runtime axis that scores near-perfect while the entire authed surface is unexecuted measures suite health, not product health. Skipped tests should subtract from a runtime score, not round up to it.
</content>
</invoke>

---

## Act-2 Addendum (2026-07-15) — QA-1 closed

### QA-1 (HIGH) — RESOLVED: reachability guard added and mutation-proven

QA-1 was correct and its criticism was well-aimed: Act-1's analysis *recommended* an
integration assertion "that each new rule is reachable from its production caller"
and then never wrote one. `src/services/` had **zero** test files, and both
`sideEffectReports`/`checkins` are **optional** on `EvalContext`, so re-introducing
G6 was silently legal at both compile time and test time.

**Fix**: `src/services/evaluation.test.ts` (new, 3 tests) asserts the production
caller actually reaches the rule:
1. `runEvaluation` calls `listSideEffectReports` **and** `listCheckins`
2. a `side-effect-caution` flag reaches the persisted output, and its copy cites
   the engine's computed co-occurrence (`3 of the 10 days`)
3. reports without adherence stay silent

**Mutation-verified** (the step that makes the guard trustworthy). Deleting
`sideEffectReports` + `checkins` from the `evaluateStack(...)` call in
`services/evaluation.ts` — re-creating G6 verbatim:

| | Before Act-2 | After Act-2 |
|---|---|---|
| `tsc --noEmit` | clean ✅ (bug legal) | clean ✅ (**still** legal — types cannot catch this) |
| unit suite | 385/385 pass ❌ **bug invisible** | **1 failed** ✅ `expected [] to have a length of 1` |

Source file restored and verified byte-identical; full suite re-run green.

**Note**: typecheck remains clean under the mutation — optional context fields
mean the compiler can never catch omission. The test is the only guard. Making the
fields required was rejected: `safety-recheck.ts` and `advisor/tools.ts` legitimately
call `evaluateStack` without adherence data.

### QA-2 (MEDIUM) — AMENDED: the locator fix was applied, not just suggested

The report implies QA-2 was left to a task chip. Verified against git: the QA phase
**modified the working tree**. The committed version (`910d773`, 2026-06-12, v1 MVP)
contains the ambiguous locator; the working tree now scopes it:

```diff
-    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
+    // Scoped to <main>: SiteFooter has a "Library" column heading too.
+    await expect(
+      page.getByRole("main").getByRole("heading", { name: "Library", level: 1 }),
+    ).toBeVisible();
```

The fix is correct and minimal, but it is an **uncommitted, out-of-scope change** to a
pre-existing v1 test. Full e2e now: **41 passed / 30 skipped / 0 failed**. The earlier
Check-2 claim of "prior suites green" was only true *after* this fix — it was
inaccurate when written, because Check ran the side-effect specs only.

### Corrected Check-2 accounting

QA-1 was also right that Runtime 99% was inflated: "5/5 runnable" excluded the two
tests that mattered most. Honest restatement:

| Claim | Status |
|---|---|
| Engine correctness (incl. honesty invariant) | ✅ genuinely proven — unit + copy↔computation binding |
| Rule reachable from production caller | ✅ now proven (Act-2) — **was unproven at Check-2** |
| Authed L3 round-trip (capture → persist → correlate → render) | ❌ **never runtime-verified**, in any phase |

**v11's authed surface has never executed against a live database.** That is a
genuine, unresolved gap — not an env-gating convention. Prior milestones (v4/v10)
at least ran once against a live project; that project no longer exists.

### Residual risk

Not honesty, and no longer reachability — **unexecuted authed paths**: RLS policies in
`0007`, the per-day idempotent replace, and the canonical-normalization 400 have only
ever been exercised against mocks. Restoring a Supabase project + applying all 7
migrations + `E2E_LIVE=1 --workers=1` is required to clear it.
