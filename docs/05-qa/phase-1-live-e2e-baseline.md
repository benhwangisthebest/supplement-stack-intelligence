# Phase 1 — E2E baseline (U17)

**Status: PARTIAL — the non-live half is measured and dated; the LIVE half is BLOCKED(env).**

Plan: `docs/01-plan/phase-1-verification-integrity.plan.md` §6.1 (U17), gated behind U16 by Gate E1.
Closes the measurement half of roadmap item 7; the live half remains open.

This document exists because the repository has been citing E2E figures — "61/71" and "79/10" — that
nothing in it can reproduce, alongside a single on-disk artifact that **contradicted** the accepted
explanation for them. Review finding **T-14** called that out. What follows is what was actually run,
when, and by what command. Where something was not run, it says so.

---

## 1. What ran

**Commit:** `4246044` — the U16 tip (tags + serialisation + build-then-start), integrated into `main` and
reachable from it since 2026-08-06. *(This originally named the branch `test/u16-u17`, which was deleted
after integration; naming a deleted branch made the measurement look unreproducible.)*
**Machine:** darwin arm64, Node v24.16.0, Playwright **1.60.0** (`@playwright/test` declared `^1.49.1`).
**Started:** `2026-08-05T18:02:16Z` · **Ended:** `2026-08-05T18:02:40Z` (23.4s of test execution).

```bash
npx playwright test --reporter=list      # with E2E_LIVE unset
```

The webServer was started by Playwright itself from `playwright.config.ts` — `npm run build && npm run
start`, U16's build-then-start change. Nothing was listening on `:3000` beforehand, so
`reuseExistingServer` could not have short-circuited it, and `.next/BUILD_ID` +
`.next/prerender-manifest.json` were present afterwards from a deleted-`.next` cold start. **This
baseline is measured against a production build, not `next dev`** — the first time that is true in this
repository.

### Result: 59 passed · 30 skipped · **0 failed** · 89 tests in 23 files

| Spec file | pass | skip | fail |
|---|---:|---:|---:|
| `advisor-actions-ui.spec.ts` | 0 | 2 | 0 |
| `advisor-actions.spec.ts` | 2 | 3 | 0 |
| `advisor-experience-actions.spec.ts` | 2 | 2 | 0 |
| `advisor-experience.spec.ts` | 2 | 2 | 0 |
| `ai-advisor.spec.ts` | 3 | 1 | 0 |
| `biomarker-intelligence.spec.ts` | 2 | 1 | 0 |
| `daily-checkin.spec.ts` | 3 | 3 | 0 |
| `evidence-disclosure.spec.ts` | 18 | 0 | 0 |
| `evidence-grading-actions.spec.ts` | 2 | 0 | 0 |
| `identity-cards.spec.ts` | 2 | 2 | 0 |
| `lab-timeline-actions.spec.ts` | 0 | 1 | 0 |
| `lab-timeline-e2e.spec.ts` | 0 | 1 | 0 |
| `lab-timeline.spec.ts` | 3 | 3 | 0 |
| `medication-interactions.spec.ts` | 2 | 2 | 0 |
| `mvp-core-loop-actions.spec.ts` | 3 | 1 | 0 |
| `mvp-core-loop-e2e.spec.ts` | 0 | 2 | 0 |
| `mvp-core-loop.spec.ts` | 6 | 0 | 0 |
| `product-match-e2e.spec.ts` | 0 | 1 | 0 |
| `product-match.spec.ts` | 2 | 0 | 0 |
| `protocol-builder-e2e.spec.ts` | 0 | 1 | 0 |
| `protocol-builder.spec.ts` | 2 | 0 | 0 |
| `side-effect-engine-actions.spec.ts` | 3 | 0 | 0 |
| `side-effect-engine.spec.ts` | 2 | 2 | 0 |
| **TOTAL (23 files)** | **59** | **30** | **0** |

**Every one of the 30 skips is `[LIVE]`-tagged.** That is the whole point of U16 landing first: the skip
list is now self-describing, so this table can be read without cross-referencing the source.

### A detail worth recording: 29 skips or 30?

An earlier run of the same command reported **29** skipped and 36 failed, because Playwright's pinned
browser build was missing (below). With the browser present the same command reports **30** skipped.

The extra skip is `medication-interactions.spec.ts` → `[LIVE] the Medications profile field offers
autocomplete suggestions`, and the difference is structural, not flaky: that is the repository's only
**test-level** gate. A `test.skip()` inside a test body only executes once the test starts, which needs a
browser; a describe-level `test.skip()` is evaluated at collection time and needs nothing. Both shapes
exist here, and U16's guard pins the 17/1 split for exactly this reason.

---

## 2. What did NOT run, and why — **BLOCKED(env)**

**No live E2E run was performed. No live figure appears in this document.** Simulating one, or carrying
forward an older number as if it were fresh, is the specific failure this document was created to end.

A live run (`E2E_LIVE=1`) needs all of the following. **Names only — no values are recorded here, ever.**

| Requirement | Needed for | Present on this machine |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all authed flows | **unset** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all authed flows | **unset** |
| `SUPABASE_SERVICE_ROLE_KEY` | `npm run db:seed` only | **unset** |
| `API_ANTHROPIC_KEY` | advisor specs (`ai-advisor`, `advisor-*`) | **unset** |
| `SEED_DEMO_EMAIL` / `SEED_DEMO_PASSWORD` | login helper; defaults exist but the account must exist | **unset** |
| Migrations `0003`–`0007` applied to that project | advisor, check-ins, side-effects | unknown — needs the project |
| Seeded demo user (`npm run db:seed`) | every `login()` call | unknown — needs the project |

All seven are things only the repository owner can supply. **U17 is therefore BLOCKED(env)** for its
live half.

> **[2026-08-08 — addendum, appended not rewritten: the posture above is now a ruling.]** Everything in
> §1–§4 describes what was run on 2026-08-05 and is unchanged. What changed is the *disposition* of the
> live half, decided by the repository owner when the Phase 2 plan was approved
> (`docs/01-plan/phase-2-operational-dependability.plan.md` §7 decision 3, option (a)):
>
> **CI runs the non-live suite only. No Supabase or Anthropic secret enters this public repository** — the
> exfiltration argument is `docs/reviews/phase-0-plan-review.md` §P-03. **The `[LIVE]` half is an
> owner-run local baseline**, run by the procedure in "To finish U17" below and appended to §1 as a second
> dated run.
>
> **This changes who runs it, not whether it counts.** The seven items above remain the entry condition
> verbatim; none is waived, and no live figure may be recorded until they are met on a real machine. What
> is now settled is that waiting for them to arrive **in CI** is waiting for something that has been
> decided against — so the live baseline's blocker is **scheduling on the owner's machine**, not a missing
> capability. A CI E2E job over the credential-free specs is still achievable and is Phase 2 unit U22.

### To finish U17

```bash
# 1. point at a live Supabase project (names only shown; never commit values)
export NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=...
export SUPABASE_SERVICE_ROLE_KEY=... API_ANTHROPIC_KEY=...

# 2. apply migrations 0001-0007 to that project, then seed the demo user
npm run db:seed

# 3. run the live suite (serialised automatically by U16 — do NOT add --workers)
E2E_LIVE=1 npx playwright test --reporter=list
```

Then append the result to §1's table as a second dated run. Do not overwrite the non-live baseline: the
two measure different things and both are worth keeping.

### A separately-fixable blocker, now cleared

The first attempt failed 36 specs on `browserType.launch: Executable doesn't exist at …
chromium_headless_shell-1223`. The cache held `chromium-1234` — **newer** than the pinned
`@playwright/test` wanted, not older. Resolved with `npx playwright install chromium` (92.4 MiB, Chrome
Headless Shell 148.0.7778.96) with the owner's explicit approval before downloading.

Worth noting because of how it presented: a missing browser binary makes **every** browser-based spec
fail at once, which looks exactly like a catastrophic application regression until you read the error.
A fresh clone will hit this.

---

## 3. The `fetch failed` login artifact (T-14) — **investigated; the review's reading is confirmed and sharpened**

**The artifact itself is gone.** `test-results/mvp-core-loop-e2e-…/error-context.md`, dated 2026-07-30,
is no longer on disk. It was never recoverable from git either: `test-results/` was untracked in
`bf7ff2e`, and the only file ever tracked under it was `.last-run.json` — the `error-context.md` was
never committed.

**I have to state plainly that my own runs may have destroyed it.** Playwright clears `test-results/` at
the start of every run, and I ran the suite several times while verifying U16 before thinking to look
for the artifact. I cannot show it was already absent, and I am not going to claim it was. The evidence
that survives is the text quoted in `docs/reviews/mvp-transition-check.md` (T-14) and
`docs/project-status.md`, which is what the analysis below works from. **Lesson: an artifact cited as
evidence in a review must be copied into `docs/` at the moment it is cited.** Untracked, it is one test
run away from gone — logged as a follow-up.

### What `fetch failed` actually proves

Login is a **server action** (`src/lib/auth/actions.ts` → `login()`), not a browser call. It builds a
server Supabase client and calls `signInWithPassword`; on error it returns `error.message`, which
`AuthForm` renders into `<p role="alert">`. So the artifact's `alert: fetch failed` is **Node's undici
error text from the Next server**, not the browser's.

That distinction is decisive, and it is testable without credentials. Both modes were reproduced
directly (2026-08-05, `@supabase/supabase-js`, no live project involved):

```
MODE A (env unset)        -> Supabase is not configured […]
MODE B (host unreachable) -> fetch failed
```
*(Mode A is truncated at the `[…]`; `getSupabaseEnv()` throws the full sentence "Supabase is not
configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example)." Mode B
is verbatim and complete — it is the string that matters here.)*

- **Mode A** is what `getSupabaseEnv()` throws when `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` are
  missing. It is a *different string*.
- **Mode B** — env set, host not reachable — reproduces the artifact's string **exactly**.

**Therefore, on 2026-07-30: the Supabase env vars WERE set, and the configured Supabase host was
unreachable.** Not a missing `API_ANTHROPIC_KEY`. Not unconfigured env. A dead or unreachable Supabase
endpoint — most plausibly a free-tier project paused for inactivity, a deleted project, or no egress at
run time.

**Verdict on T-14: upheld.** The prevailing account ("the live suite is fine apart from the Anthropic
key") was not merely unverified — it was wrong about the failure mode. The Anthropic key gates the
advisor specs only; the artifact recorded the *login helper* failing, which gates all 30 live tests. Its
severity was understated, not overstated.

---

## 4. Superseded figures

Per §7 (never delete historical rationale), the contradicted figures are struck through rather than
removed **in `docs/roadmap.md` item 7**, which is where they were being cited as current.

Two other occurrences are deliberately left as they stand, because §7 forbids rewriting the historical
record and both are exactly that:

- `docs/reviews/mvp-transition-check.md:278` — the dated review that told us to stop citing them.
- `docs/01-plan/features/context-adjusted-evidence.plan.md:370` — a 2026-07-16 Draft whose decision log
  records `full suite 61/71` as what was believed **then**. Editing it would falsify the record of a past
  decision.

So "struck through everywhere" would be untrue, and is not claimed. What *is* claimed is narrower and
checkable: no document presents either figure as a current measurement.

- ~~61/71~~ — no command in this repository reproduces it; no dated record of how it was obtained.
- ~~79/10~~ — likewise. It also disagrees with the current total: the suite is **89** tests in 23 files,
  and 79 + 10 = 89 is arithmetically suggestive but unverifiable, since no record says what the 10 were.

Neither figure should be cited again. **The citable baseline is §1: 59 passed / 30 skipped / 0 failed,
non-live, at `4246044`, 2026-08-05.** It carries the command, the commit, the timestamps and the
per-spec breakdown, so a reader can re-run it and get the same answer — which is the only property that
made it worth writing down.
