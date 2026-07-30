# MVP Transition Check — Independent Review Findings

> **Date:** 2026-07-30 · **Scope:** whole repository, read-only. No application code was modified.
> **Question put to reviewers:** is this repository ready to stop being developed as an MVP?
> Reviewers were instructed to **challenge** the current instructions and implementation, and explicitly
> told **not** to assume that preserving the existing MVP structure is automatically safest.

## Reviewer panel

| Ref | Reviewer | Assigned lens | Outcome |
|---|---|---|---|
| **ARCH** | `ecc:architect` | Architecture, layering, data architecture, branch topology, CLAUDE.md rule classification | Completed — 22 findings |
| **SEC** | `ecc:security-reviewer` | Auth, RLS, LLM attack surface, secrets, health-data governance | Completed — 8 findings |
| **TEST** | `ecc:tdd-guide` | Coverage reality, blind spots, E2E gating, contract tests | Completed — 9 findings |
| **CODE** | `ecc:code-reviewer` | Production-suitability, mocks-as-permanent, error handling, observability | Completed — 9 findings |
| **DEBT** | `general-purpose` (tech-debt / maintainability) | Branch, doc, dependency, process debt; repo hygiene | **FAILED** — terminated by an API error before producing findings |

**Gap disclosure.** The technical-debt reviewer produced no output. Most of its assigned scope was covered
independently: branch topology, CI absence, lint-enforces-nothing, and doc staleness by **ARCH**;
dependency and observability debt by **CODE**; `.gitignore` and secret hygiene by **SEC**. The one
uncovered item — tracked-junk hygiene — was verified directly by the lead: `.gitignore` correctly excludes
`.env*`, `coverage/`, `.next/`, `*.tsbuildinfo`, and `.DS_Store`; **zero** `.DS_Store` files are tracked;
only `test-results/.last-run.json` and a stray `test-results 2/` are tracked (trivial). PDCA-workflow drift
was verified by the lead via BKit: `bkit_pdca_status` reports zero tracked features, last updated
2026-06-15 — the tooling state has drifted, and `docs/archive/*/_INDEX.md` is the real status source.

**Baseline measured by the lead before dispatch:** `tsc --noEmit` clean · 408/408 unit tests ·
`next build` succeeds · 7 migrations · no CI.

---

## Findings

Severity: **critical** / **high** / **medium** / **low**.
Timing: **before-features** / **functional-beta** / **before-production** / **optional**.

---

### T-01 · Evidence grades are ungrounded in the product's declared trust layer
- **Reviewer:** Lead (verified first-hand), corroborated by ARCH, CODE
- **Severity:** critical · **Category:** product integrity / data quality
- **Subsystem:** `src/data/seed-effects.ts`, `src/lib/evidence-grading`
- **Evidence:** 27 `grade:` entries vs only **8** `evidenceProfile` blocks — 19 grades are hand-typed
  letters with no derivation. Eight are Grade A. `magnesium-metabolic` carries `paperIds: []` — a grade
  with zero supporting papers. v13 deleted all provenance fields (author/journal/year/link/studyType/
  sampleSize) because they were LLM-recalled and unverifiable.
- **Problem:** `CLAUDE.md` states "The Library is the trust layer of the product." That layer currently
  presents editorial opinion in a scientific frame. Disclosure was fixed in v13; **grounding was not.**
- **Why it matters beyond MVP:** For a prototype, illustrative grades are acceptable scaffolding. For a
  product making health-adjacent claims, an ungrounded Grade A is the largest correctness and credibility
  liability, and every feature built on top enlarges the surface a future grounding cycle must revalidate.
  No test can catch this — there is no ground truth in the repository.
- **Recommended correction:** Roadmap Phase 3 — derive every grade from an `evidenceProfile` (27/27), make
  a profile-less grade a build failure, re-introduce provenance only with verified DOI/PMID.
- **Timing:** **before-production** for grounding; **before-features** for the rule that no *new*
  ungrounded grade may be added.
- **Blocking:** **Blocking** for any claim of product readiness. Non-blocking for Phase 0–2 work.

### T-02 · The repository's two key guardrails exist only on one machine — for two different reasons
- **Reviewer:** ARCH · **Severity:** critical · **Category:** source control / data loss
- **Subsystem:** repo (`.git`)
- **Status:** Re-verified 2026-07-30 in the post-transition verification pass. **Corrected** — the original
  wording implied both guardrails were uncommitted. They are not, and the distinction changes the remedy.
- **Evidence:**
  - **Committed but unpushed:** `src/architecture/boundaries.test.ts` was added by commit **`d9fc1ef`**
    ("refactor(architecture): repair type/app/domain boundary violations") — confirmed by
    `git log --oneline --diff-filter=A -- src/architecture/boundaries.test.ts`. Local
    `feat/food-pairings-v12` = `d9fc1ef` vs `origin/feat/food-pairings-v12` = `d89cf1c`, so the commit
    exists as a git object locally but has never reached `origin`.
  - **Genuinely uncommitted:** the v13 `evidence-disclosure` work. `src/data/seed-integrity.test.ts` (the
    anti-fabrication guards) and `src/components/evidence/IllustrativeDatasetNotice.tsx` are **untracked**;
    `src/data/seed-papers.ts`, `src/types/paper.ts`, and `src/lib/validation/seed.ts` are modified but
    uncommitted. These have **no git object at all**.
  - `feat/advisor-actions-v7` has no `origin` ref.
- **Problem:** Both of the project's highest-leverage correctness artifacts exist only on one machine, but
  the failure modes differ. The layering guardrail survives a `git checkout` and is recoverable from the
  local object store; the anti-fabrication guards are not — an untracked file is one `rm` or one careless
  `git clean` from gone, with nothing to recover.
- **Why it matters beyond MVP:** A prototype can afford to lose a day's work. A product cannot lose its
  only executable spec for medical-claim provenance.
- **Recommended correction:** Commit the v13 work first (it is the fragile half), then push
  `feat/food-pairings-v12` to back up `d9fc1ef`, then fast-forward `main` (see T-03). Each of these requires
  explicit user approval.
- **Timing:** **before-features** · **Blocking:** **Blocking**

### T-03 · `main` is a stale two-commit MVP — possibly a stronger prototype signal than CLAUDE.md
- **Reviewer:** ARCH · **Severity:** critical · **Category:** source control / integration
- **Subsystem:** repo
- **Evidence:** `git log main` = 2 commits (`910d773`, `30f74e1`); `main` is **14 commits behind** the
  working tip. Crucially, `.git/logs/HEAD` proves the ten feature branches form a **single linear chain**
  — each created by `checkout` at the previous branch's tip — so there are **zero divergent merge bases**.
- **Problem:** Anyone (human or coding agent) who clones and checks out `main` gets a codebase with no
  `src/services/`, no `boundaries.test.ts`, and ten missing engines. The default branch actively
  misrepresents the product.
- **Why it matters beyond MVP:** **This corrects an intuitive reading of the repository.** "13 unmerged
  branches" suggests dangerous divergent integration work; the topology proves the opposite — `main` can
  `merge --ff-only` with *guaranteed zero conflicts*, and the integrated state is already validated (it is
  what the 408/408 baseline was measured against). The risk is a misleading default branch and unbacked
  work, **not** merge conflicts.
- **Recommended correction:** `git checkout main && git merge --ff-only feat/food-pairings-v12 && git push`.
  Then tag `v2`…`v13` retrospectively and delete the ten stale labels. **Do not** rebase, squash, or
  cherry-pick — there is nothing to reconcile, and rebasing would discard the only validated state.
- **Timing:** **before-features** · **Blocking:** **Blocking**

### T-04 · No CI — every guardrail in the repository is opt-in
- **Reviewer:** ARCH, TEST · **Severity:** high · **Category:** operations / enforcement
- **Subsystem:** repo root
- **Evidence:** No workflow files anywhere. `package.json` defines `typecheck`, `test`, `test:boundaries`,
  `test:coverage` — nothing runs them automatically. `playwright.config.ts` branches on `process.env.CI`,
  a CI that does not exist. The only coverage threshold anywhere is scoped to `src/lib/stack-evaluator/**`.
- **Problem:** `boundaries.test.ts`, `seed-integrity.test.ts`, and the compile-time Zod conformance checks
  are excellent *executable* specs that protect the codebase only if someone remembers to run them.
- **Why it matters beyond MVP:** This is the difference between "we have rules" and "the rules hold." It is
  also the cheapest item in the review, and every other fix can silently regress without it.
- **Recommended correction:** One workflow: `npm ci && npm run typecheck && npm test && npm run build`,
  required on `main`. Include `npm run build` — nothing currently verifies a production build.
- **Timing:** **before-features** · **Blocking:** **Blocking**

### T-05 · No observability of any kind
- **Reviewer:** CODE, ARCH · **Severity:** high · **Category:** observability
- **Subsystem:** entire application
- **Evidence:** No logging or error-reporting dependency in `package.json`. A repo-wide grep for
  `console.` in non-test source matches exactly one file — `src/lib/db/seed.ts` (a dev script). No request
  IDs anywhere. `handle()` (`src/lib/api/respond.ts:44-57`) catches every server error and converts it
  straight to an HTTP response **without recording anything**.
- **Problem:** There is zero server-side record that any failure occurred.
- **Why it matters beyond MVP:** Combined with T-06's silently swallowed rollback failure, a production
  incident involving a partial write would be **undiagnosable after the fact**. This is the largest single
  gap between "MVP" and "dependable."
- **Recommended correction:** Structured log in `handle()`'s catch with `{code, message, path, userId,
  requestId}` before responding; same in the `execute.ts` rollback catch. Target a real sink.
- **Timing:** **before-production** · **Blocking:** Near-blocking — acceptable for a closed beta with
  trusted users; blocking before any wider rollout.

### T-06 · Advisor rollback failure is silently swallowed; flag replacement is non-atomic
- **Reviewer:** CODE · **Severity:** medium · **Category:** error handling / data integrity
- **Subsystem:** `src/lib/advisor/actions/execute.ts`, `src/lib/db/evaluation-flag-repo.ts`
- **Evidence:** `execute.ts:127-136` — compensating rollback wrapped in
  `try { … } catch { /* best-effort */ }` with **no logging of any kind**.
  `evaluation-flag-repo.ts:23-50` — `replaceFlags()` deletes all flags for a stack then inserts the new set
  as two separate non-atomic calls.
- **Problem:** If rollback fails, a stack is left partially mutated with no record. If the insert fails
  after the delete, the stack has zero flags until the next successful evaluation.
- **Why it matters beyond MVP:** These are exactly the partial-write and failed-undo classes a green test
  suite cannot see, and with no logging (T-05) they are invisible to operator and user alike.
- **Recommended correction:** Log the rollback failure with batch/inverse context; make `replaceFlags`
  atomic, or insert-then-delete-by-id.
- **Timing:** **before-production** · **Blocking:** Non-blocking

### T-07 · The LLM-driven write path has 0% unit coverage
- **Reviewer:** TEST · **Severity:** high · **Category:** test coverage
- **Subsystem:** `src/lib/advisor/actions/execute.ts`
- **Evidence:** Coverage report — 0 of 168 lines executed. Its only exercise is `E2E_LIVE`-gated Playwright
  requiring a live Supabase and `ANTHROPIC_API_KEY`.
- **Problem:** The sole writer for an entire feature surface — add/edit/remove item, create/delete stack,
  undo — is verified only by tests that do not run by default.
- **Why it matters beyond MVP:** This is where an LLM's proposal becomes a real mutation of a user's health
  data. It deserves the *most* coverage in the repository and currently has none.
- **Recommended correction:** Unit-test with mocked repos: correct repo call and correct inverse-intent
  construction per proposal type, including rollback.
- **Timing:** **before-production** · **Blocking:** **Blocking** before production

### T-08 · No contract test binds the SQL schema to the TypeScript row types
- **Reviewer:** TEST, ARCH · **Severity:** high · **Category:** contract / silent drift
- **Subsystem:** `src/lib/db/mappers.ts`, `types.ts`, `supabase/migrations/*.sql`
- **Evidence:** `src/lib/db/**` shows **0% executed coverage** — no test calls any mapper. Row types are
  hand-written, not generated. `mappers.ts` performs unchecked casts (`row.intent as StackIntent`,
  `row.severity as FlagSeverity`) against columns declared plain `text` with no CHECK constraint
  (`0001_init.sql`).
- **Problem:** A renamed/removed column or a drifted enum set produces no failure — the cast yields a value
  TypeScript trusts but that does not exist in the domain type.
- **Why it matters beyond MVP:** With 7 migrations and one developer this is latent. With more schema churn
  it becomes silent data corruption that a clean typecheck will never reveal.
- **Recommended correction:** Unit-test every mapper with row fixtures; add a generated-types diff or a
  round-trip conformance check; consider CHECK constraints so invalid values cannot reach the mapper.
- **Timing:** **before-production** (cheaper **before-features**, while the schema is small)
- **Blocking:** **Blocking** before production

### T-09 · `stack_items.supplement_id` is a soft reference with no ID-stability contract
- **Reviewer:** ARCH, CODE · **Severity:** critical · **Category:** data integrity
- **Subsystem:** `supabase/migrations/0001_init.sql:48-52` ↔ `src/data`
- **Evidence:** The migration documents "`supplement_id` is a SOFT reference to seed data (no FK)"; the
  column is plain `text`. `src/lib/validation/seed.test.ts` validates only *internal* seed integrity.
  Nothing asserts the ID set is stable across releases. Consumers degrade silently —
  `getSupplementById` returns `undefined` and the evaluator falls back to `customName`.
- **Problem:** Renaming or removing a seed ID orphans every persisted `stack_items` row referencing it — a
  blank, unevaluable row — with no FK, no migration, no detection, and no test.
- **Why it matters beyond MVP:** This is the *one* structural consequence of splitting reference data
  (TypeScript) from user data (Postgres). Invisible with one demo user; with real users it is silent,
  unbounded data corruption of exactly the class the project's own v11 retrospective warns about. It also
  directly blocks Phase 3, which necessarily changes content.
- **Recommended correction:** Treat reference IDs as an **append-only public contract** — a checked-in ID
  manifest plus a test asserting every previously published ID still resolves; removal requires a tombstone
  and a data migration. **Do not add a foreign key** (that would force reference data into Postgres for the
  wrong reason).
- **Timing:** **before-features** for the manifest, while the ID set is small; **before-production** overall
- **Blocking:** **Blocking** before any content-ID change

### T-10 · Two documented layers are ungoverned by the boundary test; domain purity is unenforced
- **Reviewer:** ARCH · **Severity:** high · **Category:** layering / guardrail coverage
- **Subsystem:** `src/architecture/boundaries.test.ts`
- **Evidence:** `boundaries.test.ts:27` — `SCANNED_LAYERS = ["src/types", "src/components", "src/lib"]`.
  But `docs/02-design/architecture-boundaries.md:23` names `src/services/` as an Application layer, and
  `src/data/` appears nowhere in the layer table. `architecture-boundaries.md:91-93` explicitly **defers**
  the purity rule that engines must not import `lib/db`/`lib/supabase`. The harness sanity check only
  asserts `ALL_FILES.length > 50`, so an entire new top-level layer is silently ungoverned.
- **Problem:** The guardrail is a *file allowlist*, not a *tree partition* — new layers escape by default,
  which is precisely how `src/services` came to exist ungoverned.
- **Why it matters beyond MVP:** The design doc itself records that 16 violations accumulated the moment
  prose stopped being executable. The same failure mode is re-forming in `src/services` and `src/data`.
- **Recommended correction:** Add `src/services` and `src/data` to the scanned layers; add
  `DATA_IS_A_LEAF`; add a tree-partition sanity test; promote the deferred purity rule. All three pass
  against the current tree — they are ratchets, not refactors.
- **Timing:** **before-features** · **Blocking:** **Blocking**

### T-11 · `.tsx` test files are silently never collected; the presentation layer is untestable by config
- **Reviewer:** ARCH, TEST · **Severity:** high · **Category:** testing infrastructure
- **Subsystem:** `vitest.config.ts`, `src/components` (5,518 LOC)
- **Evidence:** `vitest.config.ts:13` — `include: ["src/**/*.test.ts"]` (no `.tsx`); `:12` —
  `environment: "node"` with no jsdom; no `@testing-library/*` in `package.json`. All 39 test files are `.ts`.
- **Problem:** A developer who writes `SupplementDetail.test.tsx` gets **silence, not an error** — Vitest
  never collects it. Combined with 31 client components, the whole interaction surface is verified only by
  Playwright, which mostly does not run.
- **Why it matters beyond MVP:** The project's own v11 retrospective names "copy asserting uncomputed facts"
  as a bug class a green suite cannot see — and that class lives entirely in this untested layer.
- **Recommended correction:** `include: ["src/**/*.test.{ts,tsx}"]`; add jsdom + Testing Library; then
  require a component test for anything rendering a safety flag, evidence grade, or citation.
- **Timing:** **before-features** for the one-line `include` fix; **functional-beta** for the backfill
- **Blocking:** Non-blocking

### T-12 · Coverage measurement is scoped to `src/lib` only — the headline number is misleading
- **Reviewer:** TEST · **Severity:** medium · **Category:** metric integrity
- **Subsystem:** `vitest.config.ts`
- **Evidence:** `coverage.include: ["src/lib/**/*.ts"]`. `src/services/evaluation.ts` — which *has* a test
  file — does not appear in the report at all. `src/components/**` and `src/app/**` are likewise excluded by
  config, not by being covered. The reported "72.42% all files" describes `src/lib` alone.
- **Problem:** Anyone reading the coverage number without checking the config over-trusts it; untested areas
  are invisible rather than visibly red.
- **Why it matters beyond MVP:** A metric that hides its own gaps is worse than no metric — it manufactures
  false confidence at exactly the moment the project is deciding it is ready to move on.
- **Recommended correction:** Expand `include` to the full `src/` tree; extend thresholds from
  `stack-evaluator` alone to every pure engine directory.
- **Timing:** **before-features** (config change) · **Blocking:** Non-blocking

### T-13 · The core user loop has no executable E2E coverage in a default run
- **Reviewer:** TEST, ARCH · **Severity:** high · **Category:** E2E / false confidence
- **Subsystem:** `tests/e2e/**` (23 specs, 89 tests), `playwright.config.ts`, `tests/e2e/helpers.ts`
- **Evidence:** `helpers.ts:37` — `LIVE = process.env.E2E_LIVE === "1"`. 17 of 23 spec files carry
  `test.skip(!LIVE, …)`. The 33 ungated tests are exclusively public-Library assertions and
  unauthenticated-401 checks. **Every** write path — profile, stack create/evaluate, protocol, advisor
  apply/undo, check-in, lab commit — is gated. The `L1/L2/L3` prefix does **not** indicate gating:
  `lab-timeline.spec.ts:44` "L1: lab-import authed flow" is fully gated while `:16` "L1: … (no auth)" is
  not. Separately, `fullyParallel: true` contradicts a single shared demo user whose seed performs
  destructive deletes — flaky by construction — and `webServer` runs `npm run dev`, so a production build is
  never E2E-tested.
- **Problem:** A fully green default E2E run gives **no signal** on whether the product's literal North Star
  loop works.
- **Why it matters beyond MVP:** The suite's flakiness-by-construction is exactly why specs "rotted while
  skipped." Without a runnable core-loop E2E there is no environment in which the product is verified end
  to end.
- **Recommended correction:** Tag gated describes `[LIVE]` explicitly; set `workers: 1` or add per-worker
  user fixtures (prerequisite for CI E2E); point `webServer` at `build && start`; add a CI job running the
  full suite against a seeded ephemeral project; report executed-vs-skipped counts.
- **Timing:** **before-features** for the naming/config fixes; **before-production** for the CI job
- **Blocking:** **Blocking** before production

### T-14 · The one on-disk live-E2E artifact contradicts the accepted "just missing an API key" narrative
- **Reviewer:** TEST · **Severity:** high · **Category:** evidence integrity
- **Subsystem:** `test-results/mvp-core-loop-e2e-…/error-context.md`
- **Evidence:** The artifact (dated 2026-07-30) records the core-loop spec failing at `helpers.ts:55` — the
  page stayed on `/auth/login` and the form rendered `alert: fetch failed`. That is a network/auth failure,
  **not** an Anthropic key issue.
- **Problem:** The prevailing account ("live suite is fine apart from `ANTHROPIC_API_KEY`") is at least
  partially disconfirmed by the only live-run evidence in the repository.
- **Why it matters beyond MVP:** A release gate resting on an unverified, partly contradicted claim is not a
  gate. Whether the artifact is stale or current is itself unknown — which is the point.
- **Recommended correction:** Re-run `E2E_LIVE=1` fresh with all env vars and a seeded user; capture a dated
  pass/fail/skip baseline; stop citing the prior "61/71" and "79/10" figures.
- **Timing:** **before-production** · **Blocking:** **Blocking** before production

### T-15 · No rate limiting; the LLM token budget has a concurrency gap; disconnects still bill
- **Reviewer:** SEC, ARCH · **Severity:** high (medium in isolation) · **Category:** cost / abuse
- **Subsystem:** `src/app/api/advisor/route.ts`, `src/lib/advisor/repo.ts`, `/api/lab-import/extract`
- **Evidence:** No limiter dependency or implementation anywhere. `repo.ts:143-152` reads remaining budget;
  usage is written only after the whole multi-second turn completes (`route.ts:91-93`) — a TOCTOU race, so
  concurrent requests each observe the full budget. No `maxDuration` on the SSE route; no `request.signal`
  handling, so a client disconnect stops neither the loop nor the billing. No timeout on the Anthropic
  client (`claude-adapter.ts:130-139`).
- **Problem:** The daily token budget is a genuinely good *accounting* control but not an *abuse* control.
- **Why it matters beyond MVP:** At MVP scale, cost risk is negligible. Public, it is direct financial
  exposure and a denial-of-service vector against the shared Anthropic quota — exhausting it degrades the
  product for every user.
- **Recommended correction:** Atomic reserve-then-spend (`UPDATE … RETURNING`); per-user and per-IP limits on
  both LLM-backed routes; explicit client timeout; `maxDuration`; wire `request.signal`.
- **Timing:** **before-production** · **Blocking:** **Blocking** before public launch

### T-16 · Internal error text is returned verbatim to clients
- **Reviewer:** SEC, CODE, ARCH · **Severity:** medium–high · **Category:** security / error hygiene
- **Subsystem:** `src/lib/api/respond.ts:54`
- **Evidence:** `const message = err instanceof Error ? err.message : "Unexpected error."` is sent directly
  as `error.message` on every 500. Upstream throwers pass raw Supabase/PostgREST errors
  (`stack-repo.ts:17,32,52,75,88`; `advisor-action-repo.ts:64,92,106,120,133`). Same pattern in the advisor
  routes and the SSE `error` event. Separately, `respond.ts:51` dispatches on the error-message *substring*
  `includes("not configured")` to produce a 503.
- **Problem:** Postgres constraint, table, column, and RLS-policy names can reach clients. And any future
  error whose text happens to contain "not configured" silently becomes a 503; rewording either producer
  breaks the contract.
- **Why it matters beyond MVP:** Internal schema disclosure is a standard finding once users are adversarial
  or merely curious, and it is trivially avoidable.
- **Recommended correction:** Log the real error with a correlation ID; return a generic message plus the
  request ID. Keep `ZodError` and `SAFETY_BLOCK` messages user-facing — those are intentional. Replace
  substring dispatch with typed error classes.
- **Timing:** **before-production** · **Blocking:** **Blocking** before production

### T-17 · The most safety-critical endpoint bypasses the project's own service-layer pattern
- **Reviewer:** ARCH · **Severity:** medium · **Category:** layering / testability
- **Subsystem:** `src/app/api/advisor/actions/route.ts`, `src/services`
- **Evidence:** 19 of 23 routes wrap in `handle()`; four do not, including both advisor action routes.
  `api/stacks/[id]/evaluate/route.ts:11-19` is 9 lines delegating to `@/services/evaluation`;
  `api/advisor/actions/route.ts:37-229` is ~190 lines containing schema definitions, a `revalidate()`
  orchestrator, the cumulative safety gate, batch execution, and audit recording — all in the routing layer.
  `src/services/` contains exactly one module.
- **Problem:** The route's own header comment identifies it as "the trust boundary for suggest-then-confirm."
  Route handlers are the one place that cannot be unit-tested without a live server.
- **Why it matters beyond MVP:** The product's most safety-critical logic is its least testable code — which
  is why T-07 exists. Trust boundaries belong in testable modules.
- **Recommended correction:** Extract to `src/services/advisor-actions.ts`; move Zod schemas beside their
  siblings; leave the route as auth → parse → delegate → respond, wrapped in `handle()`. Behavior-preserving.
- **Timing:** **before-features** (further advisor work compounds this) · **Blocking:** Non-blocking

### T-18 · No migration tooling, no rollback, no record of deployed schema
- **Reviewer:** ARCH · **Severity:** medium · **Category:** operations
- **Subsystem:** `supabase/migrations`
- **Evidence:** 7 hand-written `.sql` files; no `supabase` CLI dependency; no `db:migrate` script; no `down`
  migrations; nothing asserts the deployed schema matches the files.
- **Problem:** Migrations are applied by hand with no rollback and no deployed-state record.
- **Why it matters beyond MVP:** The migrations themselves are high quality — RLS on every table,
  derived-ownership policies, `touch_updated_at` triggers. The *process* around them is the prototype part.
- **Recommended correction:** Supabase CLI, a `db:migrate` script, and a CI check that generated types match
  `src/lib/db/types.ts`.
- **Timing:** **before-production** · **Blocking:** **Blocking** before production

### T-19 · No self-service export or deletion of stored health data
- **Reviewer:** SEC · **Severity:** low–medium · **Category:** data governance
- **Subsystem:** `src/app/api/**`
- **Evidence:** No export or account-deletion route exists. `on delete cascade` from `auth.users` means
  deleting the auth user via the Supabase dashboard would cascade, but there is no in-app flow.
- **Problem:** Users cannot remove or retrieve their own medications, allergies, conditions, or lab results.
- **Why it matters beyond MVP:** Not a vulnerability, but a material trust and compliance gap the moment real
  users store real medical data (GDPR/CCPA-adjacent).
- **Recommended correction:** Add a self-service export + delete flow leaning on the existing cascade.
- **Timing:** **before-production**, or record an explicit time-boxed deferral · **Blocking:** Non-blocking

### T-20 · `npm run lint` enforces nothing, and contributors already believe it does
- **Reviewer:** ARCH · **Severity:** medium · **Category:** tooling
- **Subsystem:** `package.json:9`
- **Evidence:** `"lint": "next lint"` with **no** `eslint` dependency and no ESLint config — yet
  `// eslint-disable-next-line` comments appear in `src/lib/db/seed.ts:105,113` and
  `src/lib/product-matcher/index.ts:43`.
- **Problem:** A script that appears to gate quality and does not is worse than no script; the suppression
  comments prove contributors assume it runs.
- **Why it matters beyond MVP:** Misleading tooling erodes trust in every other check. (The decision to
  implement boundaries as a Vitest test rather than an ESLint rule is well-reasoned and should stand.)
- **Recommended correction:** Configure ESLint properly (with `eslint-plugin-react-hooks`, genuinely valuable
  across 31 client components) **or** remove the script. The current state is the only unacceptable one.
- **Timing:** **functional-beta** · **Blocking:** Non-blocking

### T-21 · Seed-as-code is architecturally sound — the shortcut is the authoring format, not the pattern
- **Reviewer:** ARCH (challenging the premise) · **Severity:** medium · **Category:** data architecture
- **Subsystem:** `src/data`, `src/lib/*`
- **Evidence of soundness:** `src/data/*.ts` imports **only** `@/types` across all 10 seed files — already a
  clean leaf. Every engine exposes a uniform injection seam (`EvidenceLibrary` + `defaultLibrary` at
  `evidence/index.ts:38-43`, and equivalents in `interactions`, `biomarkers`, `product-matcher`,
  `side-effects`). No import cycles. No component or route imports `@/data` directly.
- **Problem (the real limits):** every seam is **synchronous** — that is the actual lock-in. Two client
  components pull engines and seed data into the browser bundle (`ProfileForm.tsx` → medication aliases;
  `StackItemRow.tsx` → `SEED_PRODUCTS` + matcher). `getBiomarker()` (`biomarkers/index.ts:151`) bypasses the
  seam. And TypeScript source blocks a non-engineer editorial workflow.
- **Why it matters beyond MVP:** **This corrects the intuitive conclusion.** For read-only reference data,
  seed-as-code is *better* than a database: small, versioned with the code, diff-reviewable, compile-time
  typed. Given the fabricated-citation history, reviewability matters more than queryability. Migrating it to
  Postgres "to be production-grade" would be a mistake.
- **Recommended correction:** (1) finish the seam + ID manifest + a bundle-size assertion; (2) when authoring
  outgrows TypeScript, move the source of truth to JSON/YAML with build-time codegen emitting the same
  constants — engines and types untouched; (3) only if the corpus outgrows the bundle, load server-side and
  pass props to client components. Nothing currently justifies step 3.
- **Timing:** step 1 **before-features**; step 2 **functional-beta**; step 3 **optional**
- **Blocking:** Non-blocking

### T-22 · CLAUDE.md forbids six subsystems that already ship
- **Reviewer:** ARCH, CODE, corroborated by lead · **Severity:** high · **Category:** project instructions
- **Subsystem:** `.claude/CLAUDE.md`
- **Evidence:** `CLAUDE.md:730-751` "Out of Scope for MVP" prohibits, among others, "Automatic blood test
  parsing" (`src/lib/lab-import/{csv,paste,pdf-adapter}.ts` exists), "Automatic allergy report parsing"
  (same pipeline), "Medication interaction database integration" (`src/lib/interactions/`,
  `src/data/seed-interactions.ts`), "Complex gamification system" (`src/lib/identity/`,
  `src/lib/checkin/consistency.ts`), and "Real-time chat coach" (`src/app/api/advisor/route.ts`, SSE).
  Also: `:710-712` caps Product Match at "a placeholder or simple mock system"; `:1087-1151` prescribes a
  7-phase build order, all complete; `:1164` Rule 10 says "Make the MVP useful with seeded data before
  adding complicated integrations"; `:1155` Rule 1 restricts work to the three pillars.
- **Problem:** An agent reading this file treats six shipped, tested subsystems as things it must not touch or
  improve — and may propose *removing* them for scope compliance. Rule 1, as written, excludes CI, rate
  limiting, error handling, and observability, since none is a product pillar. Rule 10 reads as a standing
  prohibition on the grounding work the product most needs. `:753-775` also still recommends "Prisma or
  Drizzle for ORM," contradicting the deliberate, correct decision to use hand-written repos so RLS performs
  tenant isolation.
- **Why it matters beyond MVP:** **This is the confirmed root cause of the reported symptom.** The
  instruction file is not merely stale — it actively argues against the work required to leave prototype status.
- **Recommended correction:** Split the file. Keep permanent product and engineering invariants in
  `CLAUDE.md`; archive `:648-751` and `:1087-1151` with a completed-historical header. Rewrite Rule 1 as
  "Feature work stays within the three pillars; infrastructure, safety, and reliability work needs no pillar
  justification." Replace the structure/ORM suggestions with a pointer to
  `docs/02-design/architecture-boundaries.md`.
- **Timing:** **before-features** · **Blocking:** **Blocking**

### T-23 · CLAUDE.md is missing the long-term rules whose absence permitted most findings above
- **Reviewer:** ARCH, SEC, TEST · **Severity:** high · **Category:** project instructions
- **Subsystem:** `.claude/CLAUDE.md`
- **Evidence:** The file's only testing/verification requirement is the single line about Rules 11–13 and
  `boundaries.test.ts` (`:1169`). It contains **no** rule about: Git/branching (hence T-02, T-03);
  reference-data ID stability (T-09); layer registration (T-10); domain purity (T-10); error-message hygiene
  (T-16); a testing floor (T-07, T-11, T-12); cost and abuse controls (T-15); CI (T-04); the server/client
  data boundary (T-21); per-route auth checks or per-migration RLS (today 100% compliant by *convention*
  only, with nothing enforcing it); or **anti-fabrication** — the project's single strongest lesson,
  currently encoded only in a test file and nowhere in the instructions.
- **Problem:** The permanent rules that would have prevented these findings were never written down.
- **Why it matters beyond MVP:** A prototype can run on convention. A product cannot — conventions do not
  survive contributor turnover, agent context resets, or a year of drift. The project already learned this
  the hard way: `architecture-boundaries.md:11-16` records that 16 violations accumulated the moment
  documented rules stopped being executable.
- **Recommended correction:** Add each missing rule to the revised `CLAUDE.md`, and prefer making them
  executable over merely writing them down.
- **Timing:** **before-features** · **Blocking:** **Blocking**

### T-24 · Verified-good findings (recorded so they are not re-litigated)
- **Reviewer:** SEC, CODE, ARCH · **Severity:** informational
- RLS is **complete and correct** across all 7 migrations — every created table has both
  `enable row level security` and a matching policy; child tables derive ownership via `EXISTS` on the parent
  stack. Migration `0005` is **not** a gap: it only adds a column to `advisor_actions`, already covered by
  `0004`'s policy.
- **All 22–23 API routes** call `getUser()` and return 401 — verified exhaustively.
- Server clients use the **anon key** bound to session cookies, so RLS genuinely applies per request. The
  service-role key appears only in `src/lib/db/seed.ts`, never in HTTP-reachable code. No `NEXT_PUBLIC_`
  secret leakage. `.env` / `.env*.local` gitignored; zero `.DS_Store` tracked.
- **The LLM cannot write data.** Tools only propose; `POST /api/advisor/actions` re-loads context
  server-side, re-validates every proposal with Zod against fresh RLS-scoped data, and runs an
  **authoritative** `cumulativeRecheck` that hard-blocks (409) on any new critical flag before execution.
  The system prompt is a fixed string never concatenated with user or DB data. No tool performs network,
  shell, or file access. Turn cap 5, batch cap 4.
- **The two v11 bug classes were not found to recur.** No UI/advisor copy asserting an uncomputed fact; no
  evaluator rule unreachable from production (all 10 wired via `ALL_RULES` → `services/evaluation.ts:49`).
- **Trust-over-monetization is enforced by types, not policy** — `toScorable()`
  (`product-matcher/index.ts:41-46`) structurally strips `affiliateLink` so the ranker cannot read it.
- `src/lib/validation/schemas.ts:146-153` makes Zod↔domain drift a **compile error** — the single best idea
  in the codebase; generalize it.
- No `dangerouslySetInnerHTML` anywhere; advisor output renders as plain text. No import cycles.
- **One reviewer error, corrected:** SEC reported "no `.git` repository at all," so its secret-history caveat
  is void — `v1.0/.git` exists with 15 commits and 13 branches (verified by the lead).

---

## Reviewer disagreements

1. **Branch/integration risk — resolved.** The lead's initial framing ("13 unmerged branches, integration
   risk") was **corrected by ARCH** with `.git/logs/HEAD` evidence: the branches are one linear chain, so a
   fast-forward is conflict-free by construction and the integrated state is already validated. The danger is
   a stale default branch and unbacked work, not merge conflicts. **ARCH's reading is adopted.**
2. **Seed-as-code — genuine, unresolved difference of emphasis.** CODE rated it **HIGH** severity and
   recommended inserting a repository abstraction; ARCH argued the pattern is *correct* for read-only
   reference data and that only the authoring format and the synchronous seam are limits. **Partially
   resolved:** both agree the engines already have injection seams and that the near-term action is to finish
   the seam plus add an ID manifest. They still disagree on the destination — CODE implies an eventual data
   store, ARCH argues for build-time codegen and explicitly against Postgres. The roadmap adopts ARCH's
   staged path (codegen at Phase 3; server-side loading only if bundle assertions demand it), but **this is a
   live architectural question the project should settle deliberately.**
3. **Observability severity.** CODE called it "near-blocking" even for a closed beta; ARCH treated it as
   straightforwardly before-production. Immaterial — both place it before any real-user rollout.
4. **Unresolved due to reviewer failure:** DEBT produced nothing, so no second opinion exists on
   dependency-currency, nor on whether the bkit PDCA workflow should be revived or retired. The lead verified
   only that its state is stale.

---

## Verdict

**GO WITH CONDITIONS.**

The repository is ready to stop being developed as an MVP. Its domain layer, safety layer, RLS posture, and
LLM authorization architecture are materially better than prototype grade, and **no reviewer found evidence
justifying a rewrite of any kind.** The blockers are concentrated in *process* (T-02, T-03, T-04), in
*enforcement coverage* (T-10, T-23), and in *instructions that actively resist the transition* (T-22) — not
in the code's design.

- **Conditions before additional feature work:** T-02, T-03, T-04, T-10, T-22, T-23 → Roadmap **Phase 0**.
- **Conditions before any claim of production readiness:** T-01, T-05, T-07, T-08, T-09, T-13, T-14, T-15,
  T-16, T-18.
