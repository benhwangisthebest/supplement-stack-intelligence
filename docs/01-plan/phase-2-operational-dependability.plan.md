# Phase 2 — Operational dependability: implementation plan

> **Status: APPROVED — 2026-08-08**, by the repository owner (unit `PHASE2-PLAN-PUB`). As an approved plan
> this is rank 5 in `CLAUDE.md` §6: it sequences work. It still never licenses a rank-1 or rank-3
> exception, and a roadmap phase that appeared to require one would be a defect in the roadmap, not a
> permission granted here.
> ~~**DRAFT — awaiting approval.** A Draft outranks nothing (`CLAUDE.md` §6, rank 5 applies only to an
> *approved* plan). Nothing in this document authorises work.~~ *(The DRAFT status line is struck rather
> than deleted — §7: retire, do not erase.)*
>
> **Approval carried six rulings**, recorded in §7 beside the options each chose. Three of them changed
> this document's content and not merely its status: ruling 1 added **U24**, ruling 5's two rewordings were
> applied to `docs/roadmap.md`'s Phase 2 exit criteria **in this same commit**, and ruling 4 was *executed*
> rather than planned.
>
> **Authored:** 2026-08-06, at Phase 1 close (`d4f6194`, suite 859/73).
> **Scope authority:** `docs/roadmap.md` "Phase 2 — Operational dependability" (rank 6, sequencing).
> **Predecessor:** `docs/04-report/phase-1-verification-integrity.report.md` ·
> `docs/reviews/phase-1-closeout-check.md` (verdict COMPLETE WITH FOLLOW-UP).
>
> Every figure in this document was measured at `d4f6194` by command, not recalled. Where a roadmap item
> or a register row turned out to be already satisfied, it is marked so rather than planned as work.

---

## 1. What this phase is for

Phase 0 made the repository's verified state real and re-verified. Phase 1 made a green run *mean*
something. Phase 2 makes failure **visible, bounded, and diagnosable** — the difference between a product
that is correct on the happy path and one that is dependable.

**The phase has one live defect at its centre, and it is not the one the roadmap names.** See §2.

---

## 2. The finding that reshapes the phase — the token ledger is user-writable

`supabase/migrations/0003_advisor.sql:48-49`:

```sql
create policy "own_advisor_usage" on public.advisor_usage
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

`FOR ALL` includes **DELETE**. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by construction — it ships to the
browser — and Supabase exposes PostgREST directly. So **an authenticated user can delete their own
`advisor_usage` row and reset their daily token budget to full**, repeatedly, against a paid API.

This is not the concurrency gap roadmap item 3 describes. It is strictly worse, it is live today, and it
is invisible to `RLS_COVERAGE`, which checks that a policy *exists* and never what it *permits* (**FU-6**).

**The generalisable rule, which is what makes this worth a section rather than a bullet:** `for all
using (user_id = auth.uid())` is *correct* for user-owned **content** — a user may delete their own
stacks, profile, check-ins. It is *wrong* for a **counter that exists to constrain that same user**. Of
the repository's 12 `for all` policies, exactly one table is a constraining counter today
(`advisor_usage`), and any rate-limit table added by this phase would be the second. That distinction has
to be made once, before either is built.

**Severity, stated honestly.** This is a cost/abuse vector, not a confidentiality breach: RLS still
confines the user to their own row, so no other user's data is reachable. It costs money and defeats
`CLAUDE.md` §4 rule 9's purpose. It is the phase's only live exploitable defect.

---

## 3. Scope

### In scope
1. The error contract: typed errors replacing substring dispatch, and extending error-disclosure to
   `src/lib/**` (roadmap item 2 residue, F3, FU-7).
2. Paid-API control: ledger hardening, atomic reserve-then-spend, rate limiting, disconnect/timeout, and
   the `PAID_API_BUDGET` guard that `CLAUDE.md` §4 rule 9 has never had (roadmap item 3, §4 rule 9).
3. Persistence trust boundaries: `replaceFlags` atomicity, repo ownership-filter pins (roadmap item 4,
   FU-16, FU-20, FU-28).
4. Platform and operations: security headers, migration tooling, self-service export/deletion, `npm run
   lint`, correlation ID in the UI, the slug manifest (roadmap items 6–9, F5, the §7 ruling-3 slug policy).

### Out of scope — and why
- **No content grounding.** Phase 3 owns it.
- **No new product features.** `docs/product-direction.md` §7's deferred capabilities stay deferred.
- **No scale or performance engineering.** There is no measured load problem and none should be invented
  (`CLAUDE.md` §3.4).
- **No component-test harness.** Phase 1 excluded component-test backfill; adding jsdom/RTL is its own
  decision with its own cost. This constrains U19 — see §5.
- **No live E2E in CI. [RULED 2026-08-08 — decision 3, option (a).]** It needs Supabase and Anthropic
  secrets in a **public** repository. `ci.yml`'s header records that no secrets are *required*; the
  **exfiltration** argument against adding them is `docs/reviews/phase-0-plan-review.md` §P-03 (fork-PR
  exposure), which `ci.yml` cites rather than states. The owner's ruling: **no secrets enter the public
  repo**; CI takes the non-live half only, and the `[LIVE]` half stays an **owner-run local baseline**.
  This is now settled scope, not an open question — U22's achievable half is what remains.
- **FU-21 / FU-22 are not scheduled.** Report §9 lists them as "characterise what the floors catch". They
  are findings *about* the coverage floors, already characterised in the register, with no executable
  deliverable that does not re-open D-2's anti-flake ruling. Recording them as permanently-open inherent
  limits is more honest than manufacturing a unit. **Disposition: remain open, unowned, by design.**

---

## 4. Inventory — every item, dispositioned

### 4.1 Roadmap Phase 2's nine items, measured

| # | Item | Measured state at `d4f6194` | Disposition |
|---|---|---|---|
| 1 | Structured logging + correlation IDs | **PARTIAL.** `respond.ts:139-186` logs `{event, correlationId, code, name, message, stack, cause}` — but **`path` and `userId`, both named in the item text, are absent**, and the only sink is `console.error` (`respond.ts:181`). `execute.ts`'s rollback log shipped (U20, `execute.ts:147`). | **Residue only** → U23 (deferred; see §5 cut list) |
| 2 | Error-message hygiene | **PARTIAL.** Raw disclosure fixed in Phase 0 and *enforced*. Substring dispatch survives at `respond.ts:247`. | → **U1** |
| 3 | Rate limiting + cost control | **NOT STARTED.** Zero matches repo-wide for rate-limit, `maxDuration`, `AbortController`/`request.signal`, or an Anthropic timeout. | → **U3, U4, U5, U6** |
| 4 | `replaceFlags` atomicity | **NOT STARTED.** `evaluation-flag-repo.ts:28` deletes before `:44` inserts. | → **U8** |
| 5 | Reference-data ID contract | **DONE (Phase 0 U8).** `id-manifest.json` — 9 namespaces, tombstone/rename policy; `id-stability.test.ts` 43 tests in CI; no FK added. | **Do not plan.** Its exit criterion is already met; annotate it |
| 6 | Migration tooling | **NOT STARTED.** No `db:migrate`, no supabase dep. | → **U15** (criterion needs rewording first — §7) |
| 7 | Security headers | **NOT STARTED.** `next.config.ts` is `{ reactStrictMode: true }`, no `headers()`. | → **U13** (+ **U14** for CSP) |
| 8 | Self-service export + deletion | **NOT STARTED.** 23 routes, none account-scoped. | → **U16, U17** (criterion needs rewording — §7) |
| 9 | Resolve `npm run lint` | **NOT STARTED.** `"lint": "next lint"`, no eslint dep, no config, **4** `eslint-disable` comments naming **2 uninstalled plugins and 1 ESLint core rule** (`react-hooks/exhaustive-deps`, `@typescript-eslint/no-unused-vars`, and `no-console` ×2). | → **U18** |

### 4.2 Deferred from Phase 1

| Item | State | Disposition |
|---|---|---|
| **F3** typed `NOT_CONFIGURED` | ~~not started (`respond.ts:247`)~~ → **CLOSED 2026-08-08 by U1** (`c0eb8bf`) | `NotConfiguredError` in `src/lib/api/errors.ts`; `respond.ts` dispatches on `err instanceof NotConfiguredError` and reads `publicMessage`. The substring branch is **deleted**, and `not-configured-totality.test.ts` (18 tests) asserts it stays deleted *and* that no other class carries the text. Evidence: `respond.test.ts` T5 (503 by class, 500 for a bare Error), M4's bypass probe red |
| **F5** correlation ID in UI | not started — zero `correlationId` in any `.tsx`; `AdvisorPanel.tsx:286` receives one and discards it | → **U19**, formatter-only (§5) |
| **Slug append-only manifest** (§7 ruling 3) | not started — no `slugs` namespace; **`id === slug` for all 15 supplements**; slugs persisted in **no** DB column | → **U20** (two schema decisions — §7) |
| **§4 rule 9** budget + rate limit | **UNENFORCED**, no guard | → **U7** |
| **§4 rule 7** client components take props | UNENFORCED; **7 of 31** would fail. **Denominator defined here, once:** *tracked files under `src/components/**` carrying a `"use client"` directive* = **31** (30 `.tsx` + 1 `.ts`). Measured — `CLAUDE.md` §4 and `project-status.md` both use this figure and neither defines it; a guard for this rule must adopt this predicate or state its own | **Deferred → Phase 3/4.** Correctly marked, and `DOC_TRUTH` now prevents silent relabelling |
| **§4 rule 8** trust boundaries | UNENFORCED generally | **Partially addressed** by U5's IP-identity function and U10; no general rule proposed |
| **F7** detector gaps (destructured bodies, two-arg `.then`) | open, tracked in Phase 1 plan §5 | **Deferred, condition restated:** close if any route adopts either form. U2 does not |

### 4.3 Follow-up register — the 26 rows not closed in Phase 1

**Re-labels required before this phase starts** (all three verified at `d4f6194`). **They are recorded here
and deliberately NOT applied to the Phase 1 plan's §12 while this plan is DRAFT:** that register was
certified as part of a closed phase, and editing a certified artifact outside a certification is the
behaviour this project's review discipline exists to prevent. They land when this plan is approved.

> **[2026-08-08 — landed, as annotations rather than rewrites.]** On approval, the three rows in the
> Phase 1 plan's §12 each gained a **dated cross-reference pointing here** (the D-3 pattern): the certified
> text stays exactly as certified, and a note beside it says what the label became and where the authority
> for that now lives. **This document remains authoritative for the three re-labels**; the Phase 1 register
> is a historical record that now knows where to send the reader. No other row and no other certified
> artifact was edited — including **FU-27's row**, which this approval's ruling 1 resolves but which was
> outside the authorised annotation set. That row therefore still reads "needs a product decision" while
> §7 decision 1 below records that the decision was taken; the discrepancy is named here rather than
> silently repaired, and closing it is part of **U24**.

- **FU-2 → CLOSED.** Its condition was fixed by U20 (`execute.ts:147`). Carrying it forward would plan
  work that exists.
- **FU-17 → re-scope, not close.** Its *owner* question resolved (U8's nullability half shipped,
  `schema-type-drift.test.ts` "agrees on nullability, column by column"), but its *finding* — dead
  defensive coalescing at `mappers.ts:40-42` — is still live. Now unowned and still true.
- **FU-13 → unowned.** Its candidate owner U14 shipped without binding the §10.1 400-exemption list, which
  remains prose. **U16 is the trigger to make it executable** (§5).

> **[2026-08-08] FU-7 → CLOSED by U2** (`4d3a060`). `error-disclosure.test.ts` gained a third inventory,
> `LIB_MODULES` over `src/lib/**` (81 non-test modules), so a helper reading `err.message` one import away
> from a route is no longer invisible. **Measured, not predicted: 3 violations in 2 files** —
> `advisor/agent.ts:154` and `lab-import/pdf-adapter.ts:92,119`; `respond.ts` came back clean because U1
> had already removed its read by construction. Both files are fixed, and **the allowlist was never
> created** — the `publicMessage` naming decision is what bought that, exactly as U1's spec predicted.
> Evidence that the extension is what does the work, rather than something pre-existing catching the
> plant: mutation **M6** kept a planted read in `stack-evaluator/rules.ts` and reverted only
> `SCANNED_FILES` → **31 passed**. What FU-7 does **not** close is stated in the guard's own header and in
> **FU-31**: `src/components/**`, `src/app/**/page.tsx`, and `auth/actions.ts`'s non-caught reads.

> **[2026-08-08] FU-5 → CLOSED by U3** (`656a628`). Its deferral condition — *"no migration uses any of
> these today"* — **fired**: `0008` is the first migration in the repository to contain a `drop policy`.
> `RLS_COVERAGE` now applies statements **in position order**, so a policy dropped in a later migration
> leaves the effective set (a set-union parser cannot tell `drop; create` from `create; drop`, and the old
> one could not); every `drop policy` / `alter policy` / `disable row level security` must additionally
> appear in `DECLARED_WEAKENINGS` with a written reason, asserted as an **equality** so a removed statement
> fails as loudly as an undeclared one. Proven red at M8 both `git add -N` ways — unstaged 22 passed,
> staged named the table *and* the migration. 14 → 22 tests.
> **What it still does not do, stated rather than implied:** judge whether a rewritten policy is weaker
> than the one it replaced. That is SQL semantics; this is text. The register makes the event impossible to
> land silently and forces a human sentence about it — it does not evaluate the sentence.
>
> **[2026-08-08] N-2 → CLOSED by U4** (`54ef19b`). Both races, each with its own red: race 1
> (`getRemainingBudget` → `recordUsage`) at **M14**, `expected [400,400,400,400,400] to have a length of 2
> but got 5`; race 2 (select-then-upsert **inside** `recordUsage`, which *lost* usage) at **M15**,
> `expected 300 to be 600`. The fake is stateful and yields at the start of every operation — without that
> yield the old implementation passes too and the test proves nothing, which is Phase 1 U10's §6.2.2 lesson
> applied rather than quoted.

**Dispositioned into units:** ~~FU-5 (→U3)~~ **FU-5 CLOSED**, FU-6 (→U3, partially), ~~FU-7 (→U2)~~ **FU-7 CLOSED**, FU-16 (→U9, reframed),
FU-20 (→U11), FU-24 (→U21), FU-25/FU-26 (→U22), FU-28 (→U12).

**Remaining open, deliberately unscheduled:** FU-1, FU-4, FU-8, FU-9, FU-10, FU-11, FU-12, FU-14, FU-15,
FU-17, FU-18, FU-19, FU-21, FU-22. Each carries its own written reason in Phase 1 plan §12; none is a live
defect; none is dropped.

### 4.4 Found while orienting — not previously in any register

| # | Finding | Evidence | Disposition |
|---|---|---|---|
| **N-1** | **`/api/lab-import/extract` calls a paid API with no budget check and no rate limit.** §4 rule 9 requires both. | `pdf-adapter.ts:136` imports `@anthropic-ai/sdk`; the route has zero budget references | → **U5, U7**. **[2026-08-09 CLOSED]** Both halves, by two units and not one: U5 (`7d0913f`) added the rate limit; the budget half was still missing when **U7's `PAID_API_BUDGET` guard found it on the day the guard was written** — `src/app/api/lab-import/extract/route.ts — reaches a paid API with neither a budget reservation nor a maxDuration ceiling` — and U7 (`24d563f`) closed it with `export const maxDuration = 60`. There is no token ledger to reserve against for a single upload, so wall-clock **is** the budget control there; the guard accepts either, by design. Worth recording that the finding was written in the register on 2026-08-06 and was *still* half-open three units later: a register row is not a control, and the guard is |
| **N-2** | **The advisor budget has two races, not one**: between `getRemainingBudget` and `recordUsage`, *and inside* `recordUsage`, which is select-then-upsert (`repo.ts:191-207`) — so concurrent turns can **lose** usage | read | → **U4** |
| **N-3** | `mappers.ts` casts at **13** sites against plain `text`/`text[]` columns with no CHECK constraint, so *value* drift stays silent though U8 closed *shape* drift | `mappers.ts:56,67,69,73,75,100,138,139,154,155,167,168,172` — 15 casts total, of which only `:40` (`ratings jsonb`) and `:57` (`severity smallint` with a CHECK) are legitimately excluded | **Register as FU-29**; candidate for U15's migration work. **[Corrected before approval]** first written as 6 sites; the claim→observed pass found 13, which **more than doubles U15's migration-audit surface** |
| **N-4** | **4** dead `safetyCopy` helpers with zero production callers: `labCaution`, `labSupported`, `medicationCaution`, `productReasonValue` | enumerated all 31 `safetyCopy` methods against non-test callers | **Register as FU-30.** `project-status.md:161` says "three" — **corrected in this commit** (the disposition first cited line 162 and claimed a correction that had not been made) |
| **N-5** | `project-status.md:252` says "**two**" client components import domain engines; measured **7** | git grep | **Corrected in this commit** (docs only) |
| **N-6** | `src/data/id-stability.test.ts:5` says "**eight** namespaces"; the manifest has **9** | read | **NOT corrected here — it is under `src/`, which this planning commit may not touch.** Register as **FU-32**; fix it in whichever unit next opens that file (U20). A guard header making a false count is the class U15 was created to audit |
| **N-7** | **One `"use server"` module is an HTTP endpoint that no guard sees.** `src/lib/auth/actions.ts:27,44` return Supabase's raw `error.message` to the browser. `AUTH_COVERAGE` scans `src/app/api/**/route.ts`; `error-disclosure` does not scan `src/lib`. Not a live leak — the text is user-facing auth copy — but the **blind spot** is real | `git grep -ln '"use server"'` + reading both hits | **Register as FU-31.** Cheap ratchet: assert exactly **this 1 file** carries the directive, so a second cannot appear ungoverned. **[Corrected before approval]** This said "two", counting `src/lib/auth/types.ts` — which only *mentions* `"use server"` in a comment. Pinning 2 would have been wrong on day one. **[2026-08-08]** The ratchet's predicate is therefore **the directive as the module's first statement**, not `git grep -ln '"use server"'`, which still returns 2 — see U2 |
| **N-8** | `enforce_admins: false` — the residual on the required CI check. Recorded in three documents, owned nowhere | `gh api` (Phase 1) | → **decision 4**. **[2026-08-08 CLOSED]** flipped to `true` and GET-verified; the corpus is synced. The "three documents" figure was itself wrong — it is **four documents, five passages**, plus two dated records annotated rather than rewritten. A finding that miscounts its own blast radius is the FU-22 lesson again |

### 4.5 Raised by executed units — the register the phase writes as it runs

Findings surfaced *by* a unit that fall outside that unit's scope (`CLAUDE.md` §8.1). A row is closed by
the owning unit's report, not by this table. Numbering continues **N-**, append-only, so a number cited in
a commit message keeps pointing at the same finding.

| # | Found by | Finding | Evidence | Disposition |
|---|---|---|---|---|
| **N-9** | U1 | **A missing `API_ANTHROPIC_KEY` reaches the user as a *failed extraction*, with advice that cannot work.** `requireKey`'s throw is re-wrapped by `extractFromPdf`/`extractFromText` into `ExtractionError(…, "EXTRACTION_FAILED")`, so the route answers **502 EXTRACTION_FAILED** with `"Extraction failed — try CSV or paste."` It is an operational 503 wearing a 502, and the remedy it offers is wrong: **paste routes through the same absent key** (`makeClaudeTranscriber`), so only the CSV third of that advice can succeed. U1 found this while enumerating callers and **deliberately preserved it** | `pdf-adapter.ts` `requireKey` → the `catch` at `:92`/`:119` → `extract/route.ts`'s `ExtractionError` branch. Preservation is pinned by `lab-import.test.ts` ("still surfaces a missing API key as ExtractionError/EXTRACTION_FAILED") | **Unit candidate — UNDECLARED-BYTE-CHANGE class, and that is why U1 did not take it.** Correcting it moves 502→503 and rewrites client copy; U1's only declared change was the bare-`Error` 503→500. **Sequenced to U6** by the plan's own logic: U6 already owns `claude-adapter.ts` + the paid-call failure paths and is the first unit after U5 that touches how a paid route reports failure, so the copy and the status move once, together, with U5's 429 already declared. **Needs a decision only on the copy**, not on the status. **[2026-08-09 CLOSED by U6, `3d6b3c4`, under the owner's ruling of 2026-08-09]** The ruling: report it as an honest operational **503** through the `NOT_CONFIGURED` path, with copy that no longer offers advice that cannot work. Executed — both adapters now rethrow `NotConfiguredError`, so the throw escapes to `handle()` instead of being re-wrapped, and `lab-import.test.ts`'s preservation pin was **deliberately inverted** (it now asserts 503/`NOT_CONFIGURED`) rather than deleted, so the reversal is visible in the diff. Declared byte change: **502 `EXTRACTION_FAILED` → 503 `NOT_CONFIGURED`**, and the body text from `"API_ANTHROPIC_KEY not configured"` to `AI_SERVICE_NOT_CONFIGURED`, which names no environment variable, asserts nothing the system did not compute, and promises no timeline |
| **N-10** | U1 | **`src/app/api/advisor/route.ts:52` re-authors the literal `"API_ANTHROPIC_KEY not configured"`** in a `fail(…)` pre-flight, independently of `claude-adapter.ts`'s `NotConfiguredError`. Two hand-authored copies of one operational string, in two layers, with nothing binding them. Editing one leaves the other stale, and the pre-flight is the copy users actually see | `git grep -n "API_ANTHROPIC_KEY not configured"` → `advisor/route.ts:52`, `claude-adapter.ts:154`, `pdf-adapter.ts:171` (the latter two re-measured after U1's import lines shifted them) | **[2026-08-09 CLOSED by U6, `3d6b3c4`]** ~~Open — small, deliberately not folded into U1.~~ The fix was the shared constant this row predicted: `AI_SERVICE_NOT_CONFIGURED` in `src/lib/api/errors.ts`, imported by all three sites, so there is now **one** authored copy of the string and drift is a compile-time impossibility rather than a review responsibility. `NOT_CONFIGURED_TOTALITY` does not see a `fail()` argument — it never will; that part of the row was right and the guard was not widened. What the row did **not** foresee is that the constant *blinded the guard in the other direction* — see **N-14** |
| **N-11** | U2 | **`ExtractionError` now carries `cause` and nothing logs it.** U2 moved the underlying transcription error off the message and onto `cause` (removing the disclosure read). The diagnostic value is preserved *in the object* but never reaches a sink: the extract route answers a canned 502 and `handle()` is never reached, so `logInternalError`'s `describeCause` never runs on it | `pdf-adapter.ts:97,127` carry `cause: e` (the reads U2 removed were at `:92,119` before the fix); `extract/route.ts`'s `ExtractionError` branch returns without logging | **Open — blocked on a sink, which is roadmap item 1's residue.** Closes when **U23** lands (`path`, `userId`, a real sink). Recorded now because "the data is captured" and "the data is observable" are different claims and U2 only bought the first |

| **N-12** | U4 | **`getRemainingBudget` has no caller outside its own tests.** U4 replaced the read-then-decide pair with `reserveAdvisorTokens`, so the read half is now unreferenced by `src/app` and `src/components` (measured: zero matches in either). It is not dead by accident — it is the honest, non-mutating way to answer "how much budget is left", which **F5's correlation-ID work and any future budget UI would want** | `git grep -n getRemainingBudget -- src/app src/components` → no output; **8** matching lines remain, all in `repo.ts` (2) and `repo.test.ts` (6) — the first figure written here said 4, and re-measuring before integration is what caught it | **Open — KEPT DELIBERATELY, owner: whichever unit first renders budget state (candidate U19, which already opens the advisor UI).** Recorded rather than deleted because `CLAUDE.md` §8.2 forbids letting a temporary state pass as permanent in either direction: an unused export is debt, and deleting a correct read accessor to make a count go down is worse debt. If no UI claims it by phase close, delete it then |
| **N-13** | U4 | **`recordUsage` survives for the seed path only, and can no longer work for anyone else.** 0008 removed the end user's INSERT/UPDATE/DELETE on `advisor_usage`, so its direct upsert is denied for any anon-key client. `npm run db:seed` runs under the service-role key, which bypasses RLS, so the function still works there and only there | `supabase/migrations/0008_usage_ledger_policy.sql` §1; `recordUsage` is now marked `@deprecated` for request-path use | **Open — narrow and labelled, not removed.** Deleting it is a change to the seed path under a unit that did not own the seed path (§8.1). The `@deprecated` tag plus the header sentence is what stops a future caller adopting it and discovering the denial in production. Owner: the seed/migration-tooling unit, **U15** |
| **N-14** | U6 | **A guard that matches literal text is one constant-refactor away from vacuity, and this was not a hypothetical.** U6 replaced three hand-authored `"… not configured"` literals with the shared constant `AI_SERVICE_NOT_CONFIGURED` (closing N-10). `NOT_CONFIGURED_TOTALITY` matched the *literal argument text* of a `new …Error(...)`, so `new NotConfiguredError(AI_SERVICE_NOT_CONFIGURED)` became **invisible to it** — the good refactor disarmed the guard watching that exact code. It did not fail silently only because the guard's own anti-vacuity inverse (the sanctioned-sites assertion) went red | U6 extended the guard with `readPhraseConstants`, so the phrase is now tracked through **names** as well as literals, plus 4 self-tests and a pin that `AI_SERVICE_NOT_CONFIGURED` is still resolved. 18 → 23 tests | **Instance closed by U6; the CLASS is open, and this row owns it.** Named task, **audit only, no guard edits**: enumerate every guard in `src/architecture/` by **matching strategy** — literal / identifier / structural — and state for each whether a constant-extraction, a rename, or a helper-extraction would defeat it, and what specifically would do so. Fixes land in each guard's owning unit, never here. **Rides with the first Group C unit to finish.** Sibling evidence that the class is real and not confined to `src/`: **GATE B1 clause (i)'s own check text** is a raw `grep` that this discharge found matching migration 0008's explanatory *comment* quoting the very policy it dropped — see the gate block |
| **N-15** | U6 | **`AdvisorPanel` does not handle the new `aborted` turn status.** U6 gave the agent loop a terminal `aborted` state so a client disconnect settles its reservation and stops the loop. Today that state is **server-side terminal** — the client that would see it is by definition the one that hung up, so nothing renders wrong and there is no live defect | `src/lib/advisor/agent.ts` returns `{ status: "aborted", … }`; `AdvisorPanel` switches on the other statuses only | **Open — not a defect today, and a trap tomorrow.** The moment any surface *retries* or *resumes* a turn, or the status is persisted and re-read, an unhandled case becomes a silent blank. Owner: **U19**, which already opens the advisor UI. Recorded because "unreachable today" and "safe" are different claims |
| **N-16** | Gate B1 discharge | **`RLS_COVERAGE` cannot see a counter table being *widened* by a later migration — only dropped, altered, or disabled.** Its `Weakening` union is exactly `"drop policy" \| "alter policy" \| "disable rls"`. A future `0010` adding `create policy "x" on public.advisor_usage for all using (user_id = auth.uid())` **alongside** the SELECT-only policy would reopen §2's hole, and the effective-policy model would record it as a policy merely *present* — no weakening event, no red | `rls-coverage.test.ts:100-105` (the union) and `:139` (`weakenings` is only pushed from the drop/alter/disable handlers); confirmed against the effective-state parse used to evaluate gate clause (i) | **Open.** The gate's clause (i) is a **one-time command evaluation at discharge**, not a standing assertion — nothing prevents regression after it. The durable form is a named `COUNTER_TABLES` set (`advisor_usage`, `api_rate_limits`) with a rule that no effective policy on them may be `for all`/`for delete`/`for insert`/`for update`. Owner: **U15** (migration tooling) or whichever unit next opens `rls-coverage.test.ts`, whichever is first. Not taken in U5–U7: none of them owned that guard, and §8.1 says name it rather than absorb it |

### 4.6 Owner-run operational items — things CI structurally cannot do

Nothing in this repository applies a migration or opens a database connection during a test run, so a
claim about the **deployed** database is never established by a green build. These are the items that
require the repository owner and a live Postgres. They are listed here, not buried in a file header, so
that "Phase 2 closed" cannot be read as "these were done".

| # | Item | Why CI cannot do it | Exact procedure |
|---|---|---|---|
| **OP-1** | **Deployment order for 0008 + U4.** `0008_usage_ledger_policy.sql` removes the end user's INSERT/UPDATE/DELETE on `advisor_usage`; U4 is the code that stops needing them. **They are one deployment.** Applying 0008 against a database whose deployed code still calls `.from("advisor_usage").upsert(...)` makes every advisor turn fail to record usage — the write is denied, `recordUsage` raises, and the turn 500s **after the paid call has already been made** | CI applies no migrations and holds no credentials; both halves are in the same integration commit, so the repository is self-consistent and only the *live* rollout can get the order wrong | Deploy the application code first, or both together. Never the migration alone. Rolling back the code without rolling back 0008 recreates the same failure |
| **OP-2** | **Verify the ledger hole is actually closed.** That the SELECT-only policy denies DELETE/UPDATE, and that the two `SECURITY DEFINER` functions work and cap correctly | Every U3 assertion is **static SQL text analysis**. `RLS_COVERAGE` and `SQL_FUNCTION_REGISTRY` read the migration as text; neither can execute a policy | The four psql statements in `0008_usage_ledger_policy.sql`'s header. **Run them as the `authenticated` role** — a superuser session bypasses RLS and reports a false pass. Record the output under `docs/05-qa/` with a date, per the U17 pattern |
| **OP-3** | **Verify the reservation is atomic under real concurrency.** U4's proof is a stateful fake, which establishes that the TypeScript caller has no read-then-write window — not that Postgres serialises the `UPDATE … WHERE … RETURNING` | No database in CI, and a JS fake cannot model row locks | Two concurrent psql sessions calling `reserve_advisor_tokens` against a budget admitting one. Same dated record as OP-2 |

**Until OP-2 and OP-3 have dated records, the honest statement is: the ledger hole is closed IN THE
MIGRATION SET and unverified AGAINST THE DEPLOYED DATABASE.** Those are different claims, and §2's finding
is only fully retired by the second.

---

## 5. Units

Sizes follow Phase 1's key: **S** = one focused test file or a config change · **M** = a guard with
fixtures, or ~5–10 route tests · **L** = a refactor plus its tests.

### Group A — the error contract

**U1 · Typed `NotConfiguredError` replaces substring dispatch.** *(roadmap 2, F3)* — **DONE 2026-08-08, `c0eb8bf`** (+24 tests → 883/74; CI run 31312551699). Five mutations red incl. the M4 bypass probe; the file list held except that the unit also added a **reachability** pin, because every other pin constructs the error itself and would stay green if every throw site reverted. **Caller enumeration (§9.4) changed the unit:** only `supabase/env.ts` actually reaches `handle()` — `claude-adapter.ts` is pre-empted by the route's own pre-flight and `pdf-adapter.ts` is intercepted by the `ExtractionError` branch — so the plan's premise that all three sites shared one path was **false**, and converting `pdf-adapter` naively would have moved bytes 502→503 undeclared. Preserved instead, and pinned. See **N-9**, **N-10**.
N `src/lib/api/errors.ts` · M `respond.ts:247-255`, `supabase/env.ts`, `claude-adapter.ts`,
`lab-import/pdf-adapter.ts`, `respond.test.ts` · N `src/architecture/not-configured-totality.test.ts`.
**M**, deps none.
**Design constraint, load-bearing:** the class must carry its client-safe text on a field **not** named
`message` or `stack`. `error-disclosure`'s `TEXT_PROPS` is `{message, stack}`; naming it `message` would
force an allowlist entry in U2 on day one. Naming it `publicMessage` means both violations vanish and no
allowlist is ever created. One word, two units of consequence.
**Red:** revert one throw site to a bare `Error("… not configured")` → totality guard names the file and
the route test goes `expected 500 to be 503`; delete the `instanceof` branch → `respond.test.ts` red;
`git add -N` a new file with a bare throw → false green unstaged, red staged (§4.2).
**Behaviour change #1** (declared): a bare `Error` with that text from an *unconverted* source now returns
500 + correlation ID instead of 503. All three real sites are converted, so no live path changes. A new
pin asserting the bare-Error case is now 500 is what makes this deliberate rather than absorbed.

**U2 · Extend `error-disclosure` to `src/lib/**`.** *(FU-7)* — **DONE 2026-08-08, `4d3a060`** (+3 tests → 886/74; CI run 31313289912). **3 violations measured in 2 files**, as §4.3's closure records. Behaviour change #2 shipped as specified: the loop takes an injected `onInternalError` and puts only a correlation id where the exception text used to be, so `agent.ts` gained no `@/lib/api/respond` edge. See **N-11**.
M `error-disclosure.test.ts` (a third inventory; its header's "`src/lib/**` in particular is not scanned"
paragraph becomes false) · M `advisor/agent.ts`, `lab-import/pdf-adapter.ts` + tests. **M**, deps **U1**.
Measured: err-text reads reachable by the catch-taint detector live in **3** files under `src/lib` —
`agent.ts`, `respond.ts`, `pdf-adapter.ts`. A **fourth**, `auth/actions.ts:27,44`, reads non-caught error
text and is outside the detector's model entirely — see N-7, which this unit does not close. U1 removes the `respond.ts` ones by construction; the exact violation count is whatever
the detector reports once pointed at `src/lib`, and the unit must record that number rather than predict it.
`agent.ts:154` is a genuine disclosure path, not bookkeeping: its text is `JSON.stringify`'d into a tool
result and **fed back to the model**, which can echo it. `agent.ts` is a governed pure-engine file, so it
must **not** import `@/lib/api/respond` — that is the transitive `next/*` edge **Phase 1 U18**'s allowlist blames for
`execute.ts`. Inject an `onInternalError` sink from the route.
**Red:** plant a read in `stack-evaluator/rules.ts` → named; **keep the plant and revert the inventory
extension → must go green** (Gate C2's technique — the only thing that proves the extension does the
work); `git add -N` a rogue file → both ways.
**Behaviour change #2** (declared): the advisor's tool-failure text changes, which changes model input and
so can change answer prose. No status, envelope or header change.
**Closes FU-7 — and narrows rather than eliminates the class:** `src/app/**/page.tsx`, `src/components/**`
and the **one** `"use server"` module (N-7) stays unscanned. The header must say so.
**[2026-08-08 — corrected at approval]** This read "the two", the same miscount N-7 already had corrected
above; the correction had not been propagated to this sentence. **And the miscount is instructive, so it is
written into N-7's predicate rather than just fixed:** `git grep -ln '"use server"'` returns **2** files —
`auth/actions.ts`, which carries the directive, and `auth/types.ts`, which only *names it in a comment
explaining why it is not there*. A ratchet built on the grep would pin 2 and be wrong on day one. The
predicate must be **the directive as the module's first statement**, not the string anywhere in the file.

> **GATE A1** — `error-disclosure.test.ts` declares three non-empty inventories covering
> `src/app/api/**/route.ts`, `src/services/**`, `src/lib/**`; violation list `[]`; allowlist empty or
> carrying **Phase 1 U18's** ratchet property.
> **Check:** `grep -cE '^const [A-Z_]+ = trackedFiles\(' src/architecture/error-disclosure.test.ts` = **3**
> **and** each inventory asserted non-empty inside the test **and** that file green.
> **[2026-08-06 — corrected before approval]** This gate first read `grep -c 'trackedFiles('` = 3, which
> **already returns 3 today** (one declaration at `:103` plus two call sites) — the gate passed before any
> work was done. That is precisely the vacuity failure this plan condemns in U18's eslint `ignores`,
> committed in the gate that was supposed to prevent it. Caught by the claim→observed pass.
>
> ### **[2026-08-08] GATE A1 — DISCHARGED.** Same command, both sides:
> ```
> git show f00d6a9:src/architecture/error-disclosure.test.ts \
>   | grep -cE '^const [A-Z_]+ = trackedFiles\('        →  2     (before, at Group A's base)
> grep -cE '^const [A-Z_]+ = trackedFiles\(' \
>   src/architecture/error-disclosure.test.ts           →  3     (after, at 4d3a060)
> ```
> Clause by clause: **three** inventories — `API_ROUTES`, `SERVICE_MODULES`, `LIB_MODULES` — each asserted
> non-empty *inside* the test (`trackedFiles` hard-fails on an empty result, and `LIB_MODULES` additionally
> carries a `>= 60` floor, proven red at N3 against a partial collapse to 2 that the empty-check misses);
> violation list `[]`; **allowlist empty — none was ever created**, which was the point of U1's field-name
> decision; `error-disclosure.test.ts` green at **31 tests**.
>
> The corrected check is what made this meaningful: the original form returned 3 before either unit ran.

### Group B — paid-API control

**U3 · Harden the ledger: writes leave the user's reach.** *(§2, FU-5, FU-6 partially)* — **DONE 2026-08-08, `656a628`** (+18 tests → 910/75; CI run 31314668727). Seven mutations red incl. M13 (unstaging 0008 blinds both guards). **Closes FU-5.** §2's finding is closed in the migration set; **OP-2 owes the live verification.**
N `supabase/migrations/0008_usage_ledger_policy.sql` (drop `own_advisor_usage`; select-only replacement;
`security definer` reserve/settle function **with `set search_path = ''`**) · M `rls-coverage.test.ts`
(must now model `drop policy` / `alter policy` — **closes FU-5**) · N
`src/architecture/sql-function-registry.test.ts`. **M**, deps none.
FU-5 was deferred on the stated ground that "no migration uses any of these today". **This is the first
migration that does** — the deferral's own condition fires here, which is why the guard extension is not
optional.
**Red:** add an unreplaced `drop policy` → `RLS_COVERAGE` names table + migration; omit `set search_path`
→ `SQL_FUNCTION_REGISTRY: … is SECURITY DEFINER with no "set search_path" — a caller-controlled
search_path is a privilege-escalation vector`; `git add -N` the migration → both ways, both guards.

**U4 · Atomic reserve-then-spend.** *(roadmap 3; named exit criterion; N-2)* — **DONE 2026-08-08, `54ef19b`** (+11 tests → 921/75; CI run 31316634263). **Closes N-2**, both races. All **50** advisor route pins pass; precisely, their assertions are unchanged except the one naming `recordUsage`, while the `vi.mock` wiring changed because the module's exports did — "unedited" would have been wrong. Added beyond spec: a **SQL↔TS totality** binding in `SQL_FUNCTION_REGISTRY` (every `rpc()` callee is a defined function, and every definer function has a caller), proven red both directions. See **N-12**, **N-13**, **OP-3**.
M `advisor/repo.ts:168-210` · M `advisor/route.ts` · **M** `src/lib/advisor/repo.test.ts` (exists, 9 tests) · M `route.test.ts`. **M**, deps U3.
**Ruling the plan makes:** supabase-js cannot express `col = col + n` over PostgREST, so "single `UPDATE …
RETURNING`" is either an RPC (U3 provides one) or a **compare-and-set** (`.eq` on the prior values;
zero rows returned means someone else won → retry). CAS *is* an `UPDATE … WHERE … RETURNING`. Put it
inside U3's function; if U3 is cut, CAS still works standalone — that is the recorded fallback.
A reservation is an upper bound taken **before** the call, settled to actual after. Verified no UI renders
remaining budget, so the pre-decrement is unobservable.
**Red:** **stateful** mock, 5 concurrent reservations against a budget admitting 2 → restore
read-then-write → reservations exceed the cap and refusals are 0. *A constant-returning mock leaves this
green — Phase 1's U10 hit exactly this (§6.2.2).* Then re-run all **50** advisor route pins **unedited** (Phase 1 recorded 49; U21 added one since).

**U5 · Rate limit both LLM-backed routes.** *(roadmap 3; N-1)* — **DONE 2026-08-09, `7d0913f`** (+28 tests → 949/77; CI run 31318417314). Five mutations red, incl. the plan's literal `expected 12 to be 13` and the spoof probe. **Two spec deviations, both forced and both recorded rather than absorbed:** (1) the shared guard could **not** live in a `route.ts` — Next.js type-checks route modules against `{ [x: string]: never }`, so an exported helper fails `next build`; it lives in `src/lib/api/rate-limit-guard.ts`, which is where §4 rule 8 wanted it anyway. (2) Threading a Supabase client into the extract route broke that route's **safety-critical structural pin** (`expect(source).not.toMatch(/@\/lib\/supabase/)`, which guards the confirm-gate between transcribe and commit). The pin was **not weakened**: the guard creates its own client, and the pin's comment now records the narrowed truth — the route reaches no repository and no lab-data table, and transitively causes exactly one counter write one module away.
N `0009_rate_limits.sql` · N `src/lib/rate-limit/` (pure) + test · M `vitest.config.ts` (new engine dir →
threshold, §5.7) · N `db/rate-limit-repo.ts` · M `db/types.ts` · M `schema-type-drift.test.ts` (`BINDING`
12→13) · M both routes + tests. **L**, deps U3, U4.
**Trap to write into the header:** per-IP identity comes from `x-forwarded-for`, whose **first** element is
attacker-controlled. `split(",")[0]` yields a limiter anyone defeats with one header. The trusted value is
the platform-appended last hop. This must be a named, tested function — §4 rule 8.
**Red:** drop `enable row level security` → `RLS_COVERAGE`; omit the row type from `BINDING` → `SCHEMA_DRIFT`
+ the totality assertion `expected 12 to be 13`; off-by-one the window → `expected 200 to be 429`; trust
`x-forwarded-for[0]` → two spoofed requests share no bucket.

**U6 · Disconnect, `maxDuration`, Anthropic timeout.** *(roadmap 3; named exit criterion)* — **DONE 2026-08-09, `3d6b3c4`** (+12 tests → 961/77; CI run 31318750982). Three mutations red as specified. **Closes N-9** (under the owner's ruling) **and N-10**. The abort branch had to settle **then return before persistence** — the first placement settled correctly but still ran `appendMessages`, writing a blank assistant turn into the user's history (`expected "spy" to not be called at all, but actually been called 1 times`). A *thrown* turn still does **not** settle: it may already have made a paid call, so over-charging by one reservation is the safe direction and stays deliberate. Raised **N-14**, **N-15**.
M `advisor/route.ts`, `advisor/agent.ts`, `claude-adapter.ts` + tests. **M**, deps U2, U4.
An aborted turn must **settle its reservation**, or disconnect leaks budget — that is the roadmap's "stops
the loop *and the billing*".
**Red:** abort after step 1 → removing the check gives `adapter.send` called 3 times not 1; removing
settle-on-abort → `settleUsage` not called; deleting `maxDuration` → `PAID_ROUTE_CONFIG` names the route.

**U7 · `PAID_API_BUDGET` — the guard §4 rule 9 has never had.** — **DONE 2026-08-09, `24d563f`** (+2 tests → 963/77; CI run 31319018055). Four mutations red, incl. the plan's literal `found 0 paid-API routes; a guard that scans nothing passes vacuously` and the `add -N` probe both ways. **Closes N-1.** The walk had to be **transitive by necessity, not by ambition**: neither paid route imports `@anthropic-ai/sdk` directly — both reach it through an adapter that `await import()`s it lazily — so a direct-import check would have reported zero paid routes and passed green. **The guard found a live gap the day it was written:** `/api/lab-import/extract` carried U5's rate limit and no budget control at all.
**M `src/architecture/boundaries.test.ts`** · M `CLAUDE.md` §4 row 9. **M**, deps U4, U5.
**The file is forced, not chosen:** `doc-truth.test.ts:168` resolves rule 9's marker to the literal
`PAID_API_BUDGET`, and line 249 derives titles **only** from `boundaries.test.ts`. A guard elsewhere leaves
rule 9 unbound in the "silently gained enforcement" direction — the drift U14 exists to catch.
**Design:** derive the governed set mechanically — tracked route files whose import graph reaches
`@anthropic-ai/sdk`. Today exactly **2**: `/api/advisor` and `/api/lab-import/extract`.
**Red:** delete the rate-limit call from `extract` → named; `git add -N` a new paid route with neither
control → red staged, false green unstaged; break the graph walk → `found 0 paid-API routes; a guard that
scans nothing passes vacuously`; revert §4 row 9 → `DOC_TRUTH: rule 9: §4 says not enforced, but
PAID_API_BUDGET: exists`.

> **GATE B1** — clause by clause: (i) **`! grep -q "for all"`** over the policies naming `advisor_usage`
> and `api_rate_limits` — expressed as a negated match, not `grep -c … = 0`, because `grep -c` **exits
> non-zero on no match** and would invert a `set -e` gate script; (ii) a concurrency test proves the cap holds and has been shown **red** against
> read-then-write with the text pasted into the unit report; (iii)
> `grep -c 'PAID_API_BUDGET:' src/architecture/boundaries.test.ts` ≥ 1 **and** §4 row 9 reads `Enforced`
> **and** `doc-truth.test.ts` green; (iv) both paid routes assert 429; (v) every `SECURITY DEFINER`
> function sets `search_path`.
>
> ### **[2026-08-09] GATE B1 — DISCHARGED.** Clause by clause, every figure re-measured at `24d563f`:
>
> **(i) — PASS on the effective policy state; and the clause's own check text is defective.**
> Written as `! grep -q "for all"` over the policies naming the two counters, it **FAILS** — correctly, by
> its own logic: migration 0003's `create policy "own_advisor_usage" … for all …` is still in the corpus,
> because **migrations are append-only and dropped text never leaves**. The literal form is therefore
> *unsatisfiable by construction* for any table that ever had such a policy — it can only pass on a table
> whose history is already clean, which is the opposite of the tables it was written to protect. It also
> matches 0008's explanatory **comment**, which quotes the policy it drops.
> The check that means what the clause meant applies statements **in order** and asks what is in effect:
> ```
> cat supabase/migrations/*.sql | sed 's/--.*$//' | tr '\n' ' ' | tr ';' '\n' \
>   | grep -iE 'create policy|drop policy' | grep -iE 'advisor_usage|api_rate_limits'
>
>   create policy "own_advisor_usage"        on public.advisor_usage   for all    using (user_id = auth.uid()) …
>   drop policy if exists "own_advisor_usage" on public.advisor_usage
>   create policy "read_own_advisor_usage"   on public.advisor_usage   for select using (user_id = auth.uid())
>   create policy "read_own_api_rate_limits" on public.api_rate_limits for select using (user_id = auth.uid())
> ```
> Effective state: **one SELECT-only policy on each counter; no `for all` on either.** PASS.
> This is not a courtesy re-reading — it is the model `RLS_COVERAGE` already implements
> (`readMigrationFacts` applies events in position order, and its `normalize()` strips `--` comments, so the
> guard was never fooled by the comment the gate's grep is). **Two consequences, neither smoothed over:** the
> corrected form is recorded here beside the original rather than replacing it (§7 — annotate, do not
> erase), and the fact that this remains a **one-time command with no standing assertion behind it** is
> registered as **N-16**, along with the widening blind spot that makes a standing assertion necessary.
>
> **(ii) — PASS.** Two independent concurrency proofs, each shown red against read-then-write. U4's ledger
> race: `expected [400,400,400,400,400] to have a length of 2 but got 5` — reservations exceeded the cap and
> refusals were 0. U5's limiter race: `expected [ …10 ] to have a length of 3 but got 10`. Both drive a
> **stateful fake that yields at the start of every operation**; a constant-returning mock cannot tell an
> atomic limiter from a racy one, which is Phase 1 U10's §6.2.2 failure and why the shape is prescribed.
>
> **(iii) — PASS.** `grep -c 'PAID_API_BUDGET:' src/architecture/boundaries.test.ts` → **4** (≥ 1);
> `CLAUDE.md` §4 row 9 reads **`Enforced`** and names its enforcer; `doc-truth.test.ts` green. Bound **both
> ways** by M27 — reverting the row gives
> `DOC_TRUTH: rule 9: §4 says not enforced, but PAID_API_BUDGET: exists`.
>
> **(iv) — PASS.** `toBe(429)` in `src/app/api/advisor/route.test.ts` and
> `src/app/api/lab-import/extract/route.test.ts`, each beside the negative assertions that matter more than
> the status: no reservation taken, no model call, no parse.
>
> **(v) — PASS.** **3** `security definer` statements in the corpus — `reserve_advisor_tokens`,
> `settle_advisor_tokens`, `consume_rate_limit` — and **3** carry `set search_path = ''`. Standing rather
> than one-time: `SQL_FUNCTION_REGISTRY` asserts it over a derived inventory with a floor, green at 20 tests.

### Group C — persistence trust boundaries

**U8 · `replaceFlags` atomicity.** *(roadmap 4; named exit criterion)* M `evaluation-flag-repo.ts` · N its
test · M `services/evaluation.test.ts` (its mock encodes the semantics; unchanged, it lies). **S/M**, deps none.
Insert-then-delete-by-id. **Cost to state, not discover:** between insert and delete the table transiently
holds both sets, so a concurrent `listFlags` sees duplicates. Acceptable (per-stack, user-initiated).
**Red:** mock the insert to reject → prior flags still returned; restore delete-first → `expected [] to have length 3`.

**U9 · FU-16, reframed as ownership pins.** N ~11 `src/lib/db/*.test.ts` + **M** `advisor/repo.test.ts` (exists). **L**
(cuttable), deps U8.
**Reframing the plan rules on:** FU-16 reads as "11 modules untested", which invites a coverage-shaped unit
of low value. The property worth pinning is that **every repo function taking a `userId` applies
`.eq("user_id", userId)`** — currently unpinned, with only RLS enforcing ownership. That is the U19/U21
argument and §4 rule 8; the coverage rises as a by-product, not as the goal.
**Red:** delete `.eq("user_id", userId)` from `getStack` → `expected "eq" to have been called with [ 'user_id', 'u1' ]`.

**U10 · `REPO_SCOPING` guard.** N `src/architecture/repo-scoping.test.ts`. **M**, deps U9. Exemption list
measured at **3** (`stack_items`, `evaluation_flags`, `advisor_messages` — transitively owned, no
`user_id` column), each with a written reason.

**U11 · FU-20 row-type placement.** **S**, deps U5, U9. **Its red proof is genuinely weak** — it is a move,
and `SCHEMA_DRIFT`'s shape discovery (§6.0.1) is correct either way. Its only proof is the totality
assertions re-running unedited. Cut candidate; said plainly rather than dressed in a manufactured mutation.

**U12 · FU-28: one message for both 404s.** **S**, deps none. **Behaviour change #3** (declared): a
response-body byte change.

> **GATE C1** — every `src/lib/db` module taking a `userId` has a test asserting `.eq("user_id", …)`, or is
> in `REPO_SCOPING`'s exemption list. **Check:** exemption list length == 3 **and** each entry names a
> table with no `user_id` column in the migrations.

### Group D — platform and operations

**U13 · Security headers, non-CSP.** *(roadmap 7, safe half; named exit criterion)* M `next.config.ts` · N
`src/architecture/security-headers.test.ts` · N `tests/e2e/security-headers.spec.ts` (**ungated** — the
public Library needs no credentials). **S/M**, deps none.
**The two tests are not redundant:** the unit test asserts the *config*, the E2E asserts *response bytes*.
Prove it with a mutation scoping the header to a non-matching path — config green, E2E red.

**U14 · CSP.** **M**, deps U13. **Report-Only first.** A strict CSP breaks Next 15's inline bootstrap
without a nonce threaded through `middleware.ts` — which sits at the **repository root, outside `src/`**,
so `TREE_PARTITION` does not govern it and **no test covers it**. Putting security logic there recreates
the C-11 shape at a path C-11's fix does not reach. Design: a pure `src/lib/security/csp.ts` builder
(unit-tested, thresholded), `middleware.ts` reduced to a call.

**U15 · Migration tooling.** *(roadmap 6)* M `package.json` · N `supabase/config.toml` · N a dated
deployed-schema record · M `ci.yml` **and `CLAUDE.md` §5 in the same commit** — FU-23 made that binding an
ordered equality, so omitting it is a guaranteed red. **M/L**, deps after U3, U5.
**Its exit criterion is unmeetable as written — see §7 decision 5.**

**U16 · Data export.** *(roadmap 8, read half)* N `src/app/api/account/export/route.ts` + test. **M**, deps U9.
Takes no input → **400-exempt**, so it joins the §10.1 list, which is **prose (FU-13)**. This unit is the
trigger to make that list executable or to knowingly extend prose — it must not do so silently.
§2.3 rule 15: the payload is health data and must not pass through any logging path. Assert it.

**U17 · Data deletion.** *(roadmap 8, write half)* N `src/app/api/account/route.ts` (DELETE) + test. **M**,
deps U9, U16. **Highest-risk new surface in the phase.**
**Scope constraint the roadmap does not state:** deleting the `auth.users` row needs the service-role key,
which §2.3 rule 14 confines to the dev seed script. So this route **cannot** delete the auth identity.
Honest scope: delete the user's rows across the 12 tables (cascades verified 12/12 reachable), leave the
identity. "Export and delete their own data end to end" is satisfiable; "delete my account" is not, and the
difference must be in the plan **and in the response body**, not discovered by a user.
**Red:** drop the confirmation check → `deleteAllForUser` called when it should not be; scope the delete by
a body-supplied user id → a **wrong-value probe** (§6.2.2), since Zod would strip it and a
plausible-attack probe would survive.

**U18 · `npm run lint`.** *(roadmap 9)* **M** (configure) / **S** (remove), deps none.
The load-bearing part is the **anti-vacuity assertion**: assert eslint lints ≥ N files. A misconfigured
`ignores` produces a green lint over zero files — the *exact* failure mode the roadmap calls the only
unacceptable state, reintroduced by the fix for it.
**Red:** conditional hook call → `react-hooks/rules-of-hooks`; then `ignores: ["**"]` → `LINT_SCOPE:
eslint matched 0 files; a linter that lints nothing passes vacuously`.

**U19 · F5, correlation ID in the UI.** N `src/lib/api/error-text.ts` + test · M `AdvisorPanel.tsx` · N
`src/architecture/ui-error-text.test.ts`. **M/S**, deps U1.
**The only Phase 2 item needing a harness the repo does not have.** `vitest.config.ts` collects
`src/**/*.test.ts`, there is no jsdom/RTL, and `HARNESS_GAP` hard-fails on any tracked `*.test.tsx`. So the
tested artifact is a **pure formatter** plus a guard asserting no component renders `error.message`
without it. **This unit must not smuggle in a component-test harness.**

**U20 · Slug append-only manifest.** *(§7 ruling 3)* M `id-manifest.json`, `id-stability.test.ts`. **S/M**,
deps none. **Two decisions — §7 decision 6.**
**The trap:** `id === slug` for all 15 supplements today, so a naive namespace is a byte-copy and a test
comparing them passes for the wrong reason. The real proof is a mutation renaming a **slug only**: the slug
namespace goes red while `supplements` stays green.

**U24 · FU-27 — the Advisor leaves the pillar group.** *(§7 decision 1, ruled **Option A** on 2026-08-08)*
M `src/components/layout/TopNav.tsx` · M `CLAUDE.md` §1 (its `[2026-08-06]` divergence block is retired in
the **same commit**, per §7 — struck with its rationale, not deleted) · N a source-level assertion under
`src/architecture/`. **S**, deps none — it touches nothing any other unit touches.
**What it does.** `TopNav.tsx:18-20` builds `pillars` as `user ? [...PILLARS, {href:"/advisor"}] : PILLARS`
and `:33` hands the result to a single `<NavPills items={pillars}>`, so a signed-in reader sees four items
in the pillar group. `PILLARS` itself (`:7-11`) is already exactly the three
`docs/product-direction.md` names — Library, Profile, Stack Lab — so nothing about the rule needs deciding,
only the conditional needs removing. Option A renders the Advisor as the **top-level-adjacent** affordance the v6 design decision
actually authorised: `NavPills` receives the three-pillar array unconditionally, and the Advisor is a
sibling of the sign-out control rather than a member of the group. It stays reachable — this is placement,
not removal.
**The "no test changes expected" claim is inherited from the plan and must be re-verified when the unit
runs, not assumed.** Measured at `d4f6194`: **zero** specs assert nav structure (`git grep -in
'navpills|<nav|getByRole..navigation' -- tests/` → no matches), and the 50 `advisor` mentions across
`tests/e2e/*.spec.ts` reach the page by URL, not by clicking a pill. If either has changed by execution
time, that is the unit's finding and the spec is updated deliberately.
**Red — stated honestly, because this one is weak by nature.** The change is a *deletion* of a conditional,
so "revert it" is just the old code, and a mutation of that shape proves little. The real guard is a
**source-level** assertion that the array reaching `NavPills` is the unconditional three-entry `PILLARS`
literal and that its labels are the three `docs/product-direction.md` names. Mutations: append a fourth
entry → red; restore the `user ? [...PILLARS, …]` conditional → red; rename a pillar → red.
It must be source-level, not a component test: `HARNESS_GAP` hard-fails on any tracked `*.test.tsx`, which
is U19's constraint applying here identically. **This unit must not smuggle in a component-test harness
either.** The exact predicate is the unit's to settle — a regex over source is brittle, and saying so now
is cheaper than discovering it during review.
**Behaviour change #5** (declared): server-rendered markup changes for signed-in users. **No API response
byte changes** — this is the first declared behaviour change in either phase that is purely visual.
**Not cuttable on size.** It implements a recorded ruling; cutting it silently reverts decision 1 to
undecided, which is the "absorb it" failure `CLAUDE.md` §8.1 forbids. Cutting it requires re-opening the
ruling explicitly.

### Group E — cuttable

**U21 · FU-24, cited artifacts must be tracked.** N `src/architecture/cited-artifact.test.ts`. **S**.
**The counting predicate must be stated before this unit starts, or its inventory is undefined.** A first
pass counted 4 live citations; the claim→observed pass found **≥5** documents citing the untracked
`test-results/…/error-context.md` under a looser reading. Proposed predicate: *a non-archive `docs/` file
citing a `test-results/` path as primary evidence for a present-tense claim* — then re-measure. Either
way the guard needs a dated-record exemption, or it demands rewriting history, which §7 forbids.

**U22 · FU-25 / FU-26.** **L**. A *live* CI E2E job needs secrets in a public repo (`phase-0-plan-review.md` §P-03). Achievable
scope: FU-26 (fresh-clone runnability) + per-worker seeded accounts + a **non-live** CI E2E job over the 59
credential-free specs. Live-in-CI is **decision 3**, not an engineering unit.

**U23 · Roadmap item 1's residue.** M `respond.ts` (add `path`, `userId`; a real sink). **S/M**. Deferred:
"target a real sink" implies a logging dependency and an operational decision this plan does not take.

### Sequence

```
Group A   U1 → U2                                   [error contract]      GATE A1
Group B   U3 → U4 → U5 → U6 → U7                    [paid-API control]    GATE B1
Group C   U8 → U9 → U10 → U11 · U12                 [persistence]         GATE C1
Group D   U13 → U14 · U15 · U16 → U17 · U18 · U19 · U20 · U24              GATE D1, D2
Group E   U21 · U22 · U23                           [cuttable]
```
**A precedes B** because U4/U5/U6 all add `catch` blocks under `src/lib/**` and U2's guard is what must see
them. **B precedes C** for merge hygiene (U5 and U11 both edit `db/types.ts` and `BINDING`). **D** is
independent except U19←U1. **U24 sits in D on dependency logic, not affinity**: it has no dependencies at
all and blocks nothing, so it lands wherever D's independent units land. It is *not* in Group E, because
Group E is the cuttable group and U24 is not cuttable (above).

> **GATE D1** — any unit adding a CI step updated `CLAUDE.md` §5's declared chain in the **same commit**.
> **Check:** `doc-truth.test.ts` green. Already mechanical since FU-23; no new machinery.
> **GATE D2** — before U17 merges: U16 is green **and** a test proves `DELETE` without a confirmation token
> writes nothing.

### Cut order (first cut at the top)
1. **U22** — L, headline deliverable blocked on decision 3. Keep the ~S fresh-clone half.
2. **U23** — residue; the sink is an operational decision.
3. **U11** — weak red proof by nature; FU-20 survives as a register row at no cost.
4. **U21** — real but process-shaped.
5. **U19** down to formatter + `AdvisorPanel` only.
6. **U10** — U9's pins cover today's files; the guard's value is over *future* modules.
7. **U14** — keep U13's headers, defer CSP. CSP is the one header that can break the shipped app.
8. **U18** to its cheap branch — *remove* the script. The roadmap explicitly permits this.
9. **U16/U17** — last, and **both go together**: an export route without deletion is half a data-rights
   feature; deletion without export is worse than neither.

**Never cut:** **U1, U2** (the error contract; FU-7's guard is the only thing that would notice a
regression) · **U3, U4** (§2 — the ledger is user-writable *today*) · **U7** (rule 9 is the unenforced rule
this phase explicitly owns) · **U8** and **U13** (named exit criteria, cheap) · **U24** (it carries a
ruling, and cutting a ruling is not a sizing decision — 2026-08-08).

---

## 6. Risks

**Trust boundaries touched:** U3, U4, U5, U7, U9, U10, U12, U14, U16, **U17 (irreversible deletion)**.

**Declared behaviour changes — Phase 1 had two and pre-declared both; this phase has five:**
1. **U1** — bare `Error("… not configured")` from an unconverted source: 503 → 500.
2. **U2** — advisor tool-failure text changes → model input changes → answer prose can change.
3. **U12** — `Item not found.` → one shared message.
4. **U5** — 429 becomes a new status on two routes. Declared as a change rather than argued to be "new behaviour".
5. **U24** *(added on approval, 2026-08-08)* — the signed-in header's rendered markup changes. **The only
   one of the five that is not a response-byte change**: no status, envelope, header or API body moves.
   Listed with the others anyway, because "it's only visual" is how a change escapes being declared.
*Conditional:* **U4** adds a refusal that only manifests under concurrency; **U8** changes behaviour only
under induced insert failure.

**Failure modes that would look green and be wrong:**
- U4's concurrency test with a constant-returning mock (Phase 1's U10 hit exactly this).
- U5 trusting `x-forwarded-for[0]` — passes every test, defeated by one header.
- U18's eslint with an over-broad `ignores` — green over zero files, the very defect item 9 exists to fix.
- **U7 landing while U4/U5 are incomplete** — the guard would be written to match what exists rather than
  to state the rule.

---

## 7. Decisions needed — **all six ruled 2026-08-08**

> **The options below are preserved as written, unchanged.** Each decision now carries a **RULING** block
> stating what was chosen and what it obliges. Preserving the rejected options is deliberate (§7): a
> decision whose alternatives have been deleted cannot be re-examined, only re-litigated from scratch.
>
> | # | Subject | Ruled | Executed by |
> |---|---|---|---|
> | 1 | FU-27, the fourth nav pill | **Option A** — move the pill out of the pillar group | **U24** |
> | 2 | U-DEFER-4, whether Phase 2 may open | **Option B** — dated, reasoned exception; criterion stays on the books | `docs/roadmap.md`, this commit |
> | 3 | Live E2E in CI | **Option (a)** — non-live CI only; no secrets in a public repo | §3, U22, and the E2E posture docs, this commit |
> | 4 | `enforce_admins: false` | **Flip to `true`** | **Executed in this unit**, against the live repository |
> | 5 | Two unmeetable exit criteria | **Approved as drafted** | `docs/roadmap.md`, this commit |
> | 6 | Slug manifest schema | **Approved** — add `publicSurfaces` | **U20** |

### Decision 1 — **FU-27: the fourth nav pill** *(product decision; blocks nothing, but it is a live contradiction between a rank-3 rule and shipped code)*

`TopNav.tsx:18-20` appends an `Advisor` pill to the same `NavPills` group for signed-in users, so an authed
user sees **four**. `CLAUDE.md` §1 and `docs/product-direction.md:82-83` both state three as permanent. The
v6 design authorised a *"top-level-adjacent surface … **not** a 4th main pillar"* — so this is an
implementation diverging from the decision that authorised it, not unauthorised scope.

| Option | What it costs | What it buys |
|---|---|---|
| **A — move the Advisor out of the pillar group** (recommended) | ~S. `TopNav.tsx` only. **No E2E spec asserts nav structure** (verified: zero matches), so no test changes. A visual change to an authed header; the Advisor stays reachable, rendered as an adjacent affordance rather than a pillar | The rule and the code agree, and the v6 decision is honoured as written. Cheapest path to consistency |
| **B — amend §1 and `product-direction.md` deliberately** | ~S in docs, but it changes a **permanent product rule** in two rank-3/rank-4 documents and retires "exactly three", which the three-pillar identity rests on | Legitimises what ships. Appropriate only if the Advisor genuinely *is* a fourth pillar — a product judgement, not an engineering one |
| **C — leave it recorded and unresolved** | Free now | The contradiction persists in a rank-3 document. Acceptable only briefly |

**I recommend A**, and note it is not mine to decide: B is a product judgement about what the Advisor *is*.

> **RULING — Option A, 2026-08-08.** Move the Advisor out of the pillar group, *"honoring the v6 decision
> as written"*. So the three-item rule in `CLAUDE.md` §1 and `docs/product-direction.md` is **not**
> relaxed, and the shipped code moves to meet it.
> **Obliges:** **U24** (§5, Group D) — `TopNav.tsx`, the retirement of `CLAUDE.md` §1's `[2026-08-06]`
> divergence block **in the same commit**, and a source-level assertion so a fourth entry cannot reappear
> ungoverned. The "no test changes expected" claim is carried into U24 as something **to re-verify at
> execution time**, not as an established fact. **Not cuttable** (§5 cut list).
> **Leaves open, deliberately:** FU-27's row in the certified Phase 1 register still reads *"needs a
> product decision"* — see §4.3's `[2026-08-08]` note. U24 closes that too.

### Decision 2 — **U-DEFER-4: Phase 0's one unmet exit criterion, and whether Phase 2 may open**

`docs/roadmap.md:14` states: *"a later phase may not start while an earlier phase's exit criteria are
unmet."* Phase 0 has exactly one unmet criterion — *"A `.tsx` test placed anywhere under `src/` is
collected and executed."* Still false: `vitest.config.ts:13` is `include: ["src/**/*.test.ts"]`,
`environment: "node"`.

**The distinction that matters, and that is easy to get wrong:** **C-12 is closed; U-DEFER-4 is not.** U13
made a tracked-but-uncollected `.tsx` fail **loudly** via `HARNESS_GAP`. It did not make `.tsx` tests
**run**. Phase 1 opened and closed with this outstanding as an annotated deferral.

| Option | Cost | Note |
|---|---|---|
| **A — close it in Phase 2** as a prerequisite unit | ~S for the `include` change; **M–L** for a real jsdom/RTL harness, which Phase 1 explicitly excluded and §3 excludes here | Honours the ordering rule literally. But it imports the component-test decision this phase declines |
| **B — record an explicit exception** in `roadmap.md`, as Phase 1 did implicitly | ~S, documentation only | Makes an already-twice-taken decision explicit rather than implicit. **Recommended** |
| **C — retire the criterion** and re-scope it to what U13 delivered (loud failure, not collection) | ~S | Defensible: zero `.test.tsx` files exist, so the property is latent. But it lowers a bar rather than clearing it — say so plainly if chosen |

**I recommend B**, and flag that A's real cost is the harness, not the config line.

> **RULING — Option B, 2026-08-08.** A **dated, reasoned exception** is recorded in `docs/roadmap.md`
> **beside the criterion itself**, not in a plan that a later reader may never open. Phase 2 opens with
> U-DEFER-4 outstanding — *making explicit the decision Phase 1 already took implicitly.*
> **The criterion stays on the books.** It is not retired (that was option C, rejected) and not
> downgraded. **Owner: the phase that introduces component testing.** Until such a phase exists the
> criterion has a named owner-condition rather than an owner, which is the honest state.
> **Obliges:** the roadmap note landed in this commit. Nothing in Phase 2 may cite this exception as
> licence to add a `.test.tsx` — `HARNESS_GAP` still hard-fails on one, and §3 still excludes the harness.
> That constraint is what U19 and U24 are written around.

### Decision 3 — **Live E2E in CI needs secrets in a public repository**

FU-25's headline deliverable is a CI E2E job. That needs Supabase + Anthropic credentials in a **public**
repo; the exfiltration argument against that is `docs/reviews/phase-0-plan-review.md` §P-03. Options: (a) take the **non-live**
half only — per-worker isolation + a CI job over the 59 credential-free specs (**recommended**);
(b) add repository secrets, accepting the exfiltration surface a public repo creates; (c) make the repo
private. **This is a decision about secrets, not an engineering unit.**

> **RULING — option (a), 2026-08-08. Non-live CI only; no secrets enter the public repo.** The `[LIVE]`
> half stays an **owner-run local baseline** — the posture `docs/05-qa/phase-1-live-e2e-baseline.md`
> already documents, now a decision rather than a blockage waiting on credentials.
> **What this makes true, and what it does not.** It does *not* close FU-25 or the roadmap's "reproducible
> in CI" ambition; it settles that neither will be closed *by adding secrets*. The seven env items U17
> listed as BLOCKED remain the entry condition for a live run — that run is now scoped to the owner's
> machine, so **the blocker is scheduling, not credentials-in-CI**.
> **Obliges:** §3's out-of-scope bullet (updated above), U22's achievable scope (already the non-live
> half), and a dated note wherever the E2E posture is recorded — `docs/roadmap.md` Phase 1 items 6–7 and
> the baseline document, both in this commit.

### Decision 4 — **`enforce_admins: false`** *(N-8)*

Recorded as a residual in `CLAUDE.md` §5, `project-status.md` and `roadmap.md`; owned nowhere. Phase 2 is
the security phase. Either flip it (cost: the repo owner can no longer bypass a red check on their own
repo — real friction for a solo maintainer), or record it as a **permanent accepted limitation** with a
reason. Doing neither leaves a security note drifting through three documents indefinitely.

> **RULING — flip to `true`, 2026-08-08. Executed in this unit, not scheduled into one** — it is a
> repository setting, so there is nothing to build.
> **Sequencing, stated because it is the whole risk:** the flip happens **after** this commit has been
> integrated and `main`'s CI is green, so the change cannot strand an in-flight integration. The ff-only
> flow is expected to survive it — every integration already waits for green, and Phase 1 §8.5's probe
> proved SHA-keyed evaluation holds against a configuration with **no bypass**. The first ff-push made
> *after* the flip is the empirical proof, and the honest place to look for it is the follow-up commit
> below, which is that push.
> **Obliges a follow-up commit.** At the moment the approval commit was authored, `enforce_admins` was
> still `false` and the documents that said so were **correct**. They are synced in a **separate, small
> commit on a fresh branch** with the same publish mechanics, once the flip is real — the alternative is
> writing a claim before it is true, which is the failure mode this whole register exists to catch.
>
> **[2026-08-08 — EXECUTED. This is that follow-up commit.]** `POST …/branches/main/protection/enforce_admins`
> returned `{"enabled": true}`, and a subsequent **GET of the full protection object** confirms:
> required check `typecheck / test / build` (`app_id` 15368) · `strict: true` · **`enforce_admins: true`** ·
> `required_linear_history: true` · `allow_force_pushes: false` · `allow_deletions: false` ·
> `required_pull_request_reviews` absent (so no PR gate was introduced as a side effect — that was option A,
> rejected in Phase 1 §8.2). Ruleset `main-integrity` (`20291684`) is **unchanged**: `active`, on
> `~DEFAULT_BRANCH`, rules `deletion` / `non_fast_forward` / `required_linear_history`, `bypass_actors: []`,
> `current_user_can_bypass: "never"`.
>
> **The ff-push flow survived it, and the proof is this commit's own integration** — the first ff-push made
> *after* the flip, and the first to be evaluated against a required check the pusher cannot bypass. Sites
> synced: `README.md`, `CLAUDE.md` §5, `docs/roadmap.md`, and **two** in `docs/project-status.md` — four
> documents, five passages, not the "three documents" N-8 estimated. Two further mentions are **dated
> records and were annotated, not rewritten** (§7): the Phase 0 report's C-6 row, and Phase 1 plan §8.6,
> whose §8.2/§8.5 text records what was *applied on 2026-08-03* and must stay as it was.
> **What the flip does not buy.** `main-integrity`'s `bypass_actors: []` already bound the admin for
> deletion and non-fast-forward. The flip extends that binding to the **required status check**, which was
> the one rule an admin could still walk past. It does not make the repository resistant to a determined
> admin — an admin can still change the setting back. It removes *accidental* bypass, and the residual is
> now "an admin who deliberately reconfigures protection", which is a different and much smaller claim.

### Decision 5 — **Two roadmap exit criteria are unmeetable as written**

This is Phase 1's criterion-1 defect about to recur, caught before the units start.

- *"`db:migrate` exists; deployed schema matches migrations, **verified in CI**"* — verifying against the
  **deployed** database needs live credentials in CI, which P-03 rejects. **Achievable:** CI applies the
  migration set to a throwaway Postgres service container and diffs the result, proving the *migration set*
  is coherent. Matching the *live* database stays a dated manual record, exactly like the E2E baseline.
- *"A user can **export and delete their own data** end to end"* — the auth identity cannot be deleted
  without the service-role key that §2.3 rule 14 confines. **Achievable:** export + delete all rows across
  the 12 tables; the identity survives. Reword to name what is deleted.

**Both must be reworded before U15/U17 start**, or they will fail the way criterion 1 failed.

> **RULING — approved as drafted, 2026-08-08.** Both rewordings are applied to `docs/roadmap.md`'s Phase 2
> exit-criteria list **in this same commit**, so the sequencing authority and this plan cannot describe
> different criteria. The originals are struck in place with their reason, not replaced silently — a
> reader who wonders why a criterion got easier can see that it was **unmeetable**, not merely hard.
> **What the rewording does not do.** Neither criterion is weakened toward what is convenient: the
> migration criterion still requires CI to *prove the migration set coherent* against a real Postgres, and
> the deletion criterion still requires **all 12 tables** to be emptied. What changed is that each now
> names something a command can decide. The residue in both cases — the live database, and the surviving
> auth identity — is stated in the criterion rather than dropped from it.

### Decision 6 — **The slug manifest needs a schema change to a Phase 0 artifact**

`id-stability.test.ts` asserts every governed namespace *"declares a real persistence site"* —
`persistedAt.length === 0` is a hard failure. **Slugs are persisted in no DB column**; they live in
`/library/{slug}` and `citation-href.ts`. So either a `supplementSlugs` namespace declares a false
persistence site, or the manifest schema gains a second surface kind (`publicSurfaces`) and that assertion
becomes `persistedAt.length + publicSurfaces.length > 0`. **That is a schema change to a Phase 0 artifact
and belongs in this plan, not inside a unit.** Recommended: add `publicSurfaces`.

> **RULING — approved, 2026-08-08: add `publicSurfaces`.** The reason given is the one that matters and is
> stronger than the convenience argument: *a false persistence site would be the fabricated-provenance
> pattern `CLAUDE.md` §2.2 forbids.* Declaring `persistedAt: ["stack_items.supplement_id"]` for slugs would
> be authoring a provenance claim the system cannot support — rule 8's shape, in a guard whose entire
> purpose is to be trusted. §8.4's own remedy applies: **prefer deleting or renaming a field over guarding
> a lie** — here, adding the field that tells the truth.
> **Obliges U20**, which now carries a schema change rather than a data addition: `id-manifest.json` gains
> `publicSurfaces`, `id-stability.test.ts`'s hard-fail assertion becomes
> `persistedAt.length + publicSurfaces.length > 0`, and **every existing namespace must be re-checked
> against the new assertion** — a relaxed assertion is exactly how a namespace with neither surface could
> slip through. U20 must show that mutation red: a namespace declaring both lists empty still fails.
> While that file is open, U20 also fixes **FU-32** (`id-stability.test.ts:5` says "eight namespaces"; there
> are 9) — N-6's disposition already routes it here.

---

## 8. Exit criteria

Written with Phase 1 criterion 1's lesson in mind: **every clause must be mechanically checkable, and the
check is written beside it.** Where a criterion needs an exemption list to be decidable, the list is named
here rather than discovered later.

- [ ] **Zero `for all` policies on constraining-counter tables.** Check:
      **`! grep -q "for all"`** over the policies naming `advisor_usage` and any rate-limit table (negated
      match, not `grep -c … = 0` — see GATE B1), and
      each has a select-only policy plus a `security definer` writer. *(Exemption: user-owned content
      tables keep `for all` — the list is the 11 non-counter tables, named in U3.)*
- [ ] **Every `SECURITY DEFINER` function sets `search_path`.** Check: `SQL_FUNCTION_REGISTRY` green, and
      its inventory is non-empty (anti-vacuity).
- [ ] **A concurrency test proves the daily token budget cannot be exceeded**, shown **red** against the
      read-then-write implementation with the red text recorded in `docs/`. Check: the test exists, its
      mock is stateful, and the red text is in the phase report.
- [ ] **Both paid-API routes enforce a rate limit and a budget reservation**, where "paid-API route" is
      defined mechanically as *a tracked `route.ts` whose import graph reaches `@anthropic-ai/sdk`* —
      today exactly 2. Check: `PAID_API_BUDGET` green with a non-empty inventory; both routes assert 429.
- [ ] **`CLAUDE.md` §4 row 9 reads `Enforced` and names `PAID_API_BUDGET` in `boundaries.test.ts`.** Check:
      `doc-truth.test.ts` green *(it binds this in both directions already)*.
- [ ] **Client disconnect terminates the advisor loop and settles its reservation.** Check: two assertions
      — `adapter.send` call count, and `settleUsage` called with the reserved amount.
- [ ] **`replaceFlags` leaves prior flags intact under induced insert failure.** Check: the test exists and
      was shown red against delete-first.
- [ ] **`error-disclosure` scans `src/app/api/**`, `src/services/**` and `src/lib/**`**, with a violation
      list of `[]` and an allowlist that is empty or ratcheted. Check:
      `grep -cE '^const [A-Z_]+ = trackedFiles\(' src/architecture/error-disclosure.test.ts` = **3**, and
      each inventory asserted non-empty. **[2026-08-08 — corrected at approval]** This criterion carried
      the *vacuous* form of GATE A1's check (`grep -c 'trackedFiles('` = 3, which already returns 3 today).
      The gate was corrected before approval and the criterion beside it was not — the same defect at a
      second site, found by re-reading the criteria against the gates. Both now use the binding-count form.
      *(Stated non-coverage, so the claim stays true: `src/app/**/page.tsx`, `src/components/**`, and the
      **one** `"use server"` module of N-7 remain unscanned.)*
- [ ] **Security headers present in the config and in a real response.** Check: the unit test asserts the
      config; the **ungated** E2E asserts the bytes; a path-scoping mutation reddens the E2E and not the
      config.
- [ ] **`npm run lint` either lints a non-empty file set or does not exist.** Check: `LINT_SCOPE` asserts
      ≥ N files, or `package.json` has no `lint` script. *(Both branches are acceptable; the unacceptable
      state is a script that appears to gate and does not.)*
- [ ] **A user can export their data and delete all of it across the 12 tables**, with the surviving auth
      identity stated in the response. Check: both route tests green; a test asserts the export payload
      passes through no logging path.
- [ ] **The navigation pillar group renders exactly the three pillars, signed in and signed out**, and
      `CLAUDE.md` §1's `[2026-08-06]` divergence block is retired in the same commit that changes the code.
      *(Added on approval, 2026-08-08 — decision 1, ruling A.)* Check: the source-level assertion in
      `src/architecture/` is green **and** was shown red against a fourth appended entry; **and**
      `grep -c 'FU-27' CLAUDE.md` = 0 while `git log -1 --name-only` for that commit lists both
      `src/components/layout/TopNav.tsx` and `CLAUDE.md`. *(The second clause is what stops the code and
      the rule drifting apart again — which is the whole of FU-27.)*
- [ ] **`db:migrate` exists, and CI proves the migration set is coherent** by applying every file in
      `supabase/migrations/` in order to a throwaway Postgres and failing on the first error. *(Reworded on
      approval — decision 5. The original said "deployed schema matches migrations, verified in CI", which
      needs live credentials that ruling 3 refuses.)* Check: `package.json` has a `db:migrate` script;
      `ci.yml` declares a Postgres service and a step applying the migration set; that step's addition
      updated `CLAUDE.md` §5's declared chain in the **same commit** (GATE D1, already mechanical).
      *(Residue, stated not dropped: matching the **live** database stays a dated manual record, exactly
      like the E2E baseline. It is not claimed by this criterion.)*
- [ ] **`npx tsc --noEmit` clean · `npx vitest run` green · `npx next build` succeeds · CI green on the
      integration commit**, with the suite count recorded at close and re-measured, not copied.
- [ ] **Every guard added in this phase has its red output recorded in `docs/`** — the Phase 1 criterion,
      retained because it is the one that produced the most value.
- [ ] **The follow-up register is complete and each row re-derived at close.** Check: FU numbering
      contiguous with no gaps and no duplicates; every row's condition re-measured. *(Added because
      FU-22's figures survived from U13 to closeout unchallenged — a register row is a claim.)*

---

## 9. Sizing

**23 proposed units** (U1–U22 and **U24**, plus U23 deferred). Rough shape: **7 S/S-M · 12 M · 3 L · 1 M/L**.
*(22 and 6 S/S-M before approval; U24 — the S-sized unit ruling 1 created — is the difference. Numbering is
**append-only**: U24 follows U23 rather than being inserted, so that every U-number already cited elsewhere
in this document keeps pointing at the same unit. The same reason reference-data IDs are append-only.)*
Phase 1 delivered 21 units and +335 tests. This phase is **comparable in unit count but heavier in risk**:
it adds two migrations, two routes, a `security definer` function, and the first code that changes what a
user can do to their own rows.

**Estimate withheld deliberately.** Phase 1's estimate was made before any unit ran and its error was the
useful artifact. The measured Phase 1 cost per unit is the better input, and it is recorded in that plan's
§6.5.
