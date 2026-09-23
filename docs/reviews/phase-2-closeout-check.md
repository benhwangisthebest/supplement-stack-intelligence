# Phase 2 — independent closeout Check

**Date:** 2026-09-22 · **Subject:** `docs/04-report/phase-2-operational-dependability.report.md` and the
plan's §10, verified against the pushed SHA **`b2ab0b6`** (`main`; branch run `35679120073`, post-merge run
`35679383761`, both green).

**Verdict: PHASE 2 COMPLETE WITH FOLLOW-UP** — §6, rendered by `ecc:tdd-guide`.
**13 findings · 0 Critical · 6 Major · 7 Minor.**

> **Authorship, stated because it is the point of an independent Check.** Four reviewers each owned a
> section and authored its findings. **The session that wrote the report and the plan's §10 acted as clerk
> only: it assembled this document, attributed each section, and authored no finding and no verdict.**
> Where it verified something itself, that is marked *(clerk, re-derived)* and appears only as
> corroboration of a reviewer's claim, never as a finding of its own.
>
> Each reviewer was given three rules verbatim and bound by them:
> **1. Published docs are claims, not evidence. 2. Re-derive by command. 3. A prior review passing is not
> evidence.**

| Section | Owner |
|---|---|
| §3 criteria · §4 mutation replays · §6 verdict | **`ecc:tdd-guide`** |
| §3's negative control · the two binding guards | **`ecc:code-reviewer`** |
| OP-5 / N-63 / N-70 residues · every rank-1 claim | **`ecc:security-reviewer`** |
| §5 the register — contiguity and owner coverage | **`ecc:code-reviewer`** *(second dispatch)* |
| Report §10–§11 · the six (d) classification changes | **`ecc:architect`** |

---

## 1. Scope

**What was re-derived by command.** `git rev-parse HEAD` on every section that could run it; `npx tsc
--noEmit`; `npx vitest run` (**1420/1420, 113 files**); `npx vitest run src/architecture/` (**26 files, 380
tests**); `npx next build`; `node scripts/verify-lint.mjs` (**368 of 368, 0 errors**); `git ls-files
src/architecture | grep -c '\.test\.ts$'` (**26**); `git grep` counts for the struck C1 and C5 literal
checks; the real CI logs for `b2ab0b6` through `gh run view --log`, including the **Migration coherence**
step's catalog-level `pg_policies.cmd` output; an independent re-implementation of `baseUrlPermitted()`
against nine adversarial URLs; and **seven** self-chosen guard mutations plus **seven** guard attacks, all
on disposable `git worktree`s.

**Not checked — stated so the certification's edges are visible:**

- **The live E2E suite.** BLOCKED(env) by ruling 3; no credentials, and none should exist here.
- **Branch protection settings** (`enforce_admins`, `strict`, `required_linear_history`). Not re-derived by
  any reviewer; they rest on the plan's own `gh` records, which under rule 1 are claims.
- ~~**Register contiguity by line-by-line recount.** `ecc:tdd-guide` verified the *mechanism* and did not
  re-count N-1…74 / OP-1…7 / FU-1…39 against the register document. **No reviewer did.** This is the
  largest single gap in this Check.~~ **[2026-09-22] RETIRED — the gap is closed.** §5 was dispatched to
  nobody on the first pass, which was **the clerk's dispatch error**, recorded here and not elided: §§1–6
  were assigned by section and §5 was omitted. On the owner's instruction it was dispatched to
  `ecc:code-reviewer` as a second, separately-scoped engagement, which re-derived contiguity from section
  bounds on a disposable worktree and checked owner coverage row by row. **§5 is now verified by command**
  and produced a finding no other section had (**P2-13**). *(The error is worth its line: a Check whose
  scope is decided by one clerk inherits that clerk's blind spots, and the only thing that caught this one
  was writing the Not-checked list honestly enough that the gap was legible.)*
- **The report's 359 `M<n>` references**, spot-checked (M8, M6, M1/M1c, M5, M16 confirmed present as
  described) rather than exhaustively re-derived.
- **Deployed-database state.** Unverifiable from here by design (P-03).
- **`docs/archive/**`**, Phase 0's and Phase 1's own closures.

**Verification-posture divergence, recorded rather than smoothed over.** `ecc:architect` disclosed before
its first claim that it had **no shell tool** — `Read`, `Grep` and `Glob` only — and could not run
`git rev-parse`, `vitest`, `tsc`, `gh` or `git ls-files`. Its source-level searches are re-derivable; its
CI and branch-protection statements are not. **§6 addresses what this does to the Check's weight**, and the
disposition of its findings reflects it: the two that carry weight in the verdict (**P2-1**, **P2-2**) were
re-derived from source by `ecc:tdd-guide` before being allowed to affect it; the other four are registered
with that provenance attached.

**Repository integrity.** Every reviewer that mutated anything did so on a disposable worktree
(`/tmp/p2check`, `/tmp/p2guards`), reverted by **file-copy backup rather than `git checkout --`** (a file
under `git add -N` is restored to *empty* by a checkout), and confirmed the main checkout unmodified before
and after. **No tracked file in the main checkout was modified during certification.**

---

## 2. Findings

### Major

#### P2-1 — `[P2-X1]`/R1's first clause is false as written, and the half that is tested is unbound
**Severity: Major** · Raised independently by **`ecc:code-reviewer`** and **`ecc:architect`**; adjudicated
and confirmed by **`ecc:tdd-guide`** from source.

Two reviewers reached this from opposite directions and the readings compose rather than conflict.

`ecc:architect` re-derived three sites that answer 5xx while returning before `logInternalError()` runs:
`src/lib/api/respond.ts:272` (`NotConfiguredError` caught inside `handle()`'s catch, returns
`fail(…, 503)` before `internalError()`); `src/app/api/advisor/route.ts:101` (returned before `handle()` is
entered at all — the route's `POST` is not wrapped, per its own comment at line 84);
`src/app/api/lab-import/extract/route.ts:91` (a **local** `try/catch` intercepts `ExtractionError` and
returns `fail(…, 502)`, so `handle()`'s outer catch never sees it — which is what register row **N-11**
already says).

`ecc:code-reviewer` found that the logging half **is** genuinely tested — `src/lib/api/respond.test.ts`,
`describe("T2 — the correlation id joins the response to the log")`, which mocks `crypto.randomUUID` with a
sequence so a mismatched id fails — but that **file is named nowhere** in the plan's `[P2-X1]` criterion,
its Check clause, or anywhere `CRITERIA_PARITY` reads. Deleting T2 leaves both boxes `[x]` and the guard
green.

`ecc:tdd-guide`'s adjudication: *"`ecc:architect`'s reading holds… the criterion is false against its own
literal text, rescued only by an informal, unratified redefinition that itself under-reports two of the
three counter-examples."* It further found that `docs/roadmap.md:365-379`'s tick-note silently substitutes
**"every unexpected error"** for the criterion's own **"every 5xx"**, without the formal reworded-criterion
decision citation that C15 carries — and that under even that narrower substituted reading, the disclosed
residue (N-11) names **only** the lab-import site.

`ecc:code-reviewer`'s finding is the mechanical half of the same defect: the Check clause never tested
logging completeness at all, which is why the false clause survived `CRITERIA_PARITY`.

**Proposed disposition (discharge in (d)).** Either reword the criterion with a formal decision citation
the way C15 was reworded — stating that it covers *unexpected* errors reaching `handle()`'s catch-all and
does not cover `NotConfiguredError` or locally-caught domain exceptions by design, **and naming all three
non-compliant sites**, not just the lab-import one — or split into `[P2-X1a]`/`[P2-X1b]` and name
`respond.test.ts`'s T2 in the Check clause so it is actually bound. **`docs/roadmap.md`'s "Both clauses
hold" language must not survive unqualified.**

#### P2-2 — the residues table's completeness claim is false; two open rows are in no list, one with no owner
**Severity: Major** · **`ecc:architect`**, independently re-derived by **`ecc:tdd-guide`**.

Plan §10.7's header — *"Every row has an owner or a written owner-condition; none is dropped"* — is true of
the rows **in that table**. The report's §10 promotes it to a claim about the phase. `ecc:tdd-guide`
counted the table's rows (exactly twelve) and confirmed **N-69 and N-40 are not among them**, both OPEN in
the register:

- **N-69** (plan line 438) — `recordBatch` can stamp another user's `advisor_actions.conversation_id`.
  Its cell ends ***"OPEN, unassigned… Candidate fixes, neither chosen here."*** **The only open register row
  found with neither an owner nor an owner-condition**, and it is security-relevant.
  `docs/project-status.md` §2.4 already flags it as "(N-69, open)".
- **N-40** (plan line 405) — nothing prevents health-bearing error text reaching the log record via
  `respond.ts`. Structural, directly §2.3 rule 15, owner recorded as a proposal rather than an assignment.

`ecc:architect` lists ≥11 further open rows outside the residue table (N-26, N-27, N-30, N-32, N-35, N-36,
N-37, N-41, N-43, N-45, N-47), each with its own written reason.

**Proposed disposition (discharge in (d)).** Add N-69 and N-40 to the survives-the-phase table in **both**
report §10 and plan §10.7, N-69 flagged security-relevant and N-40 as §2.3 rule 15; and either restate
§10's opening to distinguish *residues that constrain future work* from *all open register rows*, or state
the open-row count. **N-69 must be given an owner or an owner-condition before close** — "unassigned" is
the state §10.7's own header forbids.

#### P2-3 — landing (d) as specified would make `project-status.md` contradict itself
**Severity: Major** · **`ecc:architect`**.

Plan §10.6 says each classification *"lands in `docs/project-status.md` §3"*. But the document carries a
**second, per-subsystem** classification: §2.6 ends `**Classification: B.**` and §2.8 ends
`**Classification: X.** The largest operational gap.` Editing §3 alone asserts API = P (§3) and API = B
(§2.6), Observability = B (§3) and X (§2.8), in one file. §2.6's body would additionally still read
*"Still open: `handle()` dispatches on error-message substrings… No rate limiting on any route… No security
headers"* — all three re-derived false — underneath a **P**, and its printed route count re-derives **25**
against a stated **23**.

**Proposed disposition (discharge in (d)).** Extend (d)'s scope to the §2.x heading and trailing
`Classification:` line of every row it moves, plus §2.6's route count and its three superseded "Still open"
bullets — **struck and dated per §7, not deleted**. This is a pre-flight correction to work not yet done.

#### P2-4 — `DOC_TRUTH` does not bind named-guard tokens, so C7's stated check does not establish C7
**Severity: Major** · **`ecc:tdd-guide`**, proven by its own mutation **M-G**.

C7 is ticked on *"`doc-truth.test.ts` green (it binds this in both directions already)"*. That parenthetical
is false for row 9's convention. `readRuleTable()`'s id capture is `/\bB\d+[a-z]?\b/g` — it matches only
`boundaries.test.ts`'s internal `B1, B2, B2b…` scheme. Rows 5, 7 and 9 name **derived-set guards**
(`DOMAIN_IS_PURE`, `CLIENT_PROPS`, `PAID_API_BUDGET`) and are never checked against real test titles; only
the literal filename is checked for existence.

**M-G, verbatim:** renaming `CLAUDE.md` row 9's `PAID_API_BUDGET` to a fictional token left
`Test Files 1 passed (1)`, `Tests 21 passed (21)` — **fully green.**

Today's text is accidentally accurate (a real `it("PAID_API_BUDGET: …")` exists at `boundaries.test.ts:1062`),
so the criterion's *outcome* holds; its stated *check* does not establish it and would not catch drift.

**Proposed disposition (carry, registered).** Extend `DOC_TRUTH`'s id regex to capture the named-guard
tokens rows 5/7/9 use, or narrow the criterion's own claim to admit the gap. Raised Major because **the
exit criterion's own justification text is what is wrong**, not a peripheral doc.

#### P2-5 — FU-29's disposition asserts an OP row that does not exist
**Severity: Major, UNRESOLVED** · **`ecc:architect`**; `ecc:tdd-guide` declined to confirm.

FU-29 reads *"…so it carries its own **OP row**."* OP-1…OP-7 contain no row concerning `mappers.ts` casts
or value-domain CHECK constraints. `ecc:architect` calls this the promise-is-not-a-record class recurring a
third time, inside the row written to fix it.

**`ecc:tdd-guide` explicitly did not confirm this**, flagging on a partial read that it *"may be reading a
forward-looking work-scoping phrase ('it carries its own OP row', describing what a future dedicated unit
would need to open) as a false present-tense claim — genuinely ambiguous."*

**Proposed disposition (carry, registered, re-verify first).** Whoever discharges it must re-derive by
command and settle the reading before acting.

#### P2-6 — report §11 omits U-DEFER-4, and roadmap Phase 3 is not satisfiable without it
**Severity: Major** · **`ecc:architect`**.

Roadmap Phase 3's exit criterion *"Every surface that can show partial coverage states its coverage limit;
**test-verified**"* needs a harness that does not exist: `vitest` collects `src/**/*.test.ts` under
`environment: "node"`, so a `.test.tsx` cannot run — **U-DEFER-4**, still unmet by dated exception, with
`HARNESS_GAP` hard-failing any tracked `*.test.tsx`. Its owner-condition names *"the phase that introduces
component testing"*, which the roadmap places in **Phase 4**. §11 does not mention it, though plan §10.7
carries it as a residue — so it is in the residue table and absent from the one section a Phase 3 planner
would read.

**Proposed disposition (carry, registered, re-verify first).** Add U-DEFER-4 to §11 with the conflict
stated: either Phase 3 opens by building the harness, or Phase 3's UI criterion is re-sequenced. Deciding
is the owner's; naming it is the Check's.

### Minor

#### P2-7 — `RLS_COVERAGE` is blind to an in-place `create policy` edit
**Severity: Minor** · **`ecc:tdd-guide`**, mutation **M-B**.

Sharper than the report's own disclosed limit (*"does not judge whether a rewritten policy is weaker"*).
Editing an **existing** `create policy` in place — `api_rate_limits`, `for select` → `for all … with check`
— with no `drop`/`alter`/`disable` statement produced **`Test Files 22 passed (22)`, fully green, with no
`DECLARED_WEAKENINGS` demand at all.** `FACTS.weakenings` is populated only from those three literal
statement forms, so an in-place rewrite never becomes an event requiring a written reason.

**Proposed disposition (carry).** Diff each migration's policy text against its previous-commit state, or
add a lighter guard forbidding edits to already-merged migration files — which the ordering design already
implies and does not enforce.

#### P2-8 — the plan's own C5 re-derivation prose is wrong: 5 files, not 7
**Severity: Minor** · **`ecc:tdd-guide`**; *(clerk, re-derived: `git grep -l "@anthropic-ai/sdk" -- src/ |
wc -l` → **5**; total hits **9**)*.

The plan, the report §8 and landing (a)'s commit message all say *"9 hits across **7** files"*. The
line-by-line accounting is correct and sums to 9; only the file count is wrong. **A documentation-accuracy
defect in the passage whose entire argument is "re-derive by command, don't trust the prose."**

**Proposed disposition (discharge in (d)).** Correct to 5 files at every site.

#### P2-9 — `CLAUDE.md` §4 rule 7's "7 of 31" re-derives to 8 of 31
**Severity: Minor** · **`ecc:architect`** (read-only posture).

31 client components confirmed. Intersecting them with `@/lib`/`@/data` imports gives **8** — 7 value
imports plus one type-only (`auth/AuthForm.tsx`). The row not in the 2026-08-06 set is
`profile/LabMarkerModal.tsx`. Repeated unmeasured in report §11 — the counts-written-once class, unbound,
in the report's forward-looking section.

**Proposed disposition (carry, re-verify first).** Correct to 8 with the predicate stated beside it, or
bind it the way `SPEC_COUNT` binds the spec count.

#### P2-10 — C16's conditional tick, and the guard that made `[~]` unavailable
**Severity: Minor** · **`ecc:architect`** (read-only posture).

`docs/roadmap.md:304` already carries a `[~]` partial marker for Phase 1's PARTIAL criterion, and plan
§10.2 scheduled C16 to close at (b)/(d) — yet it was ticked at (b), making the report's headline *"All 19
met."* Nothing can detect the condition failing: `CRITERIA_PARITY` binds tick state *between the lists*,
never to evidence. And `criteria-parity.test.ts:70`'s `/^- \[( |x)\] (.*)$/` **skips** a `[~]` line, so
marking C16 partial would drop the pinned count to 18 and redden the guard — *"a guard shaping the record
it measures."*

**Proposed disposition (carry, re-verify first).** Teach the parser `[~]` (accept, treat as not-ticked,
keep the count) and/or leave C16 unticked until (d) against the named green run.
*(For the record: `ecc:tdd-guide` independently verified C16's condition IS discharged — both runs on
`b2ab0b6` green, all steps. The finding is about the practice, not the fact.)*

#### P2-11 — N-50's Phase 4 deferral is absent from the roadmap, the sequencing authority
**Severity: Minor** · **`ecc:architect`** (read-only posture).

Recorded in the plan and report; `docs/roadmap.md` Phase 4's included-work list names neither N-50 nor the
uniform-404 question. An item deferred *into* a phase whose own section does not name it is the N-11 shape
again — a disposition pointing at something that will not look back.

**Proposed disposition (discharge in (d)).** Name it in roadmap Phase 4, which (d) already edits.

#### P2-12 — service-role-key confinement has no executable guard
**Severity: Minor, informational** · **`ecc:security-reviewer`**.

`CLAUDE.md` §2.3 rule 14 holds today — `SERVICE_ROLE` appears only in `src/lib/db/seed.ts` and
test/comment references; zero hits in `src/components/`; zero `process.env.` in any `"use client"` file —
but by convention and grep, not by a ratchet analogous to `SOLE_PAID_CLIENT`. **Explicitly not a
says-vs-does gap**: the report claims no guard exists.

**Proposed disposition (carry).** Optional hardening: a reader-pin ratchet for
`SUPABASE_SERVICE_ROLE_KEY`. Not blocking; no violation exists.

#### P2-13 — FU-32 is cited thirteen times and defined zero times; the report's contiguity headline has no carve-out for it
**Severity: Minor** · **`ecc:code-reviewer`** (second dispatch, §5). **Raised after §6 was rendered — see
the note below the verdict.**

The closeout caught and fixed the promise-shaped disposition for **FU-29, FU-30 and FU-31**. **A fourth
number was issued the same way and was not caught.** N-6's disposition (§4.4, line 361) reads *"Register as
**FU-32**; fix it in whichever unit next opens that file (U20)"* — and no row was ever written, in either
plan document. The plan's own §10.3 says so (*"FU-32 | Never given a canonical row either; **13
occurrences**, and substantively **CLOSED by U20**"*), but the report's §9 headline does not:

> *"N-1 … N-74 · OP-1 … OP-7 · FU-1 … FU-39. Contiguous, no gaps, no duplicates, **every row re-derived**."*

There is no FU-32 row to have re-derived. The report's §9 body does note in passing that *"FU-32 survived
because a unit opened the file it named"* — but that sentence explains why it was not **lost**, not that it
was never **written**, and it sits inside the paragraph about the other three rather than being flagged as
its own residual the way FU-39 is.

**The underlying engineering is verified sound**, independently: `src/data/id-stability.test.ts` hardcodes
no namespace count anywhere (only derived assertions — *"registers exactly the namespaces that exist, no
more and no fewer"*), and the manifest holds **10** namespaces, matching. **The content is not in question;
the record is.**

**Proposed disposition.** Either write FU-32 as a row on the same *dated as late-registered* pattern used
for FU-29/30/31, or narrow the report's headline to name the one exception the way it already names FU-39.

---

## 3. The 19 exit criteria, verified row by row

**Owner: `ecc:tdd-guide`**, by command on a disposable worktree at `b2ab0b6`, not by reading §8.
Baseline re-derived there: `tsc` clean · `vitest` **1420/1420, 113 files** · `next build` succeeds ·
`src/architecture/` **26 files, 380 tests**.

**17 MET · 2 PARTIAL · 0 NOT MET.**

| # | Criterion | Verdict | Note |
|---|---|---|---|
| C1 | Zero `for all` on counter tables | **MET** | `RLS_COVERAGE` 22/22. The struck literal check's claimed failure **verified true** — `grep -q "for all"` matches comment prose in `0008` (lines 10/12/23) and `0009` (line 12). Caveat → **P2-7** |
| C2 | `SECURITY DEFINER` sets `search_path` | **MET** | 24/24; mutation **M-A** reddens correctly |
| C3 `[P2-X2]` | Concurrency budget test | **MET** | `repo.test.ts` 24/24 incl. both race tests; M14/M15 cited not re-run, per scope |
| C4 `[P2-X3]` | Both paid routes: limit + budget | **MET** | `PAID_API_BUDGET` 3 passed |
| C5 | No paid bypass; SDK gone | **PARTIAL** | Guard evidence and `package.json` clause correct; the plan's **prose** is wrong → **P2-8** |
| C6 | No `usage` settles nothing | **MET** | Three cited assertions read and present; M16 already recorded |
| C7 | `CLAUDE.md` row 9 Enforced | **PARTIAL** | Row 9's text correct today; **the mechanism claimed to bind it does not** → **P2-4** |
| C8 `[P2-X4]` | Disconnect terminates + settles | **MET** | Both assertions present as described |
| C9 `[P2-X5]` | `replaceFlags` intact | **MET** | Green; not re-mutated (delete-first is superseded) |
| C10 `[P2-X1]` | `error-disclosure` 3 trees | **MET** | binding-count grep = 3; 31/31. *Scope defect is **P2-1**, against the pairing, not this row* |
| C11 `[P2-X8]` | Security headers | **MET** | Via C16's CI evidence; E2E not re-run locally |
| C12 | `npm run lint` non-empty | **MET** | **368 of 368, 0 exempt, 0 errors**. Notes the 356→368 drift as expected and self-disclaimed |
| C13 `[P2-X9]` | Export + delete, 12 tables | **MET** | 6/6 and 15/15; mutation **M-E** reddens correctly |
| C14 | Three nav pillars | **MET** | 10/10; `grep -c "FU-27" CLAUDE.md` → **0** |
| C15 `[P2-X7]` | `db:migrate` + CI coherence | **MET** | Script present; `postgres:16` service and step present; green on the real run |
| C16 | Four gates + CI on the pushed SHA | **CONDITION DISCHARGED — MET** | **Two** runs on `b2ab0b6`, both success: `35679120073` (branch) and `35679383761` (main), all steps green incl. Migration coherence, Rendering determinism, E2E. Local: tsc clean, 1420/1420, build succeeds. *Practice concern is **P2-10*** |
| C17 | Red output recorded in `docs/` | **MET** | Report §3 read as an index, consistent with the criterion's wording; **spot-checked, not exhaustively re-derived — stated honestly** |
| C18 `[P2-X6]` | ID manifest | **MET** | 328 lines; present in the full-suite pass |
| C19 | Register complete; two guards built | **MET** | `CRITERIA_PARITY` 9/9, `SPEC_COUNT` 5/5, both non-trivial. **Full manual register recount not attempted** — see §1 |

### Negative control — is landing (b) documentation-only?

**Owner: `ecc:code-reviewer`.** **PASSES.**

```
git diff --stat 749dbfc..b2ab0b6 -- src/   → (empty)
git diff --name-only 749dbfc..b2ab0b6      → 6 files, all under docs/
```

Each risk surface checked individually and unchanged: `vitest.config.ts`, `package.json`,
`.github/workflows/ci.yml`, `playwright.config.ts`, `eslint.config.mjs`, `supabase/migrations/`.
Corroborated by independently re-running `npx vitest run` (**1420/1420, 113 files**) and
`git ls-files src/architecture | grep -c '\.test\.ts$'` (**26**) — against repository state, not against
what the docs say. **No assertion, threshold, test title, config, workflow or migration changed.**

---

## 4. The certifier's own mutation replays

**Owner: `ecc:tdd-guide`.** Seven mutations, none of them a string the report already records (M14, M15,
M8, M6, M1, M1c, M5, M7, M16, and landing (a)'s M1–M4). Worktree `/tmp/p2check`, control
**26 files / 380 tests**, reverted by file-copy backup after each, baseline byte-identical at teardown.

| # | Guard | Mutation | Result |
|---|---|---|---|
| **M-A** | `SQL_FUNCTION_REGISTRY` | strip `set search_path = ''` from `consume_rate_limit` | **RED** — *"these are SECURITY DEFINER with no 'set search_path'… consume_rate_limit"* |
| **M-B** | `RLS_COVERAGE` | edit the existing `create policy` in place, `for select` → `for all … with check`, no `drop`/`alter` | **GREEN — GUARD IS BLIND** → **P2-7** |
| **M-C** | `PATH_PARAM_VALIDATION` | replace `uuidParam.parse(id)` with a local shim — evasion shape (ii) from the guard's own header | **RED** — names the route and method |
| **M-D** | `AUTH_COVERAGE` | new route doing I/O before `getUser()` | **GREEN untracked / RED once staged** — confirms the deliberate index-not-worktree property (the M8 asymmetry), not a new gap |
| **M-E** | `EXPORT_COVERAGE` | declare `advisor_usage` but return `Promise.resolve([])` | **RED** — *"an empty array from a table nobody read is indistinguishable from an empty array because the user has no rows"* |
| **M-F** | `LIVE_TAGGING` | strip `[LIVE]` from a gated block — the C-9 shape | **RED** — names file, line and title |
| **M-G** | `DOC_TRUTH` | rename row 9's `PAID_API_BUDGET` to a fictional token | **GREEN — GUARD IS BLIND** → **P2-4** |

**Two of seven found a blind spot. Both are reported as findings, not absorbed.** The other five confirm
the guards catch shapes the report had no mutation for at all — `search_path`, an aliased validator shim,
I/O-before-auth in a new route, a declared-but-unqueried export key, and an untagged gated block.

### The two binding guards

**Owner: `ecc:code-reviewer`**, which was told that a prior `ecc:code-reviewer` pass had approved these same
guards on landing (a)'s diff and that under rule 3 **that pass is not evidence**. It re-derived
independently on `/tmp/p2guards`.

**Both sound.** `CRITERIA_PARITY`: heading rename → **throws**, not a silent skip; a `- [ ]` injected inside
a fenced block **is** counted by `parseCriteria()`, but the pinned counts (19 / 9 / 10) tripwire it — *"a
legitimate second line of defense, not an accident"*; tick flip, id re-use and plan-only deletion all
redden; the Phase 2/Phase 3 boundary and `---` terminator regexes were checked against the real document
for premature matches (none); all nine ids confirmed genuinely non-identical in text today.
`SPEC_COUNT`: untracked scratch spec correctly ignored, `git add -N`'d one reddens; stripping the numeric
clause while leaving the bare word reddens on the occurrence count; the fenced-block site's clause spanning
multiple `#` lines is correctly reconstructed by `normalise()`, and a nearby lowercase "bound by" sentence
does **not** spuriously match.

**No findings against either implementation.** The one finding from this section is **P2-1**, against the
`[P2-X1]` *pairing* — not the guard code, which does exactly what its comments say.

---

## 5. The register verified

**Owner: `ecc:code-reviewer`** — a second, separately-scoped dispatch after §5 was found unassigned (§1).
Re-derived on a disposable worktree (`/tmp/p2register`) at `b2ab0b6`, `git rev-parse HEAD` confirmed. Per
the Three Rules, the plan's §10.3, the report's §9 and this Check's own earlier draft text are all treated
as claims, **including the partial statements by `ecc:architect` and `ecc:tdd-guide`** — nothing below
rests on their say-so.

### 5.1 What the parse was keyed on — and the plan's own caveat is right but undercounts

**The plan's §10.3 caveat says a future guard must key on "the register tables' five-column shape or
section bounds." Re-derived: the five-column description fits only one of the two N tables.** §4.4's header
is `| # | Finding | Evidence | Disposition |` — **four** columns, because pre-execution findings carry no
"Found by" cell. §4.5's is `| # | Found by | Finding | Evidence | Disposition |` — **five**. A single
column-count predicate cannot key both.

**This parse keyed on section boundaries** (`### 4.3` / `4.4` / `4.5` / `4.6` / `## 5.`, located by command),
with each table's own header used as a secondary sanity check. A per-row column count was attempted and is
**noisy**: several rows contain literal fenced-code markers (N-23's ```` ```json ```` inside a sentence)
which flip naive in-code-span parity and misreport that row alone. That noise does not affect the
contiguity result, which depends only on line-start anchoring within known bounds.

**The naive whole-document match reproduces the caveat's own claim — and eight instances it does not name:**
`grep -noE '^\| \*\*N-[0-9]+\*\*'` returns N-21…N-24 a second time at lines 2946–2949 (U25's closeout
summary; its header two lines above is `| # | Closeout disposition |`, **two** columns) — **and** eight
further hits inside §10.3's "Eight stale rows" status table (N-29, N-48, N-49, N-51, N-63–N-66, lines
6225–6232) plus four inside §10.7's residues table (N-22, N-25, N-70, N-50, lines 6488–6498). All twelve
were read in full and are **citations, not second definitions** — none carries Finding/Evidence text of its
own. **The caveat is right about the phenomenon and undercounts its instances by twelve.**

### 5.2 Contiguity

**N — HOLDS.** Restricted to §4.4+§4.5's bounds (lines 352–479): exactly 74 matches, `N-1…N-74`, strictly
increasing. `sequence == range(1,75)` → **True**; missing `[]`, extra `[]`.

**OP — HOLDS.** Restricted to §4.6 (480–562): exactly `OP-1…OP-7`, one row each, contiguous. The two hits
outside that range are citations of OP-5.

**FU — HOLDS FOR 1–31 AND 33–39.** Re-derived across both plan documents:

- **FU-1…FU-28** — one table row each in `phase-1-verification-integrity.plan.md` §12, contiguous.
- **FU-29, FU-30, FU-31** — **confirmed genuinely written**, not merely promised: §4.3 lines 292–310, under
  *"The rows this register owed itself"*, each with its own finding text, evidence, and an owner or
  owner-condition. The closeout's claim on this specific point is confirmed.
- **FU-33, FU-34** — full rows, lines 244–276. **FU-35…FU-38** — full rows, lines 312–336, each with U31's
  proposed remedy and an explicit owner. **FU-39** — full row, lines 338–350, disposition **DROP**, ruled
  the day it was raised; a genuine closure, not another placeholder.
- **FU-32 — no canonical row in either document.** → **P2-13**.

### 5.3 Every open row: owner or owner-condition

**P2-2 re-derived and CONFIRMED, both halves.**

- **N-69** (line 438) ends *"OPEN, unassigned … Candidate fixes, neither chosen here."* **No owner, no
  owner-condition.** The only row in the register that fails §10.7's own header standard outright, and
  absent from that table (12 rows, counted).
- **N-40** (line 405) ends *"Proposed owner: the unit that next touches the error contract."* Present, and
  **weaker than an assignment** — proposed, not committed. **The Check's existing text draws the N-40/N-69
  distinction correctly**: N-40's defect is non-inclusion in the residues table, not absence of owner
  language.

**`ecc:architect`'s eleven further rows, re-checked individually rather than accepted as a block** — because
*"outside the residues table"* and *"has no owner"* are different claims:

| Row | Owner / owner-condition? |
|---|---|
| N-26 | **Yes** — "whichever unit next touches the probes" |
| **N-27** | **NOT OPEN.** Struck and dated CLOSED IN PART 2026-08-10; residual clause (i) carried to **N-28**, whose row is ✅ CLOSED 2026-08-12 stating *"N-27 (i) closes with it."* **`ecc:architect`'s inclusion is stale.** N-27's own cell lacks a final pointer to that closure — a minor cross-reference gap of the same shape as U25's N-22 summary — but it is not an open row |
| N-30 | **Yes** — dispositions accepted by owner ruling; (a) is an owner-condition alongside OP-5, (b)/(c) gated on a future product decision |
| N-32 | **Yes**, weak — "Proposed owner: whoever next touches `playwright.config.ts`" |
| N-35 | **Yes** — "whoever imports it must revisit U14's `connect-src`" |
| N-36 | **Yes** — "whoever next edits the matcher" |
| **N-37** | **Present, but the weakest of the eleven** — *"a future unit or standalone investigation"* names no actor, file or trigger |
| N-41 | **Yes** — "triggered by a measured payload, not by unease" |
| N-43 | **Yes** — an unusual owner (a document section) but written and specific |
| N-45 | **Yes** — "a lab-import unit, not a cleanup pass" |
| N-47 | **Yes** — "whichever unit next opens `id-stability.test.ts`" |

**What this settles: ten of the eleven carry written owner-condition language of the same shape the register
uses throughout. `N-69` remains the only row with neither.** N-37 is named as the borderline case worth the
next reader's attention if N-69 is ever fixed — **not raised as a numbered finding**, since weak-but-present
is the state the Check already tolerates for N-40. **N-27 is re-derived as inaccurate in `ecc:architect`'s
list**: closed, not open, since 2026-08-12.

### 5.4 The eight re-dispositioned rows — read directly, not via §10.3's claim about them

**CONFIRMED, all eight**, each now a closure naming a landing commit: N-29 → U14 `61ad255` (relabelled, not
re-argued) · N-48 → U29 `1f0077c`/`79fb1f0`/`b20c3fb` · N-49 → U29 `1f0077c` · N-51 → U30
`56c8c79`/`47712bd` · N-63, N-64, N-65 → U32 `104a111` (N-63 also `1a6c080`) · N-66 → U32 `104a111`, with
**M7** named as its red proof. N-29's case is distinguishable exactly as the plan says: its closure text
pre-dated this session and only the leading label was stale; the other seven had no closing sentence at all.

### 5.5 What holds, and the one new item

Everything asked of this section holds as re-derived, with two qualifications. **P2-2 is confirmed exactly
as stated.** **P2-13 is new**: FU-32 is cited thirteen times and defined zero times — the identical defect
class the closeout named and fixed for FU-29/30/31, left uncorrected for the fourth id issued the same way,
against a report headline claiming *"no gaps… every row re-derived."* The engineering is verified sound by
command; the register entry is missing.

**No file in the main checkout was modified.** The worktree was removed after use.

---

## 6. Verdict

**Rendered by `ecc:tdd-guide`**, with the other three sections in view. Reproduced in full.

> ### Verdict: **PHASE 2 COMPLETE WITH FOLLOW-UP**
>
> **Reasoning.** Zero Critical findings across all four sections. The Major findings that survived
> cross-examination are real, but every one shares a structure this project's culture already treats as
> compatible with closing a phase: **the underlying fact was never hidden** — N-69 and N-40 are fully
> reasoned, dated, open register rows in the tracked plan; the three unlogged 5xx sites are deliberate,
> comment-explained design choices, and **none leaks internal error text to a client (§2.3 rule 13 holds;
> re-verified that `respond.ts` returns only pre-approved public strings on all three paths)**. What is
> broken is **a closing summary's claim to completeness** — *"every row has an owner"*, *"both clauses
> hold"* — not the presence of an undisclosed hazard. That is a defect in the record, found by exactly the
> adversarial process this Check exists to run, and corrected before the record stands as final. A higher
> Major count than Phase 1 is a real difference in degree, not in kind.
>
> **What would have forced NOT CLOSED, and did not occur:** a Critical rank-1 violation live and
> unmitigated; a fabricated or unreproducible verification result (the core suite was re-run — 1420/1420,
> 113/113, CI green on both runs at `b2ab0b6`, exactly as claimed); or a defect undermining trust in the
> *mechanism* of verification rather than one criterion's wording. **N-69** is the closest candidate and is
> genuinely security-relevant, but it was found, reasoned about and left open **on purpose** during U29's
> planning, with the guarded and unguarded caller paths both named — a defense-in-depth gap for a future
> caller, not a demonstrated live exploit.
>
> **Is any single finding disqualifying? No.**

### Disposition

**Must be discharged in landing (d):** **P2-1** (reword or split `[P2-X1]`, with a formal decision citation
and all three sites named; the roadmap's *"Both clauses hold"* must not survive unqualified) · **P2-2**
(N-69 and N-40 into both residue tables; **N-69 must be given an owner before close**) · **P2-3**
(reconcile `project-status.md` §2.x against §3 before editing) · **P2-8** (5 files, not 7) · **P2-11**
(name N-50 in roadmap Phase 4).

**May be registered and carried, provided they are actually written into the register** (§8.1 — named, not
absorbed): **P2-4**, **P2-5**, **P2-6**, **P2-7**, **P2-9**, **P2-10**, **P2-12**.

> **P2-5, P2-6, P2-9, P2-10 carry a provenance caveat from the certifier:** they came from the reviewer
> without a shell and were **not** independently re-derived at the same depth. *"Whoever discharges them
> should re-verify by command first, per the Three Rules."*

> **P2-13 IS NOT DISPOSITIONED ABOVE, and the omission is factual rather than an oversight.** It was raised
> by `ecc:code-reviewer`'s §5 dispatch **after §6 had been rendered**, so the certifier never saw it and
> this clerk does not disposition findings. It is recorded in §2 with the reviewer's own proposed
> disposition and is **unclassified by the certifier**. *(It does not disturb the verdict on its face —
> Minor, a record-completeness defect whose underlying engineering §5 verified sound by command — but that
> is an observation about its severity label, not a certifier's ruling, and it should not be read as one.)*

### On the verification-posture divergence

> **It weakens the Check, and I am specific about where.** A reviewer restricted to Read/Grep/Glob can find
> real things — it found the two most consequential defects in this entire Check (**P2-1**, **P2-2**) — but
> a finding built by reading, not running, is a hypothesis about what a command would show, not the
> command's output. That distinction mattered: I could not accept either on that reviewer's authority, per
> the Three Rules (*"a prior review passing is not evidence"* applies symmetrically to a review **failing**),
> so I spent independent budget re-deriving both from source before they could affect this verdict. **They
> held up exactly as stated.** The remaining findings from that section did not receive the same
> re-derivation, and their disposition reflects that. **The weakening is localized and named, not
> systemic** — the two claims doing real work in this verdict are the two confirmed by command.

---

# PHASE 2 COMPLETE WITH FOLLOW-UP

## 7. Resolution addendum

**Certifier for this addendum: this session, dispatched separately from the four §2–§5 reviewers.**
Verified against `40fc2b6` (`git rev-parse HEAD` confirmed at start and unchanged throughout). Per the
brief, my own earlier participation as one of the four §6-adjacent reviewers on the original Check is
**not evidence here** — everything below was re-derived fresh, on this tree, by command.

### 7.1 The three rules, verbatim
1. **Published docs are claims, not evidence.**
2. **Re-derive by command.**
3. **A prior review passing is not evidence** — including this certifier's own.

### 7.2 The thirteen findings, re-verified

| # | Verdict | Settled by |
|---|---|---|
| P2-1 | **VERIFIED** | `docs/roadmap.md:374-399` reworded with decision cited; `src/architecture/five-xx-is-logged.test.ts` binds `fail()`-level logging; `DECLARED_OPERATIONAL_STATES` (`respond.ts:64`) and FU-43 are the two real carve-outs. Mutation: stripped `ADVISOR_PRESTREAM_ERROR` from `advisor/route.ts` → red; restored byte-identical |
| P2-2 | **VERIFIED** | N-69 (plan:608) carries an actual condition ("next unit touching `recordBatch`… may not ship without closing this"), not a restatement; N-40 and N-69 both in plan §10.7 and report §10 (report:290-294); header at plan:6668-6677 now scoped to residues, not all open rows |
| P2-3 | **NOT VERIFIED** | `docs/project-status.md` §2.6 (~line 289-300) still reads *"Route count is 23"* against a re-derived **25** (`git ls-files 'src/app/api/**/route.ts' \| wc -l`), and its **"Still open"** bullet (substring dispatch / no rate limiting / no security headers) is unstruck, directly under the new **Classification: P** paragraph that asserts the opposite — `respond.ts:322` confirms typed `instanceof NotConfiguredError`, not substring dispatch. §2.8/§3 got the reconciliation the disposition promised; §2.6 did not get the specific "route count and three bullets, struck and dated" fix the disposition named |
| P2-4 | **VERIFIED — CLOSED** | `doc-truth.test.ts`'s `guardTokensIn()` (~line 128) resolves against test titles OR declared identifiers; full suite green |
| P2-5 | **VERIFIED** | Re-derived by script: §4.6 (plan:653-736) holds exactly `OP-1…OP-7`, none about `mappers.ts`. FU-29's text (plan:292-299) rewritten to future tense ("that unit **WILL NEED to** open its own OP row"), closing the ambiguity `ecc:tdd-guide` declined to resolve |
| P2-6 | **VERIFIED** | U-DEFER-4 named in report §11 (line 312) and in `docs/roadmap.md` Phase 3 itself (lines 498-508), conflict stated, not decided |
| P2-7 | **VERIFIED** | FU-40 (plan:384-402) recorded as CI's boundary, not the unit's. Re-derived live: `gh run view 35700784778` — branch `probe/p2-7-rls-widening` failed at **Migration coherence**, `pg_policies.cmd`; branch since deleted |
| P2-8 | **VERIFIED** | `git grep -l "@anthropic-ai/sdk" -- src/` → 5 files; `git grep -c` sums to 9. Matches corrected text at plan:6043-6057 |
| P2-9 | **VERIFIED** | Re-derived independently: 31 `"use client"` components under `src/components/**`, 8 import `@/lib` or `@/data` (incl. `LabMarkerModal.tsx`, `LabMarkerTable.tsx`; `AuthForm.tsx` type-only). Matches `CLAUDE.md:169` |
| P2-10 | **VERIFIED (deliberately unfixed)** | FU-42 (plan:424-440) registered. Re-confirmed `criteria-parity.test.ts`'s `/^- \[( \|x)\] (.*)$/` skips `[~]` while `EXPECTED_PLAN_CRITERIA=19` is pinned — marking C16 partial would still redden. The stated reason for not fixing it here (it would rewrite a guard binding this landing's own edits) holds structurally |
| P2-11 | **VERIFIED** | N-50 named in `docs/roadmap.md` Phase 4, item 0 (lines 564-570) |
| P2-12 | **VERIFIED — CLOSED** | `SERVICE_ROLE_CONFINEMENT` ratchet exists. Mutation: planted a `SUPABASE_SERVICE_ROLE_KEY` read (after a substituting template literal) in `src/lib/safety/index.ts` → red, named the file; restored byte-identical |
| P2-13 | **VERIFIED — see 7.3** | `FU-32` is now a genuine row, plan:363-382 |

### 7.3 P2-13, classified

**Genuine register row, not another citation.** `FU-32` (plan:363-382) carries a class definition, six
named instances, a two-option remedy and an owner — the same shape every other FU row uses, re-derived by
reading it directly rather than trusting the "written" claim. The report's contiguity headline
(report:225-232) is restated to name the omission rather than assert unqualified completeness. Register
contiguity independently re-derived by script over `docs/01-plan/phase-2-operational-dependability.plan.md`
+ `phase-1-verification-integrity.plan.md`: **N-1…N-77** (77 rows, no gaps, no dupes, §4.3-§4.5 bounds),
**OP-1…OP-7** (§4.6), **FU-1…FU-46** (28 in the Phase 1 plan + 29-46 each with one definitional block here).

### 7.4 The N-75 obligation

**Landing (c) certified four credential ratchets on 64/64 green and could not have seen the
template-literal blindness — a blinded guard and a satisfied guard are the same colour.** `ecc:security-reviewer`
re-verified in parallel (relay read directly, not re-run): the helper is confirmed AST-based
(`boundaries.test.ts:1211-1233`); the derived set of dependent ratchets is confirmed as exactly **four**;
**all four verified RED** under the exact shape that blinded the old scanner (file-copy-backup mutation,
byte-identical restore, 62/62 green after). **N-75's obligation is discharged for the ratchets.**

**Two new findings, neither visible to (c) or to (d1)/(d2), both spot-verified by me directly against source:**

1. Of the "two regression fixtures" (d1)'s commit, the N-75 row, and plan §10.11 all claim, **only one
   actually pins the bug.** The "read AFTER a substitution template" fixture reddens against the
   reconstructed old scanner; the "read INSIDE a substitution" fixture does not — the old tokeniser reads
   `process.env.OPENAI_API_KEY` before reaching the brace that mis-tokenises. Confirmed by reading
   `boundaries.test.ts:1611-1616` directly: the second fixture is a real correctness check for an adjacent
   property, not a second N-75 regression proof. The "two fixtures" claim should be corrected to one.
2. **The identical sibling failure mode — a non-anchored `/\/\/[^\n]*/g` comment-strip blanking a `//`
   inside a string/URL literal — is live, undisclosed, in three specs I confirmed directly:**
   `boundaries.test.ts:1237` (backs `NO_PINNED_MODEL_ID`; its own "HONEST LIMITS" comment at 1437-1448 does
   not name this one), `five-xx-is-logged.test.ts:194` (undisclosed), and `not-found-uniformity.test.ts:70`
   (undisclosed) — against `five-xx-is-logged.test.ts:267-270`'s `codeOf()`, added the same landing, which
   **does** disclose the identical limit. No live undetected violation was found in tracked source today
   (checked near current model-id literals) — this is a demonstrated blind spot, not an observed miss, the
   same standing P2-7's finding had. **Not Critical; registered below as new follow-ups.**

### 7.5 Verdict: **PHASE 2 COMPLETE WITH FOLLOW-UP** (restated, not unchanged)

Zero Critical findings anywhere in this addendum's own re-derivation. Twelve of thirteen Check findings are
genuinely discharged or correctly carried. **P2-3 is the exception and is reopened here**: the specific fix
its own disposition promised — striking and dating `project-status.md` §2.6's stale route count and three
"Still open" bullets — was not executed, leaving a **P** classification sitting over prose that
contradicts it. That is a record defect of the identical shape this whole closeout exists to catch (§2.2
rule 7's binding, applied to a status document rather than a rendered claim), not a hidden hazard: every
underlying fact re-derives true (25 routes, typed dispatch, rate limiting, security headers). N-75's two
new findings are the same class — real, but about a guard's self-description and a sibling guard's
undisclosed limit, not about an unmitigated live violation. **Nothing here rises to a rank-1 violation, a
fabricated result, or a defect in verification's mechanism producing a false green** — CI is independently
re-confirmed at `40fc2b6` (`gh run view 35727291891`, `headSha` matches, success) and the local suite is
unchanged (tsc clean, 1446/1446/114, lint 369/369, build succeeds). **Is any single finding disqualifying?
No — but P2-3 must not be marked closed, and the two N-75 findings must be registered, before this record
stands as final.**

### 7.6 Follow-up set — corrected, not copied

**The clerk's proposed 16-item list is inaccurate** — it conflates "registered at (d2)" with "the residues
table" (plan §10.7 / report §10), which is the actual authoritative "survives the phase" list and is
longer: it also carries **FU-29, FU-30, FU-31, FU-33, FU-34, FU-35, FU-36, FU-37, FU-38, N-50**, plus two
unnumbered rows (`replaceFlags` transactional residue; Live E2E BLOCKED(env)) that the clerk's list drops
entirely. Conversely, **FU-45 and FU-46 — genuinely open, both with forward-looking effect — are absent
from §10.7 and from report §10**, present only in the register-contiguity narrative (report:228,238). That
is P2-2's exact pattern recurring, undiscovered until this pass: **new finding, register FU-45 and FU-46
into §10.7 and report §10 before Phase 3 reads either.**

**Phase 3 should inherit `docs/01-plan/phase-2-operational-dependability.plan.md` §10.7 directly, corrected
to add FU-45/FU-46, plus:** **P2-3, reopened** (§7.2 above) · two new rows from §7.4, proposed as **N-78**
(the "two fixtures" overclaim) and **N-79** (the shared undisclosed `stripComments` blind spot in
`NO_PINNED_MODEL_ID`, `five-xx-is-logged.test.ts:194`, `not-found-uniformity.test.ts:70`) — numbers are this
certifier's proposal, not an enactment; I hold no mandate to edit the plan.

### 7.7 Closing pass on `ee9db07` (next unused subsection — §7.1 already names "the three rules")

**HEAD = `ee9db07`, confirmed.**

**1. P2-3 — VERIFIED.** Recomputed: routes = 25, `route.test.ts` = 25, `getUser(` in 25/25 (all via
`git ls-files`/grep). Wrapped-vs-not script (comment-stripped, `/\bhandle[(<]/`) → 23 wrapped/31 call sites,
unwrapped = exactly `advisor/route.ts` + `advisor/actions/route.ts`. `respond.ts:322` is
`instanceof NotConfiguredError`; zero production `includes("not configured")` hits. Both paid routes import
`enforceRateLimit`; `security-headers.test.ts` exists, middleware imports the CSP module. All three struck
bullets and all three `25`s re-derive true.

**2. N-78 — dispositioned, core claim VERIFIED, one overclaim found.** Reconstructed pre-`bac5928` scanner:
"AFTER a substitution" fixture → `false` (red, genuine guard); "INSIDE" fixture → `true` (already green, not
a regression guard) — matches the row. Fixture B relabelled in place, not deleted; `vitest run` on all three
touched files = 85/85 green. **NOT VERIFIED: "§10.11 … say[s] two regression fixtures."** `grep -i fixture`
over §10.11 at `ee9db07` and pre-(d1) `40fc2b6` returns nothing — §10.11 never made a fixture-count claim, so
nothing there needed dating; the citation is false, though harmless. **N-79 — VERIFIED**: all three named
guards carry the disclosure (grep-confirmed); suite green.

**3. Survives-list — VERIFIED.** §10.7 flattens to 28 distinct ids across 22 rows, no range notation left;
report §10's 22 rows flatten to the identical 28-id set (grouped differently, same members). **FU-39
excluded — correct** (plan line 349: "raised … DROPPED here"). **FU-47 included — correct** (open, no
closing unit, present in both tables).

**4. Verdict: COMPLETE WITH FOLLOW-UP — restated.** No rank-1 violation, fabrication, or live unmitigated
defect found. The one flaw (N-78's false §10.11 citation) is a pointer error inside a sound correction, not
a functional gap. Settled by: striking "§10.11" from N-78's row, or showing the phrase there under some
other search.
