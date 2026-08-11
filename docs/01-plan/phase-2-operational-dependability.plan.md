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
> **[2026-08-10] SCOPE AMENDMENT — U25 — APPROVED**, by the repository owner, as drafted.
> ~~**PROPOSED — awaiting approval.** The U25 spec below, decision 7 and findings N-17…N-20 are drafted
> and authorise nothing until ruled.~~ *(The proposed-status line is struck rather than deleted — §7:
> retire, do not erase.)*
> **The approval carried three rulings**, recorded in §7 beside decision 7: **7A confirmed** as drafted;
> **7B DEFERRED PENDING PROBE** — no option may be chosen from documentation, so **OP-4**'s probe scripts
> are authored as owner-run artifacts and the ruling follows the dated record, not the README; and a
> **sequencing constraint** — the **advisor half is implemented now, the lab-import half must not be
> written in any file** until 7B carries a dated ruling.
>
> **[2026-08-10] SCOPE AMENDMENT — U25, the LLM provider swap.** The repository owner instructed, as a
> rank-2 explicit instruction under `CLAUDE.md` §6, that **Omniroute replaces the Anthropic SDK as the LLM
> provider for both paid routes** — full replacement, no Anthropic fallback. Appended as **U25** in §5
> Group D (numbering is append-only), with **decision 7** in §7 and findings **N-17…N-20** in §4.5.
> A rank-2 instruction changes *what* is built; it suspends nothing in §2 of `CLAUDE.md`, and U25 is
> written so that it does not: §2.1's safety gate and §2.2's grounding rules apply to the new provider
> exactly as they applied to the old one. **One half of U25 is blocked on decision 7B** and must not be
> written until that is ruled.
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
> silently repaired, and closing it is part of **U24**. **[2026-08-10] CLOSED by U24.** The decision is
> executed in code, `CLAUDE.md` §1's divergence block is retired, and the rule is now guarded by
> `src/architecture/nav-pillars.test.ts`. The Phase 1 register's FU-27 row remains a **historical record**
> and is still not edited — it is certified, and this document is where its resolution lives.

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
| **N-14** | U6 | **A guard that matches literal text is one constant-refactor away from vacuity, and this was not a hypothetical.** U6 replaced three hand-authored `"… not configured"` literals with the shared constant `AI_SERVICE_NOT_CONFIGURED` (closing N-10). `NOT_CONFIGURED_TOTALITY` matched the *literal argument text* of a `new …Error(...)`, so `new NotConfiguredError(AI_SERVICE_NOT_CONFIGURED)` became **invisible to it** — the good refactor disarmed the guard watching that exact code. It did not fail silently only because the guard's own anti-vacuity inverse (the sanctioned-sites assertion) went red | U6 extended the guard with `readPhraseConstants`, so the phrase is now tracked through **names** as well as literals, plus 4 self-tests and a pin that `AI_SERVICE_NOT_CONFIGURED` is still resolved. 18 → 23 tests | **Instance closed by U6; the CLASS is open, and this row owns it.** Named task, **audit only, no guard edits**: enumerate every guard in `src/architecture/` by **matching strategy** — literal / identifier / structural — and state for each whether a constant-extraction, a rename, or a helper-extraction would defeat it, and what specifically would do so. Fixes land in each guard's owning unit, never here. **Delivered by U10 (2026-08-10) — the table is immediately below §4.5.** Sibling evidence that the class is real and not confined to `src/`: **GATE B1 clause (i)'s own check text** is a raw `grep` that this discharge found matching migration 0008's explanatory *comment* quoting the very policy it dropped — see the gate block |
| **N-15** | U6 | **`AdvisorPanel` does not handle the new `aborted` turn status.** U6 gave the agent loop a terminal `aborted` state so a client disconnect settles its reservation and stops the loop. Today that state is **server-side terminal** — the client that would see it is by definition the one that hung up, so nothing renders wrong and there is no live defect | `src/lib/advisor/agent.ts` returns `{ status: "aborted", … }`; `AdvisorPanel` switches on the other statuses only | **Open — not a defect today, and a trap tomorrow.** The moment any surface *retries* or *resumes* a turn, or the status is persisted and re-read, an unhandled case becomes a silent blank. Owner: **U19**, which already opens the advisor UI. Recorded because "unreachable today" and "safe" are different claims |
| **N-16** | Gate B1 discharge | **`RLS_COVERAGE` cannot see a counter table being *widened* by a later migration — only dropped, altered, or disabled.** Its `Weakening` union is exactly `"drop policy" \| "alter policy" \| "disable rls"`. A future `0010` adding `create policy "x" on public.advisor_usage for all using (user_id = auth.uid())` **alongside** the SELECT-only policy would reopen §2's hole, and the effective-policy model would record it as a policy merely *present* — no weakening event, no red | `rls-coverage.test.ts:100-105` (the union) and `:139` (`weakenings` is only pushed from the drop/alter/disable handlers); confirmed against the effective-state parse used to evaluate gate clause (i) | **Open.** The gate's clause (i) is a **one-time command evaluation at discharge**, not a standing assertion — nothing prevents regression after it. The durable form is a named `COUNTER_TABLES` set (`advisor_usage`, `api_rate_limits`) with a rule that no effective policy on them may be `for all`/`for delete`/`for insert`/`for update`. Owner: **U15** (migration tooling) or whichever unit next opens `rls-coverage.test.ts`, whichever is first. Not taken in U5–U7: none of them owned that guard, and §8.1 says name it rather than absorb it |
| **N-17** ✅ | U25 planning | **A guard's own explanatory comment states behaviour that U6 reversed.** `not-configured-totality.test.ts:256` documents its third sanctioned site as `lab-import/pdf-adapter → re-wrapped as ExtractionError → 502 (preserved)`. U6 (`3d6b3c4`) inverted exactly that: `pdf-adapter.ts` now rethrows `NotConfiguredError` unchanged, it escapes to `handle()`, and the route answers **503 `NOT_CONFIGURED`** — which `extract/route.test.ts:148-157` pins. The assertion beneath the comment is still correct; only the comment is false | Measured 2026-08-10: `pdf-adapter.ts:97,133` (`if (e instanceof NotConfiguredError) throw e;`) against `not-configured-totality.test.ts:256`. Both statements cannot be true | ~~**Open — owner: U25**~~ **[2026-08-10] CLOSED BY U25.** The comment now carries a dated correction naming U6 as the reversal, beside a second dated note recording `claude-adapter.ts` → `model-adapter.ts`. The assertion never went wrong — only its explanation did, which is N-14's class in its cheapest form. Owner: U25, which edits that sanctioned-site list anyway (see U25's file list), so the comment is corrected by the first unit that has the file open rather than by a drive-by. **This is N-14's class in its cheapest form:** the guard did not go wrong, its *explanation of itself* did — and a reader deciding whether the guard still covers the right thing reads the comment, not the diff |
| **N-18** | U25 planning | **The advisor budget is denominated in tokens, and a routing gateway makes tokens a weaker proxy for cost than they were.** With one provider and one model, tokens and money differ by a constant. Behind a router that may serve a turn from any of hundreds of models at different prices — and that advertises response compression which changes the token count without changing the answer — a per-user *token* budget no longer bounds spend. `ADVISOR_DAILY_TOKEN_BUDGET` would cap a cheap model and a costly one identically | `.env.example` (`ADVISOR_DAILY_TOKEN_BUDGET`); `reserve_advisor_tokens` / `settle_advisor_tokens` are token-denominated in `0008`; OmniRoute's documented per-model routing and `x-omniroute-compression` header | **Open — registered, not absorbed, and deliberately NOT taken in U25.** Making the ledger cost-denominated is a migration (`advisor_usage` columns), a price table, and a new source of truth for prices that the repository would have to author and keep true — §2.2 rule 8 territory, since a wrong price is a fabricated figure. U25 keeps the ledger exactly as it is and changes only which numbers feed it. Owner: a future unit, and the question it must answer first is *where a trustworthy price comes from*, not *how to store it* |
| **N-19** ✅ | U25 planning | **The OpenAI-compatible surface has no equivalent of the Anthropic `document` content block, so native PDF transcription has no like-for-like replacement.** `makeClaudePdfTranscriber` sends `{type:"document", source:{type:"base64", media_type:"application/pdf"}}` — an Anthropic-shaped block. OmniRoute exposes `/v1/*` as **OpenAI-compatible**; its README lists no `/v1/messages`. If the routed model does not accept a `file` content part, every PDF that transcribes today answers **502 `EXTRACTION_FAILED`** — a functional regression, not the prose change U25 declares | `pdf-adapter.ts:207-229`; OmniRoute README (`/v1/*` "OpenAI-compatible — chat, embeddings, images, audio, OCR") and its API reference (chat/embeddings/images/audio endpoints; `/v1/ocr` present, no Anthropic surface) | ~~**Open — this is decision 7B and it BLOCKS U25's lab-import half.**~~ **[2026-08-10] CLOSED by the 7B ruling.** It has a like-for-like replacement after all — the OpenAI `file` content part — established by the OP-4 record against both a text PDF and an image-only one, exactly as this row said it would have to be. The feared regression (every PDF becoming a 502) did not materialise from *PDF acceptance*; it very nearly materialised from **N-23** instead, which this row did not predict. Recorded here rather than resolved in the spec because no reading of the docs settles it: whether a *routed* model accepts a base64 PDF is a property of the live gateway, and the only honest way to know is **OP-4**, an owner-run probe. §8.1: name it |
| **N-20** | U25 planning | **`claude-adapter.ts`'s `REQUEST_TIMEOUT_MS` is configured and never tested.** U6 set `timeout: REQUEST_TIMEOUT_MS` on the SDK client and pinned three mutations — abort, settle-on-abort, `maxDuration` — none of which is the timeout. So the control the header calls load-bearing has no red proof, and deleting the option today reddens nothing | `claude-adapter.ts:48,168`; U6's red list in §5 names abort/settle/`maxDuration` only; `claude-adapter.test.ts` (7 tests) never advances a clock | **Closed by U25 in the only direction available.** The SDK's `timeout` option leaves with the SDK, so U25 must reimplement it — and constraint (4) of the amendment requires it be tested "equivalently", which is a **higher** bar than what exists rather than parity with it. Recorded so the phase report does not later read as though a tested timeout was replaced by a tested timeout |
| **N-21** | **U25 follow-up (found by the FIRST live probe, 2026-08-10)** | **The shipped advisor half hardcoded a model id, and the id does not exist.** `model-adapter.ts` carried `DEFAULT_ADVISOR_MODEL = "claude-haiku-4-5"` with `resolveModel` falling back to it, described in its own header as "the same class of small, fast model the Anthropic adapter used". The owner's gateway has **no bare `claude-haiku-4-5`** — its Haiku ids are provider-namespaced (`cc/claude-haiku-4-5-20251001`, `claude/claude-haiku-4-5-20251001`). With `OMNIROUTE_ADVISOR_MODEL` unset — the state of a fresh deployment — **every advisor turn would have 400'd**, from a suite that was fully green, because a scripted `complete` accepts whatever id it is handed. The probe read a *different* variable name than the operator set, so the fallback answered silently instead of anything reporting the mismatch | Probe run 2026-08-10: 400, `model requested` stayed at the hardcoded value under `OMNIROUTE_MODEL`; gateway `/v1/models` lists `cc/…` and `claude/…` Haiku ids and no bare form | **CLOSED by the U25 follow-up commit.** The general fact is the finding: **a model id is a property of the gateway INSTANCE, not of the protocol**, so no value hardcoded here can be correct for a gateway this repository has never contacted (§2.2 rule 7). §8.4 applied — the default was **deleted, not corrected**: `OMNIROUTE_MODEL` is now a third REQUIRED setting answering 503 `NOT_CONFIGURED` on the same path as a missing key. Guarded by **`NO_PINNED_MODEL_ID`**, which found a **second** hardcoded id on its first run (`pdf-adapter.ts`) — registered in a shrink-only ratchet rather than fixed, because that file is the lab-import half. Red-proved three ways: restoring the default, dropping the route pre-flight, and "helpfully" stripping the provider namespace |
| **N-22** | **OP-4 probe record, 2026-08-10** | **An `auto/*` alias can produce a successful tool loop and then an EMPTY answer.** Two aliases tested against the local gateway routed to two different vendors — `auto/best-chat` → `claude-opus-4-6-thinking`, `auto/best-free` → `gemini-3.6-flash-high` — and BOTH returned correctly parsed tool calls followed by a second step with **no text**. The initial "it's a thinking route" hypothesis from the first run is weakened by the second, which is not one | `docs/05-qa/2026-08-10-omniroute-probe-record.md` §2 | **[2026-08-10] RE-SCOPED — the evidence behind it does not support the claim it was written as.** The owner ran `auto/best-free` **end to end in the deployed UI** and it answered, which the probe verdict said it would not. Cause found in the probe, not the gateway: step 3 feeds a fabricated tool result — `{ok:true,data:{note:"probe fixture"},citations:[]}` — under the system prompt *"answer only from tool results … never guess"*, so a model that **correctly obeys** has nothing to say. An empty second step is a plausible CORRECT response to that fixture, and the clause cannot tell that from a broken round trip. **What survives:** an observation that two `auto/*` aliases returned no second-step text against an empty fixture where `cc/claude-haiku…` returned some — a difference in how strictly models honour "never guess", which is *interesting* and is **not** the defect this row claimed. **What is withdrawn:** "an `auto/*` alias can complete a tool loop and return an empty answer" as a statement about real turns. **No UI evidence attaches to this row** — the owner's earlier in-UI advisor failures were `PGRST202` on `consume_rate_limit` (migration 0009 unapplied), an unrelated persistence fault that never reached the model. Record: `docs/05-qa/2026-08-10-deployed-migration-record.md`. ~~**OPEN, and deliberately not worked around in `src/`.**~~ It is an alias/routing behaviour of a gateway instance, not application code, and a guard here would be theatre. **Why it is registered rather than shrugged at:** an empty answer is the worst failure shape this product has — the grounding and `lib/safety` gates all pass on an empty string, so it surfaces as a confident blank rather than an error. If an `auto/*` alias is ever adopted, that is the defect to fix first. The pinned default `cc/claude-haiku-4-5-20251001` does not exhibit it |
| **N-23** | **OP-4 probe record, 2026-08-10** | **The routed model fences its JSON, and `candidatesFromTranscript` cannot read a fenced transcript.** Option (a) returned a *correct* transcription of both probe PDFs, opening ` ```json ` — and `candidatesFromTranscript` does a bare `JSON.parse` with no fence handling, so `adapterOutputSchema` FAILED on both. Verified before recording that both live paths (`extractFromText`, `extractFromPdf`) pass the transcriber's raw output straight in, so the probe called it exactly as production does — this is a real defect, not a probe artifact | `pdf-adapter.ts:46-52`; record §4 | **CLOSED by U25's lab-import half** (it owns this file). Unhandled it would answer **502 `EXTRACTION_FAILED` on every PDF upload while the model transcribed correctly** — a functional regression wearing the mask of a model failure. **It also corrects a plan premise:** §6 declared behaviour change #6 as prose-only with "no status or envelope change expected"; for lab-import that was wrong, and the measurement wins |
| **N-24** | **U25 lab-import half, 2026-08-10** | **A red-list entry named a test that MOCKS the module it mutates.** M19 predicted `expected 502 to be 503` at `extract/route.test.ts` for reverting `pdf-adapter.ts`'s `NotConfiguredError` rethrow. Run for real, that route test stayed **green**: it does `vi.mock("@/lib/lab-import/pdf-adapter", …)` and throws `NotConfiguredError` from the double, so no mutation inside the real module can reach it. The rethrow IS guarded — by two unit pins in `lab-import.test.ts` — but not by the test the plan credited | Mutation run 2026-08-10: 2 failures, both `lab-import.test.ts`; `extract/route.test.ts` green. `route.test.ts:27` is the mock | **CLOSED as an instance; the CLASS is registered.** The measurement wins and the attribution is corrected in the red-record below. **Why it matters beyond one row:** a mutation prediction is a claim about *which guard holds a property*, and this one was wrong in the direction that flatters — it named a route-level pin, implying end-to-end coverage, where only a unit pin exists. A red list whose entries are never executed is a list of hypotheses. Every U25 entry marked † or DEFERRED has now been executed rather than reasoned about, which is how this was found |
| **N-25** | **U25 close-out, 2026-08-10 — promoted from prose in the OP-4 record** | **CLAIM BOUNDARY: PDF transcription accuracy is measured on CLEAN RENDERS ONLY.** Decision 7B's evidence is real and it is narrower than "PDFs work". The scanned fixture was a *synthetic render* of a text PDF — `qlmanage` → JPEG → single-image PDF at 1313×1700, with no skew, no noise, no photographic artefacts, no scanner compression damage. It proves the routed model reads an **image-only** PDF, which is exactly what 7B needed; it establishes **nothing** about a photographed, faxed, or genuinely scanned report, which is what most real lab PDFs are | `docs/05-qa/2026-08-10-omniroute-probe-record.md` §4, "Stated limitation" | **OPEN — OWNER CONDITION.** Registered because **an unnumbered limitation inside a record is how a claim quietly grows**: the record states the boundary honestly, but nothing carries that boundary out of the record and into the register a reader consults, so the next summary says "verified against a scanned PDF" and means something the evidence does not support. **Closes on:** a dated probe run against a real photographed/scanned lab report, appended to the same record, whenever one is available — no synthetic substitute counts, since the whole point is the artefacts a render cannot produce. **Until then:** claims about scanned-PDF extraction must say *clean image-only renders*, not *scans* |
| **N-26** | **Deployed-migration record, 2026-08-10** | **A probe fixture that cannot discriminate the property it is read as measuring.** `omniroute-advisor-probe.ts` step 3 scores "second step produced text" while supplying a tool result of `{ok:true,data:{note:"probe fixture"},citations:[]}` under a prompt forbidding the model to answer from anything else. Empty output is then *ambiguous by construction*: correct obedience and a broken round trip produce identical readings. The ambiguity was not noticed, and a **model-viability verdict was published from it** (`auto/best-free` "NOT viable, not even for dev") — later contradicted by the owner exercising the real UI | `scripts/probes/omniroute-advisor-probe.ts:189-198`; `docs/05-qa/2026-08-10-deployed-migration-record.md` §4 | **OPEN — owner: whichever unit next touches the probes.** Fix is small: the fixture must carry answerable content (a plausible interaction finding with a citation), so an empty answer means something. **Why it is registered rather than patched here:** this session has already corrected the record and withdrawn the verdict, and changing the probe is a change to *evidence-gathering apparatus* whose output has been cited in two dated records — it deserves its own commit and a re-run, not a quiet edit. **The class is the lesson:** a probe is an instrument, and an instrument that can return the same reading for two opposite states is not measuring. OP-4(c)'s *protocol* clause was sound; the *content* clause was overloaded onto the same call |
| **N-27** | **OP-2 record, 2026-08-10** | **OP-2's procedure is narrower than OP-2's own title, in two independent ways — and both were found by running it, not by reading it.** (i) The row says *"the **two** `SECURITY DEFINER` functions work and cap correctly"*; the four header statements call **`reserve_advisor_tokens` only**. `settle_advisor_tokens` — the function that releases a reservation and charges real usage, i.e. the half that can corrupt a ledger by *under*-charging — is never invoked, so its live behaviour rests entirely on `SQL_FUNCTION_REGISTRY` reading it as text. (ii) The cap fixture is `reserve_advisor_tokens(1000, 500)`, and a single request larger than the entire budget is refused under **any** reading of the `WHERE` clause — including one that ignores prior usage altogether. The property the function exists for is that the *day's sum* is capped, and the fixture cannot see it | `0008_usage_ledger_policy.sql` header, the four statements; `docs/05-qa/2026-08-10-ledger-policy-verification.md` §3 | **CLOSED IN PART 2026-08-10 — clause (ii) closed, clause (i) carried by N-28. See the dated disposition at the end of this cell.** ~~OPEN.~~ **Does NOT reopen OP-2 in either state.** OP-2's **Exact procedure** column is the authority and the owner satisfied it in full; the discharge stands. What is registered is that the procedure collects less than the title advertises. **Fix, whenever a database sitting is next open** (naturally OP-3's or OP-6's): add `reserve_advisor_tokens(1000, 1500)` twice — expect `1000` then `0`, which no accumulation-blind implementation can produce — and one `settle_advisor_tokens` call whose effect is read back by the §2 SELECT. Both are single statements in the existing rollback block; no new apparatus. **The class, and it is N-26's twin from the opposite side:** N-26 was a fixture whose *output* could not discriminate two states. This is a fixture whose *input* is over-strong, so it passes without exercising the mechanism. A check that cannot fail for the intended reason is not weaker evidence than intended — it is evidence of something else. **[2026-08-10] CLOSED IN PART — `docs/05-qa/2026-08-10-rate-limit-policy-verification.md` §3.** **(ii) accumulation: CLOSED, decisively.** `reserve_advisor_tokens(1000, 1500)` returned **0** — and `1000 ≤ 1500`, so an accumulation-blind implementation would have **granted** it. Prior usage is demonstrably in the decision. That is exactly the discrimination `(1000, 500)` could not provide. (The ledger already held `4345 + 276 = 4621` real tokens today, which exceeds 1500 unaided — so the result does **not** depend on the preceding grant landing first, and correspondingly does **not** establish target-list evaluation order, which SQL does not guarantee. It does not need to.) **(i) `settle_advisor_tokens`: NOT closed.** It was called, completed without error and returned `void` — so 0008 §3's grant is live for **both** functions — but **its effect was not observed**, and recording it as observed would have been false. Residue carried by **N-28** |
| **N-28** | **OP-6 / N-27 addendum record, 2026-08-10** | **A verification fixture cannot read its own writes inside one statement — so a correct effect and no effect return identical values.** The N-27 addendum put `settle_advisor_tokens(1000, 300, 50)` and two `(select input_tokens … )` "after" reads in the **same `select` target list**. Both `after` columns returned the **`before`** values — `input_after_expect_before_plus_300` = **4345** = `input_before`; `output_after_expect_before_plus_50` = **276** = `output_before`; predicted 4645 and 326. The sub-selects are evaluated against that statement's snapshot, which is the same snapshot the `before` columns read, so no write by a volatile function in the same target list can ever be visible to them | `docs/05-qa/2026-08-10-rate-limit-policy-verification.md` §3.2, §4 | **OPEN — and it carries N-27(i)'s residue: `settle_advisor_tokens`' effect on the ledger is still verified only as SQL text.** **The function is NOT implicated, and the same run contains the control that proves it:** OP-6 check 4 ran six `consume_rate_limit` calls in one statement and got **1,2,3,4,5,0**, so volatile calls **do** observe each other's writes (each statement inside a plpgsql body takes a fresh command snapshot) — writes were landing; only the plain sub-select was blind. **Fix is a shape, not apparatus:** read in a **separate statement inside the same transaction**, still before the `rollback`. Fold into OP-3's sitting. **The class is the lesson, and this is the third of a family:** N-26 was a fixture whose *output* could not discriminate two states, N-27 one whose *input* was over-strong so it passed without exercising the mechanism, N-28 one whose *reads* cannot see its own writes. All three were found by **running** the check, none by reading it — which is the argument against ever recording a predicted output as an observed one. This one was visible only because the `before` and `after` columns were printed adjacent in the same row |
| **N-29** | **U13, 2026-08-10** | **U13's E2E guard — the only thing in the repository that can see a security header actually arrive — does not run in CI.** `.github/workflows/ci.yml` excludes E2E with a written reason: *"17/23 specs are `E2E_LIVE`-gated and the suite races a single shared seeded user under `fullyParallel`"*. **Neither clause applies to this spec**: it is ungated, credential-free, read-only against the public static Library, and touches no shared account. So the exclusion is correct for the suite as a whole and, for this file, incidental. By §10.3 — *"guardrails that do not run in CI do not exist"* — the config half is enforced on every push and the response-bytes half is enforced only when someone runs it by hand | `.github/workflows/ci.yml` (the `NOT included` block); `tests/e2e/security-headers.spec.ts` is untagged and ungated by construction, which `LIVE_TAGGING` enforces both ways | **OPEN — deliberately NOT fixed in U13.** Wiring E2E into CI **adds a CI step**, which trips **GATE D1** and obliges the §5 declared-chain update in the same commit; it also needs a build-and-serve stage, which is a workflow change well outside a unit whose file list is one config and two tests. Absorbing it would have been the larger sin. **[2026-08-10] RULED BY THE OWNER: DEFERRED TO U14, and the deferral is BINDING rather than advisory.** U14 needs the same build-and-serve CI stage for its own Report-Only evidence — a CSP that reports nothing and a CSP that is absent are indistinguishable without reading response bytes — so **three things land together in U14 or not at all**: (1) the CI stage that builds and serves the app for E2E, (2) its **GATE D1** update to CLAUDE.md §5's declared chain, in the same commit, and (3) `tests/e2e/security-headers.spec.ts` included in what that stage runs. **U14 MAY NOT CLOSE while this row is open**: its closeout must either discharge N-29 or **re-defer it explicitly, in writing, with a named next owner**. Silence is not a disposition — a row that is neither closed nor re-deferred is an unmet obligation, and U14's report is the place it becomes visible. **Until then, state the split honestly:** U13's config guard is CI-enforced; its delivery guard is developer-run. The mutation record in U13's entry is evidence the delivery guard **works**, not evidence that it **runs** |
| **N-30** | **U13, 2026-08-10** | **Three security headers were considered and deliberately NOT shipped, each for a reason that makes it someone else's decision.** (a) **HSTS `preload`** — the max-age and `includeSubDomains` shipped; `preload` did not. Submission to the browser preload list is outward-facing and slow to reverse, which makes it an operator decision rather than something an agent edits into a config. (b) **`Cross-Origin-Opener-Policy`** — `same-origin` severs `window.opener`, which is how an OAuth popup returns its result. (c) **`Cross-Origin-Embedder-Policy`** — `require-corp` rejects any third-party subresource lacking CORP | `next.config.ts`'s header block enumerates all three with these reasons; `security-headers.test.ts` asserts each stays absent, so re-adding one is a red rather than a silent change | **OPEN as decisions, CLOSED as omissions — the distinction is the point.** U13's own rule is *a header that can break the shipped app is not this unit's*, which is the rule that put CSP in U14; (b) and (c) fail the same test and were held to it rather than waved through because they are fashionable. **This is registered rather than silently omitted because an unexplained absence is indistinguishable from an oversight** — the next reader adding "the standard set" would otherwise re-add all three and discover the breakage in production. (a) is an **owner condition** alongside OP-5; (b) and (c) need a real decision about whether OAuth popups and third-party subresources are in the product's future, which is a product question and not a headers question. **[2026-08-10] DISPOSITIONS ACCEPTED AS RECORDED, by owner ruling.** `preload` **stays an operator decision, beside OP-5** — both are pre-deployment acts the repository can describe but must not perform. COOP/COEP **stay refused and pinned**: the pins in `security-headers.test.ts` are the mechanism, so the refusal survives the next reader who reaches for the standard set. **No further action in Phase 2** unless a product decision moves (b) or (c) |
| **N-31** | **U24, 2026-08-10** | **Two clauses of the SAME unit's own spec contradict each other, and only one can be satisfied literally at a time.** U24's §5 entry says `CLAUDE.md` §1's divergence block is *"retired … per §7 — **struck with its rationale, not deleted**"*. U24's §7 exit criterion says the check is *"`grep -c 'FU-27' CLAUDE.md` = 0"*. Struck-through text still contains the string, so a literal strikethrough leaves the grep at 2 — measured, not predicted: that is exactly what the first implementation produced | The U24 entry in §5 Group D; the U24 exit criterion in §7; `grep -c 'FU-27' CLAUDE.md` = 2 against the strikethrough version | **CLOSED as an instance by relocation; the CLASS is registered.** Both clauses are satisfiable together if the rationale MOVES rather than staying or vanishing: the struck note and its full "why it existed / does the risk still need controlling" analysis went to `docs/archive/retired-nav-divergence-note.md` — the shape `CLAUDE.md` §0 already uses for `original-mvp-instructions.md` — and §1 keeps the rule plus a dated pointer that does not contain the string. Nothing was gamed and nothing was deleted. **Why it is registered rather than quietly reconciled:** an agent meeting two contradictory clauses can satisfy either one and write a truthful-sounding report, and the reader has no way to know a choice was made. **[2026-08-10] RATIFIED BY THE OWNER as resolved:** the archive-move is the correct reconciliation, matching the `original-mvp-instructions.md` precedent. **THE CLASS INSIGHT, recorded at the owner's instruction and stated as a rule for future specs: a spec that contains BOTH a file-level `grep` clause AND a knowledge-preservation clause MUST NAME WHERE THE KNOWLEDGE LIVES — or it forces a silent choice.** A `grep … = 0` clause is a claim about a FILE; "retire, don't delete" is a claim about KNOWLEDGE. They are jointly satisfiable only if the knowledge may live somewhere else, and if the spec does not say where, whoever executes it picks — then reports truthfully against whichever clause they picked, and the reader cannot tell a choice was made. **The naming is the fix, and it is cheap:** U24's spec would have cost one clause — *"…retired to `docs/archive/`"* — to remove the contradiction entirely. Any future exit criterion of the `grep … = 0` shape must name the destination |
| **N-32** | **U14 orientation, 2026-08-11** | **A stale dev server silently substitutes itself for the production build the E2E suite is supposed to judge.** `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so a `next dev` process left listening on `:3000` from an earlier session is reused and the config's own `npm run build && npm run start` never runs. Measured: the U14 baseline first reported **12 failed / 52 passed / 30 skipped**, which reads exactly like a code regression on `main`. Re-run against a real `next start` on a free port: **64 passed / 30 skipped**, green. The 12 failures were entirely an artifact of the substituted server | `playwright.config.ts`'s `reuseExistingServer` line, whose neighbouring comment argues at length that `next dev` "is not that app" and that a suite passing only against it "cannot support a claim about the shipped build" — the config states the principle and then reuses whatever is on the port | **OPEN. Proposed owner: whoever next touches `playwright.config.ts`; naturally U14, which is the unit whose entire evidence is response bytes.** NOT fixed in U27 — it shares no file with this unit and absorbing it would repeat the mistake U13 refused with N-29. **CI is immune**: `!process.env.CI` means CI always builds and serves. This is a *local measurement* hazard, and its cost is misdirected debugging plus, in the bad case, a green run that proves nothing. **Proposed fix shape, either is sufficient:** (a) have the reuse path verify the server is a production build before trusting it — a dev server is distinguishable by response (`Cache-Control: no-store` and `?v=` cache-busting on the layout stylesheet were both present in the measured case); or (b) move the suite to a dedicated guard port no dev server would occupy. **The residual after either fix is honesty about which app was measured, which is the actual requirement** |
| **N-33** | **U14 design, 2026-08-11 (ruled at approval)** | **The Report-Only CSP has no report sink.** There is no `report-uri`/`report-to` directive, so violations go to the browser console and nowhere else. A collector route would live under `src/app/api/**`, where **§2.3 rule 11** requires authentication and a 401 on failure — and a browser-generated CSP report carries no credentials. The route could only exist as a rank-1 exception | `src/lib/security/csp.ts`'s `CSP_DIRECTIVES` contains no reporting directive, and its header comment states the reason | **CLOSED AS A DECISION, OPEN AS A CONDITION ON A FUTURE UNIT. [2026-08-11] RULED BY THE OWNER: no `/api/csp-report` route; the rank-1 exception was asked for and REFUSED.** Under Report-Only the E2E collector is the collector, which is sufficient because the policy blocks nothing and the only question is whether it *would*. **The condition: an eventual ENFORCING flip MUST re-raise this.** An enforced CSP with no sink is blind in production — it breaks things for real users and reports to nobody, which is strictly worse than the present position. Registered so the flip cannot happen without meeting it |
| **N-34** | **U14 orientation, 2026-08-11** | **`middleware.ts` sat at the repository root and was never compiled, so `updateSession` — the Supabase session refresh of Design §7 — never ran, from `910d773` (2026-06-12) until U27.** Next 15 resolves middleware at `src/middleware.ts` in a project with a `src/` directory. Measured by A/B in a clean clone: at the root the build emits `{"middleware": {}}` and no `ƒ Middleware` line; at `src/` it emits a registered matcher and `ƒ Middleware  87.4 kB`. Confirmed against untouched `main` @ `7cbc5f0`, so it predates U14 | `.next/server/middleware-manifest.json` after a build; `git log --follow` puts the file at the root since the first commit | **CLOSED BY U27, 2026-08-11** — the unit this finding created. Fixed by the move, guarded source-level by `MIDDLEWARE_SCOPE`, and checked for compilation by `npm run verify:middleware`. **The liveness half is developer-run until U14's E2E stage lands** — N-29's shape at a second site, stated in U27's entry rather than glossed. **The class insight, which is the part worth keeping: a guard that names a path asserts nothing about the path the code is actually at.** `TREE_PARTITION`'s comment named `src/middleware.ts` and its exemption list was empty and green, *because the file was somewhere else*. Two more green things missed it: `next build` succeeds when middleware is absent (an absence is not an error), and the E2E's anonymous-redirect assertions are satisfied by page-level `requireUser()`, so they never depended on middleware at all |
| **N-35** | **U27, 2026-08-11** | **`src/lib/supabase/client.ts` — the browser Supabase client — is imported by no non-test module.** Found while establishing that `connect-src 'self'` is safe for U14's CSP: if nothing in the browser talks to Supabase directly, no external origin needs allowing. `grep` over `src/**` excluding tests returns no importer | `src/lib/supabase/client.ts`; authentication runs server-side through `src/lib/auth/actions.ts` (`"use server"`) and `src/app/auth/callback/route.ts` | **OPEN, CLASSIFIED, NOT ACTED ON. Classification per §8.5: `production-suitable` code that is currently `prototype-only` in status — it is correct, small, and unreferenced.** It is **not** obviously deletable: `createBrowserClient` is the documented other half of the `@supabase/ssr` pairing, and any future client-side realtime, storage upload, or optimistic auth UI would import exactly this file. **Deleting it and re-adding it later are both cheap; guessing wrong about which is not**, so this is registered rather than resolved. **It is load-bearing for one thing today — an argument.** U14's `connect-src 'self'` rests on the claim that the browser never calls Supabase directly, and this file is the thing that would falsify that claim the moment something imports it. **Whoever imports it must revisit U14's `connect-src`.** That coupling is the reason this row exists at all |

#### N-14's audit — every guard's matching strategy, and what would defeat it

**Delivered by U10, 2026-08-10. Audit only: no guard was edited to produce this table**, and the fixes it
implies belong to each guard's owning unit. It sits below §4.5 rather than inside N-14's cell because a
Markdown table cannot nest.

Three strategies, in increasing order of resilience. **Literal** — matches text the code happens to
contain. **Identifier** — matches a specific name, so a rename or an extraction moves it. **Structural** —
parses the language (TypeScript AST, SQL statement order, the import graph), so it follows the code.

| Guard | Strategy | What would defeat it | Fails safe? |
|---|---|---|---|
| `AUTH_COVERAGE` | **structural** (TS AST) + identifier `"handle"` | Renaming the `handle` wrapper, or introducing a second auth wrapper under another name. Inventory is path-derived (`src/app/api/**/route.ts`), so a new route is governed on creation | **Yes** — an unrecognised wrapper reads as *no* auth and goes red |
| `BOUNDARIES` / `PAID_API_BUDGET` | structural import-graph walk + **identifier** control detection (`/enforceRateLimit\s*\(/`, `/reserveAdvisorTokens\s*\(/`) | Renaming either control, or extracting the call one module further away, makes the route look uncontrolled | **Yes** for absence. **No** for a false positive: the identifier in a *comment* would satisfy it. Narrow, and worth knowing |
| `DOC_TRUTH` | **literal** (`CLAUDE.md` §4 table shape, `PAID_API_BUDGET:` markers) | Reformatting §4's table so the row regex stops matching | **Yes** — `expect(TABLE.length).toBeGreaterThan(0)` at `:175` and the CI-chain parse at `:308` both refuse an empty parse |
| `E2E_LIVE_TAGGING` | structural token scan + **literal** `[LIVE]` | A new gating spelling other than `E2E_LIVE`; a tag written with different casing | **Yes** — gated-without-tag and tagged-without-gate are both red |
| `ERROR_DISCLOSURE` | **structural** (AST catch-taint) + **literal** property names `TEXT_PROPS = {message, stack}` (`:109`) | An error type carrying its text on a third property name. **This is by design, not an oversight:** U1 chose `publicMessage` precisely so client-safe text would be invisible here and no allowlist would ever be needed | **No** — a new text property is a silent blind spot. The mitigation is that adding one is a deliberate act |
| `NOT_CONFIGURED_TOTALITY` | **literal** phrase + **identifier** constants (U6's `readPhraseConstants`) | Changing the phrase itself; a factory (`makeError("… not configured")`); a computed or interpolated string. Already documented in the file's header | **Partly** — the sanctioned-sites inverse caught the constant refactor, which is the only reason N-14 exists rather than a silent green |
| `REPO_SCOPING` | **structural** (brace-matched function bodies) + **literal** `"user_id"`, `.from("…")` | A dynamic table name, a query built through an alias or helper, or a differently-named owner column | **Yes** — an unparseable body yields no owner binding and reports a violation |
| `RLS_COVERAGE` | **literal** SQL, comment-stripped, applied in statement order | Policy DDL emitted from a `DO $$ … $$` block or `execute` — **zero handling today**, measured. Also **cannot see a table being *widened*** by a later migration (that is **N-16**) | **No** — dynamic DDL is invisible, and invisible reads as compliant |
| `SCHEMA_TYPE_DRIFT` | **structural** (TS interface parse) + literal table-name mapping | A row type expressed as a mapped or generic type rather than an interface | **Yes** — an unparsed type drops out of the binding count, which is pinned as an equality |
| `SQL_FUNCTION_REGISTRY` | **literal** markers within a `create function` span | `alter function … security definer` **after** creation — the span-based scan never sees it. Measured, not assumed | **No** — the function would simply not be recognised as a definer, and its `search_path` never checked |

**Three findings worth acting on, none of them in U8–U10's scope:** `SQL_FUNCTION_REGISTRY` misses
`alter function … security definer`; `RLS_COVERAGE` misses dynamically emitted DDL and table widening
(**N-16**); `PAID_API_BUDGET`'s identifier match would accept a comment. Each belongs to its guard's owning
unit. The generalisable point is the one N-14 was raised for: **of ten guards, only two are purely
structural**, and every literal or identifier match above is one refactor away from meaning something
narrower than its name claims.

### 4.6 Owner-run operational items — things CI structurally cannot do

Nothing in this repository applies a migration or opens a database connection during a test run, so a
claim about the **deployed** database is never established by a green build. These are the items that
require the repository owner and a live Postgres. They are listed here, not buried in a file header, so
that "Phase 2 closed" cannot be read as "these were done".

| # | Item | Why CI cannot do it | Exact procedure |
|---|---|---|---|
| **OP-1** ✅ **DISCHARGED 2026-08-10** — `docs/05-qa/2026-08-10-deployed-migration-record.md` (order held: code, then 0008, then 0009). **Residual stands:** a code rollback leaving 0008 applied still reproduces the failure | **Deployment order for 0008 + U4.** `0008_usage_ledger_policy.sql` removes the end user's INSERT/UPDATE/DELETE on `advisor_usage`; U4 is the code that stops needing them. **They are one deployment.** Applying 0008 against a database whose deployed code still calls `.from("advisor_usage").upsert(...)` makes every advisor turn fail to record usage — the write is denied, `recordUsage` raises, and the turn 500s **after the paid call has already been made** | CI applies no migrations and holds no credentials; both halves are in the same integration commit, so the repository is self-consistent and only the *live* rollout can get the order wrong | Deploy the application code first, or both together. Never the migration alone. Rolling back the code without rolling back 0008 recreates the same failure |
| **OP-2** ✅ **DISCHARGED 2026-08-10** — `docs/05-qa/2026-08-10-ledger-policy-verification.md`. All four as predicted: DELETE and UPDATE filtered to 0 rows, own-row SELECT returned rows, `reserve_advisor_tokens` granted 1000/200000 and refused 0/500. Run as `authenticated` via `set local role` + `set local request.jwt.claims`, so the bypass warning was honoured; reservation rolled back. **Two narrownesses registered as N-27**, neither blocking: the procedure calls only **one** of the two definer functions, and its cap fixture cannot isolate accumulation | **Verify the ledger hole is actually closed.** That the SELECT-only policy denies DELETE/UPDATE, and that the two `SECURITY DEFINER` functions work and cap correctly | Every U3 assertion is **static SQL text analysis**. `RLS_COVERAGE` and `SQL_FUNCTION_REGISTRY` read the migration as text; neither can execute a policy | The four psql statements in `0008_usage_ledger_policy.sql`'s header. **Run them as the `authenticated` role** — a superuser session bypasses RLS and reports a false pass. Record the output under `docs/05-qa/` with a date, per the U17 pattern |
| **OP-3** — **OPEN, and explicitly NOT advanced by OP-2's discharge.** OP-2 ran in **one** session, with both `reserve_advisor_tokens` calls inside a single transaction that then rolled back: no second backend ever contended for the row, so no lock and no serialisation was observed. "The reservation function was tested and capped correctly" is one paraphrase away from being read as this row, which is why the record says so in its own §4 | **Verify the reservation is atomic under real concurrency.** U4's proof is a stateful fake, which establishes that the TypeScript caller has no read-then-write window — not that Postgres serialises the `UPDATE … WHERE … RETURNING` | No database in CI, and a JS fake cannot model row locks | Two concurrent psql sessions calling `reserve_advisor_tokens` against a budget admitting one. **A separate sitting from OP-2** — it needs two sessions, so it could not have been folded into that run. **[2026-08-10] The OP-6 sitting did not advance it either**, and could not have: every block was one session, and `generate_series(1, 6)` is six **sequential** calls in one backend, not contention. **Fold N-28's re-read into the same sitting** — it is one extra statement in a transaction that will already be open. Append to `docs/05-qa/2026-08-10-rate-limit-policy-verification.md` or record alongside it |
| **OP-4** ✅ **DISCHARGED 2026-08-10** — `docs/05-qa/2026-08-10-omniroute-probe-record.md` | **A live end-to-end call against real Omniroute credentials** — one advisor turn that calls at least one tool and returns a grounded answer, and one lab extraction, run against a reachable gateway with a real `OMNIROUTE_API_KEY`. It answers three questions no unit test can: (a) does the routed model return `usage.prompt_tokens` / `usage.completion_tokens` **per response**, or does it omit them; (b) does it accept a base64 PDF content part (**decision 7B / N-19**); (c) does the tool-calling round-trip work end to end against the real gateway rather than a scripted mock | **Ruling 3 (2026-08-08) forbids the credentials that would let CI do it**: live E2E needs secrets in a public repository, and that was decided against. So this is owner-run by construction, on the same footing as OP-2/OP-3 and the `[LIVE]` E2E baseline. **No secret enters the repository** — not in `.env.example`, not in a fixture, not in a recorded transcript | Set `OMNIROUTE_BASE_URL` and `OMNIROUTE_API_KEY` in a local `.env.local` (gitignored). Run one advisor turn and one PDF extraction against a running app. Record under `docs/05-qa/` with a date, the model id actually routed to, and **the `usage` object's field names and whether they were populated** — the names, never the key. Per the U17 pattern. **(a) and (c) are entry conditions for U25's advisor half; (b) is the entry condition for its lab-import half** |
| **OP-5** | **The production gateway's provider set must be restricted to real API-keyed providers before any deployment carries user traffic.** The owner's gateway instance currently exposes mostly **free web front-ends and repackaged coding-subscription providers**. Advisor traffic carries the user's **health context** — medications, conditions, lab values (§2.3 rule 15) — so which upstream a turn is routed to is a data-handling decision, not a cost one. A free front-end has no data-processing agreement, no stated retention, and in several cases trains on submitted text | **Registered, not absorbed (§8.1), and explicitly NOT U25 work.** U25 swaps the client and the protocol; it does not choose or constrain a routing table, and it must not silently acquire a scope that belongs to a deployment decision. Nothing in the codebase can enforce this either — the provider set lives in the gateway's own configuration, outside this repository, so a test here would be theatre | **OWNER CONDITION, PRE-DEPLOYMENT.** Before the advisor is served to any real user from this gateway: restrict the instance's provider set to API-keyed providers with stated retention terms, and record the permitted set and the date under `docs/05-qa/`. Until that record exists, treat any deployed advisor as **development-only, with no real user health data**. Non-negotiable rule §2.3.15 is the authority; this row is its operational form for a routed provider |
| **OP-6** ✅ **DISCHARGED 2026-08-10** — `docs/05-qa/2026-08-10-rate-limit-policy-verification.md`, hours after this row was opened. All four as `authenticated`: DELETE (**no `WHERE`** — every visible row targeted) removed 0; INSERT raised **`ERROR 42501 new row violates row-level security policy for table "api_rate_limits"`**; SELECT returned the live `:advisor` bucket; `consume_rate_limit('user:op6-test', 60, 5)` × 6 returned **1,2,3,4,5,0**. Test bucket rolled back. **Check 2 is the only one of the eight checks across both records that stands alone** — a raised error cannot be explained by an empty table, where a filtered 0-row result can | **`0009`'s sibling verification block was never run, and had no row here — which is the reason this one exists.** `0009_rate_limits.sql`'s header carries four owner-run statements against `api_rate_limits`: `delete` (denied), `insert` (denied), `select` (own rows), `consume_rate_limit('user:me', 60, 5)` (`1..5` then `0`). It calls itself *"plan §4.6 OP-2's sibling"* — but OP-2's procedure column names `0008`'s statements and only those, so the sibling's absence was invisible at discharge and OP-2 closed without it | Same reason as OP-2: `RLS_COVERAGE` and `SQL_FUNCTION_REGISTRY` read `0009` as **text**. `api_rate_limits` is the schema's **second counter table** (0008's rule, applied at birth rather than in a later migration), so it carries the same hole closed the same way — and verified by nothing. Its `insert` check is also the only one of the eight that can produce the `new row violates` error shape; the `0008` four can only ever produce silent 0-row filtering | The four psql statements in `0009_rate_limits.sql`'s header, **as the `authenticated` role**, same technique as OP-2. Append to `docs/05-qa/2026-08-10-ledger-policy-verification.md`. **Registered rather than folded into OP-2** because §4.6's stated purpose is that these are *"listed here, not buried in a file header"* — a header block with no register row is exactly the burial this section exists to prevent |

**OP-2 now has a dated record (2026-08-10) and `advisor_usage`'s policy is verified against the deployed
database — §2's finding is retired in both senses.** ~~Until OP-2 and OP-3 have dated records, the honest
statement is: the ledger hole is closed IN THE MIGRATION SET and unverified AGAINST THE DEPLOYED
DATABASE.~~ ~~**The narrowed form of that sentence still stands, and applies to two things:** the atomicity
of the reservation under concurrency (**OP-3**) is unverified against the deployed database, and so is the
whole of `api_rate_limits`' policy (**OP-6**).~~

**[2026-08-10, same day] BOTH COUNTER TABLES' POLICIES ARE NOW VERIFIED AGAINST THE DEPLOYED DATABASE** —
`advisor_usage` by OP-2, `api_rate_limits` by OP-6, both as `authenticated`, both recorded under
`docs/05-qa/`. **The narrowed sentence now applies to mechanisms rather than policies, and to exactly
two:** the reservation's atomicity under real concurrency (**OP-3**), and `settle_advisor_tokens`' effect
on the ledger (**N-28**, inherited from N-27(i)). Both are still SQL text and nothing more. Those remain
different claims from what the migration set proves.

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

**U3 · Harden the ledger: writes leave the user's reach.** *(§2, FU-5, FU-6 partially)* — **DONE 2026-08-08, `656a628`** (+18 tests → 910/75; CI run 31314668727). Seven mutations red incl. M13 (unstaging 0008 blinds both guards). **Closes FU-5.** §2's finding is closed in the migration set; ~~**OP-2 owes the live verification.**~~ **OP-2 paid it, 2026-08-10** — `docs/05-qa/2026-08-10-ledger-policy-verification.md`. The policy is now verified against the deployed database as `authenticated`, not only as SQL text.
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

**U8 · `replaceFlags` atomicity.** *(roadmap 4; named exit criterion)* — **DONE 2026-08-10** (see the unit report). The order is reversed as specified, and the honest framing is that this changes WHICH failure is possible rather than making the pair atomic: delete-then-insert loses the user's flags when the insert fails, insert-then-delete leaves duplicates when the delete fails, and excess is recoverable where loss is not. Ids are captured BEFORE the insert so two concurrent replacements end in last-writer-wins rather than mutual annihilation. Not a SQL function, deliberately: `evaluation_flags` is transitively owned, so a `SECURITY DEFINER` writer would have to re-derive ownership by hand and become a new privileged surface — the ledger earned that cost because a user could defeat it, and nobody gains by racing their own evaluation. M `evaluation-flag-repo.ts` · N its
test · M `services/evaluation.test.ts` (its mock encodes the semantics; unchanged, it lies). **S/M**, deps none.
Insert-then-delete-by-id. **Cost to state, not discover:** between insert and delete the table transiently
holds both sets, so a concurrent `listFlags` sees duplicates. Acceptable (per-stack, user-initiated).
**Red:** mock the insert to reject → prior flags still returned; restore delete-first → `expected [] to have length 3`.

**U9 · FU-16, reframed as ownership pins.** — **DONE 2026-08-10** (see the unit report). The property shipped as specified, widened by one word the plan did not have: a function binds the owner as a **filter** on reads/updates/deletes **or in the written payload** on inserts/upserts — five functions bind it the second way, and a filter-only rule would have called all five defects. Raised the finding that U10 acts on: `advisor_actions` has a `user_id` column and two of its functions take no owner at all. N ~11 `src/lib/db/*.test.ts` + **M** `advisor/repo.test.ts` (exists). **L**
(cuttable), deps U8.
**Reframing the plan rules on:** FU-16 reads as "11 modules untested", which invites a coverage-shaped unit
of low value. The property worth pinning is that **every repo function taking a `userId` applies
`.eq("user_id", userId)`** — currently unpinned, with only RLS enforcing ownership. That is the U19/U21
argument and §4 rule 8; the coverage rises as a by-product, not as the goal.
**Red:** delete `.eq("user_id", userId)` from `getStack` → `expected "eq" to have been called with [ 'user_id', 'u1' ]`.

**U10 · `REPO_SCOPING` guard.** — **DONE 2026-08-10** (see the unit report). The exemption list is the predicted **3** tables and each is asserted against the migrations rather than against its own comment. **The rule had to be re-quantified, and that is U10's finding:** phrased as GATE C1 phrases it — over functions that *take* a `userId` — it cannot see `getAction`/`markUndone`, which touch the user-owned `advisor_actions` and accept no owner at all, so the cheapest way to satisfy such a rule is to delete the parameter it protects. Quantified over **tables carrying a `user_id` column** instead (derived from the migrations), it catches them, and mutation M46 proves the parameter-deletion cheat still goes red. Four functions violate today; they are held in a **ratchet register** asserted as an equality, per Phase 1 U18, so it can only shrink. Also delivered N-14's audit table.
N `src/architecture/repo-scoping.test.ts`. **M**, deps U9. Exemption list
measured at **3** (`stack_items`, `evaluation_flags`, `advisor_messages` — transitively owned, no
`user_id` column), each with a written reason.

**U11 · FU-20 row-type placement.** **S**, deps U5, U9. **Its red proof is genuinely weak** — it is a move,
and `SCHEMA_DRIFT`'s shape discovery (§6.0.1) is correct either way. Its only proof is the totality
assertions re-running unedited. Cut candidate; said plainly rather than dressed in a manufactured mutation.
**— [2026-08-10] CUT, per cut order #3, on the cut list's own stated ground and no other.** The ground is
quoted rather than paraphrased: *"weak red proof by nature; FU-20 survives as a register row at no cost."*
Nothing measured since the list was written has changed that: U11 moves a row type between modules, and
`SCHEMA_DRIFT` discovers the shape from the schema either way, so the move is invisible to every standing
assertion. **FU-20 is not closed** — it stays a register row, which is exactly the disposition the cut
list priced. This is a cut, not a deferral: no later unit inherits it.

**U12 · FU-28: one message for both 404s.** **S**, deps none. **Behaviour change #3** (declared): a
response-body byte change.
**— [2026-08-10] DEFERRED into the Group D window. Not dropped, and not cut.** It is unstarted at Group C's
close, and the reason it is deferred rather than done is sequencing, not value: it is a **declared
behaviour change** (#3, a response-body byte change), and shipping a body-byte change inside the commit
that closes a *persistence* group would put an unrelated observable change under a gate that says nothing
about it. Its dependency set is empty, so it carries into Group D at unchanged cost. **The obligation
survives here in writing**: FU-28 is open, U12 owns it, and Group D's close must either land it or record
a further dated disposition. It may not evaporate by silence.

> **GATE C1** — every `src/lib/db` module taking a `userId` has a test asserting `.eq("user_id", …)`, or is
> in `REPO_SCOPING`'s exemption list. **Check:** exemption list length == 3 **and** each entry names a
> table with no `user_id` column in the migrations.
>
> ### **[2026-08-10] GATE C1 — DISCHARGED, with a named remainder.** Clause by clause, re-measured at `9f8f1e6`:
>
> **Check (a) — exemption list length == 3. PASS.**
> ```
> npx vitest run src/architecture/repo-scoping.test.ts   →  17 passed (17)
>
>   "names exactly three tables"  →  stack_items · evaluation_flags · advisor_messages
> ```
> Asserted as a sorted **equality** inside the guard, not as a `length` check, so a fourth entry and a
> swapped entry are both red. Standing, not one-time — which is the property GATE B1 clause (i) turned out
> to lack, and is registered there as N-16.
>
> **Check (b) — each entry names a table with no `user_id` column in the migrations. PASS.** Measured
> against the migrations, not against the comment beside each entry:
> ```
> stack_items:       create-table-stmts=1   with_user_id_column=0
> evaluation_flags:  create-table-stmts=1   with_user_id_column=0
> advisor_messages:  create-table-stmts=1   with_user_id_column=0
> ```
> The guard asserts both halves — that the table **exists** and that it has **no** `user_id` column — so an
> exemption for a table that was renamed away, and an exemption for a table that later *gained* an owner
> column, both go red. N-14's class is the reason the existence half is there.
>
> **The property clause — PASS under the shipped quantifier, and the clause's own text is defective in two
> ways, both found by the units it governs.** Recorded beside it rather than replacing it, per §7.
>
> Measured, every `src/lib/db` module that touches the database and takes a `userId` carries owner pins:
> ```
> advisor-action-repo 2 · checkin-repo 2 · lab-marker-repo 3 · lab-panel-repo 2
> profile-repo 2 · side-effect-repo 2 · stack-repo 5
> mappers.ts   — 0 `.from(` calls; a mapper, outside the persistence set by the guard's own filter
> seed.ts      — module-exempt, written reason, §2.3 rule 14
> ```
> **(1) `.eq("user_id", …)` is not the only way to bind an owner — U9's finding.** Five functions bind it
> in the **written payload** on an insert/upsert, where there is no filter to assert. Taken literally the
> clause calls all five defects. The shipped guard counts both forms, and a self-test pins that it does
> (*"counts a written user_id payload as binding the owner"*).
>
> **(2) Quantifying over functions that *take* a `userId` makes the cheapest way to pass the gate the
> deletion of the parameter it protects — U10's finding.** So quantified, the clause cannot see
> `getAction` / `markUndone` / `getActionsByBatch`, which touch the user-owned `advisor_actions` and accept
> no owner **at all**. The shipped guard quantifies over **tables carrying a `user_id` column**, derived
> from the migrations, which sees them; mutation M46 proves the parameter-deletion cheat goes red.
>
> **THE REMAINDER, stated rather than absorbed.** Under the corrected quantifier **four** functions touch a
> user-owned table without binding the owner. They are not in the exemption list and must not drift into
> it — a ratchet is not an exemption. They are held in `UNSCOPED_FUNCTIONS`, asserted as an **equality** so
> the register can only shrink, with a fourth violation and a silently-fixed entry both red:
> ```
> src/lib/db/advisor-action-repo.ts::getAction           (read,  by primary key)
> src/lib/db/advisor-action-repo.ts::markUndone          (WRITE, by primary key)
> src/lib/db/advisor-action-repo.ts::getActionsByBatch   (read,  by batch id — obscurity, not scoping)
> src/lib/advisor/repo.ts::appendMessages                (check-then-act; only RLS closes the gap)
> ```
> **None is a live defect** — each is reached from a route that has already authenticated, and RLS refuses
> the row regardless. They are owed because "protected by one mechanism" and "protected by the mechanism
> this codebase claims to apply" are different statements.
>
> **Owed by which unit: `U26`** (appended below; numbering is append-only). Not by U11, which is cut, and
> not by U12, which is a 404 message. Naming an existing unit would have been the silent narrowing this
> gate is being read clause by clause to avoid.

**U26 · Bind the owner in the four ratchet functions.** **S/M**, deps U10. Created 2026-08-10 by GATE C1's
discharge, which is the first document to state what the ratchet actually owes. Add a `userId` parameter to
`getAction`, `markUndone` and `getActionsByBatch` and apply `.eq("user_id", userId)`; give `appendMessages`
the owner clause that turns the route's check-then-act pair into a single scoped write. M
`src/lib/db/advisor-action-repo.ts` · M `src/lib/advisor/repo.ts` · M both test files · **M every caller** —
the signature change is the work, and §9.4 applies: enumerate them, do not let `tsc` be the enumeration for
a Supabase call it cannot type-check. M `repo-scoping.test.ts` to **empty** `UNSCOPED_FUNCTIONS`.
**Red:** the ratchet's own equality is the proof and needs no manufacturing — fix one function without
removing its row and `every registered function STILL violates` goes red; empty the register while one
function is unfixed and `reports no unscoped access …` goes red. Both directions already exist.
**Not cuttable into invisibility:** if it is cut, the register stays and stays asserted, so the debt keeps
announcing itself on every `npm test`. That is the intended failure mode.

### Group D — platform and operations

**U13 · Security headers, non-CSP.** *(roadmap 7, safe half; named exit criterion)* M `next.config.ts` · N
`src/architecture/security-headers.test.ts` · N `tests/e2e/security-headers.spec.ts` (**ungated** — the
public Library needs no credentials). **S/M**, deps none.
**The two tests are not redundant:** the unit test asserts the *config*, the E2E asserts *response bytes*.
Prove it with a mutation scoping the header to a non-matching path — config green, E2E red.

**DONE 2026-08-10, `a7f36fd`** — **CLOSED: ruled accepted by the owner, merged fast-forward to `main`**
(CI run 31399560561, green on the merged SHA). Exit criterion *"Security headers present in the config and
in a real response"* is **MET** — see §7. (+19 unit tests → **1131/91**; +5 ungated E2E, executed locally
against a production build). Baseline before the unit: 1112/90, typecheck clean. Shipped **five** headers, each justified
individually in `next.config.ts` rather than copied as a set: `X-Content-Type-Options: nosniff` ·
`Referrer-Policy: strict-origin-when-cross-origin` (a §2.3 rule 15 control — `/library/berberine` in a
`Referer` is health-revealing) · `X-Frame-Options: DENY` · `Strict-Transport-Security: max-age=63072000;
includeSubDomains` · `Permissions-Policy: camera=(), microphone=(), geolocation=()`. **No CSP in either
form** — U14's, and the E2E asserts its *absence* in bytes, because the way a premature CSP would arrive
is a middleware no config test can see. Three further headers were considered and refused: **N-30**. The
E2E does not run in CI: **N-29**.

**RED EVIDENCE — five mutations, all executed, none reasoned about:**

| # | Mutation | Result |
|---|---|---|
| **M1** ★ | **The plan-named one.** `SECURITY_HEADER_SOURCE` → `"/__u13_mutation_never_matches/:path*"` | **Config 19/19 GREEN. E2E 4/5 RED** — `x-content-type-options missing from the response for / — declared in next.config.ts but not delivered. The config test cannot see this.` **This is the non-redundancy proof the plan demanded**, and it is a demonstration rather than an argument |
| **M2** | Delete `X-Content-Type-Options` from the set | Config **RED ×2** — exact-set assertion (`…(3)` vs `…(4)`) and the value pin (`expected undefined to be 'nosniff'`) |
| **M3** | Weaken `Referrer-Policy` → `origin-when-cross-origin` | Config **RED** — `expected [ 'unsafe-url', …(3) ] to not include 'origin-when-cross-origin'`. The disqualified-policy list catches a *plausible-looking* value, not just a missing one |
| **M4** | Append `preload` to HSTS | Config **RED** — `expected 'max-age=63072000; includeSubDomains; …' not to contain 'preload'`. N-30(a) is enforced, not merely written down |
| **M5** | Re-add `X-XSS-Protection: 1; mode=block` — the "add the standard set" commit | Config **RED ×2** — exact-set and the named exclusion. The deliberate omissions cannot be quietly undone |

**The honest reading of M1's fifth E2E test, which stayed GREEN:** it asserts CSP is *absent*, and a
mutation that removes headers cannot make an absent header appear. Its survival is correct, not a gap —
recorded so the "4/5" is not later read as a partial failure of the mutation.

**U27 · The middleware has never run.** *(created 2026-08-11 by owner ruling — Option A. U14's blocker,
promoted to its own unit and sequenced ahead of it.)* M `middleware.ts` → `src/middleware.ts` · M
`src/architecture/boundaries.test.ts` (`EXEMPT_ROOT_FILES`) · N `src/architecture/middleware-scope.test.ts`
· N `scripts/verify-middleware-live.mjs` + `package.json` · M `src/lib/supabase/server.ts` (comment only) ·
N `docs/05-qa/2026-08-11-middleware-activation-smoke.md`. **S/M**, deps none.
**N-29 DOES NOT MOVE — it discharges in U14, not here.**

**THE DEFECT.** `middleware.ts` sat at the repository root from `910d773` (2026-06-12, MVP v1) and was
never at `src/middleware.ts`. This project has a `src/` directory, so Next 15 resolves middleware at
`src/middleware.ts` **only**. The root file was never compiled. **Measured, not inferred** — A/B in an
isolated clean clone, same file content, only the path changed:

| Path | `middleware-manifest.json` | Build output |
|---|---|---|
| `middleware.ts` (root) | `{"middleware": {}, "sortedMiddleware": []}` | no `ƒ Middleware` line |
| `src/middleware.ts` | `"/"` registered, matchers compiled | `ƒ Middleware  87.4 kB` |

Verified against untouched `main` @ `7cbc5f0`, so it is **pre-existing and not U14's doing**.
**`updateSession` — the Supabase session refresh of Design §7 — had never executed in this application's
history.**

**THREE GREEN THINGS THAT ALL MEANT NOTHING**, recorded because the pattern outlives the bug.
(1) `TREE_PARTITION`'s own comment names *"`src/middleware.ts` — a standard Next.js path that runs on every
request"*; `EXEMPT_ROOT_FILES` was empty and **passed, because the file was not at that path**. A guard that
names a path asserts nothing about the path the code is at. (2) `next build` succeeded every time — a
middleware that is not found is not an error, it is an absence, and absences do not fail builds.
(3) The E2E suite was green: every anonymous-redirect assertion it makes is satisfied by page-level
`requireUser()`, so it never depended on middleware running and could not report that it did not.

**WHY SIGNED-IN USAGE WORKED ANYWAY** *(the survival question, answered from evidence — three call sites
settle it).* `src/components/layout/TopNav.tsx:35` calls `getUser()` and `TopNav` renders in the root layout
on **every page**, so a refresh is *attempted* on every navigation. `src/lib/supabase/server.ts`'s `setAll`
wraps `cookieStore.set()` in `try/catch`; in a Server Component that call throws, so refreshed tokens are
**computed and discarded** — the render is authenticated, nothing is persisted. But all **31** `getUser()`
call sites under `src/app/api/**` are **Route Handlers**, where `cookies().set()` is permitted, so refreshes
there **do** persist. **The answer: the API surface refreshed the session, not navigation.** The app's
client components `fetch()` `/api/*` constantly, so sessions were kept alive by API traffic and were not
silently expiring in ordinary use. Middleware is still needed: a user who only navigates never persists a
rotated refresh token, and Supabase rotates them.

**THE SHARPEST EVIDENCE IS A COMMENT.** `server.ts`'s catch read *"safe to ignore when middleware is
refreshing sessions"* — the invariant that makes swallowing the write safe, and it had never held. The
comment did not describe the system; it described the system someone intended. **U27 corrects it in the same
commit that makes it true**, because shipping a fix whose own code still documents the broken premise would
be the C-11 comment problem a second time.

**THE GUARD, IN TWO HALVES — the ordering problem stated rather than dodged.** *"Manifest non-empty after a
build"* **cannot** be a plain vitest assertion: the declared CI chain runs `vitest run` **before**
`next build`, so on a clean checkout it would either fail for the wrong reason or skip and be vacuous, and a
guard whose easiest green is *"no build present"* is not a guard.
* **Order-safe half — `MIDDLEWARE_SCOPE`, ships here, runs in today's chain.** Source-level and
  build-independent: `src/middleware.ts` is tracked; **no** root `middleware.ts` exists (both directions, so
  a re-added shadow copy is red); it delegates rather than holding logic; and it stays under 25 code lines,
  which is what an ungoverned file's exemption is worth.
* **Liveness half — DEFERRED TO U14, developer-run in the interim.** The predicate runs where a build
  exists: **U14's `Content-Security-Policy-Report-Only` header is itself the liveness proof** — a header
  that cannot appear unless middleware executed — and U14's E2E stage is already N-29's obligation, so this
  costs no new CI machinery. **U14's spec must state that its CSP assertion doubles as the
  middleware-liveness assertion.** Registered here so it is not forgotten.
* **The interim, stated because it is N-29's exact shape at a second site:** until U14's E2E stage lands,
  compilation is checked by `npm run verify:middleware` — **developer-run, not CI-enforced**.
  **`MIDDLEWARE_SCOPE` green does not mean the middleware runs.** It means the file is where Next would
  find it.

**NOT MERGEABLE WITHOUT AN OWNER-RUN RECORD.** The 64 non-live specs exercise none of the auth paths this
activates and the live half is `BLOCKED(env)`, so no automated check in this repository can verify it.
Procedure, forcing step and acceptance criteria:
`docs/05-qa/2026-08-11-middleware-activation-smoke.md`. **U27 does not merge before that record exists and
is dated.** Note the smoke's own honesty clause: its anonymous-redirect step is a **regression** check, not
an activation check, because that redirect is page-level `requireUser()` and passes today with the
middleware inert.

**RED EVIDENCE — five mutations, all executed, none reasoned about.** Baseline before the unit: typecheck
clean, **1141/92**, non-live E2E 64 passed / 30 skipped. After: **1146/93** (+5 tests, +1 file).

| # | Mutation | Result |
|---|---|---|
| **M1** ★ | Move `src/middleware.ts` back to the repository root | **6 failed / 46 passed.** `MIDDLEWARE_SCOPE` red ×4 + `TREE_PARTITION` red ×2 — `MIDDLEWARE_SCOPE: src/middleware.ts is not tracked…`, `…a middleware file exists at the repository root:`, and `TREE_PARTITION: these root-file exemptions name files that do not exist:`. **This mutation also found a defect in the guard itself — see below** |
| **M2** | Leave the real file in place and add a **shadow copy** at the root | **1 failed / 51 passed** — `MIDDLEWARE_SCOPE: a middleware file exists at the repository root:`. The direction that matters most: a root file reads as correct, is compiled by nothing, and would leave every other assertion green |
| **M3** | Empty the `EXEMPT_ROOT_FILES` entry | **1 failed / 46 passed** — `TREE_PARTITION: these files sit directly under src/ and are neither in a scanned layer nor exempt`. The C-11 machinery now governs the file it was written for |
| **M4** ★ | Build with the file at the root, then run `verify:middleware` | **`next build` exit 0**, zero `ƒ Middleware` lines, and `verify:middleware` **exit 1**: `THE BUILD COMPILED NO MIDDLEWARE.` **This is the proof that the build cannot see this defect and the script can** — the whole reason N-34 survived fourteen months |
| **M5** | Thin the exemption reason to `"Next needs it here."` | **1 failed / 46 passed** — `src/middleware.ts exemption reason is too thin: expected 19 to be greater than 40` |

**M1 FOUND A DEFECT IN THIS UNIT'S OWN GUARD, and it is recorded rather than quietly fixed.** The first
version of `middleware-scope.test.ts` read the middleware source at **module scope**. Under M1 the file
collapsed to a collection error — `0 test`, `Tests no tests` — so the two assertions that matter most, *the
path is right* and *no shadow copy exists*, **never executed**; the only clean red came from a different
file. A guard that stops running when the thing it guards is broken is the vacuity failure mode this
repository keeps rediscovering, and it would have shipped had the mutation been reasoned about instead of
run. The read is now lazy and per-assertion; M1 was re-executed against the corrected guard and the numbers
above are from that run. **This is the strongest argument in the unit for §5.2: a mutation you did not
execute is not evidence.**

**U14 · CSP.** **M**, deps U13 (**MET — U13 closed 2026-08-10, `a7f36fd`**) **and U27** (created 2026-08-11
— U14's middleware design is inert without it; see that entry). **Report-Only first.**
**U14 additionally inherits U27's liveness obligation:** its E2E must state that the
`Content-Security-Policy-Report-Only` assertion doubles as the proof that the middleware executed.
**U14 ALSO INHERITS N-29 BY OWNER RULING (2026-08-10):** the E2E CI stage, its GATE D1 update to §5's
declared chain in the same commit, and U13's `security-headers.spec.ts` in that stage's run set. U14
cannot close without discharging N-29 or re-deferring it explicitly with a named owner. The dependency
runs both ways in practice — U14's own Report-Only evidence is response bytes, which is the thing no
config test can see. A strict CSP breaks Next 15's inline bootstrap
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

**DONE 2026-08-10, `b28493b`** — **CLOSED: ruled accepted by the owner, merged fast-forward to `main`**
(CI run 31401407080, green on the merged SHA). Decision 1's ruling is **fully executed**; the §7 exit
criterion is **MET**; **behaviour change #5 shipped exactly as declared**. (+10 unit tests → **1141/92**;
**zero test changes**, re-verified rather than assumed). Baseline before the unit: 1131/91.

**THE "NO TEST CHANGES EXPECTED" CLAIM WAS RE-VERIFIED AT EXECUTION TIME, AS THE RULING REQUIRED, AND IT
HOLDS.** Measured on `d24a449`, not carried over from `d4f6194`: `git grep -inE
'navpills|<nav|getByRole\(.navigation' -- tests/` → **no matches**; all five advisor specs reach the page
by `page.goto("/advisor")`, never by clicking a pill (the single `click.*advisor` hit is a *comment* about
a provenance chip); `git ls-files '*.test.tsx'` → **empty**, so `HARNESS_GAP`'s constraint is satisfied by
adding no component-test harness. Confirmed by execution, not inference: the full non-live Playwright suite
ran **64 passed / 30 skipped**, unchanged, with no spec edited.

**The guard.** `src/architecture/nav-pillars.test.ts`, split deliberately: the **label** half imports
`PILLARS` and asserts real values (no regex); the **structural** half reads source text, because "the array
reaches `NavPills` unconditionally" is a fact about JSX and not about any exported value. It also asserts
`docs/product-direction.md` **still states the three-item rule**, so deliberately relaxing the rule
(decision 1's option B, not ruled) reddens the guard instead of leaving it enforcing an abandoned rule —
and asserts the Advisor is **still rendered**, since Option A was placement and a later deletion would
satisfy every other assertion while quietly losing a shipped surface.

**RED EVIDENCE — four mutations, all executed:**

| # | Mutation | Result |
|---|---|---|
| **M1** ★ | Append a fourth entry to `PILLARS` | **RED ×4** — length, labels, hrefs, and the by-value `/advisor` check |
| **M2** ★ | Restore `user ? [...PILLARS, …] : PILLARS` | **RED ×2** — `expected … to contain '<NavPills items={PILLARS} />'` and `expected … not to match /\[\s*\.\.\.\s*PILLARS/` |
| **M3** ★ | Rename a pillar (`Stack Lab` → `Lab`) | **RED** — `expected [ 'Library', 'Profile', 'Lab' ] to deeply equal [ …, 'Stack Lab' ]` |
| **M4** | Delete the Advisor link entirely | **RED ×2** — placement-not-removal. Not named by the plan; added because Option A is a *move* |

★ = the three mutations the plan named. **The guard also caught its own author on the first run**, which is
recorded because it is the more useful finding: `<NavPills` appeared **twice** in `TopNav.tsx` — once as
JSX, once inside the header comment *explaining* the FU-27 defect — and "rendered exactly once" counted the
comment. That is **N-14's audit finding in its inverse shape**: a literal match will accept a mention in a
comment, and here prose could redden a structural assertion. Fixed by stripping comments before every
structural match, not by rewording the comment: a guard a file's *prose* can flip is not measuring its
*structure*.

**§7's retirement clause and the exit criterion's `grep` clause CONFLICT, and the conflict is real —
registered as N-31.** Resolved by moving the struck note plus its full rationale to
`docs/archive/retired-nav-divergence-note.md` (the shape `original-mvp-instructions.md` already sets) and
leaving `CLAUDE.md` §1 with the rule and a dated pointer. `grep -c 'FU-27' CLAUDE.md` = **0**, and no
historical rationale was deleted. Both clauses are satisfied literally; neither was gamed.

**U25 · Omniroute replaces the Anthropic SDK on both paid routes.** — **DONE 2026-08-10, merged to `main` at `c08bb83`** (see the unit report immediately below). *(§7 decision 7, ruled **full
replacement** on 2026-08-10 — a rank-2 scope instruction)* **L**, deps **U5, U6, U7** (all DONE). Lands
alongside Group D; it shares no file with U13–U24.
**Baseline measured 2026-08-10 at `9f8f1e6`: 1055 tests / 89 files green.** The five test files this unit
directly rewrites or edits hold **66** of them: `advisor/route.test.ts` (15), `advisor/agent.test.ts` (15),
`claude-adapter.test.ts` (7), `lab-import.test.ts` (21), `lab-import/extract/route.test.ts` (8).
*(§5's U4 entry says "all **50** advisor route pins"; `src/app/api/advisor/route.test.ts` contains **15**
`it()` blocks today. The 50 is a broader advisor-wide figure from Phase 1 and is not this unit's inventory
— **the measurement wins and the discrepancy is recorded rather than smoothed over.** U25's obligation is
the 66 above, re-measured at execution time, not either historical number.)*

**What the provider actually is, measured from its own documentation and not assumed.** OmniRoute is a
self-hosted **OpenAI-compatible** gateway: `POST {base}/v1/chat/completions`, `Authorization: Bearer …`,
key env `OMNIROUTE_API_KEY`, default base `http://localhost:20128`. Responses carry `usage` with
`prompt_tokens` / `completion_tokens`. Tool calling and streaming are supported. **It publishes no
Anthropic-compatible `/v1/messages` surface** — that single fact drives most of what follows, because
every wire shape in both adapters today is Anthropic's.

**Consequence, stated before the design: this is not a client swap, it is a protocol change.**
`toAnthropicTools`, `seedMessages`, `buildToolResultMessage` and `parseResponse` are pure mapping cores
*to the Anthropic message protocol*. All four are rewritten, and so are their unit tests. Anyone reading
"replace the SDK" as "change one import" will produce a green suite that has stopped testing the protocol
in use.

---

**(1) Detection target — the decision constraint (1) demands be taken deliberately.**
`PAID_API_BUDGET` derives its governed set by walking the import graph for `PAID_PACKAGES =
["@anthropic-ai/sdk"]`. A full swap makes that set empty and the anti-vacuity assertion goes red —
**by design, and that red is the guard working**, not a defect to route around.

| Option | What it buys | What it costs |
|---|---|---|
| **(i) `openai` npm SDK** pointed at OmniRoute's `baseURL`; marker becomes the package `"openai"` | The guard's shape is unchanged — still a package marker, still transitive. A `timeout` option comes free, as today | A new runtime dependency for one JSON POST, against §3.4. The repo's existing posture is deliberately the opposite: both adapters avoid a build-time dep and use structural types |
| **(ii) raw `fetch` through one named client module** `src/lib/omniroute/client.ts`; marker becomes that path (**recommended**) | No dependency. The timeout becomes *ours* and therefore testable (**N-20**). The governed set reads "routes reaching the one module that can spend money", which is what rule 9 means | An import-graph rule has nothing to match if someone writes an inline `fetch` — so the marker needs a **second, sole-client assertion** or it is defeatable by not using it |

**Recommendation (ii), and the sole-client ratchet is not optional under it.** `PAID_PACKAGES` becomes
`PAID_MODULES = ["src/lib/omniroute/client.ts"]`; `paidApiRoutes()`'s `found` predicate matches the
resolved *file* instead of the bare specifier (`resolveSpecifier` already normalises `@/` → `src/`, and
`extractEdges` already sees `await import()`, so both mechanics carry over unchanged). Alongside it, a
**`SOLE_PAID_CLIENT`** assertion: exactly one tracked module under `src/` may read `OMNIROUTE_API_KEY` or
construct the completions URL. **Its honest weakness, per N-14's taxonomy: that is an identifier+literal
match, so a differently-spelled URL or a key read through a helper defeats it** — it raises the cost of
bypassing the client, it does not make bypass impossible. Say that in the file header rather than let the
name imply more.
**Membership stays pinned at exactly 2** — `/api/advisor` and `/api/lab-import/extract` — and a third
ungoverned paid route must be proven red (mutation M2 below).

**(2) The definition, the guard and the doc row move in one commit.** `CLAUDE.md` §4 row 9 and §8's
exit criterion both *define* "paid-API route" as reaching `@anthropic-ai/sdk`, and `DOC_TRUTH` binds row 9
in both directions (`UNENFORCED_MARKERS[9] = "PAID_API_BUDGET"`, plus the "names only rule ids that are
real test titles" and "understates enforcement" assertions). U25 edits `boundaries.test.ts`, `CLAUDE.md`
§4 row 9 and this plan's §8 criterion **in the same commit**. Splitting them leaves the repository
asserting a definition it no longer implements — which is the entire failure class `DOC_TRUTH` exists for.

**(3) NOT_CONFIGURED plumbing.** `API_ANTHROPIC_KEY` → **`OMNIROUTE_API_KEY`** and **`OMNIROUTE_BASE_URL`**
(no default: `localhost:20128` is a developer's gateway, and defaulting a deployed app to it would fail
obscurely rather than loudly). `.env.example` gains both, loses the Anthropic block.
**`AI_SERVICE_NOT_CONFIGURED` is not re-authored** — it names no environment variable, which was U6's
design decision paying off here: **the user-facing 503 body does not change by a single byte** under a
provider swap. Both adapters and the advisor route's pre-flight keep throwing / returning it, so N-9's
ruling stands and a missing key stays an honest 503.
**`NOT_CONFIGURED_TOTALITY`'s sanctioned-site list is edited deliberately, not reactively.** The list is
`{supabase/env.ts, advisor/claude-adapter.ts, lab-import/pdf-adapter.ts}`; the second entry is renamed
below, and its stale explanatory comment (**N-17**) is corrected in the same edit. **The key check stays in
the two adapters and does NOT move into the client module** — the client receives an already-resolved key.
That keeps the throw sites where the guard's inverse assertion can see them and keeps `errors.ts` a
zero-import module reachable from both pure-engine directories.

**(4) U6's pinned behaviours must survive.** All four, re-proven not re-argued:
- **Request timeout.** The SDK's `timeout` leaves with the SDK. Reimplement with `AbortSignal.timeout(ms)`
  composed against the caller's signal, `OMNIROUTE_TIMEOUT_MS` defaulting to the same 60 000.
  **This gets the first real test the control has ever had (N-20).**
- **`maxDuration = 60`** on both routes — unchanged, and still one of the two controls
  `PAID_API_BUDGET` accepts.
- **Abort → settle-then-return BEFORE persistence.** Unchanged; the route's ordering is not touched.
- **A thrown turn still does not settle.** Unchanged. Over-charging by one reservation stays the safe
  direction.

**(5) Ledger semantics — reserve an upper bound, settle to what the provider actually reported.**
Mapping is `prompt_tokens → inputTokens`, `completion_tokens → outputTokens`.
**The dangerous part is the absent case, and it is a live hazard rather than a hypothetical.**
`parseResponse` today does `resp.usage?.input_tokens ?? 0`, and `claude-adapter.test.ts` *pins* that
(`// missing usage → 0`). With one provider that always reports, 0 never occurs. Behind a router that may
serve from any of hundreds of models, "usage absent" and "usage zero" become indistinguishable — and they
settle in opposite directions: absent-as-zero **releases the entire reservation** for a turn that really
spent money. That is the one direction the amendment forbids: *never estimate, and if usage is missing the
settle keeps the full reservation.*
**Design, chosen to keep the port and `agent.ts` untouched (constraint 7):** `AdapterStep.usage` keeps its
exact shape, and the adapter instance — which the route already constructs and holds — exposes a
`usageReported: boolean` **outside** the `ClaudeAdapter` interface. After `runAdvisorTurn` returns, the
route settles only when it is true. `src/types/advisor.ts` is unchanged, `agent.ts` is unchanged, and no
governed pure-engine file moves.
*(Alternative considered and rejected: threading a `reported` flag through `AdapterStep` →
`AdvisorTurnResult`. It is more explicit, and it edits both `src/types/advisor.ts` and `agent.ts` for a
fact only the route acts on.)*
**OP-4(a) is the entry condition** — if the routed model does report usage on every response, the flag is
belt-and-braces; if it does not, the flag is the only thing standing between a router and a free advisor.
The follow-on question — *should a token-denominated budget become cost-denominated?* — is registered as
**N-18** and explicitly **not taken here**.

**(6) Rate limiting is provider-agnostic and unchanged.** `enforceRateLimit`, `src/lib/rate-limit/**`,
`0009_rate_limits.sql` and both routes' 429 pins are untouched; the pins **re-run unedited**. If any needs
editing, that is a finding, not a fix.

**(7) The port stays identical; one file and one class are renamed.** `ClaudeAdapter.next()` keeps its
signature exactly, so `agent.ts` — a governed pure-engine file — is untouched, and the new client adds no
`next/*` and no `@/lib/api/respond` edge (`DOMAIN_IS_PURE` governs `src/lib/omniroute` by ruling D-4's
scope, and a `fetch` client imports none of the banned four; pin it).
**Renamed:** `src/lib/advisor/claude-adapter.ts` → `model-adapter.ts`, class `AdvisorClaudeAdapter` →
`AdvisorModelAdapter`. A module named for a provider it no longer calls is a name that lies (§8.2), and
`NOT_CONFIGURED_TOTALITY`'s list is being edited in this unit anyway — doing it now touches that file once
instead of twice. **The `ClaudeAdapter` *type* is deliberately NOT renamed**: it lives in
`src/types/advisor.ts` and `agent.ts` imports it, so renaming it would touch the one file constraint (7)
asks to leave alone, for zero behavioural gain. Registered as residual naming debt in U25's report.

**(8) `@anthropic-ai/sdk` leaves `package.json` in the same commit as the last import**, and a new
assertion makes its return red: zero tracked files under `src/` reference it (import, `require`, or
`await import`), **and** it appears in neither `dependencies` nor `devDependencies`. Anti-vacuity: the
scanned set is asserted non-empty, or a broken scan reads as a clean removal.

**(9) Declared behaviour change #6 — the provider changes.** Answer prose changes for every advisor turn
and every lab extraction; tool-selection may differ; extraction accuracy may differ. **No status, envelope
or header change is expected.** Two places where that expectation could break, both to be *stopped on*
rather than absorbed: the PDF content block (**decision 7B / N-19**, which would move a 200 to a 502) and
any turn whose usage is unreported (which changes no response byte, only a ledger entry).

**(10) §2.1 and §2.2 get no exception.** The safety re-check, the grounding rules and the `src/lib/safety`
vocabulary gate sit **around** the adapter and are not touched: `runAdvisorTurn` still gates the final
answer before a token leaves the server, `safety-recheck.ts` still runs server-side and authoritative, and
the extraction prompt is still transcription-only. A cheaper provider is not a reason to trust its output
more. `EXTRACTION_SYSTEM_PROMPT` is carried across **verbatim** — it is pinned by test, and rewording it
for a new model would be an undeclared change to a safety-critical instruction.

**(11) Test inventory, and where `vi.mock` wiring necessarily changes (U4's precedent).** U4 recorded that
its assertions were unchanged *but its mock wiring changed because the module's exports did* — and that
"unedited" would have been the wrong word. The same distinction applies here and must be reported the same
way, per assertion and not per file:
- `advisor/route.test.ts:37-39` mocks `@/lib/advisor/claude-adapter` → the mock **path and class name
  change** (wiring); `vi.stubEnv("API_ANTHROPIC_KEY", …)` at `:94` and `:158` → **env name changes**
  (wiring). Every *assertion*, including the 503 pre-flight pin, is expected to stand unedited.
- `claude-adapter.test.ts` → `model-adapter.test.ts`: **rewritten**, because it tests the Anthropic wire
  protocol. Its `MockAnthropic` becomes a scripted OpenAI-shaped client; the `// missing usage → 0` pin is
  **replaced by its inverse** — missing usage must set `usageReported = false` — and the replacement is
  visible in the diff rather than silent, exactly as U6 inverted lab-import's preservation pin.
- `lab-import.test.ts` (21): the injected-`transcribe` tests are provider-agnostic and stand; the tests
  reaching `requireKey` change env name only.
- `lab-import/extract/route.test.ts` (8): the inverted 503/`NOT_CONFIGURED` preservation pin
  (`:148-157`) **re-runs unedited** — the constant does not move.
- `agent.test.ts` (15): expected **entirely unedited**. If any test here needs a change, the port was not
  kept identical and that is a finding.
- Guard files edited: `boundaries.test.ts` (marker + membership + new `SOLE_PAID_CLIENT` + retired-package
  assertion), `not-configured-totality.test.ts` (sanctioned list + N-17's comment). `doc-truth.test.ts`
  is **not** edited — it must go green against the edited `CLAUDE.md` on its existing logic.
- `tests/e2e/{ai-advisor,advisor-actions-ui,advisor-experience-actions}.spec.ts`: `test.skip` **reason
  text** names `API_ANTHROPIC_KEY`. Text only — no gating change, so `LIVE_TAGGING` is unaffected.
- `vitest.config.ts`: `src/lib/omniroute/**` needs a threshold entry (§5.7), set at **measured − 10** with
  D-2's branches rule. **Its red proof is weak by nature** — a threshold's failure mode is the coverage
  step, not a mutation — and saying so is better than manufacturing one.
- **Dated records are annotated, never rewritten** (§7): `docs/05-qa/phase-1-live-e2e-baseline.md`'s env
  table, `docs/04-report/phase-1-verification-integrity.report.md`, `docs/roadmap.md:257` and the
  `docs/archive/**` design/QA documents all name `API_ANTHROPIC_KEY` as what was true when written.

**Files.** N `src/lib/omniroute/client.ts` + `client.test.ts` · R `advisor/claude-adapter.ts` →
`model-adapter.ts` (+ its test) · M `lab-import/pdf-adapter.ts` + `lab-import.test.ts` · M
`advisor/route.ts` + `route.test.ts` · M `lab-import/extract/route.ts` (only if 7B forces it) +
`route.test.ts` · M `boundaries.test.ts`, `not-configured-totality.test.ts` · M `vitest.config.ts`,
`package.json`, `.env.example` · M `CLAUDE.md` §4 row 9 · M this plan's §8 · M 3 E2E spec skip reasons.

**Blocked half.** The advisor half may proceed once **OP-4(a)** and **OP-4(c)** are recorded. **The
lab-import half must not be written until decision 7B is ruled** — every design for it presupposes an
answer to N-19, and writing one first would be choosing the answer by implementation.

#### **[2026-08-10] U25's split — the two obligations that had to move, and why that is not absorption**

The owner's sequencing ruling implements the advisor half now. Two clauses of the amendment turned out to
be **unsatisfiable while the lab-import half is unwritten**, and both were stopped on rather than quietly
dropped or quietly forced:

1. **The paid-route marker is a UNION during the transition, not a replacement.** Swapping
   `PAID_PACKAGES = ["@anthropic-ai/sdk"]` for `PAID_MODULES = ["src/lib/omniroute/client.ts"]` outright
   would stop detecting `/api/lab-import/extract` — which is *still genuinely a paid Anthropic route* —
   dropping the derived set to **1** and reddening the `>= 2` anti-vacuity floor. That red would be the
   guard telling the truth, and silencing it by lowering the floor is the exact vacuity this plan
   condemns. So the guard now carries **both** markers, because during the transition there really are
   two paid providers in the tree. Membership stays pinned at exactly **2**, and the union is asserted to
   find **one route through each marker** — so neither marker can rot unnoticed.
   **The single-marker form is the lab-import half's closing act**, and its removal of `@anthropic-ai/sdk`
   from `PAID_PACKAGES` is the mechanical proof that the last Anthropic import is gone.
2. **`@anthropic-ai/sdk` stays in `package.json`, and the retired-package assertion is deferred with it.**
   Constraint (8) says the dependency drops *in the same commit the last import goes* — and the last
   import is `pdf-adapter.ts`'s, which this half may not open. Removing it now would break the lab-import
   route at runtime. **This is constraint (8) honoured, not weakened:** the commit it names is the
   lab-import commit, not this one. What lands now is the assertion's *scannable half* — `src/lib/advisor`
   is proven free of the SDK — with the repository-wide form and the `package.json` clause named as the
   lab-import half's obligation.

> ### **[2026-08-10] THE SPLIT IS CLOSED. Both obligations discharged in the lab-import commit.**
> Recorded here rather than in a new section, so the deferral and its discharge sit in one place.
>
> **(1) The union collapsed.** `PAID_PACKAGES` is now `[]` and the single module marker
> `src/lib/omniroute/client.ts` accounts for **both** paid routes — asserted per-marker, not as a total,
> because a total of 2 is also what a rotted marker plus an over-matching one produces:
> ```
> paidApiRoutes(PAID_PACKAGES, [])  →  []                       (no paid package remains)
> paidApiRoutes([], PAID_MODULES)   →  ["src/app/api/advisor/route.ts",
>                                       "src/app/api/lab-import/extract/route.ts"]
> ```
> The membership pin of exactly **2** is unchanged, so a third ungoverned paid route is still a red build.
>
> **(2) The dependency left in the same commit as the last import**, which is what constraint (8) asked
> for and why it was worth deferring rather than forcing. `RETIRED_PACKAGE` widened from `src/lib/advisor`
> to **all of `src/`** (with a `>= 100` anti-vacuity floor) and gained the promised **`package.json`
> clause**. The two clauses are deliberately separate: an import with no dependency is a broken build, a
> dependency with no import is a paid provider one `import` away from being reachable with no marker
> watching — neither implies the other. **M11 red-proved the second**, which had never been executed
> before because it did not exist.
>
> **A third obligation was discharged that the split did not anticipate:** `NO_PINNED_MODEL_ID`'s ratchet.
> The advisor half's guard found a hardcoded model id in `pdf-adapter.ts` and registered it rather than
> reach into a blocked file. That row is now gone, along with the literal — and the guard asserts **both**,
> because emptying a register while leaving the code is exactly the failure a register invites.

#### **[2026-08-10] U25 — UNIT REPORT. DONE, in three commits plus a record.**

| | |
|---|---|
| **Merged at** | `c08bb83` (ff into `main`) |
| **Commits** | `77bb371` advisor half · `95f2ed2` N-21 fix · `e1897cb` OP-4 record · `c08bb83` lab-import half |
| **Live evidence** | `docs/05-qa/2026-08-10-omniroute-probe-record.md` |
| **Suite, re-measured at the merge SHA** | **1112 tests / 90 files**, `tsc` clean, coverage exit 0, `next build` exit 0 |
| **Baseline it started from** | 1055 / 89 at `9f8f1e6` → **+57 tests, +1 file** |
| **CI** | `31364502957` · `31367856674` · `31369752881` · `31370626913` — all `success` |

**What it actually was.** Not a client swap: OmniRoute publishes `/v1/*` as OpenAI-compatible and no
Anthropic `/v1/messages`, so every wire shape changed — `input_schema` → `function.parameters`, top-level
`system` → a leading system *message*, `content[{type:"tool_use", input}]` → `tool_calls` with a
JSON-**string** `arguments`, one aggregated tool-result message → one `{role:"tool", tool_call_id}` per
call, and the Anthropic `document` block → an OpenAI `file` content part. Read as "change one import" it
would have shipped a green suite that had stopped testing the protocol in use.

**Decision 7B — ruled option (a)**, from the record and not from documentation, which is what the deferral
was for. The `file` content part returned 200 with a correct transcription on **both** a text PDF and an
**image-only** one (0 fonts, 0 text operators, one `/DCTDecode` JPEG). `/v1/ocr` — option (b) — answered
400 and is not a fallback that exists on that gateway.

**The four findings this unit produced, and where each landed:**

| | Disposition |
|---|---|
| **N-21** | **CLOSED.** A hardcoded model id (`claude-haiku-4-5`) that **does not exist on the gateway** — unset variable ⇒ every advisor turn 400s, from a fully green suite. Default **deleted, not corrected** (§8.4); `OMNIROUTE_MODEL` is a third required setting. Guarded by `NO_PINNED_MODEL_ID`, which found a **second** id on its first run and registered it rather than reach into a blocked file |
| **N-22** | **OPEN.** `auto/*` aliases complete a tool loop and return an **empty** answer — two aliases, two vendors. Gateway routing, not application code; deliberately not worked around in `src/` |
| **N-23** | **CLOSED.** The model fences its JSON and `candidatesFromTranscript` did a bare `JSON.parse`, so a **correct** extraction answered 502. `stripJsonFence` is narrow by design — a fence and nothing else |
| **N-24** | **CLOSED as an instance, CLASS registered.** M19 named a test that `vi.mock`s the module it mutates, so the route pin could never have gone red. The property is guarded; the plan credited the wrong guard |

**BEHAVIOUR CHANGE #6 WAS WRONG, and the measurement wins.** §6 declared it prose-only — *"no status or
envelope change expected"*. For the **advisor** that held. For **lab-import** it did not: without N-23's
fix the happy path moves **200 → 502** on every PDF upload, while the model transcribes perfectly. The
declaration understated the change in the one direction that matters, and it was caught by a live probe
rather than by any test — which is the whole argument for OP-4 existing.

**What the unit deliberately did NOT do.** It did not remove the `| null` usage handling even though usage
was reported on every response of every run — the measurement is one instance on one date, and
absent-as-zero fails toward a silently non-binding budget. It did not choose a routing table (**OP-5**).
It did not make the budget cost-denominated (**N-18**). It adopted no model id into `src/`.

**`CLAUDE.md` §4 row 9 and §8's criterion are updated to the transitional definition in this commit**, so
the document describes the guard that exists rather than the one that will exist. Both move again when the
lab-import half lands. A definition that is briefly a union is honest; a definition that is briefly false
is what `DOC_TRUTH` exists to prevent.

#### U25's red list — every guard the swap edits, and the mutation that must redden it

`CLAUDE.md` §5.2: a test not shown red against the bug it targets is not a guard. Every row below names
the mutation, the guard, and **the text expected on the wire** — predicted here so that a mutation which
reddens for a *different* reason is caught as such. Rows marked **†** are re-runs of an existing pin,
which must go red **without being edited**; if a re-run needs editing, the port or the contract moved and
that is a finding for the report.

| # | Mutation | Guard that must go red | Expected failure text |
|---|---|---|---|
| **M1** | Point `PAID_MODULES` at a path that does not exist | `PAID_API_BUDGET` anti-vacuity | `found 0 paid-API routes; a guard that scans nothing passes vacuously` |
| **M2** | `git add -N` a third `route.ts` importing `omniroute/client` with **neither** control | `PAID_API_BUDGET` — both assertions | membership pin `expected [ …3 items ] to deeply equal [ …2 items ]` **and** `reaches a paid API with no rate limit`. Unstaged, the same file must give a **false green** — the §4.2 index property, proven both ways |
| **M3** | Delete `enforceRateLimit(...)` from `extract/route.ts` | `PAID_API_BUDGET` | `src/app/api/lab-import/extract/route.ts — reaches a paid API with no rate limit (enforceRateLimit)` |
| **M4** | Delete `export const maxDuration` from `extract/route.ts` | `PAID_API_BUDGET` | `… neither a budget reservation nor a maxDuration ceiling` |
| **M5** | Inline a `fetch` to the completions URL **inside a route**, bypassing the client module | `SOLE_PAID_CLIENT` | names the second module. **This is the new marker's specific weakness — an unproven M5 means the path marker is decorative** |
| **M6** | Revert `CLAUDE.md` §4 row 9 to the `@anthropic-ai/sdk` definition, or to `Not enforced` | `DOC_TRUTH` | `DOC_TRUTH: rule 9: §4 says not enforced, but PAID_API_BUDGET: exists` (and, for a phantom id, `claims a rule is enforced by a test that does not exist`) |
| **M7** | Revert one adapter's throw to a bare `Error(AI_SERVICE_NOT_CONFIGURED)` | `NOT_CONFIGURED_TOTALITY` | `An error carrying 'not configured' text is being constructed through a class other than NotConfiguredError` + the file and line |
| **M8** | Move the key check into `omniroute/client.ts` without updating the sanctioned list | `NOT_CONFIGURED_TOTALITY` inverse | `expected [ … ] to contain "src/lib/advisor/model-adapter.ts"` — the assertion that caught N-14 |
| **M9** | `git add -N` a new module with a bare `Error("… not configured")` | `NOT_CONFIGURED_TOTALITY` | red staged, green unstaged — both directions recorded |
| **M10** | Re-add `import Anthropic from "@anthropic-ai/sdk"` to any tracked `src/` file | new retired-package assertion | names the file; and with the scan broken instead, the anti-vacuity floor fires |
| **M11** | Re-add `"@anthropic-ai/sdk"` to `package.json` | new retired-package assertion | names `dependencies` |
| **M12** | Remove the `AbortSignal.timeout` composition from the client | new timeout test | a hanging `fetch` under a fake clock: `promise resolved instead of rejecting` — **the first red this control has ever had (N-20)** |
| **M13 †** | Remove the `signal?.aborted` check from `agent.ts` | U6's abort pin, **unedited** | `adapter.next` called 3 times, not 1 |
| **M14 †** | Remove settle-on-abort from `advisor/route.ts` | U6's settle pin, **unedited** | `settleAdvisorUsage` not called |
| **M15 †** | Move the abort return to **after** `appendMessages` | U6's persistence pin, **unedited** | `expected "spy" to not be called at all, but actually been called 1 times` — the exact failure U6 hit |
| **M16** | Make the client default absent `usage` to `{0,0}` and report it as measured | new usage-honesty pin | `settleAdvisorUsage` called with `{inputTokens:0,outputTokens:0}` where it must not be called at all. **The single most valuable mutation in this unit: it is the difference between "never estimate" and a free advisor** |
| **M17** | Emit tool results as one aggregated `user` message instead of one `{role:"tool", tool_call_id}` per call | rewritten adapter threading test | the scripted client's second request lacks `tool_call_id` → `expected undefined to be "call_1"` |
| **M18** | Treat `function.arguments` as an object rather than a JSON string | rewritten `parseResponse` test | `expected '{"a":1}' to deeply equal { a: 1 }` |
| **M19 †** | Revert `pdf-adapter.ts`'s `NotConfiguredError` rethrow | U6's **inverted** preservation pin, **unedited** | `expected 502 to be 503` at `extract/route.test.ts` |
| **M20** | `import "next/server"` in `omniroute/client.ts` | `DOMAIN_IS_PURE` | names the file and the specifier |
| **M21** | Delete the `src/lib/omniroute/**` threshold entry | *(none — stated honestly)* | A coverage threshold has no mutation proof; its absence is invisible to `vitest run` and shows only in the coverage step. **Recorded as a weak proof rather than dressed as a strong one** |

**Not in this list, deliberately:** the E2E skip-reason text and the dated-record annotations have no red
proof because they are prose. They are verified by reading, and the report must say so rather than let
them ride under a mutation count.

#### **[2026-08-10] U25 ADVISOR HALF — DONE.** Red record, measured not predicted

**Verification, run at the tip of this change:** `npx tsc --noEmit` clean · `npx vitest run` **1100 tests /
90 files, 0 failed** (from 1055/89 — **+45 tests, +1 file**, and the file count nets to +1 because
`client.test.ts` and `model-adapter.test.ts` arrived while `claude-adapter.test.ts` left) ·
`vitest run --coverage` thresholds pass with `src/lib/omniroute` at **100 / 88.23 / 100 / 100** ·
`npx next build` succeeds. CI has not run — nothing is pushed.

**Every red below was produced by applying the mutation, running the named suite, and restoring the file.**
Where the observed text differs from the prediction, the observed text is what is recorded.

| # | Verdict | Observed failure |
|---|---|---|
| **M1** | **RED** ×4 | `found 0 paid-API routes; a guard that scans nothing passes vacuously … expected 1 to be greater than or equal to 2`, plus the membership pin, the per-marker pin (`the Omniroute module marker: expected [] to deeply equal [ 'src/app/api/advisor/route.ts' ]`) and the marker-exists pin |
| **M2** | **RED staged, false green unstaged** | staged: `expected [ Array(3) ] to deeply equal [ Array(2) ]` **and** `src/app/api/zz-probe/route.ts — reaches a paid API with no rate limit`. Unstaged: `43 passed` — the §4.2 index property, proven both ways |
| **M3** | **RED** | `src/app/api/lab-import/extract/route.ts — reaches a paid API with no rate limit (enforceRateLimit)`. **Run deliberately:** the marker change is mine, so leaving the *other* route's governance unverified would be trusting the change I made. A mutation applied and reverted is not writing the lab-import half |
| **M4** | **RED** | `… reaches a paid API with neither a budget reservation nor a maxDuration ceiling` |
| **M5** | **RED** | `SOLE_PAID_CLIENT: the paid endpoint is reachable from more than one module … expected [ …(2) ] to deeply equal [ 'src/lib/omniroute/client.ts' ]`. **The one that matters most**: without it the module marker is decorative |
| **M6** | **RED** | `DOC_TRUTH: rule 9: §4 says not enforced, but PAID_API_BUDGET: exists` — the literal text U7 predicted, still binding after the row was rewritten |
| **M7** | **RED** ×2 | `src/lib/advisor/model-adapter.ts:310 new Error("AI_SERVICE_NOT_CONFIGURED")`, plus the sanctioned-sites inverse |
| **M8** | **RED** ×2 forms | Both the literal form (the throw leaves `model-adapter.ts`) and an accidental discovery — wrapping the constant so the identifier is no longer resolvable reddens the same inverse. That second form **is N-14's exact failure mode**, and finding it by accident is the strongest evidence yet that the inverse assertion is the load-bearing half of that guard |
| **M9** | **RED staged, green unstaged** | `src/lib/omniroute/rogue.ts:2 new Error("OMNIROUTE_API_KEY not configured")` |
| **M10** | **RED** ×2 | `RETIRED_PACKAGE: … expected [ 'src/lib/advisor/model-adapter.ts' ] to deeply equal []`, **and** the per-marker pin caught it independently (`the Anthropic package marker: expected [ Array(2) ] to deeply equal [ Array(1) ]`) — two unrelated assertions on one regression |
| **M11** | **RUN 2026-08-10 — RED as predicted** | Re-added `"@anthropic-ai/sdk"` to `dependencies` → `RETIRED_PACKAGE: the Anthropic SDK is declared in package.json again … expected [ '@anthropic-ai/sdk' ] to deeply equal []`. The clause was newly written for this half, with an anti-vacuity floor (`>= 10` declared dependencies) so an unreadable `package.json` cannot pass it |
| **M12** | **RED** ×2 | `Test timed out in 5000ms` on both timeout tests. **Recorded honestly as a weaker red than the others**: the mutation makes the promise never settle, so the failure is a suite timeout rather than a named assertion. That is inherent to testing a deadline, and it is still the first red this control has ever had (**N-20**) |
| **M13** | **RED** ×3, **unedited** | `adapter.next call count: expected 5 to be 1` — U6's pin, re-run against the new adapter without a single change |
| **M14** | **RED**, **unedited** | `expected "spy" to be called with arguments: [ Array(3) ]` |
| **M15** | **RED** ×2, **unedited** | `expected "spy" to not be called at all, but actually been called 1 times` — **the exact text U6 recorded hitting when it first placed the abort branch wrong**, reproduced years-of-context later by a re-run nobody edited |
| **M16** | **RED** ×4 + ×2 | Client half: `expected { inputTokens: 3, outputTokens: +0 } to be null`. Adapter half (M16b): `expected true to be false` on both the inverted pin and the sticky-flag test. **The most valuable mutation in the unit** — it is the difference between "never estimate" and a free advisor |
| **M17** | **RED** ×2 | `expected [ { role: 'user', …(1) } ] to deeply equal [ { role: 'tool', …(2) }, …(1) ]` |
| **M18** | **RED** ×2 | `expected {} to deeply equal { a: 1 }` |
| **M19** | **RUN 2026-08-10 — RED, but NOT where the plan said (N-24)** | Reverting the `NotConfiguredError` rethrow reddened **two `lab-import.test.ts` pins** — `expected ExtractionError: Transcription failed to be an instance of NotConfiguredError` — and left `extract/route.test.ts` **green**, because that file mocks `pdf-adapter` wholesale. The property is guarded; the plan credited the wrong guard. Recorded, not smoothed over |
| **M20** | **RED** | `DOMAIN_IS_PURE: … expected [ Array(1) ] to deeply equal []` |
| **M21** | **NO PROOF, as predicted** | A coverage threshold has no mutation. Stated rather than manufactured |

**Two things the red record changed about the plan's own claims:**

1. **A test found a real defect in the client, and the fix went into the code rather than the test.** The
   probe for "an already-disconnected caller" hung instead of failing, because the fake `fetch` modelled
   an aborted signal the way the platform does and the client had no short-circuit — it constructed and
   dispatched a paid request for a connection that was already gone. `createCompletion` now refuses
   before `fetch`, and the test asserts `fetchImpl` was never called. The spec did not predict this.
2. **`resolveClient`'s replacement is not a like-for-like port.** The old adapter resolved a client once
   and cached it; the new one resolves configuration per call. That is invisible behaviourally (both are
   per-turn instances) and is recorded only so nobody later reads the rename as a pure move.

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
Group C   U8 → U9 → U10 → ~~U11~~ · U12→D            [persistence]         GATE C1 discharged 2026-08-10
                                                                          remainder → U26
Group D   U13 → U27 → U14 · U15 · U16 → U17 · U18 · U19 · U20 · U24 · U25  GATE D1, D2
Group E   U21 · U22 · U23                           [cuttable]
```
**A precedes B** because U4/U5/U6 all add `catch` blocks under `src/lib/**` and U2's guard is what must see
them. **B precedes C** for merge hygiene (U5 and U11 both edit `db/types.ts` and `BINDING`). **D** is
independent except U19←U1. **U24 sits in D on dependency logic, not affinity**: it has no dependencies at
all and blocks nothing, so it lands wherever D's independent units land. It is *not* in Group E, because
Group E is the cuttable group and U24 is not cuttable (above).
**U25 sits in D on the same logic** — it depends only on already-DONE units (U5, U6, U7) and shares no file
with any other D unit. It is placed **last within D** for one reason: it changes what `PAID_API_BUDGET`
detects, and letting the other D units land first keeps that change isolated in the history.

> **GATE D1** — any unit adding a CI step updated `CLAUDE.md` §5's declared chain in the **same commit**.
> **Check:** `doc-truth.test.ts` green. Already mechanical since FU-23; no new machinery.
> **GATE D2** — before U17 merges: U16 is green **and** a test proves `DELETE` without a confirmation token
> writes nothing.

### Cut order (first cut at the top)
1. **U22** — L, headline deliverable blocked on decision 3. Keep the ~S fresh-clone half.
2. **U23** — residue; the sink is an operational decision.
3. **U11** — weak red proof by nature; FU-20 survives as a register row at no cost. **— TAKEN 2026-08-10.
   Cut on this ground, unmodified. FU-20 remains open as a register row.**
4. **U21** — real but process-shaped.
5. **U19** down to formatter + `AdvisorPanel` only.
6. **U10** — U9's pins cover today's files; the guard's value is over *future* modules.
7. **U14** — keep U13's headers, defer CSP. CSP is the one header that can break the shipped app.
8. **U18** to its cheap branch — *remove* the script. The roadmap explicitly permits this.
9. **U16/U17** — last, and **both go together**: an export route without deletion is half a data-rights
   feature; deletion without export is worse than neither.

**Never cut:** **U25** (it implements a rank-2 scope instruction; cutting it is not a sizing decision —
2026-08-10, the same logic as U24) · **U1, U2** (the error contract; FU-7's guard is the only thing that would notice a
regression) · **U3, U4** (§2 — the ledger is user-writable *today*) · **U7** (rule 9 is the unenforced rule
this phase explicitly owns) · **U8** and **U13** (named exit criteria, cheap) · **U24** (it carries a
ruling, and cutting a ruling is not a sizing decision — 2026-08-08).

---

## 6. Risks

**Trust boundaries touched:** U3, U4, U5, U7, U9, U10, U12, U14, U16, **U17 (irreversible deletion)**,
**U25** (it moves every paid call to a different provider and re-defines what the paid-route guard detects).

**Declared behaviour changes — Phase 1 had two and pre-declared both; this phase has ~~five~~ ~~six~~ eight:**
1. **U1** — bare `Error("… not configured")` from an unconverted source: 503 → 500.
2. **U2** — advisor tool-failure text changes → model input changes → answer prose can change.
3. **U12** — `Item not found.` → one shared message.
4. **U5** — 429 becomes a new status on two routes. Declared as a change rather than argued to be "new behaviour".
5. **U24** *(added on approval, 2026-08-08)* — the signed-in header's rendered markup changes. **The only
   one of the five that is not a response-byte change**: no status, envelope, header or API body moves.
   Listed with the others anyway, because "it's only visual" is how a change escapes being declared.
   ✅ **SHIPPED 2026-08-10 EXACTLY AS DECLARED (`b28493b`).** The signed-in header moved the Advisor out of
   the pillar group and beside sign-out; **no status, envelope, header or API body changed**, and the
   non-live E2E suite ran 64 passed / 30 skipped **unchanged, with no spec edited** — which is the evidence
   the declaration was accurate rather than merely made.
6. **U25** *(added by the 2026-08-10 scope amendment)* — **the LLM provider changes**, so answer prose
   changes for every advisor turn and every lab extraction, and tool-selection and extraction accuracy may
   differ. No status, envelope or header change is expected. **Two things could break that expectation and
   both are to be stopped on, not absorbed:** the PDF content block (**N-19 / decision 7B**, which would
   turn a working 200 into a 502) and an unreported `usage` object (which moves no response byte, only a
   ledger entry — and is therefore the easier of the two to ship without noticing).
7. **U27** *(added 2026-08-11 when the unit was created)* — **the Supabase session refresh begins running.**
   For a signed-in user, navigation now persists a refreshed auth cookie instead of computing and silently
   discarding it, and each matched navigation adds one `supabase.auth.getUser()` round-trip.
   **The unusual one: this change activates code that already existed and never ran** — so the risk is not
   in the diff, it is in fourteen months of behaviour that was never exercised. No automated check in this
   repository can see it (the 64 non-live specs touch none of these paths; the live half is
   `BLOCKED(env)`), which is why U27 is gated on an owner-run smoke rather than a test.
8. **U14** *(renumbered from #7 when U27 was created)* — a `Content-Security-Policy-Report-Only` header
   appears on every matched response. Report-Only enforces nothing in a browser, but it is a response-byte
   change and is declared as one.
*Conditional:* **U4** adds a refusal that only manifests under concurrency; **U8** changes behaviour only
under induced insert failure.

**Failure modes that would look green and be wrong:**
- U4's concurrency test with a constant-returning mock (Phase 1's U10 hit exactly this).
- U5 trusting `x-forwarded-for[0]` — passes every test, defeated by one header.
- U18's eslint with an over-broad `ignores` — green over zero files, the very defect item 9 exists to fix.
- **U7 landing while U4/U5 are incomplete** — the guard would be written to match what exists rather than
  to state the rule.
- **U25's absent-`usage` case defaulting to zero.** Every test passes, every turn answers, and the daily
  budget silently stops binding because each turn settles to nothing. Nothing on the wire looks wrong.
  Mutation **M16** is the only thing that distinguishes it from correct behaviour.
- **U25's path marker matching a *comment*.** N-14's audit already recorded that `PAID_API_BUDGET`'s
  identifier detection would accept the control's name inside a comment; moving the marker to a module
  path inherits that, and adds a second way to be green about nothing — a paid call written as an inline
  `fetch` that the import graph never sees. **M5** is what makes `SOLE_PAID_CLIENT` more than a name.
- **U25's rewritten mapping cores passing against a mock built from the same wrong assumption.** The four
  pure cores and their scripted client are written together from the same reading of the protocol; if that
  reading is wrong, both agree and the suite is green. **OP-4(c) — one real call — is the only check that
  is not self-referential**, which is why it is an entry condition and not a nicety.

---

## 7. Decisions needed — **six ruled 2026-08-08; a seventh raised 2026-08-10, half of it still open**

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
> | **7A** | Omniroute replaces the Anthropic SDK | **Full replacement, no fallback** — instructed 2026-08-10 | **U25** |
> | **7B** | How a PDF reaches an OpenAI-compatible endpoint | **RULED 2026-08-10 — option (a), from the OP-4 record** | Unblocks U25's lab-import half; closes N-19; raises N-23 |

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
> **[2026-08-10] RULING FULLY EXECUTED by U24.** Option A shipped: `NavPills` receives the three-entry
> `PILLARS` unconditionally and the Advisor is a sibling of sign-out. The rule was **not** relaxed. The
> "no test changes expected" claim was **re-verified at execution time** and held — zero specs touched,
> 64 passed / 30 skipped unchanged. The `[2026-08-06]` block is retired **in the same commit**.

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

### Decision 7 — **Omniroute replaces the Anthropic SDK on both paid routes** *(raised 2026-08-10)*

Two questions, and only the first is settled. Recorded as one decision because 7B exists only as a
consequence of 7A.

**7A — the swap itself.** Instructed by the repository owner on 2026-08-10 as a rank-2 explicit
instruction: replace `@anthropic-ai/sdk` with Omniroute for **both** `/api/advisor` and
`/api/lab-import/extract`, **full replacement, no Anthropic fallback**.

> **RULING — 7A, full replacement, 2026-08-10, by owner instruction.** A rank-2 instruction changes what
> is built and in what order; it does not suspend anything in `CLAUDE.md` §2, and **U25 is written so that
> nothing in §2 moves**: the safety gate, the server-side authoritative re-check and the grounding rules
> sit around the adapter and are untouched, and `AI_SERVICE_NOT_CONFIGURED` is not re-authored, so the
> user-facing 503 does not change by a byte.
> **Obliges, and each is a clause of U25 rather than an aspiration:** the detection target moves from the
> package `@anthropic-ai/sdk` to the module `src/lib/omniroute/client.ts` **with a `SOLE_PAID_CLIENT`
> ratchet**, because an import-graph rule has nothing to match against a raw `fetch`; membership stays
> pinned at exactly **2** and a third ungoverned paid route is proven red; **`CLAUDE.md` §4 row 9, §8's
> criterion and the guard move in one commit**, since all three currently *define* a paid route as one
> reaching the Anthropic SDK; the ledger settles only to figures the provider actually reported and
> **never estimates**; U6's four pinned behaviours re-run unedited; and `@anthropic-ai/sdk` leaves
> `package.json` in the same commit as its last import, with its return made red.
> **Explicitly not taken:** token- vs cost-denominated budgeting (**N-18**) and the `ClaudeAdapter` port
> **type** rename, which would touch the one governed pure-engine file the amendment asks to leave alone.

**7B — how a PDF reaches an OpenAI-compatible endpoint. OPEN, and it blocks half of U25.**
`makeClaudePdfTranscriber` sends an Anthropic `document` content block. OmniRoute publishes `/v1/*` as
**OpenAI-compatible** and no `/v1/messages`, so that block has no direct equivalent (**N-19**). This is
not a wording question: if nothing accepts the PDF, files that transcribe today answer **502
`EXTRACTION_FAILED`**, which is a functional regression and **not** the prose change declared as behaviour
change #6.

| Option | What it costs | What it buys |
|---|---|---|
| **(a) OpenAI `file` content part** — `{type:"file", file:{filename, file_data:"data:application/pdf;base64,…"}}` (**recommended, conditional on OP-4(b)**) | Nothing in the repository; but support is a property of the **routed model**, not of the gateway, so it is unverifiable from documentation and could regress silently when routing changes | Closest to today: one call, no new dependency, scanned PDFs still work if the model is multimodal |
| **(b) OmniRoute `/v1/ocr`, then the existing `extractFromText`** | A second endpoint and a second failure mode; OCR quality becomes a variable in a **transcription-only safety path** | Deterministic and provider-independent of vision support. The existing text path is already built and tested |
| **(c) Server-side PDF text extraction, then `extractFromText`** | Reintroduces exactly the dependency the v4 design avoided, and **loses scanned PDFs entirely** — a real capability regression | No model multimodality needed at all |
| **(d) Keep lab-import on Anthropic** | — | **Rejected by 7A**, which is a rank-2 instruction: full replacement, no fallback. Listed only so the rejection is on the record rather than implied |

**I recommend (a) with (b) as the recorded fallback, and I am not able to choose between them from
documentation** — the deciding fact is whether a routed model accepts a base64 PDF, which only
**OP-4(b)** can establish. **Ruling needed before U25's lab-import half is written.** Writing it first
would settle the question by implementation, which is how the answer stops being a decision.

> **RULING — 2026-08-10.**
>
> **7A — CONFIRMED as ruled.** Full replacement, no Anthropic fallback. The obligations recorded above
> stand unchanged.
>
> ### **[2026-08-10] 7B — RULED: option (a), the OpenAI `file` content part.**
> Settled by evidence, exactly as the deferral required: `docs/05-qa/2026-08-10-omniroute-probe-record.md`.
> The owner's decision tree was conditional on the probe — *"file-part works on BOTH PDFs → ruled (a)"* —
> and it did:
> ```
> OPTION (a) file content part · TEXT PDF      http 200   transcription correct
> OPTION (a) file content part · SCANNED PDF   http 200   transcription correct
> OPTION (b) /v1/ocr           · both PDFs     http 400   unavailable on this instance
> ```
> The scanned fixture was **image-only by construction** — 0 font objects, 0 text-showing operators, one
> `/DCTDecode` JPEG — so a correct transcription of it could only have come from the model reading the
> page. Both fixtures are **synthetic** and uncommitted (§2.3 rule 15).
> **Closes N-19**, which recorded that native PDF transcription had no like-for-like replacement. It has
> one, verified rather than assumed. Option (b) is not a fallback that exists here: `/v1/ocr` 400s.
> **Raises N-23**, which the ruling does NOT dispose of: the transcription is correct and
> `candidatesFromTranscript` still rejects it, because the model fences its JSON. The lab-import half
> fixes that or every PDF upload becomes a 502 while the model works perfectly.
>
> ~~**7B — DEFERRED PENDING PROBE**~~ *(superseded by the ruling above; retained per §7 — annotate, do not
> erase)*, on the stated ground that *it is a property of the routed model, so no
> option may be chosen from documentation.* The deferral is not a postponement of the decision; it is a
> ruling about **what evidence may settle it**, and that is the substantive part. A README is not
> evidence about a model.
> **Obliges — and this is executed in this commit:** the **OP-4 probe scripts are authored now**, as
> owner-run artifacts **committed WITHOUT secrets** (the key is read from the environment and never
> written, printed, or defaulted). Three probes: **(i)** the advisor probe — one chat completion through
> the gateway exercising a tool call, reporting **which `usage` fields actually come back**, which
> settles **M16's absent-usage semantics against reality rather than the README**; **(ii)** the
> lab-import probe, option (a) — the `file` content part with a base64 PDF, against **both a text PDF and
> a scanned PDF**, because the two fail differently and only the second needs model vision; **(iii)** the
> same probe against `/v1/ocr`, option (b), as the recorded fallback. A dated-record template lands under
> `docs/05-qa/` in the OP-2/OP-3 style. **The 7B ruling follows from that record and not before.**
>
> **[2026-08-10] Both probes run bare** — `npm run probe:advisor` and `npm run probe:labimport` — via
> `scripts/probes/load-env.ts`, which reads the gitignored `.env.local` so the settings need not be pasted
> onto the command line on every attempt. Three properties make it safe to commit, and each is a
> deliberate choice rather than a default:
> **(1) it is an allowlist, not a dotenv loader.** Only names prefixed `OMNIROUTE_` reach `process.env`.
> The same file carries `SUPABASE_SERVICE_ROLE_KEY`, which §2.3 rule 14 confines to the dev seed script; a
> general-purpose loader would put it in every probe process for no purpose, and "it was already in the
> file" is not a purpose. Verified: after loading, `SUPABASE_SERVICE_ROLE_KEY` and
> `NEXT_PUBLIC_SUPABASE_URL` are both still unset.
> **(2) it never emits a value.** `summarise()` reports names and their source only, so its line is safe to
> paste into the probe record verbatim — which is where a leak would otherwise happen, ruling 3 being about
> the repository but a pasted transcript being just as public.
> **(3) an explicit shell value wins**, so a one-off override cannot be silently defeated by a stale file.
> `.env.local` was confirmed ignored by `.gitignore:27` (`.env*.local`) with `git check-ignore` before the
> loader was written, and it appears in neither `git ls-files --cached` nor `--others --exclude-standard`.
>
> **SEQUENCING — the advisor half now; the lab-import half is not written in any file.** U25 splits at
> the ruling: the client module, the adapter and protocol rewrite, the guard moves and every red-list
> mutation not touching lab-import are implemented now. `pdf-adapter.ts` is not opened.
> **Where a shared file forced both halves to be considered, it was stopped on rather than absorbed** —
> see U25's split note below, which records the two obligations that had to move to the lab-import half
> (the retired-package assertion, and the single-marker form of the paid-route definition) and why
> deferring them is the honest reading of constraint (8) rather than a weakening of it.

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
      defined mechanically as ~~*a tracked `route.ts` whose import graph reaches `@anthropic-ai/sdk`*~~ →
      **[2026-08-10, effective at U25]** *a tracked `route.ts` whose import graph reaches
      `src/lib/omniroute/client.ts`, the one module permitted to spend money* — **today exactly 2 under
      either definition**, and the membership is pinned to those 2 in both. Check: `PAID_API_BUDGET` green
      with a non-empty inventory; both routes assert 429. *(The original is struck rather than replaced:
      it was **true when written and is still true until U25 lands**, and a reader needs to see that the
      definition moved with the provider rather than being loosened. Decision 7A requires the definition,
      the guard and `CLAUDE.md` §4 row 9 to move in one commit — until that commit, the struck form is the
      operative one.)*
- [ ] **No paid call bypasses the one client module, and `@anthropic-ai/sdk` is gone.**
      *(Added 2026-08-10 by the U25 scope amendment.)* Check: `SOLE_PAID_CLIENT` green and shown red
      against an inline `fetch` in a route (**M5**); zero tracked `src/` files reference
      `@anthropic-ai/sdk` and it appears in neither `dependencies` nor `devDependencies`, with the scanned
      set asserted non-empty.
- [ ] **A turn whose provider response omits `usage` settles nothing.**
      *(Added 2026-08-10.)* The reservation stays charged — over-charging by at most one reservation is the
      safe direction, and estimating is forbidden (§2.2 rule 7: never assert a figure the system did not
      compute). Check: the pin exists and was shown red against defaulting absent usage to zero (**M16**).
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
- [x] **Security headers present in the config and in a real response.** ✅ **MET 2026-08-10 by U13,
      `a7f36fd`** — ruled accepted by the owner. Check: the unit test asserts the config (**19 tests**);
      the **ungated** E2E asserts the bytes (**5 tests**, executed against a production build, 5 passed);
      the path-scoping mutation reddens the E2E and not the config — **config 19/19 green, E2E 4/5 red**,
      recorded verbatim in U13's red-evidence table. *(Stated non-coverage, so the claim stays true: the
      criterion says "in a real response", and the E2E that establishes that half **does not run in CI** —
      **N-29**, ruled DEFERRED TO U14. The config half is enforced on every push; the response half is
      developer-run until U14 lands the build-and-serve stage. The criterion is met; its CI enforcement is
      half-met, and that is deliberate rather than overlooked.)*
- [ ] **`npm run lint` either lints a non-empty file set or does not exist.** Check: `LINT_SCOPE` asserts
      ≥ N files, or `package.json` has no `lint` script. *(Both branches are acceptable; the unacceptable
      state is a script that appears to gate and does not.)*
- [ ] **A user can export their data and delete all of it across the 12 tables**, with the surviving auth
      identity stated in the response. Check: both route tests green; a test asserts the export payload
      passes through no logging path.
- [x] **The navigation pillar group renders exactly the three pillars, signed in and signed out**, and
      `CLAUDE.md` §1's `[2026-08-06]` divergence block is retired in the same commit that changes the code.
      *(Added on approval, 2026-08-08 — decision 1, ruling A.)* Check: the source-level assertion in
      `src/architecture/` is green **and** was shown red against a fourth appended entry; **and**
      `grep -c 'FU-27' CLAUDE.md` = 0 while `git log -1 --name-only` for that commit lists both
      `src/components/layout/TopNav.tsx` and `CLAUDE.md`. *(The second clause is what stops the code and
      the rule drifting apart again — which is the whole of FU-27.)* ✅ **MET 2026-08-10 by U24.** Both
      clauses checked as written: the source-level assertion is green (10 tests) **and** was shown red
      against an appended fourth entry (M1, red ×4); `grep -c 'FU-27' CLAUDE.md` = **0**; and the commit
      lists `src/components/layout/TopNav.tsx` and `CLAUDE.md` together. *(The `grep` clause and §7's
      "struck, not deleted" clause are jointly satisfiable only by relocating the rationale — see **N-31**
      and `docs/archive/retired-nav-divergence-note.md`.)*
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

**~~23~~ ~~24~~ 25 proposed units** (U1–U22, **U24**, **U25** and **U26**, plus U23 deferred). Rough shape:
**~~7~~ 8 S/S-M · 12 M · ~~3~~ 4 L · 1 M/L**. *(U26 — added 2026-08-10 by GATE C1's discharge — is **S/M**:
it does not invent an obligation, it names one the ratchet was already asserting. **U11 is cut** as of the
same date, per cut order #3, so the unit count rises by one while the work in flight does not.)*
*(U25 — added 2026-08-10 by the scope amendment — is **L**: two adapters whose wire protocol is rewritten,
a new client module, a guard whose detection model changes plus a new ratchet beside it, and **66 measured
tests** across five files that are rewritten or rewired. It is appended, not inserted, for the same reason
U24 was.)*
~~**23 proposed units** (U1–U22 and **U24**, plus U23 deferred). Rough shape: **7 S/S-M · 12 M · 3 L · 1 M/L**.~~
*(22 and 6 S/S-M before approval; U24 — the S-sized unit ruling 1 created — is the difference. Numbering is
**append-only**: U24 follows U23 rather than being inserted, so that every U-number already cited elsewhere
in this document keeps pointing at the same unit. The same reason reference-data IDs are append-only.)*
Phase 1 delivered 21 units and +335 tests. This phase is **comparable in unit count but heavier in risk**:
it adds two migrations, two routes, a `security definer` function, and the first code that changes what a
user can do to their own rows.

**Estimate withheld deliberately.** Phase 1's estimate was made before any unit ran and its error was the
useful artifact. The measured Phase 1 cost per unit is the better input, and it is recorded in that plan's
§6.5.
