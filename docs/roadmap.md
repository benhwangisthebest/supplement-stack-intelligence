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

**Phase status (updated 2026-08-06):** Phase 0 — **complete with follow-up**. All nine units (U1–U9)
shipped and are public, plus four post-review remediations — R1 `a338370`, R2 `ea5b270`, R3 `9e9e15d`,
R3b `1792f9f` — and the documentation and record-correction commits that followed them. CI is green on
`main`; the authoritative run for any commit is the GitHub Actions `CI` run whose head SHA is that
commit. **Phase 1 — complete with follow-up (2026-08-06)**: the plan at
`docs/01-plan/phase-1-verification-integrity.plan.md` is **APPROVED** and all of its units (U1–U21, plus
the FU-23 rider) shipped; **10 of 11 exit criteria are met and one is PARTIAL** — U17's live-E2E half is
**BLOCKED(env)** on credentials no agent can supply. Outcome:
`docs/04-report/phase-1-verification-integrity.report.md`.
**Phase 2 — COMPLETE WITH FOLLOW-UP (2026-09-22).** The plan is
`docs/01-plan/phase-2-operational-dependability.plan.md`, **status APPROVED** (rank 5 under `CLAUDE.md`
§6), with its **§10 Closeout** approved 2026-09-22. All 28 units shipped; **all 19 exit criteria are met**
and the register is contiguous at **N-1…N-77 · FU-1…FU-46 · OP-1…OP-7**. An independent four-reviewer
Check — `docs/reviews/phase-2-closeout-check.md`, findings **P2-1…P2-13** — returned **COMPLETE WITH
FOLLOW-UP**; four of its findings were remediated in code at landings (d1)/(d1b) and the rest dispositioned
at (d2). Outcome: `docs/04-report/phase-2-operational-dependability.report.md`.
**What "with follow-up" means here, named rather than implied:** **OP-5** carries three UNKNOWNs (the DPA
page returned HTTP 403); the **live E2E half stays BLOCKED(env)** by ruling 3; and **N-11, FU-41, FU-43 and
FU-44 all wait on the same thing — a logging sink that does not exist.** Observability is classified **B**
by ruling and was **measured X** on the sink alone; both readings are recorded in `project-status.md` §2.8.
~~Planning (2026-08-06): a DRAFT plan exists; it is not approved and authorises nothing.~~
~~No Phase 2 unit has been executed.~~ ~~**Phases 3–4 — not started.**~~ ~~**[2026-09-22] Phase 3 — STARTED**: its plan is **APPROVED** and all seven decisions D-1…D-7 are ruled; **no unit has been executed.**~~ **[2026-09-25] Phase 3 — COMPLETE WITH FOLLOW-UP** (declared on the owner's go, 2026-09-25). All eleven units (U0–U10) are DONE. The independent closeout Check returned COMPLETE WITH FOLLOW-UP (P3-1…P3-11); its remediations have landed, and a delta check found 7 ADDRESSED, 4 CARRIED-WITH-OWNER and 0 NOT ADDRESSED. Every carried item has an owner, for Phase 4 (report §10). See the Phase 3 section for the full status. ~~**Phase 4 — not started.**~~ **[2026-09-25] Phase 4 — IN PROGRESS:** plan `docs/01-plan/phase-4-product-completion.plan.md` **APPROVED** with owner rulings D-1…D-16; no unit executed.

**Two Phase 2 items were already delivered out of order** and the plan marks them so rather than
scheduling them: item 5's reference-ID manifest (`src/data/id-manifest.json` (**[2026-09-25, Phase 4 U3]** moved to `content/id-manifest.json`) +
`src/data/id-stability.test.ts`, delivered by Phase 0 U8 — its exit criterion is already met) and the
`execute.ts` rollback-failure correlation-ID log named inside item 1's text (delivered by Phase 1 U20,
`d08885c`). Items 1 and 2 are additionally **part-delivered**: correlation-ID logging exists but without
`path`/`userId` and with no sink beyond `console.error`, and raw-error disclosure is fixed and enforced
while the substring dispatch it names survives at `src/lib/api/respond.ts:247`.

**The plan raised six decisions for the repository owner; all six were ruled on 2026-08-08** and are
recorded in the plan's §7 beside the options each chose. Four of them change something a reader of *this*
document needs to know:

1. **FU-27, the fourth nav pill → move the Advisor out of the pillar group.** The three-item rule in
   `CLAUDE.md` §1 is **not** relaxed; the shipped code moves to meet it (plan unit **U24**).
2. **U-DEFER-4 → Phase 2 opens with it outstanding, by dated exception.** Recorded beside the criterion
   itself, below. The criterion stays on the books.
3. **Live E2E in CI → non-live only; no secrets enter this public repository.** The `[LIVE]` half is an
   owner-run local baseline. See Phase 1 items 6–7.
4. **Two Phase 2 exit criteria were unmeetable as written and are reworded below**, each struck in place
   with its reason: "deployed schema matches migrations, verified in CI" needed live credentials that
   ruling 3 refuses, and "export and delete their own data end to end" cannot delete the auth identity
   without the service-role key that `CLAUDE.md` §2.3 rule 14 confines.

The remaining two: **`enforce_admins` is ruled to be flipped to `true`** — a repository setting, so it is
executed rather than scheduled as work. **[2026-08-08 — done: `enforce_admins: true`, GET-verified**, with
ruleset `main-integrity` unchanged; the Phase 0 criterion below is annotated accordingly.] And the **slug manifest gains a `publicSurfaces` field**
rather than declaring a persistence site slugs do not have.

"Complete with follow-up" is deliberate: **one Phase 0 exit criterion below** remains unmet and is
annotated in place. (Phase 1 also closes with exactly one non-met criterion — its live-E2E half — so
this sentence names the phase explicitly to stay unambiguous.) The independent final Check **ran 2026-08-02** — first-pass verdict **NOT CLOSED** against
`0d9e008`. Its findings, the re-check of each after remediation, and the final certification are
recorded in `docs/05-qa/phase-0-final-check.md`; that document is the authority on the Check, and this
line deliberately does not restate its verdict.

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
3. **[U-DEFER-1 — deferred, NOT delivered]** Tag `v2`…`v13` retrospectively at their commits; push tags;
   delete the ten stale branch labels locally and on origin. Tags are immutable and push; branch labels
   are neither. *Deferred: the chain cannot support honest tags — v12 `51d2134` precedes v11 `d89cf1c`.
   0 tags exist. As measured 2026-08-02, 9 remote `feat/*` branches remained; merged-branch cleanup at
   Phase 0 close is a separate approved step (`CLAUDE.md` §10.1) — see `docs/05-qa/phase-0-final-check.md`
   for the end state.*
4. Add CI: `npm ci && npm run typecheck && npm test && npm run build`. **[Delivered `374d7c9`;
   "required on `main`" delivered 2026-08-03 — U-DEFER-3 / C-6 closed, see the exit criteria below.]**
5. Extend `src/architecture/boundaries.test.ts`: add `src/services` and `src/data` to the scanned
   layers; add a `DATA_IS_A_LEAF` rule (`src/data/**` may import only `src/types/**`); add a
   tree-partition sanity test asserting every top-level `src/*` directory is either scanned or in an
   explicitly-justified exemption list.
6. **[U-DEFER-6 — deferred in Phase 0; DELIVERED 2026-08-05 by Phase 1 U18]** Promote the domain-purity
   rule to enforced: listed engine directories may not import `@/lib/db`, `@/lib/supabase`, `@/services`,
   `@/app`, or `next/*`. ~~*Would fail today at three `src/lib` files.*~~ Now enforced as
   `DOMAIN_IS_PURE` in `src/architecture/boundaries.test.ts`, scoped to all of `src/lib` except four
   named exemptions (`auth`, `api`, `supabase`, `db`); the three violating files are a **ratchet**
   allowlist whose entries must still violate, so the list can only shrink. See
   `docs/02-design/architecture-boundaries.md`.
7. **[U-DEFER-4 — deferred, NOT delivered]** One-line fix: change Vitest `include` to
   `src/**/*.test.{ts,tsx}` so `.tsx` tests stop being silently ignored, and add a jsdom environment path
   for component tests. *Zero `.test.tsx` files exist today, so this is latent.*
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
measured 524/524 across 42 files at Phase 0 close and **859/859 across 73 files at Phase 1 close
(2026-08-06)**. The requirement is "green", not a fixed count.
Every guard added in U7, U8, R1, R2, R3 and R3b was mutation-checked at execution time; what is
**durably evidenced in `docs/`** differs by unit — see
`docs/04-report/phase-0-integration-enforcement.report.md` §6 for the distinction, and
`docs/05-qa/phase-0-final-check.md` (reviewer R-A) for the independent re-execution.)*

**Security requirements.** Confirm no secret was ever committed, now that history is pushed (the review
could not check history). *(Verified 2026-07-30: `.gitignore` correctly excludes `.env` / `.env*.local`;
zero `.DS_Store` tracked.)*

**Exit criteria (measurable)** — assessed 2026-08-02 against `main` @ `1792f9f`.

- [x] `git log main..HEAD` empty; `main` contains `boundaries.test.ts` and the v13 anti-fabrication guards.
- [x] `git status` clean; local and `origin` refs for `main` identical.
- [x] ~~Tags `v2`…`v13` on origin;~~ zero `feat/*` branches remain. **Branch half: MET** — all merged
      branches were deleted at Phase 0 close on 2026-08-03; `main` is now the only branch, local and
      remote. **Tag half: RETIRED 2026-08-03 by user ruling** (`docs/01-plan/phase-1-verification-integrity.plan.md`
      §7 decision 4), not quietly dropped. **Why it was retired, recorded per `CLAUDE.md` §7:** the chain
      cannot support honest *ordered* tags — v12 (`51d2134`) precedes v11 (`d89cf1c`) in history — and
      `CLAUDE.md` §10.4 forbids rewriting the chain to fix it. Tagging anyway would publish immutable
      labels that misdescribe the order of the work. **Milestone identity already exists** and is more
      accurate: the per-feature records under `docs/archive/2026-06/` and `docs/archive/2026-07/`, whose
      `_INDEX.md` files are the project's real status record (`CLAUDE.md` §9). A tag would add a second,
      worse identity for the same thing. **The underlying risk this criterion controlled — that milestone
      boundaries become unrecoverable — is therefore already controlled elsewhere.** `git tag` stays
      empty, which also keeps the Phase 0 plan's own criterion 11 satisfied.
- [x] **MET 2026-08-03 (U-DEFER-3, closeout finding C-6).** CI runs on every PR into `main` and on **every
      branch push**, and is green. `main` is now protected: ruleset `main-integrity` forbids deletion and
      non-fast-forward updates with **no bypass actor**, and branch protection **requires the
      `typecheck / test / build` check** on the pushed SHA (`strict: true`). The Phase 0 spec's fourth
      sub-requirement, "require PR", was **retired by recorded amendment** — see
      `docs/01-plan/phase-1-verification-integrity.plan.md` §8.6: it predates the `branches: ["**"]`
      trigger that made PR-based CI coverage redundant, and a PR flow would rewrite SHAs and so weaken the
      very property the ff-only flow guarantees. ~~**Stated limitation, not claimed closed:**
      `enforce_admins: false`, so the required check is a guardrail against accident, not a control
      against a determined admin.~~ **[2026-08-08] That limitation is closed: `enforce_admins: true`.**
      Flipped by Phase 2 plan §7 decision 4 and GET-verified. The required check now binds the repository
      admin, so the ff-only flow cannot be walked past by accident. **The residual is narrower and is
      still not claimed closed:** an admin can reconfigure the protection itself — no branch-protection
      setting defends against the account that owns the settings.
- [x] `boundaries.test.ts` scans ≥ 5 top-level layers (**5**: `src/types`, `src/components`, `src/lib`,
      `src/services`, `src/data`); each new rule verified red-then-green.
- [x] ~~**Unmet — deliberately deferred (U-DEFER-4, closeout finding C-12).**~~ **[2026-09-25, N-86] MET:** met since Phase 3 U0 (the `jsdom` project in `vitest.workspace.ts` collects and runs `.test.tsx`), and closed in full by Phase 3 U10. This item's description, the notes below, and the U-DEFER-4 text at the top of this file, in the Phase 0 section and in the Phase 3 section are historical as of this date. A `.tsx` test placed anywhere
      under `src/` is collected and executed. `vitest.config.ts` collects only `src/**/*.test.ts`. Zero
      `.test.tsx` files exist today, so this is latent rather than active.

      > **[2026-08-08] Dated exception — Phase 2 opens with this criterion outstanding.** This document's
      > own ordering rule says *"a later phase may not start while an earlier phase's exit criteria are
      > unmet"* (see the top of this file). Phase 1 opened and closed against that rule with this criterion
      > unmet, without ever saying so. **This note makes that decision explicit rather than implicit, and
      > extends it once, to Phase 2.**
      >
      > **Why.** The criterion's cost is not the one-line `include` change — it is a **jsdom/RTL component
      > harness**, which Phase 1 explicitly excluded and the Phase 2 plan excludes again (§3). Adding one
      > to satisfy an ordering rule would import a testing decision on the wrong grounds and at the wrong
      > time. The risk the criterion controls is *silent* omission, and that risk is already controlled:
      > **C-12 is closed** — Phase 1 U13's `HARNESS_GAP` ~~makes~~ made a tracked-but-uncollected `.tsx` test fail
      > **loudly**. What remains open is making such a test **run**, which is a capability, not a hole.
      > **[2026-09-23, Phase 3 U0 — FU-51]** That capability now exists: U0 (`0389a6b`) added a `jsdom`
      > vitest project that runs `src/**/*.test.tsx`, and retired `HARNESS_GAP` for `TEST_COLLECTION`
      > (`src/architecture/boundaries.test.ts:570`), which requires every tracked test file to run exactly
      > once, in its own project. U-DEFER-4 is **RE-SCOPED**, not closed; the deferred `.tsx` tests are U7's.
      > **The distinction is easy to blur and is the whole basis of this exception.**
      >
      > **What was rejected.** Retiring the criterion, or re-scoping it down to what U13 delivered. Both
      > lower the bar instead of clearing it. **The criterion stays on the books, unchanged.**
      >
      > **Owner: the phase that introduces component testing.** Until such a phase exists this has a named
      > owner-*condition* rather than an owner — stated that way because pretending otherwise would make
      > the register look tidier than the project is. **This exception licenses nothing inside Phase 2**:
      > ~~`HARNESS_GAP` still hard-fails on a tracked `*.test.tsx`~~, which is why Phase 2's UI-touching units
      > (U19, U24) are specified around source-level assertions instead.
      > **[2026-09-23, Phase 3 U0 — FU-51]** The struck clause was true for all of Phase 2 and is no longer
      > true: U0 (`0389a6b`) retired `HARNESS_GAP`, and a tracked `*.test.tsx` now runs under `jsdom`.
- [x] Coverage report lists `src/app`, `src/services`, `src/components`, `src/lib/db` — `include` is
      `src/**/*.{ts,tsx}` since `8b1bd16`.

> **On the one unmet criterion** (U-DEFER-4, `.tsx` collection). Of the original three: U-DEFER-1 (tags)
> was **retired** by ruling on 2026-08-03 with its rationale recorded in place, and U-DEFER-3 (branch
> protection) was **met** on 2026-08-03. It is annotated above with the U-DEFER item that deferred it, so a
> deliberate deferral is distinguishable from an omission (`CLAUDE.md` §7). Phase 0 is therefore
> **complete with follow-up**, not unconditionally complete.
>
> The `fix/**` / `docs/**` CI-trigger gap is **not** one of these — it is a follow-up, recorded in
> `docs/04-report/phase-0-integration-enforcement.report.md` §5, not an exit criterion.

---

## Phase 1 — Verification integrity

**Objective.** Make a green test run mean something. Close the gap between "408 tests pass" and "the
product's critical paths are verified." (The figure in that gap was 408 when this phase was written;
the baseline was 524 across 42 files when it began and **859 across 73 files at its close (2026-08-06)**,
which does not change the argument.)

**Included work** — *items without an explicit marker below were all delivered; see the per-item notes.*
1. **[DONE 2026-08-04 by U1–U4]** **Route-handler tests** for all **23** routes (measured 2026-08-02; the figure was ~22 when written): unauthenticated → 401, invalid body → 400 with the
   correct envelope, happy path with a mocked Supabase client. Call exported handlers directly; no live server.
2. **[DONE 2026-08-05 by U7 + U8]** **Mapper + schema-contract tests.** Unit-test every `mappers.ts`
   function with representative row fixtures. Add a conformance check binding `supabase/migrations/*.sql`
   to `src/lib/db/types.ts`. Delivered as `src/architecture/schema-type-drift.test.ts`, which binds 12
   tables to 12 row types **totally in both directions** with no exemption list; `mappers.ts` is at 100 %
   statements.
3. **[DONE 2026-08-04 by U10]** **`execute.ts` unit tests** — the LLM-driven write path — independent of
   live E2E: correct repo call and correct inverse-intent construction per proposal type, including
   rollback. 24 pins; `execute.ts` at 100 % statements.
4. **[DONE 2026-08-04 by U9]** **`validation/schemas.ts` tests** — accept/reject boundaries per field.
   40 tests; 100 % statements.
5. **[DONE 2026-08-04 by U12]** **Extend the reachability guard** from 2 of 7 to all 7 context fields
   threaded into `evaluateStack`, and write the pattern down so future engines get one by default. The
   pattern is recorded in `docs/02-design/architecture-boundaries.md`, and an anti-drift test fails if an
   eighth field is passed without a matching row.
6. **Fix E2E honesty:** ~~set `workers: 1` or give each spec a per-worker user fixture (the latter is the
   prerequisite for CI E2E); point `webServer` at `npm run build && npm run start`; tag gated describes
   `[LIVE]` explicitly rather than relying on the ambiguous `L1/L2/L3` convention.~~ **DONE 2026-08-06 by
   Phase 1 U16.** `workers: 1` + `fullyParallel: false` under `E2E_LIVE`, `webServer` on
   `npm run build && npm run start`, and 18 gated blocks tagged across 17 files — enforced both ways by
   `src/architecture/e2e-live-tagging.test.ts`. The per-worker user fixture is **not** done and remains the
   prerequisite for CI E2E; serialising is the available fix, not the complete one.

   > **[2026-08-08] The E2E posture is now a ruling, not an open question.** **CI runs the non-live suite
   > only. No Supabase or Anthropic secret enters this public repository** — the exfiltration argument is
   > `docs/reviews/phase-0-plan-review.md` §P-03. The **`[LIVE]` half stays an owner-run local baseline.**
   >
   > What this settles and what it does not: it does **not** close FU-25 (per-worker isolation) or make the
   > live half unnecessary — it settles that neither will be closed *by adding secrets to CI*. The seven
   > environment items recorded as BLOCKED in `docs/05-qa/phase-1-live-e2e-baseline.md` §2 are still the
   > entry condition for a live run; that run is now scoped to the owner's machine, so **what blocks it is
   > scheduling, not credentials-in-CI.** A CI E2E job over the credential-free specs remains achievable
   > and is Phase 2 plan unit U22 — which is in that plan's **cuttable** group.
7. **Establish a dated live-E2E baseline** with all env vars set, replacing the contradicted ~~"61/71"~~ and
   ~~"79/10"~~ figures. Investigate the on-disk `fetch failed` login artifact. **PARTIAL 2026-08-06 by
   Phase 1 U17** → `docs/05-qa/phase-1-live-e2e-baseline.md`. The **non-live** baseline is measured and
   dated (59 passed / 30 skipped / 0 failed at `4246044`, against a production build). The **live** half is
   **BLOCKED(env)**: it needs a live Supabase project, migrations 0003–0007, a seeded demo user and
   `API_ANTHROPIC_KEY` — none available to an agent. The `fetch failed` artifact **is investigated and
   resolved**: reproduced from source, it proves the Supabase env WAS set and the host was unreachable, so
   it was never an Anthropic-key problem. The artifact itself is gone from disk and was never tracked.
8. **[DONE 2026-08-05 by U13]** Extend coverage **thresholds** from `stack-evaluator` alone to every pure
   engine directory. 14 directories carry floors in `vitest.config.ts`, every number `measured − 10`, and
   CI gained a `Coverage thresholds` step. "Every pure engine directory" resolved to **14 of 20**
   `src/lib/*`: the four `IMPURE_BY_DESIGN` dirs are excluded by definition, and `src/lib/advisor` and
   `src/lib/identity` are excluded because each still holds a ratchet violation — thresholding them would
   assert a purity claim U13 had not established.

**Excluded work.** No product features. No content grounding. No component-test backfill beyond
safety-critical components. No new engines. **No observability (Phase 2) — with one recorded exception:**
U20 added the correlation-ID log for `execute.ts`'s swallowed rollback failure, which is Phase 2 item 1's
own text. Taken early because U10's rollback pins made the gap visible and the fix was two lines; recorded
here rather than left as an unexplained overlap.

**Prerequisites.** Phase 0 — CI must exist, or these tests can silently stop running.

**Migration / refactoring requirements.** ~~Extract the advisor confirm-and-apply orchestration (~190 lines
in `src/app/api/advisor/actions/route.ts`) into `src/services/advisor-actions.ts`…~~ **DONE 2026-08-04 by
U11**, the phase's only rank-1 refactor. The route is now **40** lines (auth → parse → delegate → respond)
and the orchestration lives in `src/services/advisor-actions.ts` (**196** lines). Proven
**behaviour-preserving** by Gate C1: all 8 outcome triples pinned before the move and re-run **unedited**
after it.

**Testing requirements.** Every guard added here must be mutation-verified red-then-green. This is a
project-specific lesson: v11 shipped an analysis that *recommended* a regression guard and shipped
without one; the omission was caught only by explicit mutation testing.

**Security requirements.** ~~Add enforced tests that (a) every `src/app/api/**/route.ts` calls the auth
helper, and (b) every migration creating a table also enables RLS with a matching policy — converting
today's perfect-but-conventional compliance into an enforced rule.~~ **DONE 2026-08-04 by U5 and U6:**
`src/architecture/auth-coverage.test.ts` (13 tests) and `src/architecture/rls-coverage.test.ts` (14),
both shown red against a `git add -N`-staged non-compliant new file.

**Exit criteria (measurable)** — re-measured 2026-08-06 at Phase 1 close. The authoritative, fuller list
with per-criterion evidence is `docs/01-plan/phase-1-verification-integrity.plan.md` §10; this is its
summary and must not disagree with it.

- [x] Every route file has ≥ 1 test each asserting 401, 400, and the happy path. — 23/23 route test files.
      **400 applies only where the file validates request input**; the 9 structurally-exempt files are
      enumerated in plan §10.1. As originally worded this criterion was not mechanically decidable.
- [x] `mappers.ts` statement coverage ≥ 90%; `execute.ts` ≥ 80%; `validation/schemas.ts` ≥ 80%. — **100 %
      / 100 % / 100 %**.
- [x] A schema↔type drift check exists and fails on a deliberately renamed column. — U8,
      `src/architecture/schema-type-drift.test.ts` (23 tests).
- [x] Reachability guard covers 7/7 `evaluateStack` context fields. — U12.
- [~] A dated live-E2E run exists with zero unexplained failures, reproducible in CI. — **PARTIAL.**
      Non-live half measured and dated; live half **BLOCKED(env)**. The "reproducible in CI" clause was
      **retired by ruling 5** — a CI E2E job is out of Phase 1's scope, so requiring it here would make
      the criterion unmeetable. It moves to whichever phase adds that job (blocked on FU-25).

      > **[2026-09-25] Dated exception: Phase 4 opens with this criterion outstanding** (owner ruling D-12 (a),
      > `docs/01-plan/phase-4-product-completion.plan.md`). This is the first recorded exception for this box. Phases 2 and 3 opened
      > against it with no record. **It expires at Phase 4 closeout, which requires an owner-run live baseline**
      > (a Phase 4 closeout exit condition).
      > **Reason:** Phase 4's approved scope (carried correctness plus item 1's plan revision) does not depend on
      > the live half. The live run is owner-run under ruling 3 and has not been scheduled, and a hold would stall
      > deterministic work behind a scheduling constraint.
- [x] Auth-coverage and RLS-coverage tests fail on a deliberately non-compliant new file. — U5 and U6,
      both proven **both ways** per §4.2: false green unstaged, red once `git add -N`'d.
- [x] Coverage thresholds configured for every pure engine directory; enforced in CI. — U13, 14
      directories; see included-work item 8 for what "every" resolved to.

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
- [x] **[P2-X1]** ~~Every 5xx~~ **Every 5xx that reports an unexpected failure** has a correlating
      server-side log entry with a correlation id; **a declared operational state answers without one, by
      ruling**; zero raw internal messages in any client response (test-enforced).
      > **[2026-09-22, (d2)] RE-WORDED on Check finding P2-1, with the decision cited — which is the whole
      > point of the rewording.** The old text said *every 5xx*, and `ecc:architect` re-derived **three**
      > sites that answered 5xx while returning before any log ran. C15 carries a formal reworded-criterion
      > citation; this one did not, and `docs/roadmap.md`'s own tick-note had silently substituted *"every
      > unexpected error"* for *"every 5xx"* — a redefinition doing real work with nothing ratifying it.
      > **The two carve-outs are now IN the criterion instead of under it:**
      > **(1) `NOT_CONFIGURED` → 503 is a DECLARED OPERATIONAL STATE (U1's ruling)** — it mints no id and
      > writes no record deliberately, because an unset environment variable is a known state, not an
      > exception, and every `handle()`-wrapped route answers it identically. Pinned by
      > `DECLARED_OPERATIONAL_STATES`, **imported** by the guard rather than re-typed (that re-typing was
      > the closeout's own HIGH 1).
      > **(2) The middleware's pre-handler window is FU-43** — `supabase.auth.getUser()` runs in the Edge
      > runtime before any handler exists, so no route-level window can reach it and there is no sink there
      > to reach. **It is the last item of `ecc:security-reviewer`'s (A) enumeration inside the request
      > path**, and it is a follow-up rather than a defect-to-fix because the missing half is the sink.
      > **What the closeout actually closed, so the carve-outs are not doing hidden work:** P2-R1 (d1)
      > routed every unexpected 5xx through the logger and fixed `extract/route.ts` discarding the real
      > exception; P2-R4 and N-76 (d1b) guarded both `handle()`-exempt routes, **from their first
      > statement**. **FU-44** records the three surfaces outside `handle()`'s reach entirely.
      > **[2026-09-22] TICKED AT LANDING (b) — ON THE CRITERION AS WRITTEN, and the gap between that and
      > item 1's ambition is stated rather than absorbed.** Both clauses hold: `handle()` writes a
      > structured record carrying a correlation ID, the public error code and the error's
      > name/message/stack/cause on every unexpected error, returning the same id to the client; and
      > `error-disclosure` scans `src/app/api/**`, `src/services/**` and `src/lib/**` with a violation list
      > of `[]` and **no allowlist**, test-enforced on every push.
      > **What is NOT claimed by this tick:** item 1's *"target a real sink, not `console.error` alone"*.
      > There is no logging library, no error-reporting service, no request ids outside the error path and
      > no aggregation. That is **item 1's residue, not this criterion's** — the criterion says *server-side
      > log entry*, and one exists. The residue is carried as **N-11 + U23's cut** (Phase 2 plan §10.7) and
      > is the reason `docs/project-status.md` §3 classifies Observability as a **bounded refactor**
      > rather than production-suitable.
      > *(This is C15's shape a second time: a criterion narrower than the ambition that produced it. Ticked
      > because it is met as written; the shortfall is named where shortfalls live.)*
      > **[2026-09-22, (d2)] The note above says "every unexpected error" where the criterion said "every
      > 5xx".** That substitution was doing the carve-out's work informally. It is now in the criterion
      > text, cited. **Re-ticked on the re-worded text** against (d1) `bac5928` and (d1b) `a27ab0a`.
- [x] **[P2-X2]** A concurrent-request test proves the daily token budget cannot be exceeded.
      > **[2026-09-22] TICKED AT LANDING (b), in the same edit as the Phase 2 plan's §8 copy — because
      > `CRITERIA_PARITY` refused the commit that ticked only one.** U4 (`54ef19b`) closed **both** races,
      > each with its own red: `getRemainingBudget` → `recordUsage` at **M14**, and the select-then-upsert
      > **inside** `recordUsage` at **M15**, which was *losing* usage. The fake is stateful and yields at
      > the start of every operation; without that yield the old implementation passes and the test proves
      > nothing. Red text: `docs/04-report/phase-2-operational-dependability.report.md` §3.1.
- [x] **[P2-X3]** Rate limits enforced on both LLM-backed routes, with tests.
      > **[2026-09-22] TICKED AT LANDING (b).** `PAID_API_BUDGET` derives the governed set from the import
      > graph rather than from a list, so a third paid route is a red build on the day it is written; today
      > it is pinned at exactly two, `/api/advisor` and `/api/lab-import/extract`, each asserting 429.
- [x] **[P2-X4]** Client disconnect provably terminates the advisor loop.
      > **[2026-09-22] TICKED AT LANDING (b).** Two assertions in `src/app/api/advisor/route.test.ts`: the
      > adapter's call count stops, **and** `settleUsage` is called with the reserved amount — so the
      > disconnect settles the billing rather than leaving the reservation charged for the day.
- [x] **[P2-X5]** `replaceFlags` atomicity test passes under induced insert failure.
      > **[2026-09-22] TICKED AT LANDING (b).** Shown red against delete-first. **Narrower than "atomic",
      > deliberately:** the operation is still three round trips with no transaction around them, and that
      > residue is carried openly in the Phase 2 plan §10.7. What the criterion asks — *prior flags survive
      > an induced insert failure* — is what is proved.
- [x] **[P2-X6]** ID manifest exists; removing a published ID fails CI.
      > **[2026-09-22] TICKED AT THE PHASE 2 CLOSEOUT — met before this phase opened, by Phase 0 U8.**
      > `src/data/id-manifest.json` (**[2026-09-25, Phase 4 U3]** moved to `content/id-manifest.json` by a pure rename) (**328 lines**) is read from disk by `src/data/id-stability.test.ts`
      > as an **independent checked-in ledger**, never derived from the arrays it validates; U20 closed the
      > header's false "eight namespaces" by **removing** the count (FU-32). This document's own
      > lines 35–37 have recorded the out-of-order delivery since 2026-08-08 — *"its exit criterion is
      > already met"* — and the box was never ticked, because a sentence in a preamble and a checkbox in a
      > list had nothing binding them. It now has a counterpart in the Phase 2 plan's §8 under the same
      > id, and `CRITERIA_PARITY` binds the tick states in both directions.
- [x] **[P2-X7]** **[REWORDED 2026-08-08 · MET 2026-08-12 by U15]** `db:migrate` exists, and **CI proves the migration set is coherent** by
      applying every file in `supabase/migrations/` in order to a **throwaway Postgres** and failing on the
      first error. ~~`db:migrate` exists; deployed schema matches migrations, verified in CI.~~
      *Why:* verifying against the **deployed** database needs live credentials in CI, which the 2026-08-08
      secrets ruling refuses for a public repository — so the original clause was unmeetable, not merely
      hard. **Residue stated, not dropped:** matching the *live* database remains a **dated manual
      record**, exactly like the live-E2E baseline.
      > **[2026-08-12] HALF DELIVERED BY U15, AND DELIBERATELY NOT TICKED YET.** `db:migrate` exists and
      > CI proves the set coherent — every file applied in order to a stock `postgres:16` behind a
      > labelled test double for Supabase's `auth` schema, which the set cannot apply without (10 FKs to
      > `auth.users`, 43 `auth.uid()` calls; the criterion's own instrument did not exist — **N-39**).
      > **The box stays unticked until two things exist: a green CI run of the new step on a pushed SHA,
      > and the dated record** (`docs/05-qa/2026-08-12-deployed-schema-record.md`, owner-run) that
      > discharges the stated residue. A criterion whose CI half has never been green is a claim about a
      > YAML file — U14's N-29 lesson, applied here rather than re-learned.
      > **[2026-08-12] BOTH CONDITIONS NOW MET, SO THE BOX IS TICKED.** The coherence step is green on runs
      > `31560224886` and `31560792889` (1–2 s; the Postgres service container adds ~20–24 s), and the
      > owner-run record `docs/05-qa/2026-08-12-deployed-schema-record.md` is complete — **all three parts
      > PASS**, discharging the live-database residue and, in the same sitting, **OP-3** and **N-28**.
- [x] **[P2-X8]** Security headers present, verified by a response-header test.
      > **[2026-09-22] TICKED AT THE PHASE 2 CLOSEOUT, and the deliberate divergence is RETIRED.** The
      > Phase 2 plan's §8 ticked this on 2026-08-10 for the config half and recorded the response half as
      > developer-run (**N-29**); this copy was deliberately left unticked while that split held. **U14
      > discharged it on 2026-08-11** — `61ad255`, green on run `31473581501` (`a1a9fc0`, full non-live
      > suite, 70/30) — so both halves have been enforced on every push since, and the reason for the
      > divergence expired that day. It survived here for thirteen months of commits because nothing read
      > both lists. `CRITERIA_PARITY` now does.
- [x] **[P2-X9]** **[REWORDED 2026-08-08]** A user can **export their data and delete all of it across the 12 tables**,
      with the **surviving auth identity stated in the response**.
      > **MET 2026-08-17 — U16 (export, `a087715`) + U17 (deletion, `55c74f6`).** `GET /api/account/export`
      > returns all twelve tables with a `notIncluded[]` statement of what it omits; `DELETE /api/account`
      > empties all twelve behind a typed confirmation literal and reports per-table counts plus the two
      > **retained** items — the `auth.users` identity and the rate-limiter counters — in the response body,
      > which is the half of the criterion the rewording added.
      > Deletion completeness, both cascades, the `SET NULL` on `advisor_actions` and **cross-user
      > isolation** are proved by `npm run verify:migrations` against a real Postgres — CI runs
      > `31875356506` and `32013610775`, whose summary enumerates each claim because the section that
      > proved it appended it. The deployed function's shape is the owner-run record
      > `docs/05-qa/2026-08-17-op7-deletion-function-sitting.md` (**OP-7**, all four steps PASS): no
      > parameters, empty `search_path`, `28000` on a null `auth.uid()`.
      > **Not proved anywhere, and deliberately:** no live deletion has been run against the deployed
      > database, and none should be.
      ~~A user can export and delete their own data end to end.~~
      *Why:* deleting the `auth.users` row needs the service-role key, which `CLAUDE.md` §2.3 rule 14
      confines to the dev seed script — so "end to end" could not be satisfied by any compliant
      implementation. The rewording narrows the **claim**, not the work: all 12 tables are still emptied,
      and the part that cannot be deleted must be told to the user rather than discovered by them.

---

## Phase 3 — Evidence grounding (the trust layer)

**Status.** ~~**STARTED — 2026-09-22.**~~ **COMPLETE WITH FOLLOW-UP — 2026-09-25** (the owner's go on the phase-closed declaration). ~~**[2026-09-25] ALL UNITS DONE; CLOSEOUT CHECK COMPLETE WITH FOLLOW-UP; the phase-closed declaration is pending the owner's go.**~~ **What "with follow-up" means here, named rather than implied:** rubric work (FU-61, FU-71), a sourcing pass (FU-62), the fish-oil surrogate question (FU-68), live re-verification between closeouts (FU-72), the products coverage statement (FU-59), the uncited-row tombstone (FU-57), and DOC_TRUTH/parity instrumentation (N-85). All are owned for Phase 4. **OP-5 is OPEN and unchanged**; Phase 3 made no OpenAI call. The plan, `docs/01-plan/phase-3-evidence-grounding.plan.md`, is **APPROVED** (rank 5 under `CLAUDE.md` §6) at landing (d), after an independent review (`docs/reviews/phase-3-plan-review.md`, verdict REVISE, P-01…P-17) and a revision answering it. **All seven owner decisions D-1…D-7 are ruled.** ~~The plan carries **ten units U0–U9**, of which **one (U6) is live**. **No unit has been executed.**~~ **It carries eleven units, U0–U10** (U10 was appended on the FU-64 ruling, 2026-09-24), and **all eleven are DONE**. U6 was the live unit; U4 and the closeout (d) also made scoped live lookups (236 calls in all, $0). Outcome: `docs/04-report/phase-3-evidence-grounding.report.md`. Independent closeout Check: `docs/reviews/phase-3-closeout-check.md` (P3-1…P3-11, **COMPLETE WITH FOLLOW-UP**). Approval authorised the units in the plan's §4 and nothing beyond them.

**Objective.** Make the Library's central claim true. Today 19 of 27 effect grades are hand-typed letters
with no derivation — **four** of them Grade A (there are eight Grade A in all; the other four already
carry an `evidenceProfile`), some with zero linked papers — in a product that declares the
Library its trust layer.

> **[2026-09-22, Phase 2 closeout (d2), Check finding P2-6] PHASE 3 CANNOT SATISFY ITS OWN UI CRITERION
> WITHOUT A DECISION THAT IS NOT YET MADE.** This phase's criterion *"every surface that can show partial
> coverage states its coverage limit; **test-verified**"* needs a component-test harness that **does not
> exist**: `vitest` collects `src/**/*.test.ts` under `environment: "node"`, so a `.test.tsx` cannot run,
> and ~~`HARNESS_GAP` hard-fails any tracked one~~ **[2026-09-23, Phase 3 U0 — FU-51: no longer true. U0
> (`0389a6b`) added the harness this sentence says does not exist, and retired `HARNESS_GAP` for
> `TEST_COLLECTION`]**. That is **U-DEFER-4**, outstanding by dated exception since
> Phase 1, and its owner-condition names *"the phase that introduces component testing"* — which **this
> roadmap places in Phase 4**. So the criterion's verification method is owned by a later phase than the
> criterion. **Two ways out, and the choice is the owner's:** Phase 3 opens by building the harness, or the
> UI criterion is re-sequenced to Phase 4. **Naming the conflict is what the Check owed; deciding it is
> not.** Recorded in plan §10.7 as a residue and in report §11.
>
> **[2026-09-22, RESOLVED by owner ruling D-1(a) — landing (d) of the Phase 3 plan.]** The choice this note left open is made: **Phase 3 opens by building the harness.** It is unit **U0** of `docs/01-plan/phase-3-evidence-grounding.plan.md` (status **APPROVED**, 2026-09-22), which adds a jsdom environment and a second `vitest` project and retires `HARNESS_GAP`. **This criterion therefore needs no rewording** — (a) is the one option under which *test-verified* is satisfiable exactly as written above, and the other option (re-sequencing to Phase 4) was not taken. **U-DEFER-4 is RE-SCOPED, not closed:** its owner-condition named *"the phase that introduces component testing"*, and this ruling makes Phase 3 that phase — so the condition is **met rather than waived**, and the dated exception standing since Phase 1 ends at U0. **The conflict this note named is discharged; the note stays for the rationale (§7).**

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
   > **[2026-09-25, Phase 3 closeout (e4)]** **Bundle half: DONE** (U8: `npm run verify:bundle`, 1% headroom over a checked-in baseline, run in CI). **Seam half: UNMET** by owner ruling U8 R1. `getBiomarker` has zero call sites, so a catalog parameter could not be observed (`CLAUDE.md` §5 rule 3), and no caller was added to justify one. **Carried as FU-65**, which triggers on the first real caller.

**Excluded work.** No live PubMed ingestion — a later capability, and doing it here would reintroduce
fabrication risk. No context-adjusted evidence (Phase 4). No commerce. No new pillars.

**Prerequisites.** Phases 0–2. Specifically, the ID manifest (Phase 2 item 5) must exist before content
IDs change, and CI must be enforcing guards before large content diffs land.

**Migration / refactoring requirements.** The content format migration (item 3) is mechanical and must be
provably output-identical: codegen must emit byte-identical constants for the current corpus *before* any
content changes land on top of it. Any ID change requires a tombstone plus a data migration for existing
`stack_items`.
> **[2026-09-25, Phase 3 closeout (e4); Check finding P3-11] The table named above is wrong for the ids this phase touches.** `src/data/id-manifest.json` (**[2026-09-25, Phase 4 U3]** moved to `content/id-manifest.json`) places paper and effect ids at **`advisor_messages.citations[].refId`** (`kind='paper'` / `kind='effect-grade'`, migration 0003), not at `stack_items`. ~~Only supplement ids persist in `stack_items`.~~ **[2026-09-25, delta-check item D-1]** Supplement **and product** ids persist in `stack_items` (`stack_items.product_id`, migration 0004, per `id-manifest.json`). The phase register (§2, §4 U6) worked to the correct table. Phase 3 retired or renamed no id, so no migration was needed (`[P3-X6]`).

**Testing requirements.** Retain and extend the v13 anti-fabrication guards (no placeholder domains, no
provenance keys without verification). Add: every `paperIds` entry resolves; every grade has a profile
whose dimensions justify it; every reintroduced DOI/PMID matches a checked format and is recorded as
verified. Mutation-check each guard.

**Security requirements.** No new attack surface expected. Any ingestion tooling must be build-time and
offline — never a runtime fetch reachable from a request path.

**Exit criteria (measurable)** — *ticked 2026-09-25 at the Phase 3 closeout (e4), each against the register's `[P3-Xn]` row, re-run at HEAD in the report §3, and re-derived independently by the Check (§3 of the review)*
- [x] 27/27 effects have an `evidenceProfile`; a grade without one fails the build. — *`[P3-X1]`: 27/27 profiled, allowlist empty, G4c red on a removed profile. "Fails the build" means CI's vitest step; the type still marks the profile optional (FU-63).*
- [x] 100% of citations carry a verified DOI/PMID; guards fail red on a planted unverified citation. — *`[P3-X2]`: 37/37 cited papers, each bound to its committed resolver response (P8, closeout (e1)); P3/P7/P8 red-proved; all 37 re-resolved live at closeout (d), with 0 drift and 0 retractions. 100% of what is cited is verified; 2 effects and 26 of 135 dimensions cite nothing, by owner ruling.*
- [x] Content source of truth is non-TypeScript; codegen output byte-identical for the pre-migration corpus. — *`[P3-X3]`: U1 `f06be39`/`93e8e30`, U2 `0bbbf0a` (byte- and value-identical at migration); `CONTENT_FIDELITY` holds at HEAD.*
- [x] Every surface that can show partial coverage states its coverage limit; test-verified. — *`[P3-X4]`: U7, `CoverageLimit.test.tsx` (filesystem-derived completeness). The products remainder is FU-59, owned for Phase 4.*
- [x] A content correction can be reviewed and shipped without hand-editing `src/`. — *`[P3-X5]`: `e653b91` plus `CONTENT_EDIT_PROPAGATES`.*
  > **[2026-09-25, Check finding P3-11] Caveat, as worded above:** this holds only for corrections that **add, remove or rename no id**. Such a change needs a hand edit to `src/data/id-manifest.json` by policy; Phase 3 hand-added 18 paper ids there. **[2026-09-25, Phase 4 U3]** moved to `content/id-manifest.json`; an id-*adding* correction now touches only `content/` and GENERATED modules, proven by `ID_CORRECTION_DIFF` (`src/architecture/canonical-layout.test.ts`). A removal or rename still needs a tombstone and a data migration (rule 16), which U3 did not test. Amending this criterion's wording is the owner's decision; the caveat is recorded here in its place. **[2026-09-25, owner ruling at P3-11; delta-check item D-3] Decided: the wording is kept, and the no-id-change caveat is recorded instead of an amendment.**

---

## Phase 4 — Product completion

**Status.** **IN PROGRESS — 2026-09-25.** The plan, `docs/01-plan/phase-4-product-completion.plan.md`, is **APPROVED** with owner rulings D-1…D-16. Scope (D-3): carried correctness (Shape A) plus item 1. Items 2, 3 and 4 are OUT, to the backlog below. **No unit has been executed.** Approval authorised the units the plan's §4 marks IN, and nothing beyond them.

**Objective.** Complete the intended core product on a foundation that is now correct, verified,
operable, and grounded.

**Included work (candidates, prioritized by product value — not a commitment)**
0. **N-50 — the uniform-404 question, deferred here from Phase 2 by ruling.**
   **[2026-09-22, Phase 2 closeout (d2), Check finding P2-11.]** Registered as a **product decision about
   the API's voice**, not a defect: `NOT_FOUND_UNIFORMITY` makes every 404 answer the same bytes, which is
   correct as a security property and may be wrong as a product one — a user who mistypes a stack id and a
   user asking for someone else's get the same sentence. **Deciding whether that is the voice this product
   wants is Phase 4's, and it must be decided rather than inherited.** It was recorded in the plan and the
   report and **named nowhere in this file, the sequencing authority** — an item deferred *into* a phase
   whose own section does not name it is the N-11 shape: a disposition pointing at something that will not
   look back.
1. **Context-adjusted evidence** — resume `docs/01-plan/features/context-adjusted-evidence.plan.md`. The
   plan must be revised first: it was halted at design and assumed a `populationRelevance` seam that
   exists for only 8 of 27 effects. Phase 3 removes that blocker.
   > **[2026-08-02] Imported — the path now resolves.** Both files were untracked when Phase 0 began
   > (`docs/01-plan/phase-0-integration-enforcement.plan.md:78-79,178` listed them as "pre-existing
   > untracked docs (NOT part of Phase 0)" and forbade changing them), so neither was ever committed and
   > the move off the Desktop tree left both behind. Recovered 2026-08-02:
   >
   > - `docs/01-plan/features/context-adjusted-evidence.plan.md` — **imported byte-identical** (399
   >   lines, **SHA-1** of file content `c5ec657f…`, i.e. `shasum -a 1` — not the git blob hash).
   >   Public-repo screen: no absolute paths, no usernames, no secret-shaped
   >   values, no emails, no machine identifiers. **Zero redactions.**
   > - `docs/02-design/features/evidence-grading.design.md` — **deliberately not imported.** The Desktop
   >   copy is **byte-identical** to `docs/archive/2026-06/evidence-grading/evidence-grading.design.md`,
   >   which is already tracked here. Importing it would duplicate tracked content at a second path.
   >   Read the archived copy instead.
   >
   > `docs/product-direction.md:109` points at the plan path, which now resolves.
2. **Real product catalog** replacing the seeded 21 products, with ranking independence still test-proven. **[2026-09-25] OUT of Phase 4 (D-3) → backlog below.**
3. **Component tests + accessibility** for every component rendering a safety flag, evidence grade, or citation. **[2026-09-25] OUT of Phase 4 (D-3) → backlog below.**
4. **Longitudinal intelligence** across labs, adherence, and outcomes. **[2026-09-25] OUT of Phase 4 (D-3) → backlog below.**
5. Deferred items from `docs/product-direction.md` §7, each requiring an explicit decision. **[2026-09-25] IN only where item 1 depends on them (D-3).**

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
- [ ] **[P4-X1]** Each shipped item meets its own plan's success criteria, with no "partial" left unexplained.
- [ ] **[P4-X2]** No subsystem classified prototype-only in an updated `docs/project-status.md`.
- [ ] **[P4-X3]** Coverage thresholds hold across all engines; CI green on `main` continuously.

**Backlog: deferred from Phase 4 by ruling (2026-09-25), not scheduled.** Each needs its own approval decision to enter a phase.
- **Real product catalog** (item 2; D-3).
- **The accessibility half of item 3** (D-3).
- **Longitudinal intelligence** (item 4; D-3).
- **FU-62's sourcing pass** for glycine-sleep and zinc-deficiency (the plan's U7; D-3).
- **A logging sink** for N-11, FU-43 and FU-44 (D-7 (d): Phase 4 ships redaction with no sink).

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
