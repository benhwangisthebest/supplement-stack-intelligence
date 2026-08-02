# Roadmap — MVP to Dependable Product

> **Status:** Active. **Rank 6** — the lowest active rank — in the single source-of-truth hierarchy defined
> in `CLAUDE.md` §6. This document is the practical authority on **sequencing** (what to do next, what is
> excluded from the current phase), but sequencing authority is not override authority: a phase here can
> **never** license an exception to the non-negotiable safety, security, privacy, evidence-integrity, or
> data-integrity rules (rank 1), nor to `CLAUDE.md`'s permanent engineering rules and architectural
> boundaries (rank 3). **A roadmap phase that appears to require such an exception is a defect in this
> roadmap** — fix the phase, not the rule.
> **Created:** 2026-07-30, from the independent MVP-transition review.
>
> **This is not a feature wishlist.** Every phase addresses foundational correctness, verifiability, or
> dependability. New product capability appears only in Phase 4, and only after the layer beneath it is
> trustworthy. Phase ordering is a constraint, not a suggestion — a later phase may not start while an
> earlier phase's exit criteria are unmet.
>
> **Phase names are adapted to this repository** rather than generic: the standard "MVP stabilization →
> functional beta → production readiness" sequence does not fit a codebase whose domain logic is already
> production-grade but whose *content* and *operations* are not.

**Phase status (updated 2026-08-02, `main` @ `1792f9f`):** Phase 0 — **complete with follow-up**. All
nine units (U1–U9) shipped and are public, plus four post-review remediations: R1 `a338370`, R2 `ea5b270`,
R3 `9e9e15d`, R3b `1792f9f`. CI is green on `main`
([run 30744203782](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/30744203782)).
Phases 1–4 — not started.

"Complete with follow-up" is deliberate: **four exit criteria below remain unmet** and are annotated
in place. The independent final Check has not yet been run — it is scaffolded at
`docs/05-qa/phase-0-final-check.md`.

See `docs/01-plan/phase-0-integration-enforcement.plan.md` for per-unit detail,
`docs/04-report/phase-0-integration-enforcement.report.md` for the completion report, and
`docs/reviews/phase-0-closeout-check.md` for the independent closeout review and its resolution addendum.

---

## Phase 0 — Integration & enforcement recovery

**Objective.** Make the repository's verified state real, durable, and automatically re-verified. Today
every quality property of this project is true only in one uncommitted working tree on one machine.

**Why first.** Cheapest, highest-leverage phase in the plan (roughly one focused day), and it unblocks
the enforcement work every later phase depends on. It changes no product behavior.

**Included work**
1. Commit the v13 `evidence-disclosure` work; push `feat/food-pairings-v12`.
2. `git checkout main && git merge --ff-only feat/food-pairings-v12 && git push`. Conflict-free **by
   construction** — the ten feature branches form a single linear chain with no divergent merge base,
   and the integrated tip is already the validated state.
3. Tag `v2`…`v13` retrospectively at their commits; push tags; delete the ten stale branch labels
   locally and on origin. Tags are immutable and push; branch labels are neither.
4. Add CI: `npm ci && npm run typecheck && npm test && npm run build`. Make it required on `main`.
5. Extend `src/architecture/boundaries.test.ts`: add `src/services` and `src/data` to the scanned
   layers; add a `DATA_IS_A_LEAF` rule (`src/data/**` may import only `src/types/**`); add a
   tree-partition sanity test asserting every top-level `src/*` directory is either scanned or in an
   explicitly-justified exemption list.
6. Promote the currently-deferred **domain-purity** rule to enforced: listed engine directories may not
   import `@/lib/db`, `@/lib/supabase`, `@/services`, `@/app`, or `next/*`.
7. One-line fix: change Vitest `include` to `src/**/*.test.{ts,tsx}` so `.tsx` tests stop being silently
   ignored, and add a jsdom environment path for component tests.
8. Expand coverage `include` to the full `src/` tree so gaps become visible rather than invisible.

**Excluded work.** No product features. No content work. No refactoring beyond items 5–8. Explicitly
**not** the `src/lib` directory reorganization — cost exceeds benefit and it would invalidate every doc
reference.

**Prerequisites.** None. Can start immediately.

**Migration / refactoring requirements.** None to data or schema. Items 5–6 are *ratchets*: written to
pass against the current tree, locking in existing good behavior rather than demanding a refactor. Do
**not** rebase, squash, or cherry-pick the chain — there is nothing to reconcile, and rebasing would
discard the only validated integrated state.

**Testing requirements.** Suite stays green through the merge: `tsc --noEmit` clean, all unit tests
passing, `next build` succeeding. Every new boundary rule must be **mutation-checked** — shown to go red
against a deliberately introduced violation before it is trusted. *(Written against a 408-test baseline;
measured **524/524 across 42 files** at Phase 0 close. The requirement is "green", not a fixed count —
every guard added in U7, U8, R1, R2, R3 and R3b was mutation-checked as required.)*

**Security requirements.** Confirm no secret was ever committed, now that history is pushed (the review
could not check history). *(Verified 2026-07-30: `.gitignore` correctly excludes `.env` / `.env*.local`;
zero `.DS_Store` tracked.)*

**Exit criteria (measurable)** — assessed 2026-08-02 against `main` @ `1792f9f`.

- [x] `git log main..HEAD` empty; `main` contains `boundaries.test.ts` and the v13 anti-fabrication guards.
- [x] `git status` clean; local and `origin` refs for `main` identical.
- [ ] **Unmet — deliberately deferred (U-DEFER-1).** Tags `v2`…`v13` on origin; zero `feat/*` branches
      remain. Today: **0 tags**, **9 remote `feat/*` branches**. The plan's own criterion 11 requires
      `git tag` stay empty, and U-DEFER-1 records why the chain cannot support honest tags — v12
      (`51d2134`) precedes v11 (`d89cf1c`) in history. Per line 8 of this document, a phase requiring an
      exception to an approved plan is a defect in *this* roadmap, not in the plan.
- [ ] **Partly met — deferred (U-DEFER-3, closeout finding C-6).** CI workflow exists, runs on every PR
      into `main` and every push to `main`/`feat/**`, and is green. It is **not** a required status and
      `main` has **no branch protection** — that needs a repository-settings change and separate approval.
- [x] `boundaries.test.ts` scans ≥ 5 top-level layers (**5**: `src/types`, `src/components`, `src/lib`,
      `src/services`, `src/data`); each new rule verified red-then-green.
- [ ] **Unmet — deliberately deferred (U-DEFER-4, closeout finding C-12).** A `.tsx` test placed anywhere
      under `src/` is collected and executed. `vitest.config.ts` collects only `src/**/*.test.ts`. Zero
      `.test.tsx` files exist today, so this is latent rather than active.
- [x] Coverage report lists `src/app`, `src/services`, `src/components`, `src/lib/db` — `include` is
      `src/**/*.{ts,tsx}` since `8b1bd16`.

> **On the four unmet criteria.** Each is annotated above with the U-DEFER item that deferred it, so a
> deliberate deferral is distinguishable from an omission (`CLAUDE.md` §7). Phase 0 is therefore
> **complete with follow-up**, not unconditionally complete.

---

## Phase 1 — Verification integrity

**Objective.** Make a green test run mean something. Close the gap between "408 tests pass" and "the
product's critical paths are verified." (The figure in that gap was 408 when this phase was written;
the current baseline is **524 tests across 42 files**, which does not change the argument.)

**Included work**
1. **Route-handler tests** for all **23** routes (measured 2026-08-02; the figure was ~22 when written): unauthenticated → 401, invalid body → 400 with the
   correct envelope, happy path with a mocked Supabase client. Call exported handlers directly; no live server.
2. **Mapper + schema-contract tests.** Unit-test every `mappers.ts` function with representative row
   fixtures. Add a conformance check binding `supabase/migrations/*.sql` to `src/lib/db/types.ts`
   (generate types from the schema and diff, or round-trip a row).
3. **`execute.ts` unit tests** — the LLM-driven write path — independent of live E2E: correct repo call
   and correct inverse-intent construction per proposal type, including rollback.
4. **`validation/schemas.ts` tests** — accept/reject boundaries per field.
5. **Extend the reachability guard** from 2 of 7 to all 7 context fields threaded into `evaluateStack`,
   and write the pattern down so future engines get one by default.
6. **Fix E2E honesty:** set `workers: 1` or give each spec a per-worker user fixture (the latter is the
   prerequisite for CI E2E); point `webServer` at `npm run build && npm run start`; tag gated describes
   `[LIVE]` explicitly rather than relying on the ambiguous `L1/L2/L3` convention.
7. **Establish a dated live-E2E baseline** with all env vars set, replacing the contradicted "61/71" and
   "79/10" figures. Investigate the on-disk `fetch failed` login artifact.
8. Extend coverage **thresholds** from `stack-evaluator` alone to every pure engine directory.

**Excluded work.** No product features. No content grounding. No observability (Phase 2). No component-test
backfill beyond safety-critical components. No new engines.

**Prerequisites.** Phase 0 — CI must exist, or these tests can silently stop running.

**Migration / refactoring requirements.** Extract the advisor confirm-and-apply orchestration (~190 lines
in `src/app/api/advisor/actions/route.ts`) into `src/services/advisor-actions.ts`, so the product's most
safety-critical trust boundary becomes unit-testable. Move its Zod schemas beside their siblings. Route
becomes auth → parse → delegate → respond. **Behavior-preserving only.**

**Testing requirements.** Every guard added here must be mutation-verified red-then-green. This is a
project-specific lesson: v11 shipped an analysis that *recommended* a regression guard and shipped
without one; the omission was caught only by explicit mutation testing.

**Security requirements.** Add enforced tests that (a) every `src/app/api/**/route.ts` calls the auth
helper, and (b) every migration creating a table also enables RLS with a matching policy — converting
today's perfect-but-conventional compliance into an enforced rule.

**Exit criteria (measurable)**
- [ ] Every route file has ≥ 1 test each asserting 401, 400, and the happy path.
- [ ] `mappers.ts` statement coverage ≥ 90%; `execute.ts` ≥ 80%; `validation/schemas.ts` ≥ 80%.
- [ ] A schema↔type drift check exists and fails on a deliberately renamed column.
- [ ] Reachability guard covers 7/7 `evaluateStack` context fields.
- [ ] A dated live-E2E run exists with zero unexplained failures, reproducible in CI.
- [ ] Auth-coverage and RLS-coverage tests fail on a deliberately non-compliant new file.
- [ ] Coverage thresholds configured for every pure engine directory; enforced in CI.

---

## Phase 2 — Operational dependability

**Objective.** Make failures visible, bounded, and diagnosable. This is what makes the product
*dependable* rather than merely correct on the happy path.

**Included work**
1. **Structured logging + request correlation IDs.** At minimum a structured log in `handle()`'s catch
   block recording `{code, message, path, userId, requestId}` before responding, plus the currently
   swallowed rollback failure in `execute.ts`. Target a real sink, not `console.error` alone.
2. **Error-message hygiene.** Stop returning internal error text to clients — log the real error with a
   correlation ID and return a generic message plus the request ID. Keep `ZodError` and `SAFETY_BLOCK`
   messages user-facing; those are intentional. Replace substring dispatch (`includes("not configured")`)
   with typed error classes.
3. **Rate limiting and cost control.** Per-user and per-IP limits on `/api/advisor` and
   `/api/lab-import/extract`. Make the daily token budget an **atomic reserve-then-spend** (single
   `UPDATE … RETURNING`), closing the concurrency gap. Add `maxDuration` to the SSE route, an explicit
   Anthropic client timeout, and wire `request.signal` so a client disconnect stops the loop and the billing.
4. **Transactional integrity.** Make `replaceFlags()` atomic (Postgres function/transaction, or
   insert-then-delete-by-id so a failed insert leaves prior flags intact).
5. **Reference-data ID contract.** Treat supplement/effect/paper/product/biomarker IDs as an append-only
   public contract: a checked-in ID manifest plus a test asserting every previously published ID still
   resolves. Removal requires a tombstone and a data migration. **Do not add a foreign key** — that would
   force reference data into Postgres for the wrong reason.
6. **Migration tooling.** Supabase CLI, a `db:migrate` script, a record of what is deployed, and a
   rollback story. Stop applying migrations by hand.
7. **Security headers** (CSP, X-Frame-Options, X-Content-Type-Options, HSTS) in `next.config.ts`.
8. **Self-service data export and deletion** for stored health data, leaning on the existing `on delete cascade`.
9. Resolve `npm run lint`: configure ESLint properly (with `eslint-plugin-react-hooks`, valuable across
   31 client components) or remove the script. A script that appears to gate quality but does not is the
   only unacceptable state — contributors already write `eslint-disable` comments for a linter that never runs.

**Excluded work.** No content grounding (Phase 3). No new product features. No scale or performance
engineering — there is no evidence of a load problem, and none should be invented.

**Prerequisites.** Phases 0–1. Logging without CI-enforced tests, or rate limiting without route tests,
would be unverifiable.

**Migration / refactoring requirements.** Item 5 introduces the ID manifest **before** any seed-ID
renaming begins, while the ID set is still small. Item 6 requires reconciling the hand-applied state of
the live database with the migration files.

**Testing requirements.** Each failure mode gets a test: forced Supabase error → logged + generic client
message; forced Anthropic timeout → clean SSE error event; concurrent budget requests → cap respected;
failed flag insert → prior flags intact; removed seed ID → manifest test fails.

**Security requirements.** This phase largely *is* the security phase. Additionally: re-verify no secret
is reachable from client code after Phase 0's push, and confirm the service-role key stays confined to
the dev seed script.

**Exit criteria (measurable)**
- [ ] Every 5xx has a correlating server-side log entry with a request ID; zero raw internal messages in
      any client response (test-enforced).
- [ ] A concurrent-request test proves the daily token budget cannot be exceeded.
- [ ] Rate limits enforced on both LLM-backed routes, with tests.
- [ ] Client disconnect provably terminates the advisor loop.
- [ ] `replaceFlags` atomicity test passes under induced insert failure.
- [ ] ID manifest exists; removing a published ID fails CI.
- [ ] `db:migrate` exists; deployed schema matches migrations, verified in CI.
- [ ] Security headers present, verified by a response-header test.
- [ ] A user can export and delete their own data end to end.

---

## Phase 3 — Evidence grounding (the trust layer)

**Objective.** Make the Library's central claim true. Today 19 of 27 effect grades are hand-typed letters
with no derivation — eight of them Grade A, some with zero linked papers — in a product that declares the
Library its trust layer.

**Why Phase 3 and not Phase 1.** It is the product's most important gap but also its most expensive, and
it must not precede verification and operations: grounding generates large content diffs, and without CI,
enforced guards, and an ID contract, that work would be unreviewable and would risk re-introducing the
exact fabrication class v13 removed.

**Included work**
1. **Grounding pipeline.** Real, verified literature with genuine DOI/PMID for every claim. Provenance
   returns to the `Paper` type **only** alongside a verification mechanism — the v13 lesson was that a
   *required* provenance field with no real source compels fabrication.
2. **Derive grades rather than type them.** Every effect gets an `evidenceProfile` whose dimensions
   produce the grade. Target 27/27, up from 8/27. A grade with no profile becomes a build failure.
3. **Move the content source of truth out of TypeScript** to JSON/YAML with build-time codegen emitting
   the same `SEED_*` constants. Engines, seams, and types stay untouched. This is what makes an editorial
   review workflow possible. *(Note: seed-as-code is the right pattern for read-only reference data — the
   shortcut is the authoring format, not the architecture. Do not move this content into Postgres.)*
4. **Coverage honesty in the UI.** A consistent product-wide treatment of "we don't know" versus "there is
   nothing" across effects, interactions, side effects, and food pairings. Absence must never read as safety.
5. Finish the injection seam (`getBiomarker` takes a catalog parameter); add a bundle-size assertion so
   the client-bundle cost of seed growth becomes visible before it becomes a problem.

**Excluded work.** No live PubMed ingestion — a later capability, and doing it here would reintroduce
fabrication risk. No context-adjusted evidence (Phase 4). No commerce. No new pillars.

**Prerequisites.** Phases 0–2. Specifically, the ID manifest (Phase 2 item 5) must exist before content
IDs change, and CI must be enforcing guards before large content diffs land.

**Migration / refactoring requirements.** The content format migration (item 3) is mechanical and must be
provably output-identical: codegen must emit byte-identical constants for the current corpus *before* any
content changes land on top of it. Any ID change requires a tombstone plus a data migration for existing
`stack_items`.

**Testing requirements.** Retain and extend the v13 anti-fabrication guards (no placeholder domains, no
provenance keys without verification). Add: every `paperIds` entry resolves; every grade has a profile
whose dimensions justify it; every reintroduced DOI/PMID matches a checked format and is recorded as
verified. Mutation-check each guard.

**Security requirements.** No new attack surface expected. Any ingestion tooling must be build-time and
offline — never a runtime fetch reachable from a request path.

**Exit criteria (measurable)**
- [ ] 27/27 effects have an `evidenceProfile`; a grade without one fails the build.
- [ ] 100% of citations carry a verified DOI/PMID; guards fail red on a planted unverified citation.
- [ ] Content source of truth is non-TypeScript; codegen output byte-identical for the pre-migration corpus.
- [ ] Every surface that can show partial coverage states its coverage limit; test-verified.
- [ ] A content correction can be reviewed and shipped without hand-editing `src/`.

---

## Phase 4 — Product completion

**Objective.** Complete the intended core product on a foundation that is now correct, verified,
operable, and grounded.

**Included work (candidates, prioritized by product value — not a commitment)**
1. **Context-adjusted evidence** — resume `docs/01-plan/features/context-adjusted-evidence.plan.md`. The
   plan must be revised first: it was halted at design and assumed a `populationRelevance` seam that
   exists for only 8 of 27 effects. Phase 3 removes that blocker.
   > **[2026-08-02] That file is not in this repository.** It, and
   > `docs/02-design/features/evidence-grading.design.md`, were untracked when Phase 0 began — the plan
   > listed both as "pre-existing untracked docs (NOT part of Phase 0)" and forbade changing them
   > (`docs/01-plan/phase-0-integration-enforcement.plan.md:78-79,178`), so neither was ever committed,
   > and the move off the old Desktop tree left both behind. They exist **only** in the pre-relocation
   > Desktop working copy. Recover them there before resuming this item — do not assume the path
   > resolves. `docs/product-direction.md:109` carries the same stale pointer.
2. **Real product catalog** replacing the seeded 21 products, with ranking independence still test-proven.
3. **Component tests + accessibility** for every component rendering a safety flag, evidence grade, or citation.
4. **Longitudinal intelligence** across labs, adherence, and outcomes.
5. Deferred items from `docs/product-direction.md` §7, each requiring an explicit decision.

**Excluded work.** Anything in `product-direction.md` §7 without an explicit approval decision. Community
features, doctor portal, payments, and live commerce APIs stay out by default. No speculative scale architecture.

**Prerequisites.** Phases 0–3. In particular, personalization (item 1) must not precede grounding —
adjusting an ungrounded grade amplifies an unverified claim rather than refining a verified one.

**Migration / refactoring requirements.** Only the server/client data boundary work, and only if Phase 3's
bundle-size assertions show it is needed. Do not undertake the `src/lib` layer reorganization unless the
engine registry has become unmaintainable.

**Testing requirements.** Every new feature ships with: pure-engine unit tests, a reachability guard
proving it is wired from production, a copy↔computation binding test proving rendered claims are
engine-derived, and a component test if it renders a safety-relevant value.

**Security requirements.** Any new external integration requires a threat review before merge. Any new
paid-API endpoint inherits the Phase 2 rate-limit and budget requirements.

**Exit criteria (measurable)**
- [ ] Each shipped item meets its own plan's success criteria, with no "partial" left unexplained.
- [ ] No subsystem classified prototype-only in an updated `docs/project-status.md`.
- [ ] Coverage thresholds hold across all engines; CI green on `main` continuously.

---

## Commercial / scale readiness — explicitly out of scope

There is **no evidence in this repository** justifying scale engineering, multi-region architecture,
microservices, or a commercial-tier plan. The corpus is 15 supplements; the user base is one demo
account. Introducing that work now would be speculative enterprise architecture, which `CLAUDE.md`
prohibits.

Revisit only when driven by measured evidence — real user load, real cost data, or a deliberate
commercial decision recorded in `docs/product-direction.md`.

---

## How to use this roadmap

- **A phase is not a sprint.** Phase 0 is roughly a day; Phase 3 is substantial. Size them at start.
- **Do not start a later phase while an earlier phase has unmet exit criteria.** If pressure demands it,
  record the exception in this file with a reason — do not proceed silently.
- **This file is the sequencing authority.** If a plan document or `CLAUDE.md` disagrees about what comes
  next, this file wins — unless the user says otherwise.
- **Update the phase status line** when a phase starts or completes, and update `docs/project-status.md`
  when classifications change.
