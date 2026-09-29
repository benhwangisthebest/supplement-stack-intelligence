# p4-u12-live-run-guards — PDCA cycle artifact for Phase 4 U12

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U12**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U12 · Live-run and server guards · **RUNNER** · deterministic · size S · **Anchor** `39fd568` · **Date** 2026-09-29
> **Authority:** the standing approval in plan §6 D-1 runner specification item 1; caps of 300 calls / 4 h (item 8).
> The owner's runner clarifications RC-1…RC-5 (2026-09-29) and PARALLEL MODE are in force. The runner records no ruling.
> **Opening check:** main CI run `36633801337` read once: `completed / success` on `39fd568…`.

## 1. Plan

**Goal (the brief's):** guard the live-E2E serialisation and settle N-32's stale-server substitution. **Retires:** FU-25's
guard half (isolation stays with D-9) and N-32.
**May touch:** `src/architecture/e2e-live-tagging.test.ts` (extended; RC-1, no new spec, SPEC_COUNT stays 30) ·
`playwright.config.ts` (AC-2 needs a value change) · the plan's U12 row and the FU-25 · N-32 row · the decision queue ·
this file.

## 2. Design

**Evaluate the config; don't grep it.** Both guards import `playwright.config.ts` afresh under a stubbed environment
(`vi.stubEnv` for all four variables the config reads, then `vi.resetModules()` and a dynamic import) and assert on the
object Playwright would receive. A rewritten expression that keeps the value passes, and any spelling that changes it
fails. Every load sets all four variables, so the ambient `CI=true` of the CI job cannot leak in. The repo-wide
`unstubEnvs: true` restores them after each test.

**LIVE_SERIAL (AC-1).** Over four live environments (`E2E_LIVE=1` × `CI` unset/`true` × `PLAYWRIGHT_NO_SERVER` unset/`1`):
`workers` is exactly `1` and `fullyParallel` is exactly `false`. One `it` per setting, so the red test's title names
the setting. An absent `fullyParallel` fails too: the config must state it, not inherit Playwright's default.

**SERVER_REUSE (AC-2, N-32).** With `CI` unset, live and non-live, every `webServer` entry has
`reuseExistingServer === false`. An anti-vacuity rule requires a `webServer` to exist when `PLAYWRIGHT_NO_SERVER` is
unset, because with none the reuse rule checks nothing. A loader self-test loads twice with different
`PLAYWRIGHT_BASE_URL` sentinels and requires both to come back, so a cached module cannot answer the whole matrix
with one environment. A second self-test, added on the reviewer's advisory (§5), reads the config through the shared
string-aware `stripComments` (FU-47). It requires every `process.env.NAME` the config reads to be in the stubbed list,
and it refuses any other `process.env` access form. Without it, a config reading an unstubbed variable
(`workers: LIVE && !process.env.PW_FAST ? 1 : 4`) passed both guards on whatever the ambient environment held.

**The value change.** `reuseExistingServer: !process.env.CI` → `false`. CI already ran with `false`
(`ci.yml:285` says so), so CI's behaviour is unchanged. Locally, an occupied port now fails the run before any test.
Before, whatever answered on the port was trusted in place of the build. Using an existing server is now an explicit
choice, `PLAYWRIGHT_NO_SERVER`. N-32 proposed two sufficient fix shapes: (a) verify the reused server is a production
build, or (b) a dedicated port. The brief's shape, never reuse, removes the reuse path that both of them were fixing.
The residual N-32 names, honesty about which app was measured, is now stated at the one opt-out, in the config comment.

**Not computed:** a command-line override (`--workers=4`, `--fully-parallel`) beats the config, and no repository file
can bind a flag someone types. Nor does the guard check which server a `PLAYWRIGHT_NO_SERVER` run measured. On that
path it asserts serialisation only.

## 3. Do — red proofs

All mutations ran on a scratch worktree at `39fd568` with the unit's two files copied in and `node_modules` symlinked (RC-2).
Each was restored by `cp` from a saved original and checked with `cmp` (all eight restores `cmp` clean). None ran in the repo.

| # | Mutation of the scratch copy | Result (spec: 16 tests) | Red test · message |
|---|---|---|---|
| R0 | none. The unit's spec against **HEAD's** config (`!process.env.CI`), in the unit worktree | 1 failed / 15 passed | *sets reuseExistingServer: false whenever CI is unset* · "gives \`reuseExistingServer\` = true under E2E_LIVE=(unset) CI=(unset) …" |
| M1 | delete `workers: LIVE ? 1 : undefined,` | 1 failed / 15 | *sets workers: 1 whenever E2E_LIVE=1* · "gives \`workers\` = undefined" |
| M2 | delete `fullyParallel: !LIVE,` | 1 failed / 15 | *sets fullyParallel: false whenever E2E_LIVE=1* · "gives \`fullyParallel\` = undefined" |
| M3 | `workers: LIVE ? 2 : undefined` | 1 failed / 15 | *sets workers: 1 …* · "= 2" |
| M4 | `fullyParallel: true` | 1 failed / 15 | *sets fullyParallel: false …* · "= true" |
| M5 | **planted `reuseExistingServer: true`** | 1 failed / 15 | *sets reuseExistingServer: false whenever CI is unset* |
| M6 | HEAD's `reuseExistingServer: !process.env.CI` restored | 1 failed / 15 | *sets reuseExistingServer: false …* |
| M7 | `webServer` made `undefined` | 1 failed / 15 | *defines a webServer when PLAYWRIGHT_NO_SERVER is unset* · "no webServer" |
| M8 | spec: delete `vi.resetModules()` | 1 failed / 15 | *loads the config afresh … (loader self-test)* |
| M9 | `workers: LIVE && !process.env.PW_FAST ? 1 : 4` (spec now 17 tests) | 1 failed / 16 | *stubs every environment variable the config reads* |
| M10 | `reuseExistingServer: !!process.env["PW_REUSE"]` | 1 failed / 16 | *stubs every environment variable …* (bracket form refused) |
| M11 | `reuseExistingServer: !!process.env.PW_REUSE` | 1 failed / 16 | *stubs every environment variable …* |

M8 shows why the first self-test is there. Without the module reset, both LIVE_SERIAL rules and the reuse rule still
passed, and the self-test was the only red. M9 was the reviewer's evasion. Before the second self-test it passed 16/16.
M9–M11 ran on the same scratch worktree, from a fresh saved original, and every restore was `cmp` clean.

**Green:** 16/16 in the unit worktree, then 17/17 after the second self-test. The same 16/16 held under ambient `CI=true`, ambient `E2E_LIVE=1`, and ambient
`CI=true E2E_LIVE=1 PLAYWRIGHT_NO_SERVER=1`. The loader's stubs win.

**Behaviour probe (not a guard; records what `false` does).** On the scratch copy, a node HTTP server was put on `:3917`
and the suite was pointed at it (`PLAYWRIGHT_BASE_URL=http://localhost:3917 npx playwright test tests/e2e/library.spec.ts`):
`Error: http://localhost:3917 is already used, make sure that nothing is running on the port/url or set
reuseExistingServer:true in config.webServer.`, exit 1, no test run. The only network use was on localhost.

**Per-file counts** (`grep -oE '\b(it|test|describe)\('`, which also counts the fixture strings; a plain `grep -oF 'it('`
reads 2 higher on both sides, because `.split(` matches too) in `src/architecture/e2e-live-tagging.test.ts`: before
`it(` 11 · `test(` 8 · `describe(` 8 → after `it(` 17 · `test(` 8 · `describe(` 10. None lower. No other test file changed.

## 4. Check

- **AC-1:** met. LIVE_SERIAL, M1–M4.
- **AC-2:** met by the guard, the preferred branch. SERVER_REUSE, R0, M5–M7, plus the value change above.
- **AC-3:** `CLAUDE.md:209-210` is now stale. It was not edited. Queued as **Q-4** with the exact replacement text.
- **Stop classes:** none hit. No live call, spend, migration, `CLAUDE.md`/roadmap/product-direction edit, `package.json`,
  `src/types/**`, id ledger or workflow change. No guard weakened: two describes and six `it`s added, nothing removed.
- **Debt named, not absorbed (§8 rule 1):** `README.md:46-57` lists `npm run dev` and `npm run test:e2e` side by side and
  never mentions `PLAYWRIGHT_NO_SERVER`. Running both together now fails fast, which is intended, but the README does not
  say how to test a server you started yourself. `README.md` is outside *May touch*. Left for a docs follow-up; no id
  assigned, because the runner does not issue register ids.

## 5. Act — landing record

- **Independent review (item 6):** a fresh subagent, on a scratch worktree at `39fd568` with the diff applied, and denied
  this session's record. Verdict **PASS WITH ADVISORIES**, nothing blocking. It re-ran R0, M1, M2, M5, M6 and M8, and each
  matched this file. Its own mutations: a `webServer` array, `workers: "100%"` and `LIVE = E2E_LIVE === "true"` were all
  caught. A project-level `fullyParallel: true` was not caught, and it is harmless because the global `workers: 1` caps
  it (Playwright 1.60 `test.d.ts:725-744`). An unstubbed env read was **not** caught. Full suite 1888/1888 · tsc 0 ·
  lint 426/426. **Advisories and their disposition:** (1) unstubbed env read → fixed, the second self-test, M9–M11;
  (2) README → named above; (3) this file's count method → corrected in §3; (4) the U12 row's `:37-38` → now also cites
  `:40-41`; (5) Q-4's replacement started mid-sentence and paraphrased the FU-25 sentence instead of striking it → fixed.
  The replacement now strikes both sentences and is delimited by « ». The reviewer did not see the fixes.
- **G, branch CI, landing:** not written here. Recording them would change the tree G measured. They are in the unit's
  bkit entry and the report back.
