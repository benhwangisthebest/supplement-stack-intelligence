# Project Status

> **Status:** Active. Describes the repository's *actual* condition, not its intended design.
> **Assessed:** 2026-07-30, by an independent five-reviewer MVP-transition review.
> **Refreshed:** 2026-08-02 at Phase 0 close, again 2026-08-03 when the closeout record was converged,
> and again **2026-08-06 at Phase 1 close**. Sections §0, §1.1, §2.4, §2.5, §2.6, §2.8, §2.9, §6 and §7
> carry measured updates; the 2026-07-30 findings are retained beside them rather than deleted
> (`CLAUDE.md` §7). Where a row is superseded it is marked with the date that superseded it — the current
> marker is **[2026-08-06]**; **[2026-08-02]** marks the Phase 0 pass. Measurements are dated where they
> appear rather than pinned to a tip SHA here — a single pinned baseline in this header went stale twice.
> *(This header itself went stale a third time: it still described only the Phase 0 pass after the Phase 1
> sync had edited §2.4, §2.5 and §6. Caught by the closeout Check as finding P1-2.)*
> **Rule:** Existing code is evidence of current state, **not** automatically the intended final design.
> Nothing below is labelled production-ready without stated evidence.

---

## 0. Verification baseline (measured 2026-07-30)

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | **Clean**, exit 0 |
| Unit tests | `npx vitest run` | ~~**408 passed / 408**, 39 files~~ → ~~**[2026-08-02] 524 passed / 524, 42 files**~~ → **[2026-08-06] 859 passed / 859, 73 files** |
| Production build | `npx next build` | **Succeeds**; 15 Library pages prerendered (SSG) |
| Migrations | `supabase/migrations/` | 7 files, `0001`–`0007` |
| E2E (default run) | `npx playwright test` | ~~~33 of 89 tests execute~~ → **[2026-08-06] 59 passed / 30 skipped / 0 failed** of 89, against a production build; every skip is `[LIVE]`-tagged (`docs/05-qa/phase-1-live-e2e-baseline.md`) |
| CI | — | ~~**None.** No workflow files anywhere~~ → **[2026-08-02] GitHub Actions `CI` exists and is green** on `main` @ `1792f9f` ([run 30744203782](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30744203782)): `npm ci` → typecheck → `vitest run` → `next build`. **[2026-08-03]** now a **required** status on `main` (`typecheck / test / build`), with force-push and deletion forbidden by ruleset `main-integrity`; ~~`enforce_admins: false`~~. **[2026-08-06]** a fifth blocking step was added between `vitest run` and the build — `Coverage thresholds` (`npm run test:coverage`, per-engine floors, Phase 1 U13). **[2026-08-08] `enforce_admins: true`** — the required check binds the admin; residual is that an admin can reconfigure the protection. |
| Lint | `npm run lint` | **Enforces nothing** — no ESLint dependency, no config |

**[2026-08-02] Coverage scope was widened** in `8b1bd16`: `include` is now `src/**/*.{ts,tsx}`. Measured
at `1792f9f` and re-measured at Phase 0 close with `npx vitest run --coverage` (read the `All files`
row): **[2026-08-06] 201 files, 55.46 % statements · ≈ 84.9 % branches · 77.75 % functions** repo-wide
(~~2026-08-02: 200 files, 47.68 % · ≈ 81.2 % · 69.85 %~~ — Phase 1's ~335 new tests moved all four).
Statements, functions, lines and the file count are stable run to run; **branch coverage is not** — it
varies about ±0.02 pp because v8 attributes branches in
`src/lib/protocol-builder/rules.ts` differently depending on worker scheduling. The suite is **[2026-08-06]
859/859** green on every run; this is a measurement artifact, not a flaky test. Cite the range, not a decimal.
Six of
the **seven** top-level `src` directories appear in the report — `src/architecture` holds only `*.test.ts`,
which `coverage.exclude` drops; it is still a governed layer under §4.6, which counts all seven.
~~Visibility only — the sole threshold remains `src/lib/stack-evaluator/**`.~~ **[2026-08-06] No longer
visibility-only: coverage is a CI gate.** Phase 1 U13 configured floors on **14** pure-engine directories
in `vitest.config.ts` (each `measured − 10`, with `branches` omitted where D-2's jitter applies) and added
a blocking `Coverage thresholds` CI step. The paragraph below described
the pre-`8b1bd16` state and its central warning still stands: a green suite is not a verified product.

**Read the green suite carefully.** 408/408 does *not* mean the product is verified. Coverage is
configured to measure `src/lib/**` only, so `src/app/api/**`, `src/services/**`, and
`src/components/**` are invisible to the report rather than covered. Vitest's `include` is
`src/**/*.test.ts` — **`.tsx` test files are silently never collected.** See §2.9.

---

### 0.1 Public-history caveat — **[2026-08-02]**

**Untracking is not removal.** `30f74e1` is an ancestor of `origin/main` and still contains
`.bkit-memory.json`, `.bkit/audit/*`, `.bkit/state/*`, and `test-results/.last-run.json`. Untracking those
paths at `bf7ff2e` did not delete them from history — they remain **permanently fetchable** from the
public remote by anyone who clones.

The decision not to rewrite history is deliberate. An independent full-history scan of every commit found
**no secret values on any ref**; `.env`, `.env*.local`, `storageState*.json` and `*.auth.json` were never
tracked. The reconstructed artifacts hold PDCA metadata, tool audit logs and session bookkeeping — no
credentials, no health data. **No rotation is required.** `CLAUDE.md` §10.4 forbids rewriting the
validated v2–v13 chain, and a rewrite would discard the only integrated state to remove content already
known to be harmless. Recorded here so the choice is visible rather than implicit. Full detail:
`docs/04-report/phase-0-integration-enforcement.report.md` §4.

---

## 1. Repository shape

- The git repository root **is** the application directory, at
  `/Users/<redacted>/Developer/supplement-stack-intelligence`. It holds the
  authoritative `CLAUDE.md`, `docs/`, `src/`, `supabase/`, `tests/`, and `.bkit/`. The `graphify-out/`
  knowledge graph lives at `graphify-out/` **inside** the repository root but is **gitignored** as a
  generated artifact (U1, commit `4337a24`) — so it is absent from a fresh clone until regenerated.
- **The legacy clone is retired, not active.** `…/Supplement-Advisor/RETIRED-v1.0` (renamed from `v1.0`
  on 2026-08-02) is the pre-relocation copy. Its git remote was removed, so it can no longer push
  anywhere; its files were left untouched. It is **not** this repository and holds no authoritative
  content. Background: closeout finding **C-2** and `docs/04-report/phase-0-integration-enforcement.report.md` §2.
- Stack: Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind, Supabase (Postgres + Auth),
  ~~Anthropic SDK~~ **OmniRoute** (self-hosted OpenAI-compatible AI gateway, reached over plain HTTP —
  Phase 2 U25, 2026-08-10; `@anthropic-ai/sdk` is no longer a dependency), Zod. Vitest + Playwright. No ORM (deliberate — hand-written repos so RLS does tenant
  isolation). No linter, no formatter. **[2026-08-02]** CI now exists (typecheck + unit tests + build).
- **Measured 2026-08-03** (tracked files, `git ls-files | xargs wc -l`): 13,831 LOC `src/lib`, 5,518
  `src/components`, 2,863 `src/data`, 1,906 `src/app`, 1,308 `src/types`. A point-in-time measurement —
  expect drift.
- Exactly **one** `TODO` in the whole source tree (`src/types/stack.ts:56`).
- No import cycles (independently confirmed via `graphify-out/GRAPH_REPORT.md`).

### 1.1 Git state — the most urgent non-code risk

> **[2026-08-02] RESOLVED IN FULL by Phase 0.** Every row in the table below is now false, and that is the
> point of Phase 0. Measured: `main` @ `1792f9f` == `origin/main`, **0 ahead / 0 behind**; history linear
> with **zero merge commits**; the layering guardrail and the v13 anti-fabrication guards are committed
> **and pushed**; working tree clean. **As measured on 2026-08-02**, the four `fix/*` remediation branches
> and nine `feat/*` branches were all intact on `origin`, and no branch had been deleted, no tag created,
> no history rewritten. (Deleting *merged* branches at Phase 0 close is a separate approved step under
> `CLAUDE.md` §10.1; it removes labels only and rewrites no history. The end state is recorded in
> `docs/05-qa/phase-0-final-check.md`.)
>
> The table is retained unedited as the record of what Phase 0 was called into existence to fix.

| Fact | Evidence |
|---|---|
| `main` is still at **MVP v1** | `git log main` = 2 commits (`910d773`, `30f74e1`) |
| `main` is **15 commits behind** the working tip | `git rev-list --count main..HEAD` (was 14 before Phase 0 U1 added `4337a24`) |
| The 10 feature branches are a **single linear chain**, not parallel work | Each was created by `checkout` at the previous branch's tip; zero divergent merge bases |
| The boundary-enforcement work **is committed** as `d9fc1ef` — but **unpushed** | `git log --diff-filter=A -- src/architecture/boundaries.test.ts` → `d9fc1ef`; local ref `d9fc1ef` ≠ `origin` ref `d89cf1c` |
| v13 `evidence-disclosure` is the **only genuinely uncommitted** milestone | `git status` — `seed-papers.ts`, `types/paper.ts`, `validation/seed.ts` + UI modified; `seed-integrity.test.ts` and `IllustrativeDatasetNotice.tsx` untracked |
| Branch labels misdescribe contents | v11 `side-effect-engine` was committed *after* v12 onto the v12 branch; no `v11` branch exists |

**Important correction to an intuitive reading:** this is **not** a merge-conflict problem.
Because the history is linear, `main` can `merge --ff-only` to the tip with **guaranteed zero
conflicts**, and the integrated state is already validated — it is what §0 was measured against.

The real risks are different and sharper:

1. **The two highest-leverage guardrails exist only on this machine — for two different reasons.**
   `src/architecture/boundaries.test.ts` (layering) is **committed** in `d9fc1ef` but **not pushed**, so it
   is lost if the working copy is lost. The v13 anti-fabrication guards in `src/data/seed-integrity.test.ts`
   are **not even committed** — they exist only as an untracked file. The second case is the more fragile:
   an uncommitted file has no git object at all.
2. **`main` is a two-commit MVP that matches no document and no test expectation.** Anyone — human or
   agent — who clones and checks out `main` gets a codebase with no `services/`, no
   `boundaries.test.ts`, and ten missing engines. This is arguably a *larger* cause of the repo
   "reading as a prototype" than `CLAUDE.md`, because it is the default branch.
3. Ten stale labels create a false impression of parallel work, discouraging the trivially safe
   fast-forward.

---

## 2. Subsystem status

Key — **P** = production-suitable · **B** = bounded refactor required · **X** = prototype-only.

### 2.1 Knowledge base / evidence content — **X**
- **Implementation:** 15 supplements, 27 effects, 20 papers, plus interactions/food-pairings/
  biomarkers/side-effects/products as static TypeScript arrays in `src/data/*.ts`.
- **Works:** integrity tests validate internal referential consistency; Zod seed validation runs.
  `src/data/*.ts` imports **only** `@/types` — a clean leaf.
- **Incomplete:** **19 of 27 effect grades are hand-typed letters with no `evidenceProfile`**
  (verified: 8 profiles vs 27 grades). Eight are Grade A. Some carry zero papers
  (`magnesium-metabolic`: `paperIds: []`). v13 **deleted** all provenance fields because they were
  LLM-recalled and unverifiable — an honest fix leaving the evidence layer *disclosed* but still
  **ungrounded**.
- **Persistence:** none — content ships in the code bundle. Every correction is a deploy.
- **Tests:** integrity/validation only. **No test can assert a grade is correct** — no ground truth exists.
- **Risks:** the product's declared trust layer is its weakest subsystem. Grades are editorial opinion
  in a scientific frame.
- **Classification: X.** The *shape* survives; the content and its authoring format must be replaced.

### 2.2 Domain engines (`stack-evaluator`, `interactions`, `product-matcher`, `protocol-builder`, `compare`, `biomarkers`, `checkin`, `side-effects`, `identity`, `lab-trends`, `evidence-grading`, `evidence`) — **P**
- **Implementation:** pure, deterministic, DB-agnostic, with a uniform injection seam (each engine
  takes its dataset as a last parameter, defaulting to the seed).
- **Works:** genuinely. Independent review found **no** copy asserting an uncomputed fact and **no**
  evaluator rule unreachable from production — the two bug classes that shipped in v11 and were fixed.
  All 10 rules run via `ALL_RULES` → `services/evaluation.ts:49`. Affiliate-blindness is *structural*:
  `toScorable()` strips `affiliateLink` before scoring (`product-matcher/index.ts:41-46`) so the ranker
  cannot read it. Evidence supremacy is regression-tested.
- **Incomplete:** ~~three~~ **[2026-08-06] four** superseded `safetyCopy` helpers have no production callers (`labCaution`, `labSupported`, `medicationCaution`, `productReasonValue` — dead code, not a
  fabrication risk). `getBiomarker()` (`biomarkers/index.ts:151`) bypasses the injection seam.
- **Risks:** engines are tested only with hand-built fixtures; nothing binds them to real DB data.
- **Classification: P.** Materially more mature than "MVP" implies.

### 2.3 Safety layer (`lib/safety`, `advisor/safety-recheck`) — **P**
- Centralized hedged copy builders plus a `BANNED_PHRASES` sweep (`containsBannedLanguage()`) invoked
  on every model-produced string. A real code-level gate, not prose convention — the best-engineered
  module in the codebase.
- **Standing caveat:** the sweep validates **vocabulary, not truth**. It cannot catch a
  correctly-hedged false statement. This is the v11 lesson and it is permanent.

### 2.4 AI advisor (`lib/advisor`) — **B** · provider: **OmniRoute** since 2026-08-10 (U25)
- **Works — unusually disciplined:** the LLM **cannot write data**. Tools only *propose*;
  `POST /api/advisor/actions` re-loads context server-side, re-validates every proposal with Zod
  against fresh RLS-scoped data, and runs an **authoritative** `cumulativeRecheck` that hard-blocks
  (409) on any new critical flag before `executeBatch`. The system prompt is a fixed string never
  concatenated with user or DB data — no injection path into it. No tool performs network, shell, or
  file access. `claude-adapter.ts` is textbook ports-and-adapters (structural types, lazy server-only
  import, injectable client). Turn cap 5, batch cap 4.
- **Incomplete:** ~~`execute.ts` — the **sole write path** for advisor-driven mutations — has **0% unit
  coverage** (168 lines), exercised only by credential-gated E2E. Rollback failure is silently
  swallowed with no logging (`execute.ts:127-136`).~~ ~~~190 lines of orchestration/safety-gate logic live
  inside the route handler rather than a testable service.~~ **[2026-08-06] Three of these four closed by
  Phase 1:** `execute.ts` (182 lines) is at **100 % statements** via `execute.test.ts` (U10, 24 pins);
  rollback failure now calls `reportInternalError(rollbackErr, "ROLLBACK_FAILED")` (U20); and the
  orchestration was extracted to `src/services/advisor-actions.ts` (196 lines) by U11, leaving a 40-line
  transport route. ~~**Still open:** no timeout on the Anthropic call. Daily budget check is non-atomic
  (read-then-write-later), so concurrency can exceed the cap. Client disconnect neither stops the loop
  nor stops billing.~~ **[2026-08-10] All three closed** — U6 (timeout + disconnect), U4 (atomic
  reservation). The timeout is now *ours*: U25 replaced the SDK's untested `timeout` option with an
  `AbortController`, which is observable under fake timers, so finding **N-20** finally has a red proof.
- **Provider path [2026-08-10, U25]:** the advisor calls **OmniRoute**, not Anthropic — one module,
  `src/lib/omniroute/client.ts`, is the only place in `src/` that can spend money, asserted by
  `SOLE_PAID_CLIENT`. The routed **model id comes from `OMNIROUTE_MODEL` with no default in `src/`**
  (finding N-21: a hardcoded id 400'd on the first real gateway, and an unset variable would have failed
  every turn from a green suite). Live evidence: `docs/05-qa/2026-08-10-omniroute-probe-record.md`.
  **Open against this path:** N-22 — an `auto/*` alias can complete a tool loop and return an **empty**
  answer, which every safety and grounding gate passes.
- **Persistence:** conversations, messages, usage, actions — all persisted with RLS.
- **Classification: B.** Architecture sound; ~~write path needs tests, logging, timeout, extraction~~ →
  **[2026-08-06]** tests, logging and extraction are done; **timeout** and the non-atomic budget check
  are what still hold it at B (the latter is CLAUDE.md §4.9, which remains unenforced).

### 2.5 Persistence (`lib/db`, `supabase/migrations`) — **B**
- **Works:** RLS is **complete and correct** — every table across all 7 migrations has both
  `enable row level security` and a matching policy; child tables derive ownership via `EXISTS` on the
  parent stack. Server clients use the **anon key** bound to session cookies, so RLS genuinely applies
  per request. Service-role key appears only in the dev seed script, never in HTTP-reachable code.
  Schema quality is high (derived-ownership policies, `touch_updated_at` triggers).
- **Incomplete:** ~~`src/lib/db/**` has **0% executed coverage** — no test calls any mapper. **No
  contract test binds the SQL schema to `types.ts`**~~ **[2026-08-06] both closed by Phase 1.**
  `mappers.ts` is at **100 % statements** (U7, 27 row-fixture tests), and
  `src/architecture/schema-type-drift.test.ts` (U8, 23 tests) binds all 12 migration tables to their 12
  row types, totally in both directions. **The gap that remains is the repository layer:** the nine
  `src/lib/db/*-repo.ts` modules are at **0 %** and `src/lib/advisor/repo.ts` at ~37 %, exercised only
  through route tests — tracked as **FU-16**. `mappers.ts` still casts (`row.intent as StackIntent`)
  against plain `text` columns with no CHECK constraint, so *value* drift stays silent even though
  *shape* drift no longer does. `replaceFlags()` is a
  non-atomic delete-then-insert — a failed insert leaves zero flags. No migration tooling, no `down`
  migrations, no record of what is deployed; migrations are applied by hand.
- **[2026-08-02] Detection now exists.** `src/data/id-stability.test.ts` (43 tests, 9 namespaces) is
exactly the missing contract: it fails if a persisted reference ID vanishes from seed data, naming the
orphaned columns, and it fails on an unregistered new ID. The FK itself is still absent by design (seed
data is code, not a table), so the *soft-reference* description below stands — the "no detection, no
test" part does not.

- **`stack_items.supplement_id` is a soft reference with no FK.** Renaming a seed ID silently orphans
  every persisted row referencing it — a blank, unevaluable stack item. ~~No detection, no test.~~
  **Detection exists since 2026-08-02** — see the `id-stability.test.ts` note above; the missing FK is
  by design (seed data is code, not a table).
- **Classification: B.**

### 2.6 API layer (`src/app/api/**`) — **B**

> **[2026-08-10, Phase 2 U25] Both paid routes now reach OmniRoute, and there is no second provider.**
> `/api/advisor` and `/api/lab-import/extract` are the two routes `PAID_API_BUDGET` governs, derived from
> an import-graph walk rather than a hand-kept list. That marker was briefly a **union** — the package
> `@anthropic-ai/sdk` plus the module `src/lib/omniroute/client.ts` — while the halves landed separately;
> it has **collapsed back to the single module marker**, which is the mechanical proof the last Anthropic
> import is gone, and `@anthropic-ai/sdk` left `package.json` in the same commit.
> **Lab-timeline PDF extraction (`pdf-adapter.ts`)** no longer sends an Anthropic `document` block: a PDF
> travels as an OpenAI **`file` content part** with a base64 data URL — decision **7B**, ruled from live
> evidence against both a text PDF and an **image-only** one, not from documentation. `/v1/ocr` was probed
> as the fallback and answered 400, so it is not one.
> Its model id, like the advisor's, comes from `OMNIROUTE_MODEL` with **no default in `src/`** (N-21).
> One finding from that path is worth carrying: the routed model **fences its JSON**, and until `U25` added
> `stripJsonFence` a *correct* transcription answered 502 `EXTRACTION_FAILED` (**N-23**). Record:
> `docs/05-qa/2026-08-10-omniroute-probe-record.md`.

> **[2026-08-02]** Raw internal error disclosure is **resolved**. `handle()` now returns a fixed generic
> message plus an opaque correlation ID and logs the full exception server-side under that ID (`9e9e15d`,
> **R3**); four further handlers that bypassed `handle()` were fixed in `1792f9f` (**R3b**), and
> `src/architecture/error-disclosure.test.ts` enforces the rule across every tracked route. Route count is
> **23**, of which ~~20 use `handle()` at 28 call sites~~ → **[2026-08-06] 19 use `handle()` at 26 call
> sites** (the earlier pair was never re-measured after the Phase 0 fixes; corrected at Phase 1 close).
> All 23 have route tests — see §2.9.
- **Works:** **[2026-08-06] all 23 routes call `getUser()` and return 401** — ~~22–23~~, a hedge that outlived the measurement; now verified exhaustively **and enforced** by `src/architecture/auth-coverage.test.ts`. Zod
  validation on all mutation routes. Consistent `{data, error}` envelope.
- **Incomplete:** ~~**zero tests**; the directory is excluded from coverage measurement entirely. Raw
  error messages returned verbatim to clients (`respond.ts:54`) — PostgREST text can leak constraint,
  table, and column names.~~ **[2026-08-06] all three are stale.** All **23** route files have a
  `route.test.ts` (Phase 1 U1–U4); the directory is measured, not excluded — `coverage.include` is
  `src/**/*.{ts,tsx}` and `src/app/api` sits at **94.11 % statements**; and raw disclosure was fixed in
  `9e9e15d`/`1792f9f` and is enforced by `error-disclosure.test.ts` (`respond.ts:54` is now
  `validationError`). **Still open:** `handle()` dispatches on error-message *substrings*
  (`includes("not configured")`) rather than typed errors — Phase 2 F3. No rate limiting on any route,
  including the paid LLM endpoint (CLAUDE.md §4.9, unenforced). No security headers in `next.config.ts`.
- **Classification: B.**

### 2.7 UI (`src/app`, `src/components`) — **B**
- **Works:** production build succeeds; Library is SSG across 15 pages; advisor output renders as plain
  text with no `dangerouslySetInnerHTML` anywhere — no XSS surface today. Design system documented in
  `.claude/DESIGN.md` (542 lines).
- **Incomplete:** **zero component tests**, and `.tsx` tests cannot even run (see §2.9). 31 client
  components; ~~two~~ **[2026-08-06] seven** of them import from `@/lib` — **six as value imports that reach the browser bundle**, `AuthForm.tsx`'s being type-only and therefore erased at build. None imports `@/data` directly
  (`ProfileForm.tsx` → medication aliases; `StackItemRow.tsx` → `SEED_PRODUCTS` + matcher). Free at 15
  supplements; a bundle cliff at 1,000.
- **Classification: B.**

### 2.8 Observability & operations — **X (absent)**
- **[2026-08-02] Partly addressed.** `handle()` no longer discards the exception: every unexpected error
  is written to the server log as a structured record carrying a correlation ID, the public error code,
  and the error's name/message/stack/cause, with the same ID returned to the client. Non-`Error` throws
  and arbitrary `cause` values are reduced to type metadata so a thrown payload cannot be serialized into
  a log line. That is the whole of it: still **no logging library, no error-reporting service, no request
  IDs outside the error path, no log aggregation**, and no UI surface where a user can read or quote the
  correlation ID (follow-up **F5**).
- **Original finding (2026-07-30), retained:** No logging library, no error reporting, no request IDs. A
  repo-wide grep for `console.` in non-test source matches exactly one dev seed script. `handle()` catches
  every server error and converts it to an HTTP response **without recording anything**.
- **Risk:** a production incident involving a partial write or swallowed rollback would be
  undiagnosable after the fact.
- **Classification: X.** The largest operational gap.

### 2.9 Testing infrastructure — **B**
- **[2026-08-06] Updated at Phase 1 close:** **859 unit tests across 73 files** (was 524/42 at Phase 0
  close). **Seven** executable architecture specs, not two: `boundaries.test.ts` (**36**),
  `error-disclosure.test.ts` (**30**), `schema-type-drift.test.ts` (**23**), `doc-truth.test.ts` (**21**),
  `rls-coverage.test.ts` (**14**), `auth-coverage.test.ts` (**13**) and `e2e-live-tagging.test.ts` (**11**). Six of the seven derive
  their inventory from `git ls-files`, so a verdict is a property of the repository rather than of one
  working tree (`a338370`, **R1**). `src/services` and `src/data` are now scanned layers, and every
  top-level `src/*` directory must be scanned or explicitly exempted with a written reason. Reference-ID
  stability is enforced across **9** manifest namespaces (`77b3c36`, plus `ea5b270` **R2** which added
  `biomarkerRelevanceRules`). Every guard added in U7, U8, R1, R2, R3 and R3b was mutation-checked at
  execution time — shown red against the defect it targets, as `CLAUDE.md` §5.2 requires. **What is
  durably evidenced in `docs/` differs by unit:** U7/U8's matrices are tabulated by an independent
  reviewer in `docs/reviews/phase-0-closeout-check.md` §4; R1–R3b's were self-reported in-unit and are
  independently re-proved only by the final Check's re-execution
  (`docs/05-qa/phase-0-final-check.md`, reviewer R-A). See
  `docs/04-report/phase-0-integration-enforcement.report.md` §6.
- **Still true, except the first clause:** ~~coverage thresholds exist for `stack-evaluator` only~~ →
  **[2026-08-06] 14 pure-engine directories carry floors, enforced by a CI step** (U13). vitest collects `*.test.ts` only,
  so a `.test.tsx` file is silently never run; `environment: "node"` with no jsdom means component tests
  cannot run; the E2E gaps below are unchanged and E2E remains excluded from CI.
- **Original findings (2026-07-30), retained:**
- **Works:** 408 unit tests. Architecture boundaries enforced by a real compiler-API test (16 tests). A
  reachability-guard test exists (`services/evaluation.test.ts`), created in response to the v11 dead-code
  bug. `src/lib/validation/schemas.ts:146-153` makes Zod↔domain drift a *compile error* — the single
  best idea in the codebase, and worth generalizing.
- **Incomplete:**
  - Coverage `include` is `src/lib/**` only — `services`, `api`, `components` are unmeasured, not covered.
  - Vitest `include` is `src/**/*.test.ts`: **a `.tsx` test file is silently never collected**, and
    `environment: "node"` with no jsdom or Testing Library means component tests cannot run at all.
  - Coverage *thresholds* exist for `stack-evaluator` only — one MVP-era module out of ~13 engines,
    several of which emit safety output.
  - Boundary enforcement scans `src/types`, `src/components`, `src/lib` — **`src/services` and
    `src/data` are ungoverned**, despite `src/services` being a documented Application layer.
  - Domain purity (engines must not import `lib/db`/`lib/supabase`) is documented but **explicitly
    deferred and unenforced**.
  - E2E: 17 of 23 spec files are `E2E_LIVE`-gated; **every** write path (profile → stack → evaluate →
    protocol → advisor apply → check-in → lab commit) is behind that gate. The `L1/L2/L3` naming does
    **not** reliably indicate gating. ~~`fullyParallel: true` contradicts a single shared demo user whose
    seed performs destructive deletes — flaky by construction. `webServer` runs `npm run dev`, so a
    production build is never E2E-tested.~~ **Both fixed 2026-08-06 by Phase 1 U16:** live runs are
    serialised (`workers: 1`, `fullyParallel: false` under `E2E_LIVE`) and `webServer` now runs
    `npm run build && npm run start`. The gated blocks are tagged `[LIVE]` — 18 blocks across 17 files,
    enforced both ways by `src/architecture/e2e-live-tagging.test.ts`. Per-worker user isolation is still
    **not** done and remains the prerequisite for a CI E2E job.
- **Contradicting artifact:** `test-results/mvp-core-loop-e2e-.../error-context.md` (dated 2026-07-30)
  recorded the core-loop E2E failing at login with `fetch failed` — a network/auth failure, **not** a
  missing `ANTHROPIC_API_KEY`. The prior "live suite is fine apart from the API key" framing should not
  be trusted without a fresh, dated re-run. **RESOLVED 2026-08-06 by Phase 1 U17** →
  `docs/05-qa/phase-1-live-e2e-baseline.md` §3. Both failure modes were reproduced from source without
  credentials: unset env yields `Supabase is not configured`, while env-set-but-host-unreachable yields
  `fetch failed` exactly. Login is a **server action**, so the string is Node's, not the browser's.
  The artifact therefore proves the Supabase env **was** configured and the host was unreachable — the
  review's reading is upheld and its severity was understated, since the login helper gates all 30 live
  tests while the Anthropic key gates only the advisor specs. **The artifact itself no longer exists on
  disk and was never tracked in git;** a dated non-live baseline now stands in its place.
- **Classification: B.**

---

## 3. Consolidated classification

| Subsystem | Classification |
|---|---|
| `src/types` (dependency-free leaf, enforced) | **P** |
| Domain engines (`lib/*` pure logic) | **P** |
| Safety layer | **P** |
| `lib/validation/schemas.ts` compile-time conformance | **P** |
| `claude-adapter.ts` ports-and-adapters | **P** |
| Migration schema + RLS design | **P** |
| AI advisor write path / orchestration | **B** |
| Persistence repos, mappers, migration *process* | **B** |
| API layer | **B** |
| UI | **B** |
| Testing infrastructure | **B** |
| Evidence content / knowledge base | **X** |
| Content delivery (authoring format) | **X** |
| Observability | **X** |
| Release/integration process | **X** |
| `db/seed.ts` shared demo fixture | **X** |

---

## 4. Mocks, placeholders, temporary behavior — treated as permanent?

**Yes, in three places.**

1. **Hand-typed evidence grades.** Never intended as final; now load-bearing for the product's central claim.
2. **Seeded product catalog** (`seed-products.ts`, 21 products, all `affiliateLink: null`). The
   *matching algorithm* is real and production-suitable; the *catalog* is still the placeholder the
   brief described, and nothing in the UI distinguishes them.
3. **Seed-as-code as the content *authoring format*.** See §5 — the pattern is sound; the format is the shortcut.

**Correctly NOT permanent:** `advisor/mock-adapter.ts` is a legitimate, clearly-documented test double
imported only by tests. `chunkAnswer()` simulates token streaming for an honest reason (the safety gate
must run before any token leaves) and is acceptable indefinitely. `lib/interactions`,
`lib/product-matcher`, and `lib/protocol-builder` have all outgrown their "placeholder" framing.

---

## 5. Is seed-as-code actually wrong?

**No — and this is a correction to the intuitive reading.** For *read-only reference data*, seed-as-code
is defensible and arguably superior to a database: the corpus is small, versioned with the code,
diff-reviewable, compile-time typed, and its correctness is an **editorial** problem — which Git review
solves better than a CMS. Given the fabricated-citation history, reviewability matters more than
queryability. **Do not move it to Postgres for its own sake.**

The real limits, all evidenced:

- **Sync-only.** Every injection seam is synchronous. Moving to async I/O ripples through every engine
  and every server component. This is the actual lock-in.
- **Ships to the browser** via two client components (§2.7).
- **The authoring format**, not the pattern, is the shortcut — TypeScript source blocks a
  non-engineer editorial workflow, which is exactly what grounding work needs.

Bounded path: (1) finish the seam + add an ID manifest + a bundle-size assertion; (2) move the source of
truth to JSON/YAML with build-time codegen emitting the same constants — engines and types untouched;
(3) only if the corpus outgrows the bundle, load server-side and pass props to client components.
Nothing in current evidence justifies step 3.

---

## 6. Does the architecture support continued development without compounding debt?

**Yes — the shape is right and no rewrite is justified.** `src/types` → pure engines → repos/services →
routes → components is correct, cycle-free, and **[2026-08-06] all eight** boundary rules are executable
(~~three of four~~): `TYPES_NO_BARREL_CYCLE`, `TYPES_IS_A_LEAF`, `TYPES_NO_EXTERNAL_DEPS`,
`NO_UPWARD_APP_IMPORT`, `DATA_IS_A_LEAF`, `DATA_NO_EXTERNAL_DEPS`, `NO_UI_IMPORT`, `DOMAIN_IS_PURE`.

> **[2026-08-02]** The three enforcement gaps named in this paragraph are closed: `src/services` and
> `src/data` are scanned layers, and CI runs `npm test` on every push to `main` and every PR into it.
> ~~Domain purity (`DOMAIN_IS_PURE`) remains unenforced.~~ **[2026-08-05] Domain purity is now ENFORCED**
> by Phase 1 U18, as a ratchet. The paragraph is retained as written to preserve the 2026-07-30 reasoning.

What compounds debt is not the shape but **the coverage of enforcement**: ~~two layers are ungoverned,
purity is unenforced, the presentation layer is untestable-by-config, and none of it runs automatically.~~
**[2026-08-06] Three of those four are closed** — `src/services` and `src/data` are scanned layers,
`DOMAIN_IS_PURE` is enforced as a ratchet (U18), and all seven architecture specs run on every push via
CI (including a coverage gate). **The presentation layer is still untestable by config**: `include` is
`src/**/*.test.ts` with `environment: "node"`, so a `.test.tsx` cannot run — though since U13 a tracked
`.test.tsx` at least fails loudly via `HARNESS_GAP` instead of being silently skipped. Plus two
content/process issues:

1. **Content debt compounds fastest** — every feature built on ungrounded grades enlarges the surface a
   future grounding cycle must revalidate.
2. ~~**Process debt compounds silently** — with no CI and nothing merged to `main`~~ — **[2026-08-02]
   closed**: CI is green on `main`, and `main` is the working tip. It is not yet a *required* status.

---

## 7. Known risks, ranked

1. **Evidence grades are ungrounded** (19/27 hand-typed) in a product whose Library is the declared trust layer.
2. ~~**Single-machine loss risk**~~ — **[2026-08-02] closed.** All guardrails are committed and pushed.
3. ~~**`main` is a stale two-commit MVP**~~ — **[2026-08-02] closed.** `main` is the working tip.
4. **Partial observability** — **[2026-08-02]** unexpected API errors are now logged with a correlation
   ID, but nothing else is instrumented and no UI surfaces the ID (**F5**).
5. ~~**No CI**~~ — **[2026-08-02] closed for existence; [2026-08-03] closed for enforcement.** CI runs on
   every branch push and is green, and is now a **required** status on `main` with force-push and deletion
   forbidden (closeout finding **C-6**, closed — see `docs/01-plan/phase-1-verification-integrity.plan.md`
   §8.5–8.6). ~~Residual: `enforce_admins: false`.~~ **[2026-08-08] `enforce_admins: true`** — flipped by
   Phase 2 plan §7 decision 4; the required check now binds the admin. The remaining residual is that an
   admin can reconfigure the protection.
6. **Core-loop E2E does not run by default.** ~~and the one live-run artifact on disk shows a login failure.~~
   **[2026-08-06]** that artifact no longer exists on disk and was never tracked; its failure mode is
   diagnosed in `docs/05-qa/phase-1-live-e2e-baseline.md` §3, and a dated non-live baseline replaces it.
7. ~~**`execute.ts` (LLM-driven write path) has 0% unit coverage.**~~ **[2026-08-06] CLOSED by U10** —
   100 % statements, 24 pins.
8. ~~**No schema↔type contract test; `supplement_id` has no ID-stability contract**~~ — **[2026-08-06]
   both CLOSED**: `schema-type-drift.test.ts` (U8, 23 tests) and `id-stability.test.ts` (43 tests).
9. **No rate limiting** on the paid LLM endpoint; budget check non-atomic; no abort on client disconnect.
10. ~~**Raw error messages returned to clients**~~ — **[2026-08-02] closed** by `9e9e15d` (R3) and
    `1792f9f` (R3b), and enforced by `src/architecture/error-disclosure.test.ts`.
11. **`.tsx` tests silently never run** — a developer writing one gets silence, not an error.
12. **No self-service data export/deletion** for stored health data.

---

## 8. What genuinely works — stated plainly

To avoid over-correcting: this is a substantially better codebase than "MVP" implies. Domain logic is
pure, deterministic, injectable, cycle-free, and well-tested. RLS is complete and correct across all 7
migrations. Every API route is authenticated. The advisor is *architecturally* prevented from writing
data unilaterally. Trust-over-monetization is enforced by types, not policy. Architecture boundaries are
compiler-verified. Zod↔domain conformance is a compile error. And the team caught and honestly
documented its own two worst bug classes (v11) and its own fabricated-citation defect (v13) rather than
papering over them.

The gaps are concentrated in the **operational layer** (observability, CI, integration, error hygiene,
rate limiting) and in **content grounding** — not in the domain design.
