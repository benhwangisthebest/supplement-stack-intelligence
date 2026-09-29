# p4-u4-guard-reach — PDCA cycle artifact for Phase 4 U4

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U4**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U4 · Guard reach · **SUPERVISED** · deterministic · size M · **Anchor** `86cbe6d` · **Date** 2026-09-29
> **Rulings in force:** P-04 (FU-31 retargeted to the taint model) · §2.3 · RC-1 (no new `src/architecture` spec;
> SPEC_COUNT 30) · RC-2 (probes and reviewer on a scratch copy; restore by copy + `cmp`) · RC-3 (CI ≤ 20 × 60 s).
> **Planned stop:** the login and signup copy (owner batch). **Spend:** none. No probe was run.

## 1. Plan

**Goal (the brief's):** make error-disclosure see destructured Supabase errors, replace the two leaking auth sites
with owned copy, bind probe request bodies to `src/`, and make the env loader warn on a populated file matching zero
keys. **Retires:** FU-31, FU-35, FU-37 (with its stated limit), N-26.

**May touch, as used:** `src/architecture/error-disclosure.test.ts` · `src/lib/auth/actions.ts` + new
`actions.test.ts` · `src/lib/safety/index.ts` (`authCopy`) + `safety.test.ts` (sweep input) · `scripts/probes/**`
(new `advisor-fixture.ts`; `load-env.ts`, the env loader; both probes) · **`src/architecture/first-party-base-url.test.ts`,
the existing spec that hosts AC-3, AC-4's test and AC-5's test** (it already inventories the probes; vitest's
`include` is `src/**/*.test.ts`, so a test under `scripts/` would not run, and RC-1 rules out a new spec) · the
phase-4 plan · the decision queue · this file.

## 2. Design

**AC-1, a second taint source.** Supabase returns `{ data, error }` instead of throwing, so the text that reached the
browser at `actions.ts:27,44` never passed a catch clause. A declaration destructuring `error` out of an **awaited**
value seeds the existing walk over its enclosing block, with forms prefixed `result-`. Two forms apply to this source
only: the whole object as a server action's `return` (a `"use server"` module or function, where the return **is** the
response), and the whole object inside `NextResponse.json`/`Response.json`. Reading `error.code` is clean.
*Measured first:* with the `return` form unscoped, `src/lib/advisor/actions/__testing__/fake-stack-db.ts:104,109`
(a test double imitating Supabase) went red. Narrowing the pathspec would be a guard weakening, so the form was
scoped to server actions instead. Stated limits (in the file header): `r.error.message` off an undestructured result,
a `.then(({ error }) => …)` callback, a synchronous `{ error }` (zod's `safeParse`, pinned as a self-test), and taint
crossing modules.

**AC-2, owned copy.** `authCopy` in `src/lib/safety` (no auth-copy module existed; the two local strings move there
unchanged). Login returns `loginFailed` for every provider error. Signup maps `error.code` through
`SIGNUP_SAFE_COPY` (`weak_password`, `email_address_invalid`) and everything else to `signupFailed`.
`validation_failed` stays generic on purpose: it is not specific to the address's format.
**Assumed, not verified:** that the provider rejects `weak_password`/`email_address_invalid` before its account
lookup. No provider source was read and no live call made (spend rule). The reviewer was asked to test this.

**AC-3, PROBE_BODIES_FROM_SRC.** Over every tracked `scripts/probes/*.ts`: each `fetch` body must be
`JSON.stringify(f(…))` with `f` imported from `@/…`; no file may `JSON.stringify` an object or array literal; `fetch`
options that are not an inline object are reported. Anti-vacuity: ≥ 2 bodies seen.
**Option (b) was removed from the lab-import probe.** `/v1/ocr` 404'd at api.openai.com on both fixtures
(`docs/05-qa/2026-09-18-u31-openai-probe-record.md` §3), U32 pins the probes to that host, and its body was the only
hand-written one. There is no production builder to import, and putting a guessed body in `src/` would ship
non-production code. Queued as **Q-12** so the owner can reverse it.

**AC-4, the loader warning.** `loadProbeEnv` sets `warning` and prints it to stderr when the file parses to ≥ 1
setting and none is `OPENAI_*`. It prints a count, never a name or value.
**FU-37's recorded limit, restated:** the observed N-57 case would **not** have been caught. Three keys matched, and
`OPENAI_BASE_URL` was glued onto the end of `OMNIROUTE_MODEL`'s value. A test pins that case as silent. The stronger
check the record names (a known setting name inside another setting's value) is **not built**: **FU-80**.

**AC-5, N-26 made answerable.** N-26's own remedy (`phase-2-operational-dependability.plan.md:581`): *"the fixture
must carry answerable content (a plausible interaction finding with a citation), so an empty answer means
something."* `scripts/probes/advisor-fixture.ts` runs the **real** `checkInteractions` handler over the existing
synthetic `makeContext()` user, with zinc added. The result carries the seeded `magnesium--zinc` finding and its rule
citation, which answer `TOOL_BAIT`. Nothing is authored, so §2.2 rule 8 holds. The probe never prints it.
`answersBait` requires `ok`, a finding pairing the two bait ids, and citations that are all seeded rule ids.
Checked in-process: no network, no OpenAI call, no probe run.

## 3. Red evidence (scratch worktree at `86cbe6d`, RC-2; every plant restored by copy, `cmp` OK)

| # | What | Result |
|---|---|---|
| R1 | **AC-1, HEAD is the red case:** only `error-disclosure.test.ts` changed, HEAD's `actions.ts` | red, exactly `actions.ts:27 [result-property-access]` and `actions.ts:44 [result-property-access]`; nothing else |
| R2 | AC-2: new `actions.test.ts` vs HEAD's `actions.ts` | 15 of 20 red; the 5 green are the local pre-checks, both redirects, and the distinct-strings check, which HEAD already satisfied |
| R3 | AC-3: new guard vs HEAD's probes | red at `openai-advisor-probe.ts:247` (N-26's line) `[inline-literal]` and `openai-labimport-probe.ts:211` (`/v1/ocr`) `[body-not-built-in-src]` `[inline-literal]` |
| R4 | AC-4: new tests vs HEAD's `load-env.ts` | the zero-match warning test red |
| M1 | AC-1: plant `if (error) console.log(error.message);` at `src/lib/db/advisor-action-repo.ts:60` | red, `[result-property-access]` |
| M2 | disable the new seed (`false &&` on the await check) | 8 self-tests red |
| M3 | inline body in the advisor probe's step 1 | red, `:146` both forms |
| M4 | remove the loader's zero-match condition | warning test red |
| M5 | fixture reverted to N-26's literal | `answersBait` test red |
| M6 | review fix: quoted/computed `body` key and spread options ignored again | 3 new self-tests red |
| M7 | review fix: `toString()` / `JSON.stringify(err)` forms disabled | 4 new self-tests red |
| M8 | review fix: signup lookup back on a plain object | the `"constructor"` code test red |

Two `it(` titles changed (error-disclosure's main rule, safety's sweep); both widen what they cover. No test was
deleted, no pathspec narrowed, and no allowlist grew. Per-file counts: error-disclosure 31 → 48,
first-party-base-url 6 → 26, safety unchanged, `actions.test.ts` new (21).

## 4. The copy (owner batch: STOP)

Shown verbatim to the owner on 2026-09-29, before staging (queue **Q-11**). **APPROVED 2026-09-29 (owner), with one amendment:** *"Approved, 2026-09-29 (Q-11), with one amendment: signupWeakPassword: \"That password isn't strong enough. Try a longer, less common password.\" loginFailed, signupInvalidEmail, signupFailed (without the \"sign in\" clause), missingFields, passwordTooShort: exactly as shown. Q-12: approved: option (b) /v1/ocr removed from the lab-import probe."*

| Key | When | Proposed text |
|---|---|---|
| `missingFields` | email or password empty (local; moved unchanged) | Email and password are required. |
| `passwordTooShort` | signup, < 8 characters (local; moved unchanged) | Password must be at least 8 characters. |
| `loginFailed` | every login failure from the provider | We couldn't sign you in with that email and password. Check them and try again. |
| `signupWeakPassword` | signup, `weak_password` | ~~That password isn't strong enough. Try a longer one, or add numbers and symbols.~~ **As amended by the owner:** That password isn't strong enough. Try a longer, less common password. |
| `signupInvalidEmail` | signup, `email_address_invalid` | That doesn't look like a valid email address. Check it and try again. |
| `signupFailed` | every other signup failure, "already registered" included | We couldn't create an account with those details. Please try again. |

`signupFailed` first ended *"…, or sign in if you already have an account."* The review (advisory 1) showed that for a
well-formed request the generic branch is almost always "already registered", so the clause would state the oracle
aloud. It was dropped before the owner saw the proposal; the owner may restore it.

## 5. Review (AC-7)

Fresh `ecc:security-reviewer`, read-only, on the scratch copy; inputs: the U4 row, the diff, the owner direction.
**Verdict: PASS WITH ADVISORIES, nothing BLOCKING.** It ran the four affected suites (96/96) and `tsc`; its reach of
`:27/:44` was by inspection (R1 is the executed proof). **Answer to the question:** login reveals nothing through
text, status or our branch timing. Signup's text reveals nothing beyond the two translated codes. **Signup's outcome
does:** success vs failure is an existence oracle unless the provider's email confirmation is on → **N-112**.
1. `signupFailed`'s sign-in clause states the oracle → **dropped** (§4).
2. the success/failure oracle and the unrecorded provider setting → **N-112**, **closed as mitigated at the provider**
   on the owner's dashboard record of 2026-09-29 (Confirm email ON; minimum length 8). Provider config is owner-held.
3. an inherited key (`"constructor"`) could return a function → **fixed**, `Map` + test (M8).
4. `err.toString()`, `JSON.stringify(err)` unflagged → **fixed** for both sources (M7); `new Response(…)` and wrapper
   helpers → **stated as a limit** in the header.
5. quoted/computed `body`, spread options, `.mjs` probes unscanned → **fixed** (M6; the scan now takes every JS/TS
   extension); aliased or `globalThis.fetch` and a shadowing local → **stated as limits**.
6. the warning fires on any file with no `OPENAI_*` key → **accepted**: with no `OPENAI_*` in the file, a probe either exits 1
   (`requireConfig`) or runs on shell values while the file is stale, and a stale file is what the warning is for.

## 6. Gate

**G on the staged tree** (13 files, all inside *May touch*), in a clean worktree at `86cbe6d` with the staged patch
applied (byte-identical to `git diff --cached`) and a fresh `npm ci`, 2026-09-29: typecheck clean · lint 430 of 430,
0 errors · vitest 1980/1980 across 150 files · AC-6: `src/architecture` 30 specs + `src/lib/auth`, 539/539 ·
`test:coverage` green, no floor edited · `next build` OK · `verify:rendering` OK · `verify:bundle` OK (largest move
+1 B, `/stack-lab/[stackId]`) · E2E non-live 70 passed / 30 `[LIVE]` skipped. This paragraph was added after that
run; the docs-only change was re-checked with `src/architecture` and lint. Commit and CI run ids: bkit notes and
the landing report.
