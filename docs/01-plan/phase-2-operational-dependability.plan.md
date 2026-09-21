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
> **[2026-09-14] SCOPE AMENDMENT — U31, the LLM provider swap, again.** The repository owner instructed,
> as a rank-2 explicit instruction under `CLAUDE.md` §6, that **OpenAI's first-party API replaces the
> Omniroute gateway for both paid routes** — full replacement, no gateway fallback, and no `openai`
> package: the call stays on plain `fetch`. Appended as **U31** in §5 Group D (numbering is append-only —
> U31 follows U30, it is not inserted), with **decision 9** in §7. A rank-2 instruction changes *what* is
> built; it suspends nothing in §2 of `CLAUDE.md`, and U31 is written so that it does not: §2.1's safety
> gate and §2.2's grounding rules apply to the new provider exactly as they applied to the previous two.
>
> **The instruction carried two rulings**, recorded in §7 beside decision 9: **9A** — the module, its
> settings and its probes are renamed to `OPENAI_*` in full, rather than left describing a gateway that is
> gone; **9B** — `reasoning_effort` is carried as an environment variable with **no default**, omitted
> from the request body entirely when unset, so no value this repository has never seen a provider accept
> is written into `src/`.
>
> **U31 inherits U25's honest limit, and it is the point of the unit's shape:** a model id and a
> reasoning-effort value are properties of the provider account, not of the protocol, so
> `NO_PINNED_MODEL_ID` forbids either from appearing in `src/` and **no test in this repository can prove
> the swap works**. A scripted mock accepts whatever it is handed. Acceptance is an owner-run live probe
> against `GET /v1/models` plus both probe scripts, recorded dated under `docs/05-qa/` — the OP-4 pattern,
> reused because it is the only thing that caught N-21. The unit's detail is in
> `docs/01-plan/features/u31-openai-first-party.plan.md`, which is **subordinate** to this entry.
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
| 9 | Resolve `npm run lint` | ~~**NOT STARTED.** `"lint": "next lint"`, no eslint dep, no config, **4** `eslint-disable` comments naming **2 uninstalled plugins and 1 ESLint core rule**~~ → **DONE 2026-08-18 by U18.** The count in the struck text was one of the drifted figures this plan warns about: **5** disable comments, not 4. ESLint 9 + flat config + `scripts/verify-lint.mjs`; **356/356** tracked source files linted, 0 errors; CI `Lint` step live. | **U18 — DONE** |

### 4.2 Deferred from Phase 1

| Item | State | Disposition |
|---|---|---|
| **F3** typed `NOT_CONFIGURED` | ~~not started (`respond.ts:247`)~~ → **CLOSED 2026-08-08 by U1** (`c0eb8bf`) | `NotConfiguredError` in `src/lib/api/errors.ts`; `respond.ts` dispatches on `err instanceof NotConfiguredError` and reads `publicMessage`. The substring branch is **deleted**, and `not-configured-totality.test.ts` (18 tests) asserts it stays deleted *and* that no other class carries the text. Evidence: `respond.test.ts` T5 (503 by class, 500 for a bare Error), M4's bypass probe red |
| **F5** correlation ID in UI | ~~not started — zero `correlationId` in any `.tsx`; `AdvisorPanel.tsx:286` receives one and discards it~~ → **CLOSED 2026-08-20 by U19**. The row undercounted: the discard was **two** sites (`:286` SSE and `:248` envelope) across a **14-file** surface, not one site in one file | `errorText()` in `src/lib/api/error-text.ts` (100/100/100/100, 11 tests); `AdvisorPanel` converted at both sites; `ui-error-text.test.ts` scans all 65 tracked `.tsx` with a **13-entry shrink-only ratchet** (owner ruling 2026-08-20) and pins the SSE branch separately, since no envelope regex can see it. Evidence: 8 mutations red, incl. M3 `(Reference: undefined)`, M6 green-untracked/red-staged, M7 anti-vacuity |
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
- ~~**FU-13 → unowned.** Its candidate owner U14 shipped without binding the §10.1 400-exemption list, which
  remains prose.~~ **[2026-08-13] CLOSED BY U16 — the list is executable.** `ROUTE_CONTRACT` holds the nine
  entries with their original reasons plus U16's own, and binds them as a **set equality** against the
  measured non-validating routes, so the list cannot rot in either direction. It caught a live error on its
  first run: this unit's own first transcription of the list had **four of nine entries wrong**, written
  from memory rather than re-derived — which is the failure mode prose had no way to report. Residual
  disclosed in the guard header: the validating/non-validating split is a `.parse(` literal match (N-14's
  class), so a hand-rolled validator surfaces as a **false exemption entry someone had to justify** rather
  than as a silent gap.

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
**[2026-09-14, decision 8]** Five of those dispositions changed and the line above is kept as written so
the change is visible: **FU-20** — U11 cut (2026-08-10), stays a register row · **FU-24** — U21 **cut**,
stays a register row, measured at 21 citations across 11 files · **FU-25** — split off from U22 and now a
**dated register row**, deferred to whichever phase adds a live E2E job (ruling 3 keeps that out of this
repository's CI) · **FU-26** — now U22's whole scope, **S** · **FU-28** — **CLOSED by U12** (`324ebda`,
2026-09-14).

**Remaining open, deliberately unscheduled:** FU-1, FU-4, FU-8, FU-9, FU-10, FU-11, FU-12, FU-14, FU-15,
FU-17, FU-18, FU-19, FU-21, FU-22. Each carries its own written reason in Phase 1 plan §12; none is a live
defect; none is dropped.

> **[2026-09-21] FU-33 — NEW, and it is the first row this register has gained since Phase 1.**
> **A `handleParams(params, schema, fn)` wrapper: the structural fix that would make U30's guard
> redundant by construction.** Raised by `ecc:architect` during U30 planning and **deferred to a later
> phase by owner ruling the same day**, with **U30's two-layer guard as the interim control**.
>
> **Why it is better than the guard it would replace:** U30 asserts that twelve handlers each remember
> to validate; a wrapper that receives `params` makes forgetting impossible — the difference between a
> rule that is checked and a rule that cannot be broken (§3 rule 5's ceiling). **Why it is not U30:**
> it is a twelve-site signature refactor, and `handle()` structurally cannot become it — `handle()`
> receives a thunk and never sees `params`, so this is a new sibling, not an extension.
> **The interim control is not a placeholder**: if the wrapper ever lands, U30's behavioural layer
> remains the thing that proves the wrapper is wired, so the guard outlives its own redundancy.

### 4.4 Found while orienting — not previously in any register

| # | Finding | Evidence | Disposition |
|---|---|---|---|
| **N-1** | **`/api/lab-import/extract` calls a paid API with no budget check and no rate limit.** §4 rule 9 requires both. | `pdf-adapter.ts:136` imports `@anthropic-ai/sdk`; the route has zero budget references | → **U5, U7**. **[2026-08-09 CLOSED]** Both halves, by two units and not one: U5 (`7d0913f`) added the rate limit; the budget half was still missing when **U7's `PAID_API_BUDGET` guard found it on the day the guard was written** — `src/app/api/lab-import/extract/route.ts — reaches a paid API with neither a budget reservation nor a maxDuration ceiling` — and U7 (`24d563f`) closed it with `export const maxDuration = 60`. There is no token ledger to reserve against for a single upload, so wall-clock **is** the budget control there; the guard accepts either, by design. Worth recording that the finding was written in the register on 2026-08-06 and was *still* half-open three units later: a register row is not a control, and the guard is |
| **N-2** | **The advisor budget has two races, not one**: between `getRemainingBudget` and `recordUsage`, *and inside* `recordUsage`, which is select-then-upsert (`repo.ts:191-207`) — so concurrent turns can **lose** usage | read | → **U4** |
| **N-3** | `mappers.ts` casts at **13** sites against plain `text`/`text[]` columns with no CHECK constraint, so *value* drift stays silent though U8 closed *shape* drift | `mappers.ts:56,67,69,73,75,100,138,139,154,155,167,168,172` — 15 casts total, of which only `:40` (`ratings jsonb`) and `:57` (`severity smallint` with a CHECK) are legitimately excluded | **Register as FU-29**; ~~candidate for U15's migration work~~. **[Corrected before approval]** first written as 6 sites; the claim→observed pass found 13. **[2026-08-12] RE-ROUTED OUT OF U15 BY OWNER RULING — it needs its own unit.** Closing it means a new migration adding CHECK constraints to a **deployed** database: an operational act requiring its own **OP row** and deployment-order decision, on top of **13 separate value-domain decisions** — one per cast site at `mappers.ts:56,67,69,73,75,100,138,139,154,155,167,168,172`, each of which must establish what the legal value set actually *is* before a constraint can encode it. **A schema change to a live database must not ride in a tooling unit**; U15 builds the apparatus that would *verify* such a migration (`npm run verify:migrations` applies the set to a real Postgres, so a constraint that fails on contact is caught before deploy), which makes the re-route cheaper to execute later, not more expensive. **Proposed owner: a dedicated unit, sequenced after U15** |
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
| **N-13** | U4 | **`recordUsage` survives for the seed path only, and can no longer work for anyone else.** 0008 removed the end user's INSERT/UPDATE/DELETE on `advisor_usage`, so its direct upsert is denied for any anon-key client. `npm run db:seed` runs under the service-role key, which bypasses RLS, so the function still works there and only there | `supabase/migrations/0008_usage_ledger_policy.sql` §1; `recordUsage` is now marked `@deprecated` for request-path use | ~~**Open — narrow and labelled, not removed.** Deleting it is a change to the seed path under a unit that did not own the seed path (§8.1).~~ **[2026-08-12] CLOSED BY U15 — AND THE PREMISE OF THIS ROW WAS FALSE, NOT MERELY STALE.** The row and `repo.ts` both said `recordUsage` *"survives for the seed path only"*. **`src/lib/db/seed.ts` has never referenced `advisor_usage`**, and at deletion the function had **zero callers anywhere in `src/` outside its own test file** — so it was never seed-path code, and §8.1's argument for leaving it alone never applied to it. Deleted, with the correction written into `repo.ts` at the site of the false claim rather than only here. **The transferable lesson, which is why this row keeps its space after closing: a `@deprecated` tag plus a plausible retention story reads exactly like a considered decision, and nothing in the toolchain checks whether the story is true.** Four units passed over it; it was one `grep` away |
| **N-14** | U6 | **A guard that matches literal text is one constant-refactor away from vacuity, and this was not a hypothetical.** U6 replaced three hand-authored `"… not configured"` literals with the shared constant `AI_SERVICE_NOT_CONFIGURED` (closing N-10). `NOT_CONFIGURED_TOTALITY` matched the *literal argument text* of a `new …Error(...)`, so `new NotConfiguredError(AI_SERVICE_NOT_CONFIGURED)` became **invisible to it** — the good refactor disarmed the guard watching that exact code. It did not fail silently only because the guard's own anti-vacuity inverse (the sanctioned-sites assertion) went red | U6 extended the guard with `readPhraseConstants`, so the phrase is now tracked through **names** as well as literals, plus 4 self-tests and a pin that `AI_SERVICE_NOT_CONFIGURED` is still resolved. 18 → 23 tests | **Instance closed by U6; the CLASS is open, and this row owns it.** Named task, **audit only, no guard edits**: enumerate every guard in `src/architecture/` by **matching strategy** — literal / identifier / structural — and state for each whether a constant-extraction, a rename, or a helper-extraction would defeat it, and what specifically would do so. Fixes land in each guard's owning unit, never here. **Delivered by U10 (2026-08-10) — the table is immediately below §4.5.** Sibling evidence that the class is real and not confined to `src/`: **GATE B1 clause (i)'s own check text** is a raw `grep` that this discharge found matching migration 0008's explanatory *comment* quoting the very policy it dropped — see the gate block |
| **N-15** | U6 | **`AdvisorPanel` does not handle the new `aborted` turn status.** U6 gave the agent loop a terminal `aborted` state so a client disconnect settles its reservation and stops the loop. Today that state is **server-side terminal** — the client that would see it is by definition the one that hung up, so nothing renders wrong and there is no live defect | `src/lib/advisor/agent.ts` returns `{ status: "aborted", … }`; `AdvisorPanel` switches on the other statuses only | **Open — not a defect today, and a trap tomorrow.** The moment any surface *retries* or *resumes* a turn, or the status is persisted and re-read, an unhandled case becomes a silent blank. Owner: **U19**, which already opens the advisor UI. Recorded because "unreachable today" and "safe" are different claims |
| **N-16** | Gate B1 discharge | **`RLS_COVERAGE` cannot see a counter table being *widened* by a later migration — only dropped, altered, or disabled.** Its `Weakening` union is exactly `"drop policy" \| "alter policy" \| "disable rls"`. A future `0010` adding `create policy "x" on public.advisor_usage for all using (user_id = auth.uid())` **alongside** the SELECT-only policy would reopen §2's hole, and the effective-policy model would record it as a policy merely *present* — no weakening event, no red | `rls-coverage.test.ts:100-105` (the union) and `:139` (`weakenings` is only pushed from the drop/alter/disable handlers); confirmed against the effective-state parse used to evaluate gate clause (i) | **Open.** The gate's clause (i) is a **one-time command evaluation at discharge**, not a standing assertion — nothing prevents regression after it. The durable form is a named `COUNTER_TABLES` set (`advisor_usage`, `api_rate_limits`) with a rule that no effective policy on them may be `for all`/`for delete`/`for insert`/`for update`. Owner: **U15** (migration tooling) or whichever unit next opens `rls-coverage.test.ts`, whichever is first. Not taken in U5–U7: none of them owned that guard, and §8.1 says name it rather than absorb it. **[2026-08-12] CLOSED BY U15 — but NOT where this row said to close it, and the deviation is the point.** This row prescribed the rule inside `rls-coverage.test.ts`; U15 put it in `npm run verify:migrations`, asserted against **`pg_policies.cmd`** on a database with the whole set applied, and left `rls-coverage.test.ts` untouched. **Why:** that guard's policy pattern captures a policy's *name and table and discards the command clause*, so the prescribed fix meant teaching a text parser to read `for all` — the literal-matching fragility **N-14**'s own audit warns about, and this row is listed in that audit. `pg_policies.cmd` is the command **Postgres computed**, immune to formatting, to policy DDL emitted from a `DO $$ … $$` block (which this row's neighbours note is invisible to text analysis), and to a later migration widening an earlier policy — which is this finding's exact subject. **The demonstration, not the argument, is what settles it:** mutation **M7** adds `create policy … for all` on `advisor_usage`; the catalog assertion goes **RED** and `rls-coverage.test.ts` stays **GREEN, 22/22**. A prescribed fix that would have passed its own defect is a weaker fix, and the row records that its own prescription was the weaker one |
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
| **N-28** ✅ **CLOSED 2026-08-12** — `docs/05-qa/2026-08-12-deployed-schema-record.md` Part 3. Re-run with **each read as its own statement**: before `0 \| 0` → `reserve(1000, 1000000)` granted `1000` → **separate-statement re-read showed `1000 \| 0`, so the write IS visible** → `settle(1000, 300, 50)` → read showed **`300 \| 50`**, matching the derivation from the function body exactly (`greatest(0, 0 + 1000 − 1000 + 300)`, `0 + 50`) → rollback → `0 \| 0`, nothing persisted. **The instrument was broken, not the ledger** — which is precisely what this row claimed, now confirmed rather than argued. **N-27 (i) closes with it:** `settle_advisor_tokens`, the half that can corrupt by *under*-charging, had never been executed against the deployed database and now has been. | **OP-6 / N-27 addendum record, 2026-08-10** | **A verification fixture cannot read its own writes inside one statement — so a correct effect and no effect return identical values.** The N-27 addendum put `settle_advisor_tokens(1000, 300, 50)` and two `(select input_tokens … )` "after" reads in the **same `select` target list**. Both `after` columns returned the **`before`** values — `input_after_expect_before_plus_300` = **4345** = `input_before`; `output_after_expect_before_plus_50` = **276** = `output_before`; predicted 4645 and 326. The sub-selects are evaluated against that statement's snapshot, which is the same snapshot the `before` columns read, so no write by a volatile function in the same target list can ever be visible to them | `docs/05-qa/2026-08-10-rate-limit-policy-verification.md` §3.2, §4 | **OPEN — and it carries N-27(i)'s residue: `settle_advisor_tokens`' effect on the ledger is still verified only as SQL text.** **The function is NOT implicated, and the same run contains the control that proves it:** OP-6 check 4 ran six `consume_rate_limit` calls in one statement and got **1,2,3,4,5,0**, so volatile calls **do** observe each other's writes (each statement inside a plpgsql body takes a fresh command snapshot) — writes were landing; only the plain sub-select was blind. **Fix is a shape, not apparatus:** read in a **separate statement inside the same transaction**, still before the `rollback`. Fold into OP-3's sitting. **The class is the lesson, and this is the third of a family:** N-26 was a fixture whose *output* could not discriminate two states, N-27 one whose *input* was over-strong so it passed without exercising the mechanism, N-28 one whose *reads* cannot see its own writes. All three were found by **running** the check, none by reading it — which is the argument against ever recording a predicted output as an observed one. This one was visible only because the `before` and `after` columns were printed adjacent in the same row |
| **N-29** | **U13, 2026-08-10** | **U13's E2E guard — the only thing in the repository that can see a security header actually arrive — does not run in CI.** `.github/workflows/ci.yml` excludes E2E with a written reason: *"17/23 specs are `E2E_LIVE`-gated and the suite races a single shared seeded user under `fullyParallel`"*. **Neither clause applies to this spec**: it is ungated, credential-free, read-only against the public static Library, and touches no shared account. So the exclusion is correct for the suite as a whole and, for this file, incidental. By §10.3 — *"guardrails that do not run in CI do not exist"* — the config half is enforced on every push and the response-bytes half is enforced only when someone runs it by hand | `.github/workflows/ci.yml` (the `NOT included` block); `tests/e2e/security-headers.spec.ts` is untagged and ungated by construction, which `LIVE_TAGGING` enforces both ways | **OPEN — deliberately NOT fixed in U13.** Wiring E2E into CI **adds a CI step**, which trips **GATE D1** and obliges the §5 declared-chain update in the same commit; it also needs a build-and-serve stage, which is a workflow change well outside a unit whose file list is one config and two tests. Absorbing it would have been the larger sin. **[2026-08-10] RULED BY THE OWNER: DEFERRED TO U14, and the deferral is BINDING rather than advisory.** U14 needs the same build-and-serve CI stage for its own Report-Only evidence — a CSP that reports nothing and a CSP that is absent are indistinguishable without reading response bytes — so **three things land together in U14 or not at all**: (1) the CI stage that builds and serves the app for E2E, (2) its **GATE D1** update to CLAUDE.md §5's declared chain, in the same commit, and (3) `tests/e2e/security-headers.spec.ts` included in what that stage runs. **U14 MAY NOT CLOSE while this row is open**: its closeout must either discharge N-29 or **re-defer it explicitly, in writing, with a named next owner**. Silence is not a disposition — a row that is neither closed nor re-deferred is an unmet obligation, and U14's report is the place it becomes visible. ~~**Until then, state the split honestly:** U13's config guard is CI-enforced; its delivery guard is developer-run.~~ **[2026-08-11] CLOSED BY U14.** All three landed in `61ad255`, and the stage went **green on run `31473581501`** (`a1a9fc0`): full non-live suite, **70 passed / 30 skipped**, 39 s. **The split is gone — both halves are now CI-enforced, and this is the first green execution of response-byte verification in the repository's history.** The mutation record in U13's entry was evidence the delivery guard **works**; run `31465731188` (red, on a real defect) and run `31473581501` (green) are jointly the evidence that it **runs** |
| **N-30** | **U13, 2026-08-10** | **Three security headers were considered and deliberately NOT shipped, each for a reason that makes it someone else's decision.** (a) **HSTS `preload`** — the max-age and `includeSubDomains` shipped; `preload` did not. Submission to the browser preload list is outward-facing and slow to reverse, which makes it an operator decision rather than something an agent edits into a config. (b) **`Cross-Origin-Opener-Policy`** — `same-origin` severs `window.opener`, which is how an OAuth popup returns its result. (c) **`Cross-Origin-Embedder-Policy`** — `require-corp` rejects any third-party subresource lacking CORP | `next.config.ts`'s header block enumerates all three with these reasons; `security-headers.test.ts` asserts each stays absent, so re-adding one is a red rather than a silent change | **OPEN as decisions, CLOSED as omissions — the distinction is the point.** U13's own rule is *a header that can break the shipped app is not this unit's*, which is the rule that put CSP in U14; (b) and (c) fail the same test and were held to it rather than waved through because they are fashionable. **This is registered rather than silently omitted because an unexplained absence is indistinguishable from an oversight** — the next reader adding "the standard set" would otherwise re-add all three and discover the breakage in production. (a) is an **owner condition** alongside OP-5; (b) and (c) need a real decision about whether OAuth popups and third-party subresources are in the product's future, which is a product question and not a headers question. **[2026-08-10] DISPOSITIONS ACCEPTED AS RECORDED, by owner ruling.** `preload` **stays an operator decision, beside OP-5** — both are pre-deployment acts the repository can describe but must not perform. COOP/COEP **stay refused and pinned**: the pins in `security-headers.test.ts` are the mechanism, so the refusal survives the next reader who reaches for the standard set. **No further action in Phase 2** unless a product decision moves (b) or (c) |
| **N-31** | **U24, 2026-08-10** | **Two clauses of the SAME unit's own spec contradict each other, and only one can be satisfied literally at a time.** U24's §5 entry says `CLAUDE.md` §1's divergence block is *"retired … per §7 — **struck with its rationale, not deleted**"*. U24's §7 exit criterion says the check is *"`grep -c 'FU-27' CLAUDE.md` = 0"*. Struck-through text still contains the string, so a literal strikethrough leaves the grep at 2 — measured, not predicted: that is exactly what the first implementation produced | The U24 entry in §5 Group D; the U24 exit criterion in §7; `grep -c 'FU-27' CLAUDE.md` = 2 against the strikethrough version | **CLOSED as an instance by relocation; the CLASS is registered.** Both clauses are satisfiable together if the rationale MOVES rather than staying or vanishing: the struck note and its full "why it existed / does the risk still need controlling" analysis went to `docs/archive/retired-nav-divergence-note.md` — the shape `CLAUDE.md` §0 already uses for `original-mvp-instructions.md` — and §1 keeps the rule plus a dated pointer that does not contain the string. Nothing was gamed and nothing was deleted. **Why it is registered rather than quietly reconciled:** an agent meeting two contradictory clauses can satisfy either one and write a truthful-sounding report, and the reader has no way to know a choice was made. **[2026-08-10] RATIFIED BY THE OWNER as resolved:** the archive-move is the correct reconciliation, matching the `original-mvp-instructions.md` precedent. **THE CLASS INSIGHT, recorded at the owner's instruction and stated as a rule for future specs: a spec that contains BOTH a file-level `grep` clause AND a knowledge-preservation clause MUST NAME WHERE THE KNOWLEDGE LIVES — or it forces a silent choice.** A `grep … = 0` clause is a claim about a FILE; "retire, don't delete" is a claim about KNOWLEDGE. They are jointly satisfiable only if the knowledge may live somewhere else, and if the spec does not say where, whoever executes it picks — then reports truthfully against whichever clause they picked, and the reader cannot tell a choice was made. **The naming is the fix, and it is cheap:** U24's spec would have cost one clause — *"…retired to `docs/archive/`"* — to remove the contradiction entirely. Any future exit criterion of the `grep … = 0` shape must name the destination |
| **N-32** | **U14 orientation, 2026-08-11** | **A stale dev server silently substitutes itself for the production build the E2E suite is supposed to judge.** `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so a `next dev` process left listening on `:3000` from an earlier session is reused and the config's own `npm run build && npm run start` never runs. Measured: the U14 baseline first reported **12 failed / 52 passed / 30 skipped**, which reads exactly like a code regression on `main`. Re-run against a real `next start` on a free port: **64 passed / 30 skipped**, green. The 12 failures were entirely an artifact of the substituted server | `playwright.config.ts`'s `reuseExistingServer` line, whose neighbouring comment argues at length that `next dev` "is not that app" and that a suite passing only against it "cannot support a claim about the shipped build" — the config states the principle and then reuses whatever is on the port | **OPEN. Proposed owner: whoever next touches `playwright.config.ts`; naturally U14, which is the unit whose entire evidence is response bytes.** NOT fixed in U27 — it shares no file with this unit and absorbing it would repeat the mistake U13 refused with N-29. **CI is immune**: `!process.env.CI` means CI always builds and serves. This is a *local measurement* hazard, and its cost is misdirected debugging plus, in the bad case, a green run that proves nothing. **Proposed fix shape, either is sufficient:** (a) have the reuse path verify the server is a production build before trusting it — a dev server is distinguishable by response (`Cache-Control: no-store` and `?v=` cache-busting on the layout stylesheet were both present in the measured case); or (b) move the suite to a dedicated guard port no dev server would occupy. **The residual after either fix is honesty about which app was measured, which is the actual requirement** |
| **N-33** | **U14 design, 2026-08-11 (ruled at approval)** | **The Report-Only CSP has no report sink.** There is no `report-uri`/`report-to` directive, so violations go to the browser console and nowhere else. A collector route would live under `src/app/api/**`, where **§2.3 rule 11** requires authentication and a 401 on failure — and a browser-generated CSP report carries no credentials. The route could only exist as a rank-1 exception | `src/lib/security/csp.ts`'s `CSP_DIRECTIVES` contains no reporting directive, and its header comment states the reason | **SHIPPED WITH U14 AS A PINNED REFUSAL, 2026-08-11** — `csp.test.ts` asserts the policy contains neither `report-uri` nor `report-to`, so the absence is a red rather than an omission. **CLOSED AS A DECISION, OPEN AS A CONDITION ON A FUTURE UNIT. [2026-08-11] RULED BY THE OWNER: no `/api/csp-report` route; the rank-1 exception was asked for and REFUSED.** Under Report-Only the E2E collector is the collector, which is sufficient because the policy blocks nothing and the only question is whether it *would*. **The condition: an eventual ENFORCING flip MUST re-raise this.** An enforced CSP with no sink is blind in production — it breaks things for real users and reports to nobody, which is strictly worse than the present position. Registered so the flip cannot happen without meeting it |
| **N-34** | **U14 orientation, 2026-08-11** | **`middleware.ts` sat at the repository root and was never compiled, so `updateSession` — the Supabase session refresh of Design §7 — never ran, from `910d773` (2026-06-12) until U27.** Next 15 resolves middleware at `src/middleware.ts` in a project with a `src/` directory. Measured by A/B in a clean clone: at the root the build emits `{"middleware": {}}` and no `ƒ Middleware` line; at `src/` it emits a registered matcher and `ƒ Middleware  87.4 kB`. Confirmed against untouched `main` @ `7cbc5f0`, so it predates U14 | `.next/server/middleware-manifest.json` after a build; `git log --follow` puts the file at the root since the first commit | **CLOSED BY U27, 2026-08-11** — the unit this finding created. Fixed by the move, guarded source-level by `MIDDLEWARE_SCOPE`, and checked for compilation by `npm run verify:middleware`. ~~**The liveness half is developer-run until U14's E2E stage lands**~~ — N-29's shape at a second site, stated in U27's entry rather than glossed. **[2026-08-11] CLOSED TOO: U14's stage is green on run `31473581501`, and its Report-Only assertion cannot pass unless the middleware executed, so liveness is CI-enforced.** **The class insight, which is the part worth keeping: a guard that names a path asserts nothing about the path the code is actually at.** `TREE_PARTITION`'s comment named `src/middleware.ts` and its exemption list was empty and green, *because the file was somewhere else*. Two more green things missed it: `next build` succeeds when middleware is absent (an absence is not an error), and the E2E's anonymous-redirect assertions are satisfied by page-level `requireUser()`, so they never depended on middleware at all |
| **N-35** | **U27, 2026-08-11** | **`src/lib/supabase/client.ts` — the browser Supabase client — is imported by no non-test module.** Found while establishing that `connect-src 'self'` is safe for U14's CSP: if nothing in the browser talks to Supabase directly, no external origin needs allowing. `grep` over `src/**` excluding tests returns no importer | `src/lib/supabase/client.ts`; authentication runs server-side through `src/lib/auth/actions.ts` (`"use server"`) and `src/app/auth/callback/route.ts` | **OPEN, CLASSIFIED, NOT ACTED ON. Classification per §8.5: `production-suitable` code that is currently `prototype-only` in status — it is correct, small, and unreferenced.** It is **not** obviously deletable: `createBrowserClient` is the documented other half of the `@supabase/ssr` pairing, and any future client-side realtime, storage upload, or optimistic auth UI would import exactly this file. **Deleting it and re-adding it later are both cheap; guessing wrong about which is not**, so this is registered rather than resolved. **It is load-bearing for one thing today — an argument.** U14's `connect-src 'self'` rests on the claim that the browser never calls Supabase directly, and this file is the thing that would falsify that claim the moment something imports it. **Whoever imports it must revisit U14's `connect-src`.** That coupling is the reason this row exists at all |
| **N-36** | **U27 smoke run 2, 2026-08-11** | **The middleware matcher is broad enough that non-application requests do Supabase work — and one of them consumed the very refreshes the first smoke was trying to observe.** The matcher excludes only `_next/static`, `_next/image`, `favicon.ico` and a list of image extensions, so **everything else** reaches `updateSession`, which constructs a Supabase client and calls `auth.getUser()`. Measured in the run-2 trace: `/.well-known/appspecific/com.chrome.devtools.json` — a background request DevTools itself issues — went through the middleware and logged `refreshOccurred:true`. **The act of observing consumed the thing being observed**, and the Network tab's Doc filter could not show it | The run-2 trace, recorded in `docs/05-qa/2026-08-11-middleware-activation-smoke.md` §3.2; the matcher in `src/middleware.ts` | **OPEN, NOT FIXED IN U27 — it is a scope question, not a defect in the move.** Two consequences, one measured and one reasoned, kept apart on purpose. **Measured:** a refresh spent on a `.well-known` probe is a refresh the next document load correctly does not perform, so any observer counting `Set-Cookie` on document responses will undercount — which is exactly how run 1 went wrong, and the reason a server-side trace was the only instrument that could settle it. **Reasoned, and therefore not asserted as a cost figure:** every matched non-asset request performs a `getUser()`, and `getUser()` is a network call to the Supabase auth endpoint. Whether that is material depends on real traffic mix, which nothing in this repository measures. **Proposed fix shape:** tighten the matcher to exclude `/.well-known/*` and any other non-application prefix, or invert it to an allow-list of app routes. **Proposed owner: whoever next edits the matcher**; a natural companion to U14, which touches `src/middleware.ts` and would otherwise inherit the same breadth for its CSP header — a Report-Only policy emitted on `.well-known` probes is noise for the same reason. **Deliberately not absorbed here:** narrowing the matcher changes which requests get a session refresh, which is a behaviour change of the same class U27 just spent an owner-run smoke verifying, and it would ride in on the back of that verification without being covered by it |
| **N-37** | **U14, 2026-08-11 — authored in corrected form by U28** | **`next build` reports `/library/[slug]` as `● SSG` with 15 prerendered paths while emitting ZERO HTML for it.** The build summary — the artifact every reader consults to learn how a page is served — describes something the build did not do. Two runtime observations contradict the label: the served page carries a **per-request nonce** matching that response's CSP header, which a build-time artifact cannot contain, and every response carries `Cache-Control: private, no-cache, no-store` | Credentialed build route table (`● /library/[slug]`, 15 paths) vs `find .next/server/app -name '*.html'` = **0**, and `curl -I` against a production `next start`. **PROVENANCE NOTE, because the first version of this row got it wrong:** it originally cited a three-build A/B across middleware states as proof the behaviour predates U27 and U14. That A/B was **credentialed throughout** — it varied the middleware and held the environment fixed, when the environment was the variable that mattered (**N-38**). The conclusion happens to survive, but it was not established by the evidence cited. The corrected evidence is the both-envs table in U28's entry | **OPEN, NARROWED BY U28.** **U28 answers half of it:** the reason no prerender is served is now known and deliberate — `getUser()` calls `cookies()` from the root layout, so every page is request-dependent, and after U28 that holds in **both** environments by construction rather than by accident. **What remains open is the label itself.** `generateStaticParams` still enumerates 15 slugs that are never prerendered, so the build spends time producing a plan it then discards, and the summary reports a mode the server does not use. **Why it is registered rather than chased:** it breaks nothing, and diagnosing it means understanding Next's static-optimisation bail-out reporting — work with no bearing on whether U14's policy is correct. **Why it must not vanish:** believing a page is static when it is dynamic wastes build time and states a false performance claim; believing it is dynamic when it is cached is a correctness risk for anything user-specific. **Do NOT "fix" it by deleting `generateStaticParams`** without first establishing whether the Library should be static — that would resolve a label mismatch by discarding a capability, which is not an answer. **Proposed owner: a future unit or standalone investigation** |
| **N-38** | **U14 CI failure, 2026-08-11** | **The app's rendering mode depended on whether Supabase env vars were present at BUILD time, so CI had been building a materially different app from production for as long as CI has existed.** `getUser()` returned `null` on `!isSupabaseConfigured()` **before** reaching `createClient()`, and `createClient()` was the only caller of `cookies()` — the API that opts a route out of static generation. `TopNav` calls `getUser()` from the root layout on every page. Measured on one commit, both ways: credentialed emits **0** prerendered page `.html`; clean-env emits **20** | CI run `31465731188` — U14's E2E reported **72 `script-src-elem` violations** and `no nonce in the rendered HTML`; reproduced locally in a clean clone (header nonce present, **0** nonces in the HTML), against **15** in the credentialed build of the same commit | **CLOSED BY U28, 2026-08-11** — the unit this finding created. Fixed by making the `cookies()` marker unconditional; guarded source-level by `RENDERING_DETERMINISM` and at build level by `npm run verify:rendering`, **which runs in CI — so the fix is verified in exactly the environment that exposed the defect.** **The class insight, and the reason this row outlives its fix: a green CI run is a claim about the app CI BUILT, and nothing was checking that this was the app production runs.** Every CI result before U28 carried that unstated caveat. It surfaced only because U14 shipped the first artifact — a per-request nonce — that a build-time prerender physically cannot contain; **a defect that needs an unrelated unit's accident to become visible is one the guards were never going to find.** **A second lesson, paid for twice:** U14's first measurement reported "zero violations" because it ran with `.env.local` present, which forced dynamic rendering and hid the defect; the clean-env simulation that would have caught it had been run against U27's code *before* CSP existed and was never re-run after. **Hence the both-envs discipline U28 institutes: any measurement whose result could depend on build-time configuration must be taken in BOTH environments, and the two must agree** |
| **N-39** | **U15 orientation, 2026-08-12** | **A reworded exit criterion named an instrument that does not exist.** Decision 5 replaced *"deployed schema matches migrations, verified in CI"* — unmeetable, it needed live credentials — with *"applying every file in `supabase/migrations/` in order to a **throwaway Postgres**"*. **The migration set cannot apply to a throwaway Postgres.** It depends on objects Supabase's GoTrue creates: **10** FKs to `auth.users`, **43** `auth.uid()` calls, **10** references to the `authenticated`/`anon` roles | Measured before U15 wrote any code: a stock `postgres:16` fails at `0001_init.sql` line 7. The four dependencies are enumerated in `supabase/ci/auth-prelude.sql`'s header | **CLOSED BY U15 the day it was raised** — the instrument was buildable, and building it (a labelled test double, ruled Option B) is most of that unit. **The row exists for the class, not the instance: decision 5 made the criterion measurable IN PRINCIPLE without checking that the thing it named could be obtained — which is the same defect decision 5 was written to fix, one level down.** Phase 1's criterion-1 defect, caught before the unit started, then recurring inside the fix for it. **The general form: rewording a criterion to be measurable is not finished until someone has taken the measurement once.** Cheap here — an afternoon and a `brew install`. It would not have been cheap discovered as a red CI stage, which is exactly where U14 found its equivalent |
| **N-40** | **U16, 2026-08-13** | **Nothing prevents an error message carrying health data into the logs.** `respond.ts`'s `internalError` records `err.message`, `err.stack` and `err.cause` verbatim to `console.error`. Every route funnels failures through it, including `/api/account/export`, whose payload is the user's complete health record — medications, conditions, lab values, advisor transcripts. If any error raised on that path embeds row data in its message, §2.3 rule 15 is breached by the error contract rather than by the route | `src/lib/api/respond.ts` — the `detail` object built from `err.name/message/stack/cause`, then logged. U16's route test asserts the error path leaks nothing **for an error it throws itself**, which is not the same claim | **OPEN. Stated as STRUCTURAL, not as an observed leak** — no failure carrying row data has been seen, and asserting one would be fabricating an observation. What is established is that **nothing stands between such an error and the log**. **NOT fixed in U16, deliberately (§8.1):** `respond.ts` is a shared trust boundary on all **24** routes, changing what it records is §9.4 caller-enumeration work, and U1/U2 own that contract. **Proposed owner: the unit that next touches the error contract.** The question it must answer is not "does this leak today" but "what would make it impossible" — a redaction pass, a typed safe-detail contract, or a rule that health-bearing paths throw only errors they constructed |
| **N-41** | **U16, 2026-08-13** | **The data export is unbounded in size.** `GET /api/account/export` assembles every row of twelve tables into one JSON response, with no pagination, streaming, or limit. A user with a long advisor history — `advisor_messages` is the realistic one — receives it all in a single buffered body | `src/lib/db/export-repo.ts`; the route returns `ok(data)` with no chunking. `checkins` and `side_effect_reports` are now read UNWINDOWED by design (a windowed export is silently incomplete — see U16's entry), which removes the only accidental bound that existed | **OPEN, REGISTERED NOT BUILT, by owner ruling at plan approval.** At seed scale this is a non-issue, and inventing a limit nobody asked for would trade a theoretical memory problem for a **certain correctness problem**: any cap makes the export quietly partial, which is the exact failure the unwindowed readers were added to prevent. **Whoever bounds this must keep the export total** — streaming (NDJSON, or a per-table chunked download) rather than truncation, and the `notIncluded[]` field is where any residual omission must be declared. **Proposed owner: a future unit, triggered by a measured payload, not by unease** |
| **N-42** | **U17 CI first run, 2026-08-15** | **A check's success message inherited its claims from an earlier version of the check, and went green describing work it no longer fully described.** `verify:migrations`' summary was written for U15 and named U15's proofs. U17 added an entire section — deletion completeness, two cascades, `SET NULL`, cross-user isolation — and the summary did not change. **Every word of it stayed true.** It was wrong by OMISSION, which is strictly harder to catch than a false statement, because nothing about it looks wrong. On the deletion probe's FIRST CI execution the step went green in 2s and its output gave no sign the probe had run at all — that it *had* could only be established by reading the script's control flow, which is not what CI output is for | `scripts/verify-migrations.mjs`, the closing `console.log` | **CLOSED IN U17's commit 2 by owner ruling.** The summary is now DERIVED: each section appends its own claim via `proved()` at the point its assertions passed, so a section that does not execute cannot be claimed. **M13 executed both halves** — skipping section 4 drops all four deletion claims; the same skip under a *hand-maintained* widened string still printed *"empties all 12 user-owned tables, cascades hold, and cross-user isolation is enforced"* at exit 0, which is the defect re-hidden. **Stated asymmetry:** a section that runs but forgets `proved()` makes the summary UNDER-claim — the safe direction, and why the calls sit beside the assertions they describe. Generalises past this file: **a check's self-description is the part of it that nothing executes** |
| **N-43** | **U17 commit preparation, 2026-08-15** | **The pre-commit gate ran against the WORKING TREE while the commit carried a subset of it.** `scripts/verify-migrations.mjs` (+221 lines — the whole deletion probe) was written, executed, and mutation-tested, then never `git add`ed. The full gate passed, the mutation table was real, and the commit request stated a 10-file / +915 diff that was in fact 11 files / +1159. **Green would have looked IDENTICAL with the probes absent from the commit** — CI would have applied ten migrations and asserted nothing about deletion, exiting 0 with a summary that (then) never mentioned deletion anyway. Caught only by re-reading `git status` before committing; nothing in the gate could have caught it, because the gate was measuring a tree the commit did not contain | The §5 gate as described in this plan and in `CLAUDE.md` §5.10 — *"before declaring work done: `tsc`, `vitest run`, `next build`"* — says nothing about WHICH tree those run against | **OPEN as a PROCEDURE CHANGE, not a code defect.** The gate that precedes a commit request must run against the **STAGED** tree, not the working tree: `git stash -u --keep-index` before the gate and restore after, or gate a clean checkout of the index. Anything else measures an artifact that is not the one being proposed. **Related to but distinct from N-42:** N-42 is a check describing itself wrongly, this is a check being pointed at the wrong subject entirely. **Proposed owner: the plan's §5 gate description**, which is where the instruction that produced this actually lives |
| **N-44** | **U17 commit 3, found at U18 orientation 2026-08-18** | **The two exit-criteria lists tick independently, and nothing binds them.** U17's closeout ticked `docs/roadmap.md`'s copy of the export/delete criterion and left this plan's copy at `[ ]`, with the same evidence available for both. **U18 then found the divergence runs the OTHER way too:** this plan ticks *"Security headers present in the config and in a real response"* ✅ **MET 2026-08-10 by U13**, while `docs/roadmap.md:391` still reads `- [ ] Security headers present, verified by a response-header test.` — and U14 has since landed the CI stage that discharged that criterion's stated non-coverage. So the divergence is **not** a slip in one commit; it is the absence of any binding at all, in both directions, on both criteria anyone has recently closed | `doc-truth.test.ts` binds `CLAUDE.md` §4's rule table and §5's CI chain to reality. It binds **nothing** between `docs/roadmap.md`'s criteria list and this plan's — not the text, not the tick state. Decision 5's own ruling anticipated exactly this when it reworded criteria in one file | **HALF CLOSED IN U18 COMMIT 1, half deferred with its shape written down.** The instance is fixed: this plan's export/delete criterion is now ticked with U17's evidence, in U18's commit, per the standing disposition. **The guard is DEFERRED to Phase 2 closeout**, shape recorded now so deferral is not forgetting: give each criterion a **stable id** present in both files, assert **tick-state parity** across the two lists, and assert **never the text** — the wordings differ *by design* (`roadmap.md` states the user-facing claim, the plan states the mechanical check beside it), so a text binding would force one of them to stop doing its job. **The security-headers instance is deliberately NOT fixed here.** Ticking `roadmap.md`'s copy means re-deriving U13's and U14's evidence, which is not U18's to certify — naming it is §8.1, absorbing it would be the failure §8.1 describes. **THE SECOND INSTANCE IS THE ARGUMENT FOR THE GUARD, NOT A FOOTNOTE TO IT.** The two instances run in
OPPOSITE directions — one criterion ticked only in `roadmap.md`, one ticked only in the plan — so no
one-way discipline ("remember to update the plan too") would have caught both. Tick-state **parity** over
stable ids catches both by construction, which is why the deferred guard is specified that way rather than
as a reminder. **Proposed owner: Phase 2 closeout, with the parity guard** |
| **N-45** | **U18 first lint run, 2026-08-18** | **`parseNumber` exists twice, byte-identical, on the two halves of the lab-import path.** `src/lib/lab-import/csv.ts:74-80` and `src/lib/lab-import/paste.ts:16-22` are the same seven lines including the same `no-useless-escape` defect, which is how the duplication surfaced: **one lint finding arrived twice**, from two files, in the same run. The finding is the **divergence hazard**, not the lint line — a future fix to numeric parsing (a thousands separator, a unicode minus, a `<` prefix on a below-detection-limit result) applied to one copy silently gives CSV upload and pasted text two different readings of the same lab value | Both files, and U18's lint output listing `csv.ts:76` and `paste.ts:18` with identical text. §2.2 rule 7 territory: the two paths would compute different numbers from the same source document, and both would render as though computed | **OPEN, OUT OF U18 SCOPE.** U18 fixed the escape at both sites and deliberately did **not** deduplicate: extracting a shared parser is a change to lab-import behaviour on both paths at once, which needs its own red evidence against real fixtures rather than riding in a lint unit. **The lint fix does not reduce the hazard** — it made both copies identical again, which is the state that hides it. **Proposed owner: a lab-import unit, not a cleanup pass** |
| **N-46** | **U18 first lint run, 2026-08-18** | **A test helper's parameter configures nothing — "a lie shaped like a parameter", at a second site.** `src/lib/advisor/repo.test.ts`'s `statefulLedger(dailyBudget)` ignored its argument entirely and read `args.p_daily_budget` off the RPC call instead. **Five call sites passed a budget** — three `100_000`, two `1000` — and every one of them configured nothing. Any reader would take the two `1000` sites as exercising a tight budget; they were not. This is U16's finding recurring in a different subsystem, and the shape is the danger: an ignored parameter reads as a deliberate test condition, so the test appears to cover a case it never sets up | `repo.test.ts:110` before the fix, and the five call sites at `:159`, `:172`, `:211`, `:231`, `:241` | **CLOSED IN U18 by fix 11** — the parameter is removed and the five call sites now read `statefulLedger()`, which states the truth: the budget comes from the caller of `rpc`, not from the helper. **Registered for the pattern, not the instance.** ESLint found it in seconds; it had been invisible to `tsc`, to 1245 passing tests, and to review, because an unused parameter is well-typed, tested, and reviewable. **That is the argument for this whole unit in one line.** No guard proposed: `@typescript-eslint/no-unused-vars` IS the guard, and it now runs in CI |
| **N-47** | **U20 orientation, 2026-08-21** | **Two `id-manifest.json` fields are declared, populated with varying values, and asserted by nothing.** `Namespace.dereferenced: boolean` is in the interface and carries real per-namespace values (4 of 9 are `false`, each for a different documented reason) — and `git grep dereferenced -- src/data/id-stability.test.ts` returns **exactly one hit, the declaration**. `manifest.version` is the same: read by no assertion, so U20's own 1 → 2 bump could have been omitted with nothing noticing. This is `CLAUDE.md` §8.3's silent placeholder **in data form** — a field a reader reasonably takes for a governed fact, which is governed by nothing. Worse than an unused variable, because the manifest's entire value is that it is trusted | `grep -c dereferenced src/data/id-stability.test.ts` → **1**; `grep -c 'manifest.version'` → **0** | **OPEN. NOT absorbed into U20** — U20 is a schema change under a recorded ruling, and quietly adding assertions for two unrelated fields is the scope creep §8.1 forbids in the opposite direction. **Owner PROPOSED, not assigned:** whichever unit next opens `id-stability.test.ts`. The fix is not obviously "assert them" — `dereferenced` may be documentation rather than a contract, in which case the honest fix is to say so in the manifest's `purpose`, or delete the field per §8.4 (prefer deleting a field over guarding it) |
| **N-48** | **U26 plan, 2026-09-11** (found by the unit's caller enumeration; confirmed independently by ecc:architect) | **`POST /api/advisor` performs NO ownership check on `body.conversationId` before the paid model call — and three standing documents said it did.** The `UNSCOPED_FUNCTIONS` reason for `appendMessages`, GATE C1's discharge block, and the comment in `advisor/repo.test.ts` all cite "the route checks ownership first via `conversationBelongsToUser`". Its **only** caller is `GET /api/advisor/conversations/:id`. In POST the id flows into `getMessages` (RLS returns an empty history for a foreign id), **the paid model call runs**, and only then does the write fail — under RLS before U26, under the repo's owner clause after it — inside the committed stream, as a generic `error` event with a correlation id. **The cost dimension is what makes this a finding and not a nit: a foreign `conversationId` spends a paid model call before the ownership failure surfaces.** That is paid-API control — §4 rule 9's spirit — not only error hygiene. Nothing unauthorised is read or written (§2.3 rule 13 preserved; the empty history is RLS working), so this is not a live data defect | `grep -rn conversationBelongsToUser src/app` → one call site, `conversations/[id]/route.ts:41`; `src/app/api/advisor/route.ts:59-60,105` passes `body.conversationId` unchecked | **OPEN → owned by U29** (appended to Group D by owner ruling 2026-09-11). **Not absorbed into U26**: a pre-spend 404 is a declared behaviour change, and U26's named scope is the four repo functions. U26 corrected the three false statements in the same commit that made the repo clause true. **Depends on U12**, so the 404 inherits the unified message rather than authoring a third string |
| **N-49** | **ecc:security-reviewer during U26 review, 2026-09-11** | **`confirmAndApply` writes a caller-supplied `conversation_id` into the caller's own `advisor_actions` row without checking the conversation is theirs.** `POST /api/advisor/actions` passes `body.conversationId` through `src/services/advisor-actions.ts` into `recordBatch`'s `NewAction.conversationId`; `conversationBelongsToUser` exists and is never called on this path. The row's **owner** is bound (`user_id` is the authenticated caller — U9's payload pin), so no cross-tenant read or mutation follows: no reader dereferences `advisor_actions.conversation_id` to expose another table. It is an **unvalidated foreign-key reference on write** — the caller can point their own audit row at any existing conversation, including someone else's — i.e. a data-integrity gap, not an ownership bypass. Registered so U26's "every function binds the owner" is not misread as covering it: the function binds the *owner*, not the *reference* | `src/app/api/advisor/actions/route.ts:39` → `services/advisor-actions.ts:39` → `advisor-action-repo.ts::recordBatch`; `grep -rn conversationBelongsToUser src/services` → 0 | **OPEN → owned by U29** (owner ruling 2026-09-11, at commit 1 of U26). **Not absorbed into U26** — a service-layer validation is outside the four repo functions. U29 now owns the conversation-ownership predicate at **both** sites: the `POST /api/advisor` pre-spend check (N-48) and `confirmAndApply`'s `conversation_id` reference (this row). **Sizing rule, by the same ruling:** if U29 exceeds S when it is planned, it splits into U29/U30 rather than growing. Cost of leaving it: an audit row that claims a conversation it never belonged to |
| **N-50** | **U12 planning, 2026-09-11** (raised by the first draft of U12's plan block; ruled out of U12 by the owner the same day) | **Should every API 404 carry one uniform `error.message`?** Today `notFound(what)` renders `<What> not found.` at fourteen route sites and `services/advisor-actions.ts` hand-writes three more (one ownership, two echoing a caller-supplied supplement id). The first U12 draft proposed one constant everywhere, on a rule-13 reading. **The owner's ruling:** rule 13 governs *internal* error text, not resource names; a single-resource route has no oracle because foreign and nonexistent ids already answer identically; flattening fourteen sites is a product-wide UX regression bought for no security property. U12 was re-scoped to the per-route defect class (`NOT_FOUND_UNIFORMITY`). What remains is a **product** question — is a resource-named 404 the product's voice, or should the API speak one 404? — plus one sub-case the scan deliberately does not decide: `POST /api/advisor/actions` receives three distinct 404 literals from its service (`Stack not found.` and two `Supplement "<id>" not found.`), and whether that is a per-route oracle or an input-validation echo of public reference data (ecc:architect's part-2 reasoning) is part of this question | fourteen `notFound(` sites in `src/app/api/**/route.ts`; `services/advisor-actions.ts:74,82,89` | **OPEN — owner UNASSIGNED.** A product decision (`CLAUDE.md` §6 rank 4 territory), not a Phase 2 unit; recorded so the option-B draft is not re-proposed from scratch by the next reader. Not a defect: no path in it discloses another user's data |
| **N-51** | **ecc:security-reviewer during U12 review, 2026-09-11** | **A malformed `id` path segment answers 500, not 404 — a syntax oracle, not an ownership one.** `stacks/[id]/items/[itemId]/route.ts` passes `id` unvalidated into `getStack`'s `.eq("id", id)` against a `uuid` column; a non-UUID fails at PostgREST, `getStack` throws, and `handle()` answers the generic 500 with a correlation id. `itemId` has no equivalent gap (compared in JS via `Array.prototype.some`, never cast). A caller can therefore tell "malformed id" (500) from "well-formed and not mine / nonexistent" (404) — which does **not** reopen FU-28's three-way distinguishability, because reaching the item branch already requires an owned, well-formed stack id. It is a 500 logged with a correlation id for what is really a 400, on every route that takes a UUID path param without a schema | `route.ts:61-64,77-80`; `src/lib/validation/schemas.ts` has no path-param schema; `stack-repo.ts:26-33` | **TAKEN AS `U30`** — decision 8(d), 2026-09-14. *(This row read "OPEN — for the Group E / closeout ruling" between U12's closeout and that ruling; noted because a finding that got a decision point and then a unit on the same day is the register working rather than accumulating.)* Not absorbed into U12 (it is a validation shape across many routes, not a 404-message concern). Likely shape: a shared `uuidParam` Zod schema applied by `handle()` or at each route, answering `validationError` (400). Counting the routes that take a UUID path param is the first step of whichever unit takes it. **The ruling this needs is take-or-defer**, not who: it is cheap and mechanical if taken with Group E, and a Phase 3 inheritance if not — what it must not do is stay a row with neither an owner nor a date at which someone decided |
| **N-52** | **ecc:code-reviewer during U22 review, 2026-09-15** | **`README.md:26` states per-spec test counts that are stale by 11 and 1.** It says `boundaries.test.ts` (**36** tests) and `error-disclosure.test.ts` (**30**); measured 2026-09-15 they are **47** and **31**. The same line's "**seven** executable architecture specs" is dated by U22 to **21**, but the two per-file counts beside it were not, because U22's scope was the "seven" claim and the new row — correcting figures the unit did not touch would be the absorption §8.1 forbids. This is the counts-written-once class (FU-32) at its fifth site, and the first one in a file a **reader outside the project** sees first | `grep -c 'it(' src/architecture/boundaries.test.ts` → 47 vs README's 36; `error-disclosure.test.ts` → 31 vs 30 | **OPEN — owner UNASSIGNED.** Cheap, and the honest fix is probably not "update the numbers": a per-file test count in prose rots by construction, so either drop the counts and keep the file names, or bind them mechanically the way `doc-truth.test.ts` binds §4's table. **Deciding which is the work** |
| **N-53** | **U31, 2026-09-18** · *source: `u31-openai-first-party.plan.md` §7, promoted 2026-09-18 by ruling* | Both probe scripts hardcoded `"cc/claude-haiku-4-5-20251001"` as a model fallback — an Omniroute-namespaced Claude id, invisible to `NO_PINNED_MODEL_ID` because that guard scans `src/` and probes live in `scripts/` | *The source table has three columns and carries no separate evidence cell; finding and disposition below are verbatim from it, and the evidence is whatever each names inline.* | **The instance is FIXED** — defaults deleted, unset exits 1. **The class is OPEN and now OWNED: §8 C6**, a closeout decision point. `scripts/` is unguarded territory: `NO_PINNED_MODEL_ID`, `SOLE_PAID_CLIENT` and `verify-lint.mjs` all scan `src/`, and `scripts/probes/*` authenticate paid calls. The ruling due at closeout is *extend the scan, or accept the class with a written reason* — **not** silence |
| **N-54** | **U31, 2026-09-18** · *source: `u31-openai-first-party.plan.md` §7, promoted 2026-09-18 by ruling* | The `ClaudeAdapter` port name is now **two providers stale** | *The source table has three columns and carries no separate evidence cell; finding and disposition below are verbatim from it, and the evidence is whatever each names inline.* | ~~OPEN, unassigned.~~ **OPEN and OWNED: §8 C7**, a closeout decision point. Renaming opens `agent.ts` and `src/types/advisor.ts` for zero behavioural gain, which is the argument for *accepting* it — but acceptance is a ruling with a recorded reason, not a default reached by nobody deciding. A port named for a provider the repository has not called since U25 is a §8.2 naming-debt finding, not a fact of life |
| **N-55** | **U31, 2026-09-18** · *source: `u31-openai-first-party.plan.md` §7, promoted 2026-09-18 by ruling* | §5 of the Phase 2 plan omitted **U30** from its sequence line entirely | *The source table has three columns and carries no separate evidence cell; finding and disposition below are verbatim from it, and the evidence is whatever each names inline.* | **FIXED in passing** — `U29 → U30 → U31`, per U30's own "Scheduled after U29" |
| **N-56** | **U31 session, 2026-09-18** (registered there; ruled by the owner the same day) | **bkit's PDCA state and this project's record of a unit had no stated relationship, so two sessions could disagree about whether a unit is closed.** After both units had landed on `main`, `u12-one-404-message` still read `report` and `u22-fresh-clone-e2e` still read `plan`. The instruction that surfaced it — advance the tracker *in the same commit as the next docs change* — **cannot be satisfied at all**: the state file is gitignored, so no commit can carry it, and the coupling that would have made the change reviewable does not exist | `.bkit/state/pdca-status.json` vs each unit's DONE block in this plan; `git check-ignore -v .bkit/state/pdca-status.json` → `.gitignore:68`; `git ls-files .bkit` → empty, so **nothing** under `.bkit` is tracked | **CLOSED BY OWNER RULING, 2026-09-18 — once for all units.** (a) The state file is **local and gitignored, so it is not the record**; the record is the subordinate artifact under `docs/01-plan/features/`, which is tracked and which CLAUDE.md §9 already names. (b) The state file is advanced by **whichever session closes the unit, as the last step of that closeout** — not by a later session tidying up, which is how the two units drifted. (c) The advance becomes a **standing line in the closeout STAMP ROW**: `bkit: <feature> → completed`. Being in the STAMP ROW is what makes a machine-local edit auditable from a tracked file, which is the nearest available substitute for the commit coupling that (a) rules out. (d) **CLAUDE.md §9's retired note is NOT reinstated.** The condition that note states is *registered*, and both units were registered and driven through the cycle; a terminal phase left unadvanced is a stale field, not the half-use the note forbade. **Applied the same day**, both to `completed` in `u26-bind-owner`'s shape — u12 (matchRate 100, carried) and u22 (**matchRate left `null`**: it was never computed, and writing 100 would be asserting a measurement nobody ran, §5.1). Neither edit appears in `git status`, by design |
| **N-57** | **U31, 2026-09-18** · *source: `u31-openai-first-party.plan.md` §7, promoted 2026-09-18 by ruling* | **`.env.local` goes stale after a worktree split**, and an append onto a file with no trailing newline silently glues the new setting into the previous value, where `parseEnvFile` absorbs it. N-52's failure mode from the opposite side | *The source table has three columns and carries no separate evidence cell; finding and disposition below are verbatim from it, and the evidence is whatever each names inline.* | **ACCEPTED by the owner 2026-09-18 → §8 C9.** Full detail in the probe record |
| **N-58** | **U31, 2026-09-18** · *source: `u31-openai-first-party.plan.md` §7, promoted 2026-09-18 by ruling* | **Both probe scripts sent legacy `max_tokens`** in hand-rolled bodies — the field U31's own M2 replaced with `max_completion_tokens`. `openai-advisor-probe.ts` step 1 and `openai-labimport-probe.ts` option (a) both 400. **The probes no longer mirrored production on the one field this unit changed** | *The source table has three columns and carries no separate evidence cell; finding and disposition below are verbatim from it, and the evidence is whatever each names inline.* | **FIXED 2026-09-18, by owner ruling.** Neither probe hand-rolls a body now: the advisor's step 1 calls `buildCompletionBody`, and lab-import's option (a) composes `pdfContentParts` + `buildTranscriptionRequest` + `buildCompletionBody`, all **imported** from the modules under test. Option (b)'s second leg was repaired too — unreachable while `/v1/ocr` 404s, but the identical defect one function down. Two pure cores were **extracted and exported** from `pdf-adapter.ts`; nothing was copied |
| **N-59** | **U31, 2026-09-18** · *source: `u31-openai-first-party.plan.md` §7, promoted 2026-09-18 by ruling* | **The lab-import probe printed a verdict it had not earned** — `REJECTED — option (a) does not work for this model`, from a request carrying two candidate causes of failure. **N-26 recurring**: the 2026-08-10 record withdrew its own §2/§3 for the same reason. Decision 7B relies on this script's output shape | *The source table has three columns and carries no separate evidence cell; finding and disposition below are verbatim from it, and the evidence is whatever each names inline.* | **FIXED 2026-09-18.** The line now reads `NOT ACCEPTED — HTTP <status>. Status recorded; no verdict inferred (N-59)`. With N-58 fixed the request finally isolates the variable, so a 400 *can* now be attributed — but the script still declines to name a cause it cannot see, because the response body is deliberately not printed |
| **N-60** | **U31, 2026-09-18** · *source: `u31-openai-first-party.plan.md` §7, promoted 2026-09-18 by ruling* | The configured model id `gpt-5.6-luna` was the same literal **M5** used as its mutation string, which made M5's red weaker evidence than an obviously-synthetic id would | *The source table has three columns and carries no separate evidence cell; finding and disposition below are verbatim from it, and the evidence is whatever each names inline.* | **FIXED 2026-09-18** — now `"gpt-mutation-does-not-exist-9f3a"`, re-run red. **The owner's proposed literal was corrected first**: `"mutation-does-not-exist-9f3a"` carries none of the guard's family tokens and would have made M5 pass vacuously. See §4 |
| **N-61** | **U31, 2026-09-18** · *source: `u31-openai-first-party.plan.md` §7, promoted 2026-09-18 by ruling* | *(candidate remedy now at §8 C10)* **The lab-import probe verifies shape, never content** — `reportTranscript` prints candidate and recognised-marker counts and never a transcribed value, so a schema-valid hallucination and a correct transcription are indistinguishable in its output. N-59's class one level deeper: N-59 was an unearned verdict, N-61 is an unmeasured dimension | *The source table has three columns and carries no separate evidence cell; finding and disposition below are verbatim from it, and the evidence is whatever each names inline.* | **OPEN, unassigned.** Not fixed here: printing values means printing health-shaped content even when synthetic, which needs a rule-15 judgement rather than a patch. Registered so "verified against a PDF" does not travel further than "verified schema-valid against a PDF" |
| **N-62** | **U31, 2026-09-18** · *source: `u31-openai-first-party.plan.md` §7, promoted 2026-09-18 by ruling* | *(was N-52 until 2026-09-18 — see the numbering note under this table)* `load-env.ts` filtered on prefix `OMNIROUTE_`; after the env rename the probes would load nothing from `.env.local` and report "not configured" with the operator's file present | *The source table has three columns and carries no separate evidence cell; finding and disposition below are verbatim from it, and the evidence is whatever each names inline.* | **FIXED in this unit** — prefix is `OPENAI_` |
| **N-63** | **`ecc:security-reviewer` on the U31 diff, 2026-09-18** | **`OPENAI_BASE_URL` is documented as first-party and never validated as first-party.** Both readers (`model-adapter.ts`, `pdf-adapter.ts`) apply a **truthiness check only**; `completionsUrl` concatenates without a `new URL()` parse, an https-only assertion or a host allowlist. `.env.example:26` documents the escape hatch in as many words. Anyone who can set the deployment's environment can silently redirect medications, conditions, lab values and whole lab-report PDFs to an arbitrary host, carrying `OPENAI_API_KEY` in the `Authorization` header. `SOLE_PAID_CLIENT` does not cover this **and says so itself** — it proves the code funnels through one module, not what host that module dials | `model-adapter.ts:365-368`, `pdf-adapter.ts:244-249`, `client.ts:179-181`; `.env.example:26`; `boundaries.test.ts:1160-1164` (the guard's own stated limit) | **TAKEN AS `U32`** — owner ruling 2026-09-18, sequenced after U31 and **before U29**. **Not absorbed into U31:** a provider rename must not quietly acquire a deployment control (§8.1). **This is OP-5's code-level half**, and OP-5 stays OPEN until it lands *and* the owner's account facts are recorded |
| **N-64** | **U31 closeout, 2026-09-18** | **`.gitignore:27`'s `.env*.local` does not match a `.env*.local*` backup.** `.env.local.bak-u31probe` — created while repairing N-57 — was untracked, unignored, and offered by `git status` for staging, holding a live API key and the Supabase service-role key. It was noticed and deleted by hand. **The near-miss is the finding:** §2.3 rule 14 was preserved by attention, not by a pattern | `git check-ignore -v .env.local.bak-u31probe` → no match | **FOLDED INTO `U32`** — one line. Registered separately because the *class* is "credential files whose names are one suffix away from the ignore pattern", which one line narrows but does not close |
| **N-65** | **U31 closeout sweep, 2026-09-18** | **The probe record template outlived the thing it templates, and the renamed probes still hand it to the operator.** `docs/05-qa/omniroute-probe-record.template.md` is titled *"OP-4 — Omniroute live probe record"*, instructs a copy to `omniroute-probe-<date>.md`, and states it "is the only thing that may close decision 7B" — a decision ruled 2026-08-10 and re-established against a different provider on 2026-09-18. **Three live pointers in U31's own renamed probes still name it.** Neither record written on 2026-09-18 used it | `scripts/probes/openai-advisor-probe.ts:31,263`; `openai-labimport-probe.ts:277`; the template's own header | **FOLDED INTO `U32`** — owner ruling 2026-09-18, **declared there as a widening with its reasons**, not absorbed silently: U32 already opens `scripts/`, the template is the instrument's own documentation, and this is **N-58's class** (the probes drifting from what they measure) one level out. This is U31's residue — U31 renamed the probes and not their target. **The class is "counts-written-once, one level up": not a number that rotted but a template that did**, still being handed forward by the files that should have retired it |
| **N-66** | **`ecc:architect` during U32 planning, 2026-09-18** (the one question the unit put to it: client module or env reader) | **`SOLE_PAID_CLIENT`'s reader ratchet pins readers of `OPENAI_API_KEY` and nothing else, so a new module that reads `OPENAI_BASE_URL` and dials it without the validator is green.** The key half of the paid boundary is ratcheted; the address half is not, and U32's control lives on the address | `boundaries.test.ts:1194` pins the key readers as an equality; no assertion anywhere names a base-URL reader. Measured readers today: `model-adapter.ts:365`, `pdf-adapter.ts:244`, `route.ts:74` | **FOLDED INTO U32 by owner ruling 2026-09-18, declared as a widening.** The ruling's reason: it is what stops U32's *"the validator is called from exactly two sites"* clause from being a count written once (FU-32's class). An anti-vacuity assertion proves the validator is called somewhere; only a pinned reader list proves nothing reads the variable *instead*. **M7** is its red proof |
| **N-67** | **U32 implementation, 2026-09-18 — raised by this unit's own test, which is the uncomfortable part** | **`vi.stubEnv` leaks across tests in `src/app/api/advisor/route.test.ts`, and a test that sets an escape-hatch flag therefore disables that control for every test AFTER it.** Nothing in the file or in `vitest.config.ts` unstubs. U32's new *"proceeds when the override is set"* test stubbed `OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL=1`, and the happy-path test 200 lines later — which configures the non-first-party `https://gateway.invalid` — **passed with a 200 while the brand-new host pin was switched off**. A green suite over a disabled control, introduced by the commit that added the control | Observed: run at 19:58:38 on 2026-09-18, `route.test.ts` **23 passed** with `FAKE_BASE_URL = "https://gateway.invalid"` and the pre-flight live — arithmetic that only works if the override leaked. Confirmed by `git show HEAD:src/app/api/advisor/route.test.ts | grep -c unstub` → **0**, and `grep -c unstub vitest.config.ts` → **0** | **INSTANCE FIXED HERE** — `vi.unstubAllEnvs()` added to `beforeEach`, and `FAKE_BASE_URL` changed to the first-party host so the happy path exercises a permitted address rather than a tolerated one. **THE CLASS IS OPEN, unassigned**: `grep -rl "vi.stubEnv" --include=*.test.ts src/` returns **three** files — this one plus `src/lib/advisor/model-adapter.test.ts` and `src/lib/lab-import/lab-import.test.ts` — and nothing in the project asserts that a stub is ever undone. The mechanical fix is `unstubEnvs: true` in `vitest.config.ts` — one line, and it may redden tests that currently depend on leakage, which is why it is a decision and not a patch smuggled into this unit |
| **N-68** | **U32 review follow-through, 2026-09-18** — found while proving the fix for `ecc:code-reviewer`'s BLOCKING finding, by running the same mutation against `HEAD` | **`model-adapter.test.ts`'s "key is absent" test has been green for the wrong reason since before this unit.** Deleting the `!apiKey` clause leaves the suite **21/21 green on `HEAD`**, because the test stubs no `OPENAI_MODEL` and `resolveModel` throws the same shared `AI_SERVICE_NOT_CONFIGURED` a moment later. `rejects.toThrow("not configured")` cannot tell two causes apart when one message serves every cause | `git show HEAD:…model-adapter.ts` with `!apiKey` removed, `git show HEAD:…model-adapter.test.ts` unchanged → **Tests 21 passed (21)**. The same mutation on the U32 tree: **22 passed** | **OPEN, unassigned — NOT fixed here, deliberately.** It predates U32 and belongs to whichever unit owns that guard; fixing a pre-existing green-for-the-wrong-reason test inside a unit about base URLs is the absorption §8.1 forbids, and this register row is what stops it being forgotten instead. **The fix is one line** — stub `OPENAI_MODEL` in that test so the key check is the only thing that can throw. **The class is the real finding**: a single shared error message across every configuration failure makes `toThrow(<that message>)` structurally unable to distinguish causes, so any test written that way is one new early-return away from silently stopping. U32's own BLOCKING finding was the same mechanism, one commit later |
| **N-69** | **`ecc:architect` during U29 planning, 2026-09-19** (the one question: route, service or repo) | **`recordBatch` can persist an `advisor_actions` row pointing at ANOTHER user's conversation, and every existing guard passes.** The row's `user_id` is stamped correctly, so `repo-scoping.test.ts` is satisfied; the column's foreign key constrains **existence, never ownership** | `0004_advisor_actions.sql:16-17` — `conversation_id uuid references public.advisor_conversations(id) on delete set null`, so a *nonexistent* id is refused by Postgres and a *foreign* one is accepted. `recordBatch` itself takes the id from its caller | **OPEN, unassigned.** **U29 closes the path through `confirmAndApply` and does NOT close `recordBatch`** — which is the distinction worth keeping: U29 guards a caller, not the function every future caller will reach. Candidate fixes, neither chosen here: scope `recordBatch` to verified conversations, or add a composite constraint so the database itself refuses a cross-owner reference |
| **N-70** | **`ecc:security-reviewer` on the U29 diff, 2026-09-20** | **U29's two ownership guards are check-then-act, and the repo layer already has the atomic pattern they do not use.** `conversationBelongsToUser` is a plain `select … maybeSingle` awaited at `route.ts:119`; the reservation happens at `route.ts:137` as a separate round trip, and `getMessages` at `:140`. Between the two the answer can go stale. Same shape at `advisor-actions.ts:149` | The contrast is inside this repository: **`appendMessages` (`repo.ts:159-187`, Phase 2 U26) folds ownership into the write statement itself** — `update … .eq("id", …).eq("user_id", …)` and a row-count check — so its check cannot go stale. U29's guards are the weaker pattern beside it | **DEFERRED by owner ruling 2026-09-20, with the reason stated rather than left implicit — NOT a Phase 2 unit.** **The window has no adversary**: nothing in this product transfers or shares a conversation, so the only way to lose ownership between the check and the reservation is to delete your own conversation, and the cost of that race is your own budget. A TOCTOU with no second party is a latent defect, not a live one. **THE GATE, and it is the whole point of deferring rather than closing: any future proposal to make conversations transferable or shareable must cite N-70 and close it first.** That is what turns the window into an exploitable one, and the person proposing the feature is the only one positioned to notice. **It is registered because the asymmetry is the finding** — this codebase holds both patterns, and the weaker was chosen where the stakes are a paid call. The fix folds the predicate into the reservation RPC or the write's `WHERE`, the way `appendMessages` already does; that is a design, not a patch |
| **N-71** | **`ecc:code-reviewer` on the U29 diff, 2026-09-20** (found while tracing the blast radius of an empty `conversationId`) | **A stack mutation can commit with no audit row and no `rolledBack` signal.** `executeBatch` has its own `try/catch` that returns `ACTION_ERROR` with `details: { rolledBack: true }` — a computed fact the client acts on. **`recordBatch` runs AFTER that block**, so a throw there falls to the outer `catch`, which returns `ACTION_ERROR` **without** `rolledBack`. The stack change is already committed and the audit row never exists | `advisor-actions.ts` — inner catch returns `{ rolledBack: true }`; `recordBatch` is called ~15 lines later; the outer catch returns `internalError(err, { code: "ACTION_ERROR" })` with no details | **OPEN, unassigned. PRE-EXISTING and explicitly NOT introduced by U29** — the reviewer said so unprompted, and U29 in fact *narrows* one route to it by refusing an empty id before `executeBatch` rather than after. It is registered because the audit trail is the thing this pair of findings (N-48/N-49) is about: a client told `ACTION_ERROR` with no `rolledBack` cannot tell a rolled-back batch from an applied-but-unaudited one |
| **N-72** | **U30 planning, 2026-09-21** (found enumerating the twelve handler sites) | **`src/app/api/advisor/actions/[id]/undo/route.ts` is the only dynamic handler that does not use `handle()`.** It reads its path param outside any `try`, and its own catch maps **everything** to `internalError(err, { code: "UNDO_ERROR" })` → 500 — so a `ZodError` there would be a 500 with a different code, not the 400 every other handler gets for free | `grep -c "handle(async"` → **0** in that file, **≥1** in the other seven dynamic route files; its catch is a single `internalError` with no `ZodError` branch | **OPEN — owner: U34**, by ruling 2026-09-21. U34 already owns that route's error reporting (N-71), so it decides whether the handler **moves onto `handle()`** or **stays exempt with a written reason**. **U30 does not decide it**: U30 gets the same 400 body there via `safeParse` + explicit `validationError`, which works under either outcome and prejudges neither |

**[2026-09-18, third and final revision — the two earlier versions of this note are why it is worth reading.] THE GAP IS CLOSED, AND BY THIS COMMIT RATHER THAN BY THE CLOSEOUT.** The first version said N-53…N-55 sat on an unmerged branch and would arrive at merge. They did not: U31's code commit `f9c34e3` left them in its subordinate artifact. The second version recorded that as a finding and refused to promote them unasked. U31's closeout `a0d318b` then added **N-63, N-64 and N-65** straight into this register — correctly — while **N-53 … N-62 stayed in the artifact**, so the register read N-1…N-52, N-63…N-65 and the numbers between them existed only in a subordinate file. **This commit promotes N-53 … N-62 verbatim**, each tagged with its source section, and strikes the artifact copies in place with a pointer (§7). **N-56 is one row, not two** — U31 raised it, the main session wrote it up more fully with the owner's ruling, and the artifact's copy is superseded in place. The register is now **contiguous N-1 … N-65**, verified by count rather than by reading.

**STANDING RULE, from the owner's ruling of 2026-09-18:** a unit's findings are registered **here, in §4.5, in the unit's own commit**. The unit's artifact **may mirror the register; it may never replace it.** The reason is mechanical, not stylistic: §8's *"follow-up register is complete and each row re-derived at close"* looks at this table, so a finding registered only in a subordinate file is a finding the closeout cannot see — and U31 registered eleven that way while its own numbering note called this register canonical.


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
| **OP-3** ✅ **DISCHARGED 2026-08-12** — `docs/05-qa/2026-08-12-deployed-schema-record.md` Part 2. **Both halves observed directly, and the second is the one that mattered:** A reserved 1000 of a 1000 budget and held its transaction open; **B hung** — proving Postgres took the row lock, which no JS fake and no single-session run can show — and on A's commit **B released immediately and returned `0`**, proving it **re-evaluated the budget predicate against A's committed state** rather than its own starting snapshot. That second half is what stops two concurrent turns each spending the last of the budget, and a rollback-based procedure could not have demonstrated it. Ledger repaired with `settle_advisor_tokens(1000, 0, 0)` and verified back to `0 \| 0`; the residual zero-valued row is recorded and shown benign in the record. **Two procedure facts worth keeping: it cannot be run in the SQL editor at all, and it needs the pooler in SESSION mode** — transaction mode would have presented as "B didn't block", i.e. as OP-3 failing. ~~**OPEN, and explicitly NOT advanced by OP-2's discharge.**~~ OP-2 ran in **one** session, with both `reserve_advisor_tokens` calls inside a single transaction that then rolled back: no second backend ever contended for the row, so no lock and no serialisation was observed. "The reservation function was tested and capped correctly" is one paraphrase away from being read as this row, which is why the record says so in its own §4 | **Verify the reservation is atomic under real concurrency.** U4's proof is a stateful fake, which establishes that the TypeScript caller has no read-then-write window — not that Postgres serialises the `UPDATE … WHERE … RETURNING` | No database in CI, and a JS fake cannot model row locks | Two concurrent psql sessions calling `reserve_advisor_tokens` against a budget admitting one. **A separate sitting from OP-2** — it needs two sessions, so it could not have been folded into that run. **[2026-08-10] The OP-6 sitting did not advance it either**, and could not have: every block was one session, and `generate_series(1, 6)` is six **sequential** calls in one backend, not contention. **Fold N-28's re-read into the same sitting** — it is one extra statement in a transaction that will already be open. ~~Append to `docs/05-qa/2026-08-10-rate-limit-policy-verification.md` or record alongside it~~ **[2026-08-12] PROCEDURE WRITTEN, AWAITING THE SITTING — `docs/05-qa/2026-08-12-deployed-schema-record.md` Part 2 (OP-3) and Part 3 (N-28 + N-27 (i)), consolidated with U15's deployed-schema record so all three clear in one visit.** Two things the procedure had to settle that this row did not: **OP-3 cannot be run in the Supabase SQL editor at all** — it needs two backends holding transactions open simultaneously, so it is written for two `psql` terminals; and **step 4 must COMMIT rather than roll back**, because a rollback releases the lock and grants B its 1000, which demonstrates the lock but *not* the re-evaluation — and the re-evaluation is the half that stops over-granting. The cost is one repair statement (`settle_advisor_tokens(1000, 0, 0)`), which the procedure includes and verifies against the step-1 reading |
| **OP-4** ✅ **DISCHARGED 2026-08-10** — `docs/05-qa/2026-08-10-omniroute-probe-record.md` | **A live end-to-end call against real Omniroute credentials** — one advisor turn that calls at least one tool and returns a grounded answer, and one lab extraction, run against a reachable gateway with a real `OMNIROUTE_API_KEY`. It answers three questions no unit test can: (a) does the routed model return `usage.prompt_tokens` / `usage.completion_tokens` **per response**, or does it omit them; (b) does it accept a base64 PDF content part (**decision 7B / N-19**); (c) does the tool-calling round-trip work end to end against the real gateway rather than a scripted mock | **Ruling 3 (2026-08-08) forbids the credentials that would let CI do it**: live E2E needs secrets in a public repository, and that was decided against. So this is owner-run by construction, on the same footing as OP-2/OP-3 and the `[LIVE]` E2E baseline. **No secret enters the repository** — not in `.env.example`, not in a fixture, not in a recorded transcript | Set `OMNIROUTE_BASE_URL` and `OMNIROUTE_API_KEY` in a local `.env.local` (gitignored). Run one advisor turn and one PDF extraction against a running app. Record under `docs/05-qa/` with a date, the model id actually routed to, and **the `usage` object's field names and whether they were populated** — the names, never the key. Per the U17 pattern. **(a) and (c) are entry conditions for U25's advisor half; (b) is the entry condition for its lab-import half** |
| **OP-5** | **The production gateway's provider set must be restricted to real API-keyed providers before any deployment carries user traffic.** The owner's gateway instance currently exposes mostly **free web front-ends and repackaged coding-subscription providers**. Advisor traffic carries the user's **health context** — medications, conditions, lab values (§2.3 rule 15) — so which upstream a turn is routed to is a data-handling decision, not a cost one. A free front-end has no data-processing agreement, no stated retention, and in several cases trains on submitted text | **Registered, not absorbed (§8.1), and explicitly NOT U25 work.** U25 swaps the client and the protocol; it does not choose or constrain a routing table, and it must not silently acquire a scope that belongs to a deployment decision. Nothing in the codebase can enforce this either — the provider set lives in the gateway's own configuration, outside this repository, so a test here would be theatre | **OWNER CONDITION, PRE-DEPLOYMENT.** Before the advisor is served to any real user from this gateway: restrict the instance's provider set to API-keyed providers with stated retention terms, and record the permitted set and the date under `docs/05-qa/`. Until that record exists, treat any deployed advisor as **development-only, with no real user health data**. Non-negotiable rule §2.3.15 is the authority; this row is its operational form for a routed provider. **[2026-09-18, U31] RE-STATED FOR THE NEW PROVIDER, AND STILL OPEN — NOT DISCHARGED.** U31 replaced the routed gateway with OpenAI's first-party API, which **narrows** this row's original risk (a routing table of free front-ends is gone; there is one known upstream) but does **not** close it, for two reasons, both blocking: **(i) N-63 — the code does not enforce what the docs claim.** `OPENAI_BASE_URL` is validated only for non-emptiness, so "first-party" is a deployment convention, not a control. **U32 is this row's precondition** and is sequenced before U29 for that reason. **(ii) The account facts are the owner's and are not in evidence** — the configured base URL as deployed, whether a data-processing agreement is executed for this account and when, and whether zero-data-retention is enabled. The record this row demands (`docs/05-qa/2026-09-18-op5-provider-record.md`) is **not written**, because writing it would mean either fabricating those facts or citing a retention policy from recall, and §2.2 rule 8 forbids both: verified against a real source, or absent. **Any account fact returning "unknown" leaves OP-5 open with the record naming exactly what is missing.** The development-only instruction above **remains in force** |
| **OP-7** ✅ **DISCHARGED 2026-08-17** — `docs/05-qa/2026-08-17-op7-deletion-function-sitting.md`. All four steps PASS: `0010` applied clean, **`args` EMPTY**, `proconfig = {search_path=""}`, and the null-claim probe raised **`28000` from `line 8 at RAISE`** — the same line the local measurement and CI both exercise. **No live deletion run.** Two apparent mismatches were client rendering, not data (`prosecdef` as `true` not `t`; `proconfig` as JSON not an array literal); the procedure's expectations now carry both renderings, because a probe that reports a false alarm invites being tuned until it agrees (**N-26**). U17's merge blocker is cleared | **Deploy `0010_delete_user_data.sql`, then verify the function with SAFE PROBES ONLY.** **THE ORDER IS THE REVERSE OF OP-1's, and the reversal is the point.** OP-1 (0008) was *code first, never the migration alone*. This one is **migration first, never the code alone**: `0010` deployed against old code is a harmless unused function, whereas U17's code deployed without `0010` is a DELETE route whose RPC does not exist. That second case is pinned to fail **honestly** rather than partially — `route.test.ts` asserts a 500 with `data: null`, no counts, and a correlation id, so a user is never told their data was removed when nothing was | CI proves the function applies, is callable, deletes all twelve, and isolates users — but only against a **throwaway** Postgres. Whether the DEPLOYED database has the function, and whether its pins hold there, is exactly what CI structurally cannot see (P-03: no credentials) | **SAFE PROBES ONLY — three statements, none of which delete live data.** (1) **Catalog shape:** `select p.proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_function_result(p.oid) as returns, p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'delete_all_user_data';` → **expect 1 row, `args` EMPTY, returns `jsonb`, `prosecdef = t`**. The empty `args` is the live-side check of the repository's highest-stakes assertion. (2) **search_path:** `select proconfig from pg_proc where proname = 'delete_all_user_data';` → **expect `{search_path=\"\"}`**. (3) **Null-claim refusal, which touches no data:** in a transaction, `set local role authenticated;` with **no** `request.jwt.claims`, then `select public.delete_all_user_data();` → **expect ERROR `28000` \"requires an authenticated caller\"**; `auth.uid()` is null so the function raises before its first delete. `rollback;`. **NO LIVE-DELETION TEST** — the cascade and emptiness proofs live in CI against the throwaway Postgres, which is what U15 was built to make possible. **If the procedure appears to need anything beyond read-only plus the null-claim probe, STOP AND ASK rather than improvising against a production database.** The three statements are also carried in `0010`'s own header, per the 0008/0009 pattern |
| **OP-6** ✅ **DISCHARGED 2026-08-10** — `docs/05-qa/2026-08-10-rate-limit-policy-verification.md`, hours after this row was opened. All four as `authenticated`: DELETE (**no `WHERE`** — every visible row targeted) removed 0; INSERT raised **`ERROR 42501 new row violates row-level security policy for table "api_rate_limits"`**; SELECT returned the live `:advisor` bucket; `consume_rate_limit('user:op6-test', 60, 5)` × 6 returned **1,2,3,4,5,0**. Test bucket rolled back. **Check 2 is the only one of the eight checks across both records that stands alone** — a raised error cannot be explained by an empty table, where a filtered 0-row result can | **`0009`'s sibling verification block was never run, and had no row here — which is the reason this one exists.** `0009_rate_limits.sql`'s header carries four owner-run statements against `api_rate_limits`: `delete` (denied), `insert` (denied), `select` (own rows), `consume_rate_limit('user:me', 60, 5)` (`1..5` then `0`). It calls itself *"plan §4.6 OP-2's sibling"* — but OP-2's procedure column names `0008`'s statements and only those, so the sibling's absence was invisible at discharge and OP-2 closed without it | Same reason as OP-2: `RLS_COVERAGE` and `SQL_FUNCTION_REGISTRY` read `0009` as **text**. `api_rate_limits` is the schema's **second counter table** (0008's rule, applied at birth rather than in a later migration), so it carries the same hole closed the same way — and verified by nothing. Its `insert` check is also the only one of the eight that can produce the `new row violates` error shape; the `0008` four can only ever produce silent 0-row filtering | The four psql statements in `0009_rate_limits.sql`'s header, **as the `authenticated` role**, same technique as OP-2. Append to `docs/05-qa/2026-08-10-ledger-policy-verification.md`. **Registered rather than folded into OP-2** because §4.6's stated purpose is that these are *"listed here, not buried in a file header"* — a header block with no register row is exactly the burial this section exists to prevent |

#### OP-5's non-coverage paragraph — written by U32, from `ecc:security-reviewer`'s enumeration (2026-09-18)

**THE RECORD ITSELF IS `docs/05-qa/2026-09-18-op5-provider-record.md`** (filed at U32's closeout). It carries the provider's current terms with their URL and read-date, this paragraph's code half, and the three account facts that remain **UNKNOWN**. **OP-5 stays OPEN**, and the development-only constraint stays in force. *(The pointer is added here because this row had none — a non-coverage paragraph whose evidence file cannot be reached from it is the same defect one layer down.)*

**Drafted here so OP-5's record cannot cite U32 as though it settled the question.** The reviewer was
asked one question — *with the pin in place, enumerate every way health context can still leave the
process to a host other than `api.openai.com`* — and the answer is the paragraph, ordered by how
plausible each path is in a real deployment. **Verdict first: N-63 is MITIGATED, not CLOSED.** U32 closes
the *silent-drift* mode — an unset or mistyped `OPENAI_BASE_URL` no longer dials an arbitrary host
unnoticed. It does not close the *hostile-operator* or *network-layer* mode.

1. **The override itself.** `OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL=1`. By design, and the most plausible
   path in any real deployment, because it is the intended hatch for a proxy or compatible gateway.
   Whoever can set the address can set the permission. **U32 makes it explicit and logged once per
   process, naming the host; it does not prevent it.**
2. **DNS, TLS and proxy-level redirection the code cannot observe.** An egress proxy, poisoned DNS, a
   hosts entry, or a TLS-terminating middlebox can make the literal string `api.openai.com` resolve to,
   or be terminated by, infrastructure no source-level check can see. **There is no certificate pinning
   anywhere in the client.** U32 validates the configured *string*, not the resolved peer. **Unchanged
   by this unit, and not fixable by a check of this kind.**
3. **A future call that bypasses `createCompletion`.** Measured today: none — the only other `fetch(`
   calls in `src/` are same-origin `/api/...` calls from client components. `SOLE_PAID_CLIENT` plus
   N-66's address ratchet catch a new `src/` module that *reads `OPENAI_BASE_URL`*; **neither catches a
   hardcoded host literal that never reads the variable**, and the ratchet's file set is `src/` only.
   **Narrowed by U32, not eliminated.**
4. **Supabase.** Every request carrying medications, allergies, conditions or lab values reaches the
   configured Supabase host through `src/lib/db` and the session refresh in `src/middleware.ts`. This is
   expected, separately governed infrastructure rather than a leak — listed because the question said
   *every* way, and because a non-coverage paragraph that omits the other host the data goes to is not
   an honest one. **Entirely outside U32's scope and untouched by it.**
5. **Telemetry or error-reporting SDKs.** None exist: the reviewer grepped Sentry, Datadog, PostHog,
   LogRocket, Bugsnag, Honeycomb and New Relic across `src/` and `package.json` — **zero matches**. Not
   a path today, and the measurement is what makes that sentence worth writing.
6. **Log and error paths.** No `console.*` in the advisor, lab-import or advisor-route code outside
   U32's own host-only override line, and `OpenAIError` carries no response body or upstream text by the
   module's existing design — so the new `"config"` failure kind inherits that invariant and cannot
   smuggle context into a log or a response.
7. **The probe scripts.** They transmit health-context-shaped test data to whatever host is configured.
   **U32 gates them with the same validator**, and the refusal deliberately does not print the host.
   **Residual, and it belongs in this paragraph:** the N-66 ratchet does not reach `scripts/`, so a
   third probe or an ad-hoc script that read the variable would not be caught mechanically.
8. **Build-time, edge and middleware execution.** `next.config.ts` sets static headers and no rewrites,
   redirects or proxying; `src/middleware.ts` refreshes the Supabase cookie and stamps a CSP nonce.
   Neither is a paid-LLM egress path. **N/A, and unchanged.**

**One advisory taken as written rather than silently:** the override log has no correlation id or
structured fields. It carries a host name and no health context, so it is low severity — recorded, not
fixed here.


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

> **METHOD RULE, standing, added 2026-09-21 from U30 — mutation reverts use a FILE-COPY BACKUP, never
> `git checkout --`.**
>
> A file under mutation usually carries **uncommitted work belonging to the unit doing the mutating**.
> `git checkout -- <file>` restores it to **HEAD**, which silently discards that work; the mutation
> "reverts" and the implementation goes with it. This is recorded because it happened: during U30's M4,
> a `git checkout` on `stacks/[id]/compare/route.ts` removed that unit's own `uuidParam.parse` and
> import, and the loss was caught only because `git status` was read afterwards rather than the revert
> being trusted.
>
> **The rule:** `cp <file> <scratch>/…bak` before mutating, `cp` back after. **And read `git status`
> after any revert** — the check is cheap and it is the only thing that would have noticed. §5 rule 2
> requires a mutation to be *shown* red; a revert that also deletes the fix makes the next green run a
> lie about a tree that no longer exists.

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

**U10 · `REPO_SCOPING` guard.** — **DONE 2026-08-10** (see the unit report). The exemption list is the predicted **3** tables and each is asserted against the migrations rather than against its own comment. **The rule had to be re-quantified, and that is U10's finding:** phrased as GATE C1 phrases it — over functions that *take* a `userId` — it cannot see `getAction`/`markUndone`, which touch the user-owned `advisor_actions` and accept no owner at all, so the cheapest way to satisfy such a rule is to delete the parameter it protects. Quantified over **tables carrying a `user_id` column** instead (derived from the migrations), it catches them, and mutation M46 proves the parameter-deletion cheat still goes red. Four functions violate today; they are held in a **ratchet register** asserted as an equality, per Phase 1 U18, so it can only shrink. **[2026-09-11] Zero — U26 emptied it, and the register stays asserted at `toHaveLength(0)`.** Also delivered N-14's audit table.
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

> ### **[2026-09-11] U12 PLAN — opened after U26's closeout, per the owner's disposition; REVISED to option C by owner ruling the same day; awaiting plan approval before any source edit.**
>
> **Problem (FU-28, verbatim from the Phase 1 register).** *"The route answers `notFound("Stack")` vs
> `notFound("Item")`, and `notFound` writes `` `${what} not found.` `` into the client-facing
> `error.message`. The pin asserts equal status and equal error code only, so the messages differ and are
> unpinned."* Residual disclosure is minor — learning "the item isn't in it" implies the stack *is* yours —
> but a message that varies with which check failed **within one route** is a small oracle, and the pin
> that claimed "identically" was weaker than its title until Phase 1 closeout corrected the title rather
> than the code.
>
> **The defect class, stated precisely (owner ruling 2026-09-11).** Rule 13 governs *internal* error
> text, not resource names. A single-resource route has no oracle: `Stack not found.` on
> `GET /api/stacks/:id` distinguishes nothing, because a foreign id and a nonexistent id already answer
> identically there. The defect is **per-route distinguishability** — one route, two ownership checks,
> two messages — and the fix is scoped to exactly that shape. The first draft of this block proposed
> flattening all fourteen `notFound(what)` sites to one constant; that was **ruled out**: a product-wide
> UX regression bought for no security property, and U29 does not need a shared constant because its
> pre-spend check is a single-resource 404. The product question it raised is registered as **N-50**,
> open, owner unassigned — a product decision, not a Phase 2 unit.
>
> **Every 404 site, enumerated (grep `notFound(` and `"NOT_FOUND"` across `src/`; graphify oriented on
> `respond.ts`'s callers).** Current text is what `notFound(what)` renders today:
>
> | # | Site | Today | After U12 (option C) |
> |---|---|---|---|
> | 1 | `api/stacks/[id]/items/[itemId]/route.ts:56` (PUT, stack not caller's) | `Stack not found.` | **`Stack item not found.`** |
> | 2 | `…/items/[itemId]/route.ts:57` (PUT, item not in stack) — **FU-28's pair with #1** | `Item not found.` | **`Stack item not found.`** |
> | 3 | `…/items/[itemId]/route.ts:72` (DELETE, stack) | `Stack not found.` | **`Stack item not found.`** |
> | 4 | `…/items/[itemId]/route.ts:73` (DELETE, item) — **FU-28's pair with #3** | `Item not found.` | **`Stack item not found.`** |
> | 5–7 | `api/stacks/[id]/route.ts:20,34,49` | `Stack not found.` | unchanged |
> | 8 | `api/stacks/[id]/evaluate/route.ts:17` | `Stack not found.` | unchanged |
> | 9 | `api/stacks/[id]/items/route.ts:19` | `Stack not found.` | unchanged |
> | 10 | `api/stacks/[id]/compare/route.ts:19` | `Stack not found.` | unchanged |
> | 11 | `api/products/match/route.ts:21` | `Stack not found.` | unchanged |
> | 12 | `api/protocol/generate/route.ts:27` | `Stack not found.` | unchanged |
> | 13 | `api/advisor/conversations/[id]/route.ts:42` | `Conversation not found.` | unchanged |
> | 14 | `api/advisor/actions/[id]/undo/route.ts:33` | `Action not found.` | unchanged |
> | 15 | `services/advisor-actions.ts:82` — `fail("NOT_FOUND", "Stack not found.", 404)` | `Stack not found.` | unchanged (a service, not a `route.ts`; one 404 shape reaches its route from here — see the scan's scope) |
> | 16–17 | `services/advisor-actions.ts:74,89` — `` `Supplement "${id}" not found.` `` | names the **caller-supplied** reference id | unchanged |
> | — | `app/library/[slug]/page.tsx:42`, `app/stack-lab/[stackId]/page.tsx:23` | Next's `notFound()` — renders the 404 page, not an envelope | out of scope, different function |
>
> **Every site other than #1–#4 is untouched.** `notFound(what)` keeps its parameter.
>
> **Tests that pin today's text and must move with it:** only the FU-28 pin,
> `api/stacks/[id]/items/[itemId]/route.test.ts:219-235`, which gains the assertion its title once
> promised. `lib/api/respond.test.ts:538` and `api/advisor/actions/route.test.ts:206,218` are **unchanged**
> under C — they pin sites this unit does not touch. No file under `src/components`, `e2e/` or `tests/`
> matches `not found` — no client copy or spec binds the text.
>
> **Design — option C: A's scope with B's enforcement.**
> 1. The two FU-28 pairs (#1–#4) answer one message, `Stack item not found.`, on both PUT and DELETE.
> 2. The FU-28 pin asserts equal **message and byte length** across each pair, not only status and code.
>    (ecc:architect's part-1 verdict below is why length is named: the two bodies today differ by one
>    byte of Content-Length.)
> 3. **`NOT_FOUND_UNIFORMITY`**, N `src/architecture/not-found-uniformity.test.ts`: for every tracked
>    `src/app/api/**/route.ts`, every `notFound(…)` / `fail("NOT_FOUND", …)` call site **within that one
>    file** must resolve to the same message literal. That is the mechanical form of the defect class —
>    per-route distinguishability — and it needs **no allowlist today**: no other route answers two
>    different 404 literals. The inventory of scanned routes is asserted non-empty (anti-vacuity), and
>    the inventory of routes with ≥1 404 site is asserted non-empty too, so a regex that stops matching
>    is red rather than green. Comments are stripped first (N-14's class). `services/**` is outside the
>    scan by construction — the rule is *per route*, and #15–#17 reach one route (`api/advisor/actions`)
>    from a service; whether that route's three distinct 404 literals (one ownership, two caller-echo)
>    are a per-route oracle is part of **N-50**, stated there rather than silently decided here.
>
> **Behaviour change #3 — DECLARED, explicitly, and now sized correctly: two response bodies, not
> fourteen.** `error.message` on the stack-item route's PUT and DELETE 404s changes from `Stack not
> found.` / `Item not found.` to `Stack item not found.`. Status (404), code (`NOT_FOUND`), envelope shape,
> and the absence of `correlationId` on 404 (`respond.test.ts:524-546`) do not move. **User-visible
> consequence, stated:** the components that render `json?.error?.message` show the new text on those
> two paths only. No spec asserts it.
>
> **Red (C).** **M1:** restore `notFound("Stack")` at #1 alone → the FU-28 pin red on message inequality
> (and on length). **M2:** add a second distinct 404 literal to any route (e.g. `notFound("Nope")` beside
> an existing `notFound("Stack")`) → `NOT_FOUND_UNIFORMITY` red, naming the route and both literals.
> **M3:** empty the scan's inventory (narrow the pathspec to match nothing) → anti-vacuity red, a thrown
> hard failure rather than a green run.
>
> **Files (C).** M `src/app/api/stacks/[id]/items/[itemId]/route.ts` (four call sites) · M its test (the
> FU-28 pin) · N `src/architecture/not-found-uniformity.test.ts` · M this document · M
> `docs/01-plan/features/u12-one-404-message.plan.md` (bkit artifact, subordinate). `respond.ts` and
> `services/advisor-actions.ts` are **not touched**.
>
> **Not in U12:** any change to *which* check runs first; the other twelve `notFound` sites; the
> service-level 404s; the two page-level `notFound()`s; any 403; the N-50 question.
>
> **ecc:architect, one question — does unifying the message leave any way to tell which of the two
> cases occurred (rule 13's direction)?** Asked against the first draft (option B); **part 1 holds
> unchanged under C**, because C makes the same two branches byte-identical. **(1) PASS WITH NOTE.** With
> one message, the two branches emit byte-identical bodies — `fail` passes `details`/`correlationId` as
> `undefined` and `JSON.stringify` drops them, so status, key set, headers **and Content-Length** match
> (today the two messages differ by one byte, a weak oracle even under TLS that the change removes; the
> pin's length assertion is there because of this). The sensitive pair is collapsed at the source, not
> only at the message: `getStack(supabase, user.id, id)` returns `null` identically for "no such stack"
> and "someone else's stack" — one query, no branch. The residual is a round-trip/timing channel: the
> item branch answers after a second query. It distinguishes only "you own this stack" from "you do not",
> a fact about the caller's own resource already readable from `GET /api/stacks/:id`; no query for a
> foreign item is ever issued. Check ordering in PUT is safe: body validation runs *after* both ownership
> checks, so a malformed body cannot turn one branch into a 400. **(2)** — asked about keeping the
> supplement-id messages distinct under B; **moot under C** (those sites are untouched), and its
> substance is carried into N-50 rather than lost: the reviewer's reasoning was that rule 13 governs
> *internal* text and those messages echo bounded, Zod-parsed caller input about public append-only
> reference data (§2.4 rule 16). **One premise corrected by the reviewer:** the two handlers at #1–#4 are
> **PUT** and **DELETE**, not PATCH and DELETE; the table's line numbers stand.

**DONE 2026-09-11.** Baseline before: typecheck clean, **1278/105**, lint 359/359 (U26's close, re-measured
by CI run `34665397790`). After: **1294/106** (+16 — 15 in `not-found-uniformity.test.ts`: 5 rules + 10
self-tests; +1 net in the route test, where one status-and-code pin became two pins), lint **360/360, 0
errors**, build succeeds. All four re-measured after the last edit, none copied.

| U12 | before | after |
|---|---|---|
| 404 literals in `stacks/[id]/items/[itemId]/route.ts` | 2 (`Stack not found.` · `Item not found.`) | **1** (`Stack item not found.`) |
| FU-28 pin asserts | status, code | status, code, **message, body byte length**, across both handlers |
| routes answering two 404 literals | 1 | **0**, and `NOT_FOUND_UNIFORMITY` makes the next one a red build |
| unit tests | 1278 / 105 | **1294 / 106** |

**Files touched in the code commit.** M `src/app/api/stacks/[id]/items/[itemId]/route.ts` (four call
sites, header note) · M its test (the FU-28 pin, now two) · N `src/architecture/not-found-uniformity.test.ts`
· M this document (plan block, this entry, N-50, N-51) · N `docs/01-plan/features/u12-one-404-message.plan.md`.
`respond.ts` and `services/advisor-actions.ts` are **untouched**, as option C specified. **Deferred to the
closeout commit, by U19's shape:** the spec-count corrections in `docs/project-status.md` §2.9 (below).

**RED LIST — five mutations, every one executed against the FINAL detector, verbatim.** M1–M3 were also run
against the first draft; M4 and M5 exist because review found the first draft unsound (below).

| # | Mutation | Observed |
|---|---|---|
| M1 | restore `notFound("Stack")` at the **PUT** stack site alone | scan: `+ "src/app/api/stacks/[id]/items/[itemId]/route.ts answers 2 different 404 messages: \"Stack item not found.\" · \"Stack not found.\""`; cross-handler pin: `expected 2 to be 1`. **The DELETE-only byte-length pin stayed green** — a PUT-only regression is invisible to it, which is why the second pin exists |
| M2 | a second distinct literal in another route (`notFound("Nope")` beside `notFound("Stack")` in `evaluate/route.ts`) | `+ "src/app/api/stacks/[id]/evaluate/route.ts answers 2 different 404 messages: \"Nope not found.\" · \"Stack not found.\""` |
| M3 | narrow the inventory to a pathspec matching nothing | `Error: NOT_FOUND_UNIFORMITY found zero tracked route files under src/app/api/nowhere. A guard that scans nothing passes vacuously, so this is a hard failure rather than a silent green.` — thrown, `Test Files 1 failed` |
| M4 | FU-28 hidden behind a variable: `{ const msg = "Stack"; return notFound(msg); }` in one branch, `"Item"` in the other | `+ "…/[itemId]/route.ts has a 404 whose message is not a string literal at the call site: \"msg\" · \"msg\""` |
| M5 | `import { notFound as nf }` | `+ "…/[itemId]/route.ts aliases the 404 helper: notFound as nf"` |

The initial red — three failures across the new spec and the strengthened pin before any source edit, the
scan naming the route and both literals — is the TDD half and is not counted as a mutation.

**THE FIRST DRAFT OF THE DETECTOR WAS UNSOUND, AND REVIEW FOUND IT, NOT THE AUTHOR.** ecc:code-reviewer's
first pass returned **REQUEST CHANGES — 4 findings (1 blocking, 3 advisory)**. The blocking one: a
non-literal argument resolved to an opaque token built from its *source text*, so two branches that each
wrote `const msg = …; return notFound(msg)` collapsed to one token and read as uniform — **FU-28 exactly,
hidden behind a name** — and `notFound(c ? "A" : "B")` was one call site with two outcomes the scan never
saw. Fixed by making the only sound rule for a textual scan explicit: **the message must be a string
literal at the call site**; anything else is a violation, not a token. The three advisories were taken
too: an aliased import (`notFound as nf`) made a call invisible — now a rule; the `fail("NOT_FOUND", …)`
capture stopped at the first comma inside a message — now a full string-literal capture; and the
PUT/DELETE pin's title claimed four sites while asserting three — now four. Each has a self-test and a
mutation (M4, M5). **Second pass: APPROVE — 0 findings outstanding, 1 new low note**, recorded and *not*
taken: the scan does not strip string-literal contents before matching, so prose inside a string that
happened to contain `notFound(` would register a phantom site. The direction is a spurious **red**, never a
silent green, and stripping strings would remove the very literals the scan resolves; left as a stated
limitation of a textual scan rather than half-fixed.

**ecc:security-reviewer, one question — does the unified message or the byte-length equality leave any way,
other than the noted timing channel, to distinguish "stack not yours" from "item absent" on PUT/DELETE?
VERDICT: NO REMAINING CHANNEL — 1 finding (0 blocking, 1 advisory).** Headers: uniform, no per-branch
logic, middleware sets the same CSP headers on every response, no caching headers. Envelope: `fail` passes
`details`/`correlationId` as `undefined`, dropped by `JSON.stringify`, so both bodies serialise identically
— now pinned byte-for-byte. Validation: body parsing sits *after* both checks and is never reached on either
404 branch (pinned by the existing "checks membership BEFORE parsing the body" test). Thrown repo errors:
both branches map to the same generic 500 with a per-request random correlation id, not derivable from the
branch. The advisory is **N-51**, outside U12 and registered, not absorbed.

**Behaviour change #3 — DECLARED, as two response bodies.** `error.message` on this route's PUT and
DELETE 404s: `Stack not found.` / `Item not found.` → `Stack item not found.`. Status, code, envelope shape,
and the absence of `correlationId` are unchanged. No other route's bytes move. Re-verified rather than
assumed: the full non-live E2E suite is CI's to re-measure on the pushed SHA; no spec matches `not found`.

**§5.7 — no new engine; a new architecture spec.** `not-found-uniformity.test.ts` is a test file, excluded
from coverage like its siblings. It is registered by inclusion: `boundaries.test.ts` already governs
`src/architecture` as a directory, so a new spec needs no registry entry — and that is why a spec count
written in prose rots (the closeout sweep, below).

**bkit:** feature `u12-one-404-message` at `check`, `matchRate` 100; artifact subordinate to this entry.

**U12 CI — run `34919261813`, green on `324ebda`, 18/18 steps.** Every figure this entry claims was
re-measured by CI independently and matched exactly: lint **360 of 360, 0 errors**; **1294/106**; non-live
E2E **70 passed / 30 skipped** — unchanged from U26's baseline with zero specs edited, which is the
evidence that behaviour change #3 moved no byte any E2E asserts. Recorded because the entry's numbers were
taken on one developer's machine, and §5.1 asks what was run, not what was believed.

**U12 STAMP ROW** *(standing disposition):*

| U12 closeout | value |
|---|---|
| merged to `main` | **`324ebda`** — fast-forward from `dda046a`, 1 commit |
| code run | **`34919261813`** — green on `324ebda`, 18/18 steps, on `feat/u12-one-404-message` |
| post-merge `main` run | **`34919508198`** — green on `324ebda`, required check satisfied on the merged SHA |

**THE COUNTS-WRITTEN-ONCE SWEEP (FU-32 class).** A new architecture spec is a magnet for this class, and
the unit predicted two sites. **The sweep found three, and the third is the finding:** it was not in the
pre-enumeration, and it lives in the design document `CLAUDE.md` §4 points readers to. Corrected by dating
beside the original, never by rewriting it:

| # | Site | Claim made false | Correction |
|---|---|---|---|
| 1 | `docs/project-status.md:309` — "**Seven** executable architecture specs, not two" | seven | dated observation appended: **20**, measured 2026-09-14 at U12 |
| 2 | `docs/project-status.md:445` — "all seven architecture specs run on every push" | seven | same dated observation |
| 3 | `docs/02-design/architecture-boundaries.md:254` — `npm test  # includes all seven executable specs` | seven | same dated observation. **Not pre-enumerated by this unit** — found only because the sweep grepped `docs/` rather than trusting the list |
| 4 | this document, the U12 entry's own pre-enumerated sweep line | "nothing to correct" outside the two `project-status` sites | struck and dated: the pre-enumeration was itself a count written once, and it was wrong |

**All three were already false before U12** — the directory held **19** specs and the claim said seven, so
the drift began long before this unit and U12 is merely the commit that had to notice. Stated plainly
rather than implied: U12 did not break these; it inherited them and is the first unit since 2026-08-06
whose own work required counting the directory.

**Checked and deliberately NOT changed:** `docs/04-report/phase-1-verification-integrity.report.md:278`
("Seven executable architecture specs, **counts measured 2026-08-06**") and
`docs/04-report/phase-0-integration-enforcement.report.md:29,188`. These are dated historical records of
what was true when each phase closed, and §7 forbids editing historical rationale — a dated claim that
says when it was measured has not rotted, it has aged. `CLAUDE.md` §4/§5 enumerate specs **by name**, not
by count, and `doc-truth.test.ts` binds the §4 table's file names rather than a total, so a new spec makes
nothing there false; both re-checked at this commit rather than carried forward from the pre-enumeration.

**The transferable lesson, since this is the class's fourth appearance (FU-32 · U19 · U20 · here):** the
pre-enumeration of a sweep is itself a count written once. U12 wrote its expected sweep into the entry
*before* running it, which is the right order — and the entry was then wrong by one site. The check that
caught it was grepping `docs/` for the claim's words, not re-reading the list.

> **GATE C1** — every `src/lib/db` module taking a `userId` has a test asserting `.eq("user_id", …)`, or is
> in `REPO_SCOPING`'s exemption list. **Check:** exemption list length == 3 **and** each entry names a
> table with no `user_id` column in the migrations.
>
> ### **[2026-08-10] GATE C1 — DISCHARGED, with a named remainder.** Clause by clause, re-measured at `9f8f1e6`:
> ### **[2026-09-11] — and the named remainder is CLOSED by U26, `66b6322`.** The block below is kept as written; the dated note at its end says what changed.
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
>
> **[2026-09-11] CLOSED by U26 (`66b6322`, CI run `34664914852`).** `UNSCOPED_FUNCTIONS` is `{}`, asserted as
> an equality and `toHaveLength(0)`; all four bind the owner as a filter. Two corrections to the text above,
> dated rather than rewritten: **(i)** the `appendMessages` line says "check-then-act" — the *check* half
> never existed on the route that calls it. `POST /api/advisor` never called `conversationBelongsToUser`;
> only the GET conversations route does. That is **N-48**, owned by U29. **(ii)** "None is a live defect"
> stands, and for the reason given (RLS refused the row regardless), but the sentence "each is reached
> from a route that has already authenticated" was doing more work than it could: authenticated is not
> the same as owner-checked, and for `appendMessages` the second never happened at the route.

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

> ### **[2026-09-11] U26 PLAN — approved by the owner before any source edit.**
>
> **Problem.** Under the corrected quantifier, four functions touch a user-owned table without binding
> the owner and rely on RLS alone. They are held in `UNSCOPED_FUNCTIONS`, which asserts itself as an
> equality on every `npm test`. **RLS already isolates tenants at the database (`CLAUDE.md` §2.3 rule
> 12); U26 is defence in depth at the repository layer, so a bug in `src/` cannot rely on RLS to save
> it.** No vulnerability RLS already prevents is claimed here.
>
> **Approach.** Add `userId: string` in the second position — the `(supabase, userId, …)` shape
> `recordAction`, `listActionsByUser` and `conversationBelongsToUser` already use — and apply
> `.eq("user_id", userId)`. Then empty the register.
>
> **Design decision, `appendMessages`.** `advisor_messages` has **no** `user_id` column (0003; it is one
> of GATE C1's three exemptions), so the owner binds as a **filter on the parent conversation**, not as
> a column on the message row. The order changes: the owner-scoped `updated_at` bump runs **first** with
> `.select("id")`, a zero-row result throws, and only then are the messages inserted. Check and act are
> one scoped write, and it fails before any side effect. Cost, stated: if the insert then fails,
> `updated_at` leads the newest message. Chosen over insert-then-scoped-bump because that order writes
> the rows first and discovers the conversation is not the caller's second — which, on any path where
> RLS is not the enforcing mechanism, is persisted unauthorised rows.
>
> **Finding before any code — N-48.** The register's reason for `appendMessages`, the GATE C1 block
> above, and the comment in `advisor/repo.test.ts` all say the route checks ownership first via
> `conversationBelongsToUser`. **`POST /api/advisor` never calls it.** Its only caller is
> `GET /api/advisor/conversations/:id`. In POST, `body.conversationId` flows into `getMessages` (RLS
> returns an empty history for a foreign id), the **paid model call runs**, and only then does the
> insert fail under RLS inside the committed stream. So U26's owner clause on `appendMessages` is not
> defence in depth *behind* a route check — it is the only application-layer ownership check on that
> write path. Registered in §4.5 as **N-48** with the cost dimension stated (paid-API control, §4 rule 9's
> spirit, not only error hygiene) and owned by **U29**, appended to Group D by the same ruling. U26 does
> **not** add the pre-spend check; that is a declared behaviour change and U29's.
>
> **Caller enumeration (§9.4) — grep across `src/`, `tests/`, `e2e/`; the graph oriented, grep
> enumerated.** `tsc` cannot enumerate callers of a Supabase call, so this list is the enumeration:
>
> | # | Site | Passes today | Will pass |
> |---|---|---|---|
> | 1 | `api/advisor/actions/[id]/undo/route.ts:31` | `getAction(supabase, id)` | `getAction(supabase, user.id, id)` |
> | 2 | `…/undo/route.ts:39` | `getActionsByBatch(supabase, action.batchId)` | `(supabase, user.id, action.batchId)` |
> | 3 | `…/undo/route.ts:47` | `markUndone(supabase, rows[i].id)` | `(supabase, user.id, rows[i].id)` |
> | 4 | `api/advisor/route.ts:179` | `appendMessages(supabase, conversationId, msgs)` | `(supabase, user.id, conversationId, msgs)` |
> | 5 | `…/undo/route.test.ts:121,140` | asserts `({}, "a1")`; reads `c[1]` | `({}, "u1", "a1")`; `c[2]` |
> | 6 | `api/advisor/route.test.ts:268` | asserts `({}, "c-new", […])` | `({}, "u1", "c-new", […])` |
> | 7 | `lib/db/advisor-action-repo.test.ts:67-86` | three "pinned as they are" tests asserting **no** owner filter | rewritten as owner pins |
> | 8 | `lib/advisor/repo.test.ts:292-310` | two `appendMessages` tests | rewritten: owner filter + zero-row throw |
>
> **A premise in the unit brief was wrong and is not acted on:** `src/lib/advisor/actions/execute.ts`
> and `src/services/advisor-actions.ts` do **not** call `markUndone`. The rollback path replays inverses
> through `executeIntent`; the service imports only `recordBatch`. `export-repo.ts` imports only
> `listActionsByUser`, already scoped. None of the three changes.
>
> **Files touched.** M `src/lib/db/advisor-action-repo.ts` · M `src/lib/advisor/repo.ts` · M the two
> routes · M the four test files above · M `src/architecture/repo-scoping.test.ts` (empty the register,
> drop the hardcoded `toHaveLength(4)`, correct the header) · M this document · M
> `docs/project-status.md` §2.5 · N `docs/01-plan/features/u26-bind-owner.plan.md` (bkit cycle artifact,
> subordinate, no status of its own) · M `CLAUDE.md` §9's bkit note.
>
> **Risks.** (1) Three adjacent `string` parameters make a transposed call site type-clean — M4 and the
> positional route-test assertions are the mitigation, and the hazard already exists in
> `conversationBelongsToUser`. (2) The ratchet's `toHaveLength(4)` is a count written once; left behind,
> the empty register is red for the wrong reason.
>
> **Success criteria.** Register empty; M1–M4 shown red with verbatim output; four gate commands green;
> suite count re-measured; CI green on the pushed SHA; N-48 registered; standing claims dated.
>
> **ecc:architect, one question — does `userId` in these signatures cross a §4 boundary or move the
> trust boundary's owner (§4 rule 8)?** **(1) PASS.** No import edge changes; `advisor/repo.ts` stays
> green under `DOMAIN_IS_PURE` because it receives the client as a parameter; the change moves it toward
> the shape the db repos already use. **(2) PASS WITH NOTE.** The boundary relocates from "nothing —
> RLS only" into a testable module, leaving routes only the response decision; bump-first was judged the
> better-aligned ordering because it fails before any side effect and, for the first time, makes the
> `advisor_messages` exemption's stated reason true of this call path. The note is N-48, found
> independently by the reviewer.
>
> **Baseline before (measured 2026-09-11, not copied):** typecheck clean · **1276/105** · graph rebuilt
> (it was 27 days stale).
>
> **bkit revived for this unit** — feature `u26-bind-owner`, state in `.bkit/state/pdca-status.json`,
> cycle artifact at `docs/01-plan/features/u26-bind-owner.plan.md`, subordinate to this entry.

**DONE 2026-09-11.** Baseline before: typecheck clean, **1276/105**, lint 359/359. After: **1278/105**
(+2 — one transposition pin in `advisor-action-repo.test.ts`, one zero-row pin in `advisor/repo.test.ts`;
the ratchet file stays at 17), lint **359/359, 0 errors**, build succeeds. All four re-measured after the
last edit, none copied.

| U26 | before | after |
|---|---|---|
| `UNSCOPED_FUNCTIONS` | 4 entries, asserted as equality | **`{}`**, asserted as equality and `toHaveLength(0)` |
| `advisor_actions` functions binding the owner | 3 of 6 | **6 of 6** |
| application-layer ownership checks on the advisor **write** path | 0 (route never called `conversationBelongsToUser`; RLS only) | 1 — `appendMessages`' owner-scoped bump, before any insert |
| unit tests | 1276 / 105 | **1278 / 105** |

**Files touched in the code commit.** M `src/lib/db/advisor-action-repo.ts` · M `src/lib/advisor/repo.ts`
· M `src/app/api/advisor/actions/[id]/undo/route.ts` · M `src/app/api/advisor/route.ts` · M the four
test files · M `src/architecture/repo-scoping.test.ts` · M this document (plan block, this entry, N-48,
N-49, U29, §5 sequence, §9 sizing) · N `docs/01-plan/features/u26-bind-owner.plan.md`. **Deferred to the
closeout commit, by U19's shape and not by omission:** `docs/project-status.md` §2.5 and `CLAUDE.md` §9's
bkit note — the plan block above lists them under "files touched" for the *unit*, and ecc:code-reviewer's
one advisory was that they were not yet in the working tree at review time. Correct, and intended: the
closeout commit is where U19 and U20 put their status-claim corrections, and the §9 note retires in the same
commit as the closeout entry that states where bkit's state now lives.

**RED LIST — four mutations, every one executed, verbatim.** M1 ran against the **full** register before it
was emptied; M2–M4 against the empty one.

| # | Mutation | Observed |
|---|---|---|
| M1 | fix `getAction` alone, leave its register row | `every registered function STILL violates — a fixed one must be removed` → `expected [ …(3) ] to deeply equal [ …(4) ]` with the diff naming it: `-   "src/lib/db/advisor-action-repo.ts::getAction",` |
| M2 | register emptied, revert `markUndone`'s owner clause | `reports no unscoped access to a user-owned table outside the ratchet` → `+ "src/lib/db/advisor-action-repo.ts::markUndone touches "advisor_actions" (a user-owned table) without binding the owner — it takes a userId and never applies it"` (backticks around `userId` elided from the quote) |
| M3 | same revert, `markUndone`'s own pin | `expected [ [ 'id', 'a1' ] ] to deep equally contain [ 'user_id', 'u1' ]` |
| M4 | pass a second user's id (`"u2"`) to `getAction` in its pin | `expected [ [ 'id', 'a1' ], [ 'user_id', 'u2' ] ] to deep equally contain [ 'user_id', 'u1' ]` — the pin checks the **value**, so a transposed or foreign id cannot stay green |

Both ratchet directions the U26 spec predicted ("both already exist") were exercised rather than trusted:
M1 is fix-without-deregistering, M2 is deregister-without-fixing. The initial red — ten failures across
the four rewritten test files before any source edit — is the TDD half and is not counted as a mutation.

**NO BEHAVIOUR CHANGE IS DECLARED.** No response byte, status, or envelope changes. The one client-visible
path this unit touches — a foreign `conversationId` in `POST /api/advisor` — ends today exactly where it
ended yesterday: a generic `error` event with a correlation id inside the committed stream, raised now by
the repo's owner clause instead of by RLS, after the same paid call (N-48). The undo route's 404 for a
foreign action id is unchanged in bytes: `getAction` returns `null` for a row the caller does not own,
which is what RLS made it return before.

**§5.7 — no new engine, so no threshold entry.** Two existing modules gained a parameter. Their coverage is
governed by the thresholds already in `vitest.config.ts`, which are unchanged.

**ecc:code-reviewer — VERDICT: APPROVE — 1 finding (0 blocking, 1 advisory).** Traced every call site;
confirmed a transposed implementation fails on column-plus-value; confirmed §2.3 rule 13 holds at both
call sites (the new throw is caught by `reportInternalError` / `internalError` and never reaches a client);
confirmed no vacuous pin. The advisory is the "files touched" note answered above.

**ecc:security-reviewer, one question — any remaining path in `src/` by which an authenticated user reads
or mutates another user's `advisor_actions` or `advisor_messages` row? VERDICT: NO REMAINING PATH — 1
finding (0 blocking, 1 advisory).** Every reader and writer of both tables was enumerated. The advisory is a
**new** finding, registered as **N-49** and not absorbed: `confirmAndApply` stamps its own new
`advisor_actions` row with a caller-supplied `conversation_id` that is never checked against
`conversationBelongsToUser`. The row's *owner* is bound (it is the caller's); its *conversation reference*
is not. No reader follows that FK to expose anything, so it is a data-integrity gap, not a cross-tenant
read — and it is exactly the kind of thing "every function binds the owner" could be misread as covering.

**U12 disposition (required by its 2026-08-10 deferral): LANDING, not re-deferred.** Owner ruling
2026-09-11: U12 lands in its own commit after this unit's closeout commit, with its own entry and its own
red-evidence table, and precedes U29 so U29 inherits the unified 404 message.

**bkit PDCA, revived for U26 and driven through the cycle:** feature `u26-bind-owner` in
`.bkit/state/pdca-status.json` (**gitignored** — `.gitignore:68` — so the state is local to this machine and
the tracked record is the artifact); the cycle artifact is `docs/01-plan/features/u26-bind-owner.plan.md`,
subordinate to this entry by ruling; the design decision (bump-first) is recorded in the artifact's design
section rather than in a separate design document, because the unit has one decision and a 3-option
design document for it would be ceremony. `CLAUDE.md` §9's "stale tooling" note retires in the closeout
commit.

**U26 CI — run `34664914852`, green on `66b6322`, 18/18 steps.** Every figure this entry claims was
re-measured by CI independently and matched exactly: lint **359 of 359, 0 errors**; **1278/105**; non-live
E2E **70 passed / 30 skipped**, unchanged with zero specs edited. Recorded because the entry's numbers were
taken on one developer's machine, and §5.1 asks what was run, not what was believed. The SHA reached
`main` by the repository's own path: pushed to `feat/u26-bind-owner`, CI green there, `main` fast-forwarded
to the already-green SHA — a direct push of a new commit to `main` is refused by construction
(`strict: true`, `enforce_admins: true`), which U19 and U20 also went through.

**U26 STAMP ROW** *(standing disposition):*

| U26 closeout | value |
|---|---|
| merged to `main` | **`66b6322`** — fast-forward from `6ec3734`, 1 commit |
| code run | **`34664914852`** — green on `66b6322`, 18/18 steps, on `feat/u26-bind-owner` |
| post-merge `main` run | **`34665120379`** — green on `66b6322`, required check satisfied on the merged SHA |

**THE COUNTS-WRITTEN-ONCE SWEEP (FU-32 class) — every standing claim U26 made false, corrected by dating,
not restating.** Nine sites; two were corrected in the code commit because they sit beside the code:

| # | Site | Claim made false | Correction |
|---|---|---|---|
| 1 | this document, GATE C1 heading (`DISCHARGED, with a named remainder`) | the remainder is open | dated clause appended: remainder closed by U26 |
| 2 | this document, GATE C1 "THE REMAINDER" block, incl. `appendMessages … (check-then-act; only RLS closes the gap)` | four functions unscoped; a route-side check exists | dated note after "Owed by which unit": closed, and the "check" half never existed on POST (N-48) |
| 3 | this document, U10 entry: "Four functions violate today; they are held in a ratchet register" | four | dated clause: zero since U26 |
| 4 | this document, §5 sequence line "remainder → U26" | open | **already dated in `66b6322`**: "CLOSED 2026-09-11" |
| 5 | this document, §6 "Trust boundaries touched" list | omits U26 | U26 appended |
| 6 | `src/architecture/repo-scoping.test.ts` header and `advisor_messages` exemption reason | "take no owner at all"; "the route establishes ownership first via `conversationBelongsToUser`" | **already dated in `66b6322`** |
| 7 | `docs/project-status.md` §2.5: "The gap that remains is the repository layer … exercised only through route tests — tracked as FU-16" | unpinned repo layer | dated paragraph: pinned by U9, guarded by U10, ratchet emptied by U26 |
| 8 | `docs/project-status.md` §2.4: "all persisted with RLS" | true, but the only mechanism | dated clause: owner-bound at the repo layer too since U26 |
| 9 | `CLAUDE.md` §9 note: "the bkit PDCA tooling state is stale … either revive the tooling deliberately or retire it" | tooling unrevived | **retired per §7** — struck with rationale, replaced by where the state lives |

`docs/roadmap.md` was grepped for `REPO_SCOPING`, `GATE C1`, `UNSCOPED` and `bkit`: no hit, nothing to
correct. `.claude/CLAUDE.md` is rank 8 and was not touched.

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

**DONE 2026-08-11, `c514f50`** — code, guard and procedure; CI green on the branch SHA
(run `31454137741`, **93 test files**, with `✓ middleware-scope.test.ts (5 tests)` in the log and
`ƒ Middleware  87.2 kB` in CI's build — the first time either has existed anywhere but one laptop).
**Activation verified by owner-run smoke, 2026-08-11: `docs/05-qa/2026-08-11-middleware-activation-smoke.md`
— ACTIVATION CONFIRMED, no redline.** Suite **1141/92 → 1146/93**; non-live E2E 64 passed / 30 skipped,
unchanged, no spec edited.

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
* **The interim, stated because it is N-29's exact shape at a second site:** ~~until U14's E2E stage lands,~~
  compilation is checked by `npm run verify:middleware` — **developer-run, not CI-enforced**.
  **`MIDDLEWARE_SCOPE` green does not mean the middleware runs.** It means the file is where Next would
  find it. **[2026-08-11] THE INTERIM IS OVER — U14's E2E stage is green in CI on run `31473581501`, and
  its Report-Only assertion cannot pass unless `src/middleware.ts` executed. Liveness is CI-enforced from
  that run forward.** `verify:middleware` remains developer-run and remains useful: it reads the manifest
  directly, so it localises the fault to compilation rather than to whichever assertion happens to notice.

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

**THE SMOKE TOOK TWO RUNS, AND THE FIRST ONE'S FAILURE IS THE MORE USEFUL RECORD.** Run 1 aborted on what
looked like path-dependent cookie persistence — `Set-Cookie` on `/library` and `/profile`, none on
`/stack-lab` and `/advisor`. **Every observation in it was accurate; the inference was not, and neither was
the first diagnosis offered in response.** Three defects, all recorded in the smoke document:

* **The first procedure had no CONTROL step.** It asked *"did a cookie appear?"* without ever establishing
  what its absence means — and absence is the **correct** result whenever no refresh is due. So the
  procedure could not distinguish success from failure on its own central question. Run 2's R3 is the fix
  and it cost one step: `/stack-lab` with a fresh token (`refreshOccurred:false`, no `Set-Cookie`) beside
  R5, `/stack-lab` with an expired one (`expiresInSeconds:−37` → refresh, cookie written). Same route,
  opposite results, ambiguity gone.
* **The diagnosis wrongly called the instrument miscalibrated.** Run 1's step 3 read `exp − now ≈ −34` and
  the diagnosis treated a negative value as impossible for a freshly minted token. It is not: the owner
  supplied the missing timing context — ~2–3 minutes elapsed while learning the devtools workflow — and
  against a 120s expiry `120 − 154 ≈ −34` is what a **correct** decode reports. **Both run-1 decodes were
  right.** Elapsed time was read as measurement error. Recorded because a wrong diagnosis that sounds
  rigorous is more dangerous than an obviously wrong one, and because it was caught only by testimony the
  trace could not contain.
* **Step 3's stop condition covered only the `~1 hour` case**, so a negative reading had no stated meaning
  and the run continued past a step nobody could interpret.

**What the second run changed methodologically:** the owner decodes nothing. A temporary uncommitted probe
in `updateSession` logged `{path, method, kind, hadSession, expiresInSeconds, refreshOccurred, setAllFired,
cookiesWritten}` per request — deliberately logging no token, cookie value, user id or email (§2.3 rule 15)
— and every step carries a stop condition for negative, near-expiry and ~1h readings. **The class of error
that produced run 1's ambiguity is designed out rather than warned about.** The probe was removed before
this commit; `git diff --quiet HEAD` verified.

**Two findings the trace produced, beyond the pass.** (1) Supabase refreshes within a **~90-second margin**
of expiry — visible as refreshes firing at `expiresInSeconds ≈ 88` — so a 120s token leaves only a ~30s
window in which a load does *not* refresh, which is the whole of run 1's "path-dependence": **visit order,
not route identity**, exactly as the three eliminated hypotheses implied. (2) The invisible-consumer theory
was **correct and has a named culprit** — `/.well-known/appspecific/com.chrome.devtools.json`, DevTools'
own background requests, passed through the middleware and consumed refreshes the Doc filter never showed.
**The act of observing consumed the thing being observed.** Registered as **N-36**.

**Unscripted confirmation, recorded because it owes nothing to the procedure:** the first trace line of the
sitting showed run 1's leftover session at `expiresInSeconds:−946` refreshed and persisted on `/`, before
any scripted step ran.

**U28 · Deterministic rendering.** *(created 2026-08-11 by owner ruling — U14's blocker, split out on
U27's precedent.)* M `src/lib/auth/session.ts` · N `scripts/verify-rendering.mjs` + `package.json` · N
`src/architecture/rendering-determinism.test.ts` · M `.github/workflows/ci.yml` · M `CLAUDE.md` §5 · M
`src/architecture/doc-truth.test.ts`. **S/M**, deps none. **U14 rebases on it.**

**THE DEFECT (N-38).** The app's rendering mode depended on whether Supabase env vars were present **at
build time**. `getUser()` returned `null` on `!isSupabaseConfigured()` **before** calling `createClient()`,
and `createClient()` was the only thing that called `cookies()` — the API that opts a route out of static
generation. `TopNav` calls `getUser()` from the root layout on **every** page. So an unconfigured build
prerendered pages that a configured build renders per request. **CI has no credentials by design (P-03 —
this repository is public), so CI had been building a materially different app from production for as long
as CI has existed.** U14 was simply the first unit whose evidence depended on the difference.

**MEASURED, both ways, same commit — the state before this unit:**

| | credentialed | clean-env (CI) |
|---|---|---|
| `/`, `/_not-found`, `/auth/login`, `/auth/signup`, `/library` | `ƒ` Dynamic | **`○` Static** |
| `/library/[slug]` | `●` SSG, **0 HTML emitted** | `●` SSG, **15 HTML emitted** |
| prerendered page `.html` under `.next/server/app` | **0** | **20** |
| `Cache-Control` on `/library/creatine` | `private, no-cache, no-store` | `s-maxage=31536000` |

**A ROUTE-TABLE DIFF ALONE IS NOT SUFFICIENT, and that is measured rather than argued.**
`/library/[slug]` reports `● SSG` in **both** builds while emitting 15 HTML files in one and none in the
other — same label, different artifact. So the evidence bar adds the **emitted-artifact set** to the
route-table diff. Recorded because the weaker check would have passed while the defect survived, which is
this phase's recurring shape.

**DESIGN — the fix goes at the root cause, not the call sites.**
* **REJECTED — per-route `export const dynamic = "force-dynamic"`.** Five page files to touch and a list to
  keep correct forever; cannot cover `/_not-found`; and on `/library/[slug]` it directly contradicts
  `generateStaticParams`. It treats the symptom, and the fix would itself be the thing that goes stale.
* **CHOSEN — make the dynamic dependency unconditional in `getUser()`:** call `cookies()` *before* the
  `isSupabaseConfigured()` short-circuit. The root cause is a *conditional* marker, so the fix is to remove
  the condition. **It converges on credentialed behaviour by construction rather than by enumeration** — the
  unconfigured path is made to do exactly what the configured path already did — and it governs every future
  route automatically, because the marker lives in the layout's dependency rather than a per-page directive.
  It is also honest: the root layout renders auth-dependent navigation, so every page *is* request-dependent.

**THE GUARD — predicate settled, ordering problem addressed head-on (U27's lesson).** The credentialed build
hands us an exact invariant, so the predicate is a zero rather than a route list — lists go stale the first
time someone adds a route:

> **`.next/server/app` must contain no prerendered page `.html`.**

* **Build half — `npm run verify:rendering`, and it runs in CI.** It reads build output, so it cannot be a
  plain vitest test: the declared chain runs `vitest run` **before** `next build`, and a guard whose easiest
  green is *"no build present"* is not a guard. It is a CI step after `Production build`, tripping **GATE
  D1** and carrying the `CLAUDE.md` §5 update in the same commit. **Deliberately NOT deferred to
  developer-run** — three units in a row had shipped a developer-run half (N-29, then U27's liveness), and
  this one costs a directory read with no rebuild, so deferring would have been habit rather than constraint.
* **Source half — `RENDERING_DETERMINISM`, order-safe, runs in today's chain.** Asserts the marker exists,
  is imported from `next/headers`, is `await`ed, and sits **before** the short-circuit.

**RIDER 1 — the marker's mechanics, checked rather than assumed.** *(a)* No caller invokes `getUser()`
outside a request scope: `generateStaticParams` in `src/app/library/[slug]/page.tsx` calls
`getAllSupplements()` and never reaches it; every other call site is a route handler, server component, or
`TopNav`. A future non-request caller will make `cookies()` **throw** rather than silently revert the app to
environment-dependent rendering, which is the correct failure direction. *(b)* **Zero test wiring changes,
and the reason is structural:** 23 test files `vi.mock("@/lib/auth/session")`, so the real `getUser()` never
executes in the unit suite; the single unmocked reference (`auth-coverage.test.ts:277`) is a string literal
inside a fixture. No assertion was touched or weakened.

**RIDER 2 — credentialed behaviour is unchanged, asserted not assumed.** Same tree, marker reverted and
restored, credentialed build both times: **route table UNCHANGED**, **response headers UNCHANGED** (all
three sampled routes keep `private, no-cache, no-store, max-age=0, must-revalidate`), prerendered `.html`
**0 → 0**. The working hypothesis from the A/B's cache-control evidence held: **this unit is a no-op where
production lives.**

**AFTER — the two builds converge:**

| | credentialed | clean-env |
|---|---|---|
| route table | — | **IDENTICAL** ✓ |
| prerendered page `.html` | **0** | **0** ✓ *(was 20)* |
| `verify:rendering` | OK | OK |
| non-live E2E | 64 passed / 30 skipped | **64 passed / 30 skipped** ✓ |

**ALTERNATIVE CONSIDERED AND REJECTED, recorded per the ruling: a static-compatible CSP** — dropping the
nonce for `'unsafe-inline'` or script hashes. It would weaken the policy to accommodate a rendering mode
production does not use, and `'unsafe-inline'` on `script-src` forecloses the enforcing flip permanently.
**Rejected as fixing the measurement instead of the app.**

**RED EVIDENCE — six planned mutations plus one added at authoring time, all executed.** Baseline before the
unit: typecheck clean, **1146/93**, non-live E2E 64/30. After: **1150/94** (+4).

| # | Mutation | Result |
|---|---|---|
| **M1** ★ | Revert the `cookies()` marker — **run both ways**, per Rider 2 | **Credentialed: 0 `.html`, guard exit 0 — GREEN. Clean-env: 20 `.html`, `verify:rendering` exit 1 — RED** (`THIS BUILD PRERENDERED 20 PAGE(S) TO STATIC HTML.`). `next build` exit **0** in both: the build never notices. **The credentialed half is what makes the clean-env red meaningful** — it shows the mutation is invisible where production lives, which is exactly why the defect survived unnoticed |
| **M2** | Delete the marker | **3 failed / 1 passed** — `RENDERING_DETERMINISM: src/lib/auth/session.ts no longer calls cookies().` |
| **M2b** ★ | *(UNPLANNED — added while authoring.)* Marker present but **after** the short-circuit | **1 failed / 3 passed** — `cookies() is called AFTER the isSupabaseConfigured() short-circuit` |
| **M3** | Delete the CI step only | **1 failed / 20 passed** — `DOC_TRUTH: §5's declared CI steps and ci.yml's run: steps have diverged.` |
| **M4** | Change §5's chain only | **1 failed / 20 passed** — same assertion, opposite direction; GATE D1 binds both ways |
| **M5** ★ | Run `verify:rendering` with no `.next` | **exit 1** — `.next/server/app not found. Run npm run build first.` |
| **M6** ★ | Stray `.html` on an otherwise-good build | **exit 1**, naming `__mutation.html` — proves the scan looks rather than trusting the build |

**WHY M2b EXISTS, recorded because it is N-14's lesson applied at authoring time rather than caught in
review.** The first three assertions are file-level: *does the source call `cookies()`*, *is it imported
from `next/headers`*, *is it awaited*. **All three stay GREEN against a `cookies()` call moved below the
`isSupabaseConfigured()` short-circuit — which is the original defect, fully reintroduced, while the guard
reports success.** The marker's *presence* was never the property worth asserting; its *reachability on the
unconfigured path* is. N-14's audit asks of every guard "what would defeat this matching strategy", and
here the answer was a two-line reordering. The ordering assertion was written before the mutation was run,
and M2b then confirmed it reddens — which is the only reason the claim is worth anything.

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

**DONE 2026-08-11, `61ad255`** *(rebased onto U28; originally committed as `2c3c19b`, whose CI run went
**RED** — see below, the record keeps both)*.

**THE BRANCH STORY, because the unit spans two of them.** Work began on `feat/u14-csp` (red first CI run at
`2c3c19b`), was rebased onto U28 and continued as **`feat/u14-csp-r2`**, because a local plugin hook
(**bkit ENH-298**) blocks force pushes as a matter of policy and **was respected rather than routed
around** — the stale remote branch stayed untouched at `2c3c19b` until both were deleted together at merge.
Deleting the remote ref to re-push would have achieved the same rewrite while evading a guard that was
actively refusing it, which is the move §10's rules exist to prevent.

**AND WHY THREE COMMITS RATHER THAN THE APPROVED TWO:** N-29's closed form cites run `31473581501`, a run
that could not exist before commit 2 was pushed, so the citation could not ride in the commit it describes.
The amend that would have preserved the two-commit shape was attempted and reverted — commit 2 was already
pushed and green, so amending it would have required exactly the force push the paragraph above declines.
**The same regress applies one step further out and is stopped rather than chased:** a third CI run covers
this closeout commit itself, and its id is recorded in the merge accounting rather than here, because an
entry cannot cite the run that validates it without yet another commit to hold the citation.

Baseline re-measured on the rebased branch, not copied:
typecheck clean, **1150/94**, non-live E2E 64/30. After: **1175/95** (+25 unit, +6 E2E). Coverage
`src/lib/security` **100/100/100/100** against floors of 90.

**WHAT SHIPPED.** A pure `src/lib/security/csp.ts` (nonce + directives as data), `src/middleware.ts` reduced
to a call composing with U27's `updateSession`, and `Content-Security-Policy-Report-Only` on every matched
response. **The enforcing header stays absent and stays asserted absent** — U13's fifth E2E test was
*narrowed*, deliberately, not deleted, so an enforcing flip is a red rather than a one-word edit.

**THE FIRST ATTEMPT FAILED IN CI, AND THAT RUN IS THE MOST VALUABLE THING IN THIS ENTRY.** Commit `2c3c19b`
was pushed green-locally and CI run **`31465731188`** went red at the new E2E stage: **2 failed / 68 passed /
30 skipped**. `the delivered nonce matches the one in the rendered HTML` → `Error: no nonce in the rendered
HTML`; `a real browser reports ZERO violations` → **72 `script-src-elem` violations**, every chunk plus six
inline scripts. The header arrived fine; the nonce never reached the HTML.

**Root cause: CI was building a different app.** Clean-env builds prerendered pages that credentialed builds
render per request, and a build-time prerender cannot contain a per-request nonce. Registered as **N-38**,
split out under owner ruling as **U28**, and fixed there. **U14 did not cause it — U14 was the first thing
whose evidence depended on it**, because a nonce is the first artifact this app ever shipped that a
prerender physically cannot hold.

**THE MEASUREMENT WAS CONTAMINATED, AND THE ACCOUNT STAYS IN FULL RATHER THAN BEING TIDIED.** Before that
push, this unit reported to the owner: *rendering mode unchanged, SSG pages do not violate, zero violations,
nonce matches on every route class.* **The "zero violations" claim was false**, and it was false because
every CSP measurement was taken with `.env.local` present, which forced `cookies()` and made every route
dynamic — so no static page was ever served and the failure mode could not appear. **Rider 2 had named this
exact risk in advance** — *"a per-request nonce cannot reach statically generated pages; the public Library
is the pillar most likely affected"* — and the answer given was the opposite of the truth.

**The process error is specific and worth more than the bug.** A clean-env simulation existed and had been
run — for Ruling Q1, against **U27's** code, *before* CSP existed — and was never re-run after the CSP
landed. The one check that would have caught this was in hand and executed at the wrong time. **Hence the
both-envs discipline U28 institutes and this unit now follows:** any measurement whose result could depend
on build-time configuration is taken in BOTH environments and the two must agree.

**RE-MEASURED AFTER U28, BOTH ENVIRONMENTS — clean-env is the load-bearing half, because it is what CI
judges and what failed:**

| | credentialed | clean-env (CI shape) |
|---|---|---|
| prerendered page `.html` | 0 | **0** *(was 20)* |
| `verify:rendering` | OK | OK |
| header nonce == HTML nonce on `/library/creatine` | YES | **YES** *(was: no nonce in HTML)* |
| browser violation set | **0** | **0** *(was 72)* |
| non-live E2E | **70 passed / 30 skipped** | **70 passed / 30 skipped** |

**TWO DESIGN QUESTIONS ANSWERED BY MEASUREMENT, NOT ASSUMPTION** — and now answered in both environments:
Next threads the nonce under the **Report-Only** variant (not only the documented enforcing one), and
`next/font`'s injected `<style>` is nonce'd. Header and HTML nonces match on every route class including the
`● SSG`-labelled Library detail page.

**N-29 — DISCHARGED IN U14, IN ONE COMMIT, AND THE DISCHARGE IS NOW COMPLETE.** The three things the
ruling required land together in `61ad255`: (1) the CI E2E stage, (2) its **GATE D1** update to `CLAUDE.md`
§5's declared chain in the same commit, (3) `security-headers.spec.ts` inside that stage's run set — and the
stage runs the **full** non-live suite, not just that spec, because the clean-env simulation showed all 64
green with no secrets present.

**CLOSED BY RUN `31473581501` on `a1a9fc0`, 2026-08-11 — green.** The stage ran the **full** non-live suite,
**70 passed / 30 skipped** (100 collected, 2 workers), in **38.3 s** of test time and **39 s** of step
wall-clock, with the browser install a further 26 s. **That run is the first green execution of
response-byte verification in this repository's history.** Every prior security-header claim rested either
on a config test — which reads `next.config.ts`, not a response — or on a developer running Playwright by
hand on their own machine. From this run forward, the assertion that a header **arrives** is enforced on
every push, which is what §10.3 has always required and what N-29 recorded the absence of.

**The caveat this row carried until now, kept because it is the whole point of it: a CI stage that has
never been green is still a claim about a YAML file.** Run `31465731188` proved the **mechanism** — full
suite collected, 30 gated specs skipped, correct failure propagation, **≈39 s** stage wall-clock — by
failing honestly on a real defect (N-38). Run `31473581501` proves the **stage**. The two together are the
discharge: one showed it can fail, the other that it can pass, and a guard that has only ever done one of
those is not yet known to be a guard.

**U27's liveness obligation closes here.** `MIDDLEWARE_SCOPE` is source-level, and `verify:middleware` needs
a build the declared chain lacks when `vitest` runs. The Report-Only header cannot exist unless
`src/middleware.ts` executed, so the E2E assertion *is* U27's liveness proof — stated in the spec so that
deleting the block is visibly also a decision about U27.

**RED EVIDENCE — ten mutations, all executed.**

| # | Mutation | Result |
|---|---|---|
| **M1** | Drop the nonce substitution | **1 failed / 50 passed** — `expected … not to contain '\'nonce-NONCE\''` |
| **M2** | `generateNonce` returns a constant | **3 failed / 48 passed** — encoding pin, `expected 1 to be 200` (freshness over 200 calls), `expected [] to deeply equal [ 16 ]` (CSPRNG default no longer called) |
| **M3** | Emit the **enforcing** header instead of Report-Only | **6 E2E failed** — U13's narrowed absence assertion plus all four Report-Only assertions |
| **M4** | Remove `frame-ancestors 'none'` | **2 failed / 49 passed** — exact-set and value pins |
| **M5** | Inline a policy literal into `src/middleware.ts` | **1 failed / 50 passed** — `MIDDLEWARE_SCOPE: logic appeared in the middleware:` |
| **M6** | Delete the E2E step from `ci.yml` only | **1 failed / 20 passed** — `DOC_TRUTH: §5's declared CI steps and ci.yml's run: steps have diverged.` |
| **M7** | Change §5's chain only | **1 failed / 20 passed** — same assertion, opposite direction |
| **M8** ★ | Delete the response-header set in middleware | **Unit suite 25 passed — GREEN. E2E 5 failed.** The config-vs-bytes non-redundancy proof, U13's M1 shape: the builder is provably correct while zero bytes reach a client |
| **M9** | Add `'unsafe-inline'` to `script-src` | **1 failed / 50 passed** — the pinned refusal |
| **M10** ★ | `style-src 'none'` — **re-run in CLEAN-ENV after U28** | **Collector RED**, `[report] style-src-elem <- /_next/static/css/…css`. **Re-run deliberately in the environment CI judges**, because the original M10 was taken in the contaminated one |

**M8 and M10 are the two that matter.** M8 proves the unit test cannot see delivery; M10 proves the collector
can see a violation. Without them the other eight assert things about a system nobody had shown could fail —
and "zero violations" would be exactly the unfalsifiable claim that this unit already got wrong once.

**PLAN WORK SUPERSEDED IN PART BY U28.** An earlier draft of this entry was written before the red run and
parked; on resumption it was reconciled piecemeal rather than applied wholesale. Its **N-33** update was
salvaged (the pinned refusal did ship). Its **N-37** was **discarded**: that row was authored from a
credentialed-only three-build A/B, and U28 re-authored it on `main` with a corrected evidence cell and an
explicit provenance note. Its DONE line carried a `<COMMIT1>` placeholder and a success claim that the CI run
had already falsified, so the entry above was rewritten rather than patched.

**U15 · Migration tooling.** *(roadmap 6; named exit criterion)* **M/L**, deps U3 (**MET**), U5 (**MET**).
~~Its exit criterion is unmeetable as written — see §7 decision 5.~~ Reworded 2026-08-08; **and the
rewording was still not executable — see below.**

**DONE 2026-08-12, `7e9a395`** (+ `b8b9970` the sitting procedure, + the closeout). Baseline before: typecheck clean, **1175/95**, non-live E2E 70/30.
After: **1186/96** (+13 `MIGRATION_TOOLING`, doc-truth bindings added to existing tests, **−2** with `recordUsage`).

**U14 STAMP ROW** *(standing disposition — an entry cites the runs that existed before its final commit;
the merge SHA and the runs after it are stamped by the next natural docs commit, which is this one):*

| U14 closeout | value |
|---|---|
| merged to `main` | **`c266c4b`** |
| docs-only run (commit 3) | **`31474385556`** — green, 70/30 |
| post-merge `main` run | **`31474693567`** — green, 70/30, required check satisfied on the merged SHA |

---

**THE CRITERION'S INSTRUMENT DID NOT EXIST, AND THAT IS THIS UNIT'S FIRST FINDING.** Decision 5 reworded
the criterion to *"applying every file in `supabase/migrations/` in order to a **throwaway Postgres**"*.
Measured before any code was written: **the migration set cannot apply to a throwaway Postgres.** It fails
at `0001_init.sql` line 7.

| Dependency on Supabase's `auth` schema | count |
|---|---|
| `references auth.users(id)` | **10** FKs (0001×3, 0002, 0003×2, 0004, 0006, 0007, 0009) |
| `auth.uid()` in policy clauses | **43** (every file except 0005) |
| grants/policies naming `authenticated` / `anon` | **9 / 1** |

**Decision 5 made the criterion measurable in principle without checking that its instrument existed — the
same defect it was written to fix, one level down.** Registered as **N-39**. It is not a reason to weaken
the criterion again: the instrument was buildable, and building it is most of this unit.

**RULED OPTION B, 2026-08-12:** stock `postgres:16` plus `supabase/ci/auth-prelude.sql`, a **labelled test
double**. Three owner conditions, all met: the prelude is minimal (only the four referenced things), its
header states what it is *not*, and the dated record anchors its assumptions against the live database.
**What CI proves: the set is INTERNALLY coherent.** What it does not prove: that the deployed `auth`
schema conforms — that residue is the dated record, exactly as the criterion's live-database residue
already is.

**ALTERNATIVE CONSIDERED AND REJECTED, recorded so it is not re-proposed:** the Supabase CLI's local stack
(`supabase start`), which runs real GoTrue and would need no double. Rejected on two grounds. It needs
Docker in CI and on any developer's machine that wants to reproduce the check, and — decisively — **it was
not simulable on the machine this unit was built on**, so wiring it would have made the first CI run its
first execution ever. That is precisely how U14's stage went red. Roadmap item 6's "Supabase CLI" is
satisfied a different way: the CLI is how `db:migrate` **applies** migrations, and plain Postgres is how CI
**proves** them. Two jobs, and conflating them is what made the CLI look mandatory.

**N-16 CLOSES AGAINST THE CATALOG, NOT AGAINST THE TEXT GUARD ITS OWN ROW PRESCRIBED.** The finding asked
for a `COUNTER_TABLES` rule inside `rls-coverage.test.ts`. That guard's policy pattern captures a policy's
**name and table and discards the command clause**, so closing it there meant teaching a text parser to
read `for all` — the literal-matching fragility N-14's audit exists to warn about. `pg_policies.cmd` is the
**effective** command computed by Postgres after the whole set is applied. **M7 is the demonstration and it
is why the deviation is not a preference:** a widening `create policy … for all` on `advisor_usage` turns
the catalog assertion **RED** while `rls-coverage.test.ts` stays **GREEN, 22/22**. The prescribed fix would
have been the weaker one. `rls-coverage.test.ts` is untouched.

**N-13: THE PRESERVATION RATIONALE WAS FALSE, NOT STALE.** `recordUsage` carried the note *"retained only
because `npm run db:seed` runs under the service-role key … deleting it would be a change to the seed path
under U4's name."* Measured: **`src/lib/db/seed.ts` has never referenced `advisor_usage`**, and the
function had **zero callers anywhere in `src/` outside its own test file**. It was never seed-path code, so
§8.1's argument for leaving it alone never applied to it. Deleted, with the correction written into
`repo.ts` where the false claim used to sit rather than only here. **The transferable part: a
`@deprecated` tag plus a plausible retention story reads exactly like a considered decision, and nothing
in the toolchain checks whether the story is true.** It was one `grep` away for four units.

**THE ROLLBACK STORY IS DOCUMENTATION, AND IT SAYS SO.** Roadmap item 6 asks for one. It lives in the dated
record's §4, beside OP-1's residual — which is the other half of the same story and the half with teeth
(*"rolling back the code without rolling back 0008 recreates the same failure"*). Written as what it is:
this schema is **forward-only**, rollback means a new forward migration, and point-in-time recovery is a
platform feature this repository does not provide. **The section states in its own text that §10.3's logic
applies to it — a procedure in a markdown file is a claim nothing tests.** No reversibility tooling was
built, deliberately: a confident `db:rollback` that cannot restore state is the §8.3 trust defect, not a
convenience.

**MEASURED COLLATERAL, recorded because both are evidence about the apparatus rather than the product.**
*(i)* The throwaway shell harness used while scoping this unit reported a **broken migration as `exit=0`**,
because a shell `if` consumed `$?`. That bug became **M4**. *(ii)* Local simulation required a
**machine-level install**: `postgresql@16` (16.14, Homebrew, 68.7 MB), run as an ad-hoc instance
(`initdb` into a scratch directory, socket-only, `pg_ctl` start/stop per run) with **no service
registered**. A **pre-existing PostgreSQL 18 system daemon** was already running on that machine and was
left untouched; an earlier orientation note in this session said `psql` was "absent", which was true of
`PATH` and false of the machine. The "works on this machine" precondition is therefore: a Postgres 16
client and server on `PATH`, or `PGHOST`/`PGPORT` pointing at one. CI supplies its own.

**ONE FILE-LIST DEVIATION, declared rather than absorbed.** The approved list had **N `supabase/config.toml`**;
it was **not created**. `db:migrate` is `supabase db push`, and that file is generated by `supabase init` /
`supabase link` against a CLI whose schema is version-specific. The CLI is not installed on this machine, so
anything written here would be a hand-authored approximation **nothing available could validate** — §2.2
rule 8's shape exactly, and a wrong config that looks official is worse than none, because it gets edited
instead of regenerated. The operator prerequisite is documented in the dated record's **§0** instead, and
**nothing in CI depends on it**: the coherence step drives `psql` against a service container and never
invokes the CLI.

**THE DEVIATION HAD A SECOND HALF, AND IT WAS A TRUST DEFECT UNTIL IT WAS FIXED.** `db:migrate` was
`supabase db push`. Measured on a machine without the CLI — which, after the refusal above, is the
*expected* state of a fresh clone:

```
$ npm run db:migrate
sh: supabase: command not found          EXIT=127
```

That names neither the CLI, nor `supabase link`, nor why `config.toml` is absent. **§8.3: an affordance
that fails obscurely is a trust defect, not a neutral stub** — and refusing to ship the config while
leaving the command to fail like that would have made the refusal *look* like an oversight. `db:migrate`
now goes through `scripts/db-migrate.mjs`, which checks two preconditions, explains either, points at the
record's §0/§4, and notes that **`verify:migrations` needs none of it**. It does not replace or simulate
the CLI: it hands over to `supabase db push` and **exits with that command's status** — because a wrapper
that turned a failed push into a success would tell an operator their migrations are deployed when they
are not, which is strictly worse than the obscure error it replaced. **M11** is that assertion's proof.

**RED EVIDENCE — thirteen mutations, all executed.**

| # | Mutation | Result |
|---|---|---|
| **M1** | Break a statement in `0006` | **red, exit 1** — `MIGRATION SET IS NOT COHERENT — 0006_checkins.sql failed to apply`, quoting psql's error and `Applied cleanly before it: 5 of 9` |
| **M2** | Point the runner at an empty directory | **red, exit 1** — `applied 0 migrations`. U27 M5's shape at a second site |
| **M3** | Replace the directory read with a hardcoded 9-file list | **guard red** — `must enumerate the migration directory` |
| **M4** ★ | `void error; continue;` in the migration loop's catch | **RED ONLY ON THE THIRD FORM OF THE GUARD — see below** |
| **M4b** | The cruder swallow: `\|\| true` on the psql call | **guard red** — `must not neutralise a command's exit status` |
| **M5** | Copy the prelude into `supabase/migrations/` and track it | **guard red** — `the auth prelude appears to have moved into the migration set` |
| **M6** | `create table public.smuggled_in` appended to the prelude | **guard red** — `expected [ 'table public.smuggled_in' ] to deeply equal []` |
| **M7** ★ | `create policy … for all` on `advisor_usage` in a new `0010` | **Catalog RED** — `COUNTER TABLE WIDENED … own_advisor_usage_write (ALL)`. **`rls-coverage.test.ts` GREEN, 22/22.** N-16's actual discharge, and the proof its prescribed fix was weaker |
| **M8** | Delete the CI step only | `DOC_TRUTH` red — `§5's declared CI steps and ci.yml's run: steps have diverged` |
| **M9** | Delete the step from §5's chain only | `DOC_TRUTH` red — same assertion, opposite direction |
| **M10** | Remove the prelude entirely | **red at `0001`** — `schema "auth" does not exist`, `Applied cleanly before it: 0 of 9`. The double is load-bearing, not decorative |
| **M11** | `db-migrate.mjs` returns `process.exit(0)` instead of the CLI's status | **guard red** — `must exit with the CLI's own status`. The failure it prevents is worse than the one the wrapper fixes: a failed push reported as a deploy |
| **M12** | Strip `supabase link --project-ref` out of the wrapper's message | **guard red** — the instructive message is the deliverable, so it is pinned rather than trusted to survive an edit |

**M4 IS THE MOST INSTRUCTIVE ROW AND IT IS AN INDICTMENT OF THE GUARD, NOT OF THE MUTATION.** The
assertion had to be corrected **twice** before it could see the bug it was written for:

1. **First form** — regex over catch bodies, terminated at `\n}`. The runner's catches are **indented**, so
   the captured "body" ran past the block and swept up a `fail(` from further down the file. **Green.**
2. **Second form** — brace-matched bodies, rule *"every catch contains `fail(` or `throw`"*. Still
   **green**: `void error; continue; fail(…)` **does** contain `fail(` — unreachable, after a `continue`.
   **Presence is not reachability (§5.3), and a does-the-word-appear rule cannot tell them apart.**
3. **Third form** — *"fail or throw must be the catch's FIRST statement"*. **Red.**

Two green forms of a guard, against a mutation that disables the entire check. §5.2's rule earns its
keep here: a test that has not been shown to go red against the bug it targets **is not a guard**, and
neither reasoning nor a careful reading would have caught either form.

**CI EVIDENCE — the coherence step went green on its FIRST run, which is worth stating because the last
two units' new steps did not.**

| Run | SHA | Coherence step | Suite |
|---|---|---|---|
| **`31560224886`** | `7e9a395` | **success, 2 s** | 70/30 |
| **`31560792889`** | `b8b9970` | **success, 1 s** | 70/30 |

**Cost of the Postgres service container, measured rather than estimated: 24 s then 20 s to initialise, 0 s
to stop; the check itself is 1–2 s.** Job wall-clock went **158 s → 199 s**, of which ~26 s is attributable
and the rest is runner variance (E2E drifted 39.7 → 43.5 s on identical specs). **The container is roughly
twelve times the cost of the thing it enables**, and is still the right trade: the alternative is a fixture,
and a fixture cannot fail the way a real Postgres can. **The first-run green is not luck — it is what the
local simulation bought**, which is the whole argument for the machine-level install.

**THE OWNER SITTING IS COMPLETE — `docs/05-qa/2026-08-12-deployed-schema-record.md`, run 2026-08-12, ALL
THREE PARTS PASS.** One sitting cleared three obligations: U15's deployed-schema record and the Option B
condition (c) anchors, **OP-3**, and **N-28** (with **N-27 (i)** as collateral — `settle_advisor_tokens`
executed against the deployed ledger for the first time, `300 | 50` matching the derivation exactly).

**The exit criterion is now met in both halves** — CI proves the set coherent, and the dated record
discharges the live-database residue. The roadmap box is ticked on that basis and not before.

**FOUR THINGS THE SITTING PRODUCED THAT THE PROCEDURE DID NOT PREDICT**, each recorded in the record and
worth carrying forward:

1. **The near-miss, which is the most valuable thing in the whole unit.** The SQL editor *displayed* **12**
   tables — `advisor_actions` scrolled off the top — and **the U16/U17 exit criterion says "all 12".** A
   reading of 12 would have matched the criterion exactly, "confirmed" a number nobody has ever
   enumerated, and closed U15's open question **in the wrong direction, with a screenshot as evidence.**
   The owner asked the database to `count(*)` instead: **13**, confirmed by a direct probe. **Two errors
   would have cancelled, and the cancellation would have looked like agreement.** The general form: *a
   check that agrees with a number you already expected deserves more scrutiny than one that disagrees.*
2. **The deployed server is PostgreSQL 17.6; CI pins `postgres:16`.** Not a defect — every object in the
   set is version-neutral SQL and Part 1 confirms the deployed schema matches — but the two are **not the
   same Postgres**, and the record says so rather than letting a green step imply otherwise.
3. **Part 2's restoration is value-level, not existence-level.** Step 1 found no row; A's committed
   reservation created one, and the repair returned it to `0 | 0` rather than deleting it. **Provably
   benign**: `getRemainingBudget` computes `used = row ? input + output : 0`, so an absent row and a
   `0 | 0` row are indistinguishable, and `reserve_advisor_tokens` opens with `insert … on conflict do
   nothing` anyway — the sitting produced exactly the row the next real turn would have. Recorded because
   *"the ledger was restored"* and *"the database was restored"* are different claims and only the first
   is true.
4. **The session pooler matters for OP-3.** Port 5432 in **session** mode; a transaction-mode pooler does
   not hold a session across statements and would have silently broken the two-terminal contention test —
   it would have looked like "B didn't block". Plus a shell detail worth carrying: the connection URI needs
   **single** quotes, because `!` in the password triggers history expansion and the failure presents as an
   authentication error rather than a shell one.

> **[2026-08-12, flagged by U15 — NOT acted on there] THE TABLE COUNT IN U16/U17's CRITERION MAY BE
> WRONG.** The exit criterion says a user can *"export their data and delete all of it across the **12**
> tables"*. The migration set creates **13**: `advisor_actions`, `advisor_conversations`,
> `advisor_messages`, `advisor_usage`, `api_rate_limits`, `checkins`, `evaluation_flags`, `lab_markers`,
> `lab_panels`, `side_effect_reports`, `stack_items`, `stacks`, `user_profiles` — measured against a real
> Postgres by `npm run verify:migrations`, not counted from the files by eye. The difference is presumably
> `api_rate_limits` (a counter keyed by an opaque bucket, not user data), but **which twelve the criterion
> means has never been written down**, and `advisor_usage` is a counter that nonetheless carries a
> `user_id`. **U16/U17 must enumerate the twelve explicitly before claiming the criterion**, because
> "all 12" is unfalsifiable while the list is implicit — and an export that silently omits a table is the
> failure mode this criterion exists to prevent. Registered here rather than fixed: U15 owns neither
> route, and guessing the intended list would be authoring the very claim that needs deciding.
>
> **[2026-08-12] THE OWNER SITTING NEARLY CLOSED THIS IN THE WRONG DIRECTION, WHICH RAISES ITS PRIORITY.**
> The SQL editor *displayed* **12** tables — `advisor_actions` had scrolled off the top of the list view.
> **12 is exactly what this criterion says**, so a reader trusting the display would have "confirmed" the
> criterion against a rendering artifact and closed this note. `count(*)` returned **13**, and a direct
> probe for `advisor_actions` returned 1 row. **Two errors would have cancelled and looked like
> agreement.** U16/U17 must enumerate the twelve **by name, from `pg_tables`, counted by the database**,
> and state which table is excluded and why — not read a list off a screen.
>
> **[2026-08-13] ANSWERED BY U16, AND ENFORCED RATHER THAN WRITTEN DOWN.** The twelve are the nine tables
> with a NOT NULL `user_id` plus the three owned through a parent; the thirteenth, `api_rate_limits`, is
> excluded because migration 0009 states its `user_id` *"is not the key"* — it is keyed on an opaque
> `bucket_key`, its owner column is the only nullable one of the thirteen, and a row may describe no user
> at all. **`EXPORT_COVERAGE` derives that partition from the migrations on every run**, so a future table
> is red until dispositioned in writing. **U17 inherits the answer and must not re-derive it by eye:** the
> deletion half should consume the same partition, so export and deletion cannot disagree about what "the
> user's data" means — two lists would be two chances to be wrong.

**U16 · Data export.** *(roadmap 8, read half; half of a named exit criterion)* **M**, deps U9 (**MET —
DONE 2026-08-10**).

**DONE 2026-08-13, `a087715`.** Baseline before: typecheck clean, **1186/96**, non-live E2E 70/30.
After: **1218/99** (+32: `EXPORT_COVERAGE` 7, `ROUTE_CONTRACT` 10, route 6, `export-repo` 5, repo readers 4).

**U15 STAMP ROW** *(standing disposition):*

| U15 closeout | value |
|---|---|
| merged to `main` | **`a045e3f`** |
| closeout run | **`31563080393`** — green, coherence step included |
| post-merge `main` run | **`31563281454`** — green, required check satisfied on the merged SHA |

---

**THE TWELVE, ENUMERATED AND ARGUED FROM THE SCHEMA — the unit's first order of business.** The criterion
says "all 12"; the schema has **13**; which twelve had never been written anywhere.

* **Directly owned (9)** — `user_id uuid NOT NULL references auth.users(id)`: `user_profiles`, `stacks`,
  `lab_panels`, `lab_markers`, `advisor_conversations`, `advisor_actions`, `advisor_usage`, `checkins`,
  `side_effect_reports`.
* **Transitively owned (3)**: `stack_items` → `stacks.user_id`, `evaluation_flags` → `stacks.user_id`,
  `advisor_messages` → `advisor_conversations.user_id`. *(Independently corroborated: these are exactly
  `REPO_SCOPING`'s three `EXEMPT_TABLES`, which were derived for a different reason entirely.)*

9 + 3 = **12**. **The thirteenth, `api_rate_limits`, is excluded, and migration 0009 makes the argument
itself** rather than leaving it to inference: *"`user_id` is kept ALONGSIDE it, nullable, purely so RLS can
grant the SELECT — **it is not the key**"*. Three structural facts, none true of any of the twelve: the
primary key is `(bucket_key, window_start)`; its `user_id` is **the only nullable ownership column among
the thirteen**; and `bucket_key` is deliberately opaque so a future per-IP bucket needs no migration — so a
row there may describe **no user at all**. It is a limiter's state about a bucket, not a fact about a
person.

**And the enumeration is enforced, not recorded.** `EXPORT_COVERAGE` derives the partition from the
migrations — *every table = exported + excluded, nothing in both, nothing in neither* — so a table added by
a future migration is red until someone decides in writing which side it is on. **"12" is pinned only as a
snapshot of today's left-hand side, never as the rule.** After the near-miss at the U15 sitting, where a
scrolled-off list view nearly confirmed the wrong number *because it matched the criterion*, a prose list
was not a defensible instrument.

**FU-13 CLOSED — §10.1 IS EXECUTABLE.** `ROUTE_CONTRACT` replaces the nine-file prose exemption list with a
named list carrying every original reason, and asserts: every route has a test; every test asserts **401**;
every test asserts a success status; every **input-validating** route asserts **400**; and the exemption
list is **set-equal** to the non-validating routes, so it rots in neither direction. Measured before
building: **23 routes, 14 validating, 9 exempt, 23/23 on 401 and success, 14/14 on 400** — the guard passes
today, so the cost was the guard and not a cleanup.

**The residual is disclosed in the guard's header, N-14 style, and accepted on stated terms.** The
validating/non-validating split is `grep '.parse('` — a literal match. A hand-rolled validator is
classified non-validating, lands in the exemption list, and **its written reason will be false**. That is a
visible wrong thing that someone had to author, where prose's failure mode is silence. **It is an
improvement, not a solution, and the header says so.**

**§2.3 RULE 15 — asserted behaviourally, in two halves, because one was not enough.** Console spies over
`log`/`error`/`warn`/`info`/`debug`, with real-shaped sentinels (`SENTINEL-WARFARIN-5MG`,
`SENTINEL-TSH-8.4-MIU-L`) rather than generic markers — a `"x"` would pass a test a drug name fails.

**A TRUNCATION TRAP FOUND WHILE COMPOSING, AND THE UNIT'S ONE FILE-LIST DEVIATION.** `listCheckins` and
`listSideEffectReports` both default to a **90-day window**. An export built on them returns the last 90
days and **looks complete** — the failure mode is silence, which is the worst shape for a "download all my
data" feature. Fixed by adding `listAllCheckins` / `listAllSideEffectReports` (two repo functions and two
tests beyond the approved list). **Expressing "all of it" as a large `days` argument was rejected: that is
a lie shaped like a parameter**, and it leaves the window in place for anyone with a longer history. **M11**
pins it — swapping a windowed reader back in is red.

**SCOPE HONESTY IN THE ARTIFACT, per the rider.** The payload carries a `notIncluded[]` of
`{what, where, why}`: the **auth identity row** (email and sign-in metadata live in `auth.users`, a schema
this application does not own) and **rate-limiter state**. A user opening "an export of my data" should not
have to diff the schema to learn what is not in it. Asserted by both the route test and
`EXPORT_COVERAGE`.

**RED EVIDENCE — eleven mutations, all executed.**

| # | Mutation | Result |
|---|---|---|
| **M1** | Drop `checkins` from the export map | `EXPORT_COVERAGE` red — `expected [ 'checkins' ] to deeply equal []`, plus the 12-count snapshot |
| **M2** ★ | A 14th user-owned table (`mood_journal`) in a scratch `0010` | red — `expected [ 'mood_journal' ]`. **Cleanup verified: `git status --short` byte-identical to the pre-mutation snapshot** |
| **M3** | Export the excluded `api_rate_limits` | red both ways — *"both exported and listed as excluded"* **and** *"declares table(s) it never queried"* |
| **M4** ★ | `console.log(payload)` in the route | red — `§2.3 rule 15 VIOLATION: the medication value … reached a logger` |
| **M5** ★ | The logging call **one layer down**, inside `export-repo` | **GREEN on the first attempt — the guard was wrong. See below.** Red after correction |
| **M6** | Break the 400 assertion in a validating route's test | `ROUTE_CONTRACT` red — names `checkins/route.ts` |
| **M7** | A new non-validating route absent from the exemption list | red — *"no 400 test and no exemption entry"*, plus the missing-test-file assertion |
| **M8** | Make an exempted route validate input, leaving it listed | red — *"exempted route(s) that now validate request input … the exemption is stale"* |
| **M9** | Drop the export route's `unauthorized()` | route test red — `expected 500 to be 401` |
| **M10** | Export a different user's id | red — `expected "spy" to be called with [ Anything, 'u1' ]`, got `"someone-else"` |
| **M11** | Swap the windowed reader back into the export | red — *"exportUserData bounded a read"* |

**M5 CAUGHT A FALSE CLAIM IN THIS UNIT'S OWN TEST HEADER, WHICH IS THE MOST USEFUL THING IT DID.**
`route.test.ts` asserted that its console spy covered *"anywhere beneath the route, not merely in
route.ts"*. **It does not.** The file mocks `@/lib/db/export-repo`, so the real repository never executes
there — a `console.error` added inside `exportUserData` left it green. The claim was written in good faith
and was false, and **only running the mutation revealed it; reading the file would not have.** Corrected by
splitting the coverage and saying what each half sees: `route.test.ts` proves the **route** does not log
what it received; `export-repo.test.ts` exercises the **real repository** against a stub client and proves
it does not log what it read. Neither implies the other, and the headers now say so.
**Second unit running: U15's M4 needed three forms of a guard, U16's M5 needed the coverage restructured.
Both were guards that looked right and asserted nothing.**

**ONE PROCESS ERROR WORTH RECORDING.** The first draft of `EXEMPT_NO_400` was **transcribed from memory
rather than from §10.1** and got four of the nine entries wrong — it invented `library/[slug]` and
`stacks/[id]` and omitted `side-effects` and `stacks/[id]/compare`. The guard caught it immediately, on
first run, by set-equality against the measured non-validating set. **§10.1's own closing line says
*"re-derive the 9 with the two commands above rather than trusting the table"*, and that instruction was
not followed.** The guard now performs that re-derivation on every run, which is precisely the point of
building it.

**WHAT THIS UNIT DOES NOT CLOSE.** The exit criterion covers export **and deletion**; this is the read half
only. It is not ticked. **GATE D2** governs U17 and is untouched here.

**U17 · Data deletion.** *(roadmap 8, write half; completes a named exit criterion)* **M/L**, deps U9,
U16 (**both MET**). **Highest-risk new surface in the phase.**

**U16 STAMP ROW** *(standing disposition):*

| U16 closeout | value |
|---|---|
| merged to `main` | **`a087715`** |
| closeout run | **`31662808694`** — green |
| post-merge `main` run | **`31663090063`** — green, required check satisfied |

**DONE 2026-08-17, `55c74f6`** (+ `70525a2`, the derived summary and the OP-7 procedure).
Baseline before: typecheck clean, **1218/99**, non-live E2E 70/30.
After: **1245/102** (+27: route 15, `delete-repo` 7, `SQL_FUNCTION_REGISTRY` +5).
CI: **`31875356506`** green on `55c74f6` — the first execution of `0010`'s cascade and cross-user probes;
**`32013610775`** green on `70525a2`, whose log carries the eight-claim derived summary.
**OP-7 discharged 2026-08-17** — `0010` is live on the deployed database.

---

**THE FINDING THAT RESHAPED THE UNIT, FOUND BEFORE ANY CODE.** `advisor_usage` is **SELECT-only** for the
end user — migration 0008 removed INSERT/UPDATE/DELETE deliberately in U3, so nobody could reset their own
token budget. **It is also one of the twelve tables this criterion covers.** Measured against the applied
schema: 11 tables `ALL`, `advisor_usage` and `api_rate_limits` `SELECT`.

So a client-side deletion loop would delete eleven tables and, on the twelfth, **be filtered to zero rows by
RLS — silently**. An RLS denial of DELETE is an empty result, not an error (measured, OP-2). The route would
report success with the user's usage history intact. **A `SECURITY DEFINER` function is therefore not an
optimisation here; it is the only way one of the twelve can be deleted at all.** It also makes the deletion
atomic, which a client cannot: `supabase-js` has no transaction API.

**The irony belongs in the record: U3's correct security decision is exactly what blocks the deletion half
of the criterion, and the definer function is how both properties hold at once.**

**THE SINGLE HIGHEST-STAKES ASSERTION IN THE REPOSITORY.** `delete_all_user_data()` **takes no parameters**
and derives its owner from `auth.uid()` inside the body. Given a `p_user_id`, any authenticated caller
could irreversibly erase any other account — RLS is bypassed by construction, and the call would look
ordinary in every log. `SQL_FUNCTION_REGISTRY` pins it as a **hard zero** rather than "no parameter named
like a user id", so nobody has to judge which parameters are safe. **M1 is red from the executed mutation,
and two assertions fired** — the new pin *and* a pre-existing identity-parameter rule already watching for
this shape.

**WHAT COULD NOT BE TESTED FROM TYPESCRIPT, AND WHERE IT MOVED TO.** The plan specified a wrong-value probe
per §6.2.2 — `deleteAllForCaller(supabase, "u-other")`. **That mutation would have been a no-op**: the RPC
takes no arguments, so a user id passed from TypeScript is ignored. §6.2.2's lesson recurring one level
down, and the reason the repository function takes no user id at all. **The ownership proof moved into
SQL**: `verify:migrations` seeds two users, deletes as one, and asserts the other's rows survive (**M3**).

**PROVING THE CASCADES INSTEAD OF READING THEM.** The stub's claim was *"cascades verified 12/12
reachable"* — FK text. U15 put a real Postgres in CI, so U17 **executes** it: seed one row into all twelve,
call the function, assert every table is empty (**M4**), plus a separate cascade probe (**M5**) and an
assertion that `advisor_actions.conversation_id` is **`SET NULL`, not cascade** (**M6**) — the distinction
the FK text makes easy to mis-scan. **No CI step added, so no GATE D1.**

**GATE D2 — asserted as ZERO CALLS, not as a status.** Eight rejection cases (empty body, wrong phrase,
wrong case, partial, trailing whitespace, non-string, malformed JSON, missing field) each assert the
repository was **never called**. A route that deleted the data and then returned 400 would satisfy a
status-only test.

**HONEST SCOPE — TWO retained items, not one.** The stub anticipated the auth identity. The second was
found by reading `0009`: **`consume_rate_limit` writes `user_id` into `api_rate_limits`** (line 28), so rows
bearing the user's id outlive deletion — SELECT-only, excluded from the twelve, cascading only from
`auth.users`, which cannot be deleted here. Both are stated in the response body in U16's `notIncluded`
shape, with per-table counts so §5.4 has something to bind to.

**RED EVIDENCE — twelve mutations, all executed.**

| # | Mutation | Result |
|---|---|---|
| **M1** ★ | `delete_all_user_data(p_user_id uuid)`, used as the owner | **TWO pins red** — `has gained a parameter` and the pre-existing `accepts an identity parameter` |
| **M2** ★ | Drop the confirmation check | **8 failed / 7 passed** — every GATE D2 case: `the deletion repository was called on a request that failed confirmation` |
| **M3** ★ | Remove the owner filter from one delete | `CROSS-USER DELETION — calling delete_all_user_data() as one user removed ANOTHER user's rows` |
| **M4** | Drop `advisor_usage` from the function | `DELETION IS INCOMPLETE — 1 of 12 tables still hold the user's rows: advisor_usage: 1 row(s)` |
| **M5** | Remove the `stack_items` cascade | cascade probe red — FK violation, diagnosed **(see the script defect below)** |
| **M6** | Drop the explicit `advisor_actions` delete, assuming conversations cascade | `DELETION IS INCOMPLETE — advisor_actions: 1 row(s)`. `SET NULL` is not `CASCADE` |
| **M7** | Remove a table from `USER_OWNED_TABLES` | `expected 11 to be 12` — one definition, two consumers |
| **M8** ★ | `console.log` the counts in the route | `a deletion count reached a logger` |
| **M9** ★ | The same call one layer down, in `delete-repo` | `the repository logged something during a deletion` — **the two halves U16's M5 taught us to build separately** |
| **M10** | Drop `set search_path = ''` | `SECURITY DEFINER with no set search_path — a caller-controlled search_path is a privilege-escalation vector` |
| **M11** | Accept a deletion with a missing table count | 3 failed — `rejects.toThrow(/advisor_usage/)`, `/no count for/` |
| **M12** | Drop the 401 check | `expected 500 to be 401` |
| **M13** ★ | Skip section 4 of `verify:migrations` entirely | All four deletion claims vanish from the summary — 4 lines, not 8. **Exit 0, correctly:** nothing failed; it proved less and said so |
| **M13b** ★ | The same skip, with a **hand-maintained** widened summary string in place of the derived one | **Printed `"empties all 12 user-owned tables, cascades hold, and cross-user isolation is enforced"` at exit 0 with section 4 not executing.** The counterfactual that makes the derivation load-bearing rather than decorative |

**TWO DEFECTS IN THIS UNIT'S OWN WORK, both caught by running things rather than reading them.**

*(i)* **`next build` failed and the unit tests did not.** `route.ts` exported `CONFIRMATION_PHRASE` for its
test; Next type-checks route modules against `{ [x: string]: never }`, so the build refused it —
*"CONFIRMATION_PHRASE is not a valid Route export field"*. **This is Phase 2 U5's wall at a second site**,
and it is why §5.10 requires `next build` before declaring work done: 1245 unit tests and a clean typecheck
had already passed. Fixed by moving the confirmation contract to
`src/lib/api/deletion-confirmation.ts` — **which is where §4 rule 8 wanted it anyway**, since it is the
trust boundary for an irreversible operation. The constraint pushed the code somewhere it should already
have been; the file's header says so rather than presenting the move as a workaround.

*(ii)* **M5 exposed this unit's own script printing a stack trace instead of a diagnosis.** The cascade
probe's `psql` call was unguarded, so removing a cascade produced an unhandled Node throw. It still exited
1 — the guard was not vacuous — but `verify:migrations` holds itself to explaining failures, and this one
did not. Wrapped, with a message naming the likely cause; **M5 re-executed against the corrected script**.

**A THIRD DEFECT, IN U16's SHIPPED WORK, EXPOSED ON FIRST CONTACT.** `ROUTE_CONTRACT`'s N-14 disclosure
listed the ways its literal `.parse(` match could be defeated, and gave as its example that `safeParse` was
"matched by the same substring". **`.safeParse(` does not contain `.parse(`.** U17's DELETE route is the
first route in the repository to validate with `safeParse`; the guard classified a plainly-validating route
as non-validating and demanded an exemption entry whose written reason would have been false. The matcher
now names both forms — `/\.(?:safeParse|parse)\s*\(/` — and the header records that its own earlier
sentence was wrong.

**The lesson is larger than the fix, and is why this is recorded rather than quietly corrected: a residual
disclosure is itself a claim, and it needs a mutation, not a sentence.** N-14 requires guards to disclose
what defeats them; nothing required the disclosure to be *true*, and U16's was not — it shipped green,
because a false statement about a guard's limits fails no test. A guard's stated limits are the part of it
that nothing executes. The residual as *stated* still stands (a future `.check(` would slip); the
*example* given for it was the false part.

**A FOURTH DEFECT, IN THIS UNIT'S OWN COMMIT PREPARATION — and the gate could not have caught it.**
`scripts/verify-migrations.mjs` (+221 lines, the entire deletion probe) was written, executed and
mutation-tested, and then **never staged**. The full gate passed against the WORKING TREE while the
proposed commit carried a subset of it, and the commit request stated a 10-file diff that was in fact 11.
**Green would have looked identical with the probes absent from the commit:** CI would have applied ten
migrations, asserted nothing about deletion, and exited 0 — under a summary that, at that point, never
mentioned deletion anyway. The two defects compound, which is why they are registered as a pair: **N-43**
(the gate measured the wrong tree) and **N-42** (the summary would not have said so). It was caught by
re-reading `git status` before committing, which is not a control. **The procedure changed: the gate that
precedes a commit request runs against the STAGED tree** — `git stash -u --keep-index` around it — and
**commit 2 practised it on itself**: `git diff` empty and no untracked files for the gate's duration,
confirmed before running rather than asserted after.

**THE SUMMARY THAT DESCRIBED THE WRONG RUN (N-42).** On the deletion probe's first CI execution the
migration-coherence step went green in **2 s** and its output gave no sign the probe had run at all: the
summary was U15's, every word still true, silently incomplete. Whether the probe had executed could only be
settled by reading the script's control flow, which is not what CI output is for. It is now **derived** —
each section appends its own claim at the point its assertions pass (**M13**) — and a hand-maintained
widened string was shown to re-hide the defect at exit 0 (**M13b**). **First-run discipline is what
surfaced this**: the step was green, and accepting green would have shipped it.

**WHAT THIS UNIT DOES NOT CLOSE.** ~~The migration must be deployed **before** the code — see **OP-7**,
whose order is the **reverse** of OP-1's. The exit criterion is not ticked until that sitting is on
record.~~ **[2026-08-17] THE SITTING IS ON RECORD** —
`docs/05-qa/2026-08-17-op7-deletion-function-sitting.md`, all four steps PASS, `0010` live on the deployed
database with `args` empty. **The migration-first order held: nothing merged until it did.** The criterion
is ticked. What remains below is the *scope* of what deletion means, which no sitting changes.
**Scope constraint the roadmap does not state:** deleting the `auth.users` row needs the service-role key,
which §2.3 rule 14 confines to the dev seed script. So this route **cannot** delete the auth identity.
Honest scope: delete the user's rows across the 12 tables (cascades verified 12/12 reachable), leave the
identity. "Export and delete their own data end to end" is satisfiable; "delete my account" is not, and the
difference must be in the plan **and in the response body**, not discovered by a user.

> ~~**Red:** drop the confirmation check → `deleteAllForUser` called when it should not be; scope the delete
> by a body-supplied user id → a **wrong-value probe** (§6.2.2), since Zod would strip it and a
> plausible-attack probe would survive.~~ **The stub's red plan, superseded and struck rather than deleted
> (§7).** Its first half became **M2**. Its second half was wrong for a reason the stub could not have
> known: there is no body-supplied user id to substitute a wrong value into, because the RPC takes no
> arguments — so the probe would have been a no-op. See *WHAT COULD NOT BE TESTED FROM TYPESCRIPT* above;
> the ownership proof is **M3**, in SQL.

**U18 · `npm run lint`.** *(roadmap 9)* **M** (configure) / **S** (remove), deps none.
The load-bearing part is the **anti-vacuity assertion**: assert eslint lints ≥ N files. A misconfigured
`ignores` produces a green lint over zero files — the *exact* failure mode the roadmap calls the only
unacceptable state, reintroduced by the fix for it.
**Red:** conditional hook call → `react-hooks/rules-of-hooks`; then `ignores: ["**"]` → `LINT_SCOPE:
eslint matched 0 files; a linter that lints nothing passes vacuously`.

**U17 STAMP ROW** *(standing disposition):*

| U17 closeout | value |
|---|---|
| merged to `main` | **`beab8d9`** — fast-forward |
| closeout run | **`32041871938`** — green |
| post-merge `main` run | **`32042081158`** — green, required check satisfied |

**DONE 2026-08-18.** Baseline before: typecheck clean, **1245/102**, `npm run lint` did not exist as a
check. After: **1251/103** (+6, all `LINT_CONFIG`). **356 of 356** tracked source files linted, **0**
errors, **0** warnings, **0** exemptions.

**THE FIRST LINT RUN IN THIS REPOSITORY'S HISTORY FOUND 11 ERRORS ACROSS 10 FILES, AND THE COUNT WAS
WRONG WITHIN THE HOUR — 12 ACROSS 11. TWELVE, ONE OF THEM THE UNIT'S OWN** *(ratified by the owner: the
twelfth is the same class as five of the eleven, self-inflicted, and leaving it red blocks the unit)*. The twelfth is `scripts/verify-lint.mjs` itself: it carried an
unused `relative` import, and it entered its own scope the moment the WIP commit made it a tracked file.
That is not an embarrassment to be footnoted, it is the derivation working — the expected set comes from
`git ls-files`, so the linter acquired jurisdiction over its own author the instant the author committed.
A guard deriving its scope from `eslint.config.mjs` would have been silent, because nothing in that file
mentions `scripts/`. Recorded because the same property is what M1c below proves deliberately, and this
proved it by accident first.

**WHAT THE ELEVEN WERE, AND WHY NONE OF THEM IS A STYLE COMPLAINT.** Three were `eslint-disable` comments
that suppressed nothing (`seed.ts` ×2 waiving a `no-console` that is not enabled; `product-matcher/index.ts`
waiving a `no-unused-vars` its own config option already satisfies) — written, necessarily, by people who
had never seen the violation they claim to waive, because no linter had ever run here. Five were dead
imports and fixtures. Two were `no-useless-escape` in a `parseNumber` that exists **twice, byte-identical**
(**N-45**). The eleventh is **N-46**.

**THE FIVE DISABLE COMMENTS SPLIT 3–2, AND THE TWO SURVIVORS BOTH NEEDED WORK.**
`export-coverage.test.ts`'s `no-explicit-any` waiver is live and correct. `src/components/ui/Tabs.tsx`'s
`exhaustive-deps` waiver is live and its **stated reason was false**: *"anchorTabMap is a stable literal
from the parent render"*, while `SupplementDetail.tsx` passed `{{ "effect-": "effects", … }}` **inline —
a fresh object every render**. The directive was suppressing a real warning on a premise that did not
hold. Fixed by hoisting the literal to module scope (`ANCHOR_TAB_MAP`), which makes the sentence true
rather than deleting the sentence. **Stated honestly: this repair is not test-enforced.** No mutation
reddens on re-inlining it, because `exhaustive-deps` is a warning and the waiver suppresses it either way.
It is a correctness repair to a *comment*, and comments are the one thing this phase has no instrument for.

**RED EVIDENCE — twelve rows, all executed** (M1, M1b, M1c and its control, M2–M9; M7/M8 added under §5.2 because `LINT_CONFIG` is a new guard and needed its own red, M9 at owner ruling)**.** Every `eslint.config.mjs` edit is in the config-edit log
below.

| # | Mutation | Expected | Result |
|---|---|---|---|
| **M1** | `ignores: ["**"]` | `LINT_SCOPE` red | **RED**, exit 1 — *"LINT SCOPE — **356 of 356** tracked source files are NOT linted"* |
| **M1b** | expectation derived from the ESLint config instead of git, then M1 re-applied | plan predicted **GREEN** | **RED, exit 1 — THE PLAN'S PREDICTION WAS WRONG, and the reason matters.** Under `ignores:["**"]` the config-derived expectation collapses to **zero files**, and the independent zero-file net catches it: *"git reports ZERO tracked .ts/.tsx/.mjs files … a guard whose easiest green is 'there was nothing to check' is not a guard."* **M1b as specified does not isolate the variable it was written to isolate** — two guards overlap on it, so its green would have proved nothing and its red proves the wrong thing. See M1c |
| **M1c** | same config-derived expectation, but a **partial** over-broad ignore (`"src/**"`) so the zero-net cannot fire | the real counterfactual | **GREEN, exit 0** — *"ESLint's configuration lints **39 of 39** tracked source files … no tracked source file is exempt"*, while **317 source files went unlinted**, under a summary whose closing sentence reads *"The expected file set comes from `git ls-files`, NOT from the ESLint config."* A fully green run, saying the true thing, doing the false thing |
| **M1c control** | the identical ignore, git-derived expectation restored | red | **RED**, exit 1 — *"**317 of 356** tracked source files are NOT linted"*. M1c and its control differ in **one variable**: where the expectation comes from. That is the proof M1b was meant to be |
| **M2** | conditional `useState` in `Tabs.tsx` | `rules-of-hooks` fires | **RED**, exit 1 — *"React Hook \"useState\" is called conditionally"* |
| **M3** | `eslint-plugin-react-hooks` block deleted from the config | site 1's waiver becomes an unused directive | **RED**, exit 1 — but by a **different and stronger mechanism than predicted**: *"Definition for rule 'react-hooks/exhaustive-deps' was not found"*. ESLint refuses a directive naming a rule it cannot resolve, so the failure arrives before the unused-directive check. `LINT_CONFIG` reddens independently (1 failed / 5 passed) |
| **M4** | CI `Lint` step deleted | `DOC_TRUTH` red | **RED** — *"§5's declared CI steps and ci.yml's `run:` steps have diverged"* (1 failed / 20 passed). GATE D1 satisfied: the step and `CLAUDE.md` §5's chain move in one commit |
| **M5** | `REPO_ROOT` pointed at a directory that does not exist | fails loudly, not a stack trace | **RED**, exit 1 — *"could not list tracked files with `git ls-files` … without git it cannot make its assertion at all — and passing anyway would be exactly the vacuity it exists to prevent"* |
| **M6** | the removed disable at site 2 restored | unused-directive error | **RED**, exit 1 — *"Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-unused-vars')"* |
| **M7** | `reportUnusedDisableDirectives` demoted `"error"` → `"warn"` | `LINT_CONFIG` red | **RED** — *"`reportUnusedDisableDirectives` must be \"error\""* (1 failed / 5 passed). **And the complementarity is the point:** with M6 ALSO applied, `npm run lint` exits **0** and prints the inert directive as a warning. The demotion is invisible to the lint gate and visible only here — which is the entire reason `LINT_CONFIG` exists as a separate guard |
| **M8** | `package.json` `lint` repointed to `next lint` | `LINT_CONFIG` red | **RED** — *"`npm run lint` must run scripts/verify-lint.mjs"*. Without this pin, CI's Lint step goes green having proved nothing: the P-10 vacuity, restored by one word |
| **M9** | `eslint: { ignoreDuringBuilds: true }` removed **while a real lint error is present** *(added at owner ruling — a build-config change with a real failure mode gets a mutation)* | the second linter is real | **BOTH HALVES SHOWN. (a)** With the setting as shipped and `m9Unused` planted in `product-matcher/index.ts`: `npm run lint` **RED** (*"1 error(s) across 1 file(s)"*) while `next build` printed **✓ Compiled successfully** — the build does not lint, which is the whole claim. **(b)** With the setting removed and the same error present: **`Failed to compile.` — *"43:9 Error: 'm9Unused' is assigned a value but never used"***. The second linter was never hypothetical; it was running, and it is what a green U18 would have shipped alongside the real one |

**AN UNPLANNED DECISION, FORCED BY THE WORK AND FLAGGED RATHER THAN ABSORBED: `next build` SILENTLY
BECAME A SECOND LINTER.** Creating `eslint.config.mjs` switched on Next's build-time ESLint pass, which
had been skipping for want of a config. The first build after the config landed **failed on a lint error**
— in this unit's own new test file. Two problems, not one: (i) Next resolves that pass's file set for
itself, so the repository would carry two linters with two scopes, one of them never adjudicated, and the
`git ls-files` derivation would govern only one of them; (ii) it collapses two failure modes, exactly what
`ci.yml` refuses when it keeps `test:coverage` separate from `npm test` — a red build should mean the app
does not compile. `next.config.ts` now sets `eslint: { ignoreDuringBuilds: true }` with that reasoning at
the site, and states in two lines **why it is off** and **which linter is the authority**. **This removes
duplicate enforcement, not enforcement:** `npm run lint` is a blocking CI step and nothing in
`next.config.ts` can make it pass. Proved by **M9**, both directions.

**THE ROADMAP'S "ONLY UNACCEPTABLE STATE" HAS A MIRROR IMAGE, AND THIS IS IT.** Roadmap item 9 names one
failure: *a linter that appears to gate quality but does not*. The fix for it arrives carrying the
reflection — **two linters with different scopes, only one of them derived from `git ls-files`** — and the
reflection is worse in one specific way. A single vacuous linter is at least honestly empty; two disagreeing
linters both report, both look like enforcement, and the one nobody adjudicated silently governs a file set
nobody wrote down. `LINT_SCOPE` would keep asserting 356 of 356 and stay true, while the build enforced
something else entirely on its own list. **That is what was declined**, and it is the same defect as the
original in a different posture: enforcement whose extent no one can state.

**THE JOB NAME IS NOW PINNED IN A COMMENT.** `main`'s required status check is the literal string
`typecheck / test / build`. Extending it to `typecheck / lint / test / build` — the obvious tidy-up, and
the one a future reader will reach for — would leave the required check permanently pending and block every
merge. It is an identifier, not a description; `ci.yml` now says so where the rename would be typed.

**`eslint.config.mjs` EDIT LOG** *(per the standing ruling — config-protection was disabled at the plugin
level for this unit, and this record is what discharges its purpose; **re-enable it in the merge
accounting**)*:

| # | Edit | Disposition |
|---|---|---|
| 1 | created — flat config as described in its header | kept |
| 2 | deleted a no-op `{ files: [...], rules: {} }` block; its `no-console` rationale moved to the header, per §8.3 — a placeholder that silently does nothing is a trust defect | kept. **Blocked twice by config-protection before the ruling; the only edit made under it** |
| 3 | probe: appended a comment to test whether edits were still blocked after the restart | reverted immediately |
| 4 | **M1** — `ignores: ["**"]` | reverted |
| 5 | **M1c** — `ignores: ["src/**", …]` | reverted |
| 6 | **M3** — react-hooks block deleted | reverted |
| 7 | **M7** — `reportUnusedDisableDirectives: "warn"` | reverted |

Edits 3–7 are mutations; the file is byte-identical to edit 2's result, verified by `git diff`.

**N-43's STAGED-TREE GATE, PRACTISED FOR THE FIRST TIME — AND IT PAID ON THE FIRST RUN.** The gate ran
against the **index**, not the working tree (`git add` the unit's files, `git stash push -u --keep-index`,
run, restore). It immediately contradicted a number this entry had already been written with: every
working-tree run had reported **355 of 355** files linted, and the staged run reported **356 of 356**.
The difference is `src/architecture/lint-config.test.ts` — *this unit's own new guard*, untracked while it
was being written, and therefore outside the scope of a check that derives its scope from `git ls-files`.
**A working-tree gate had been measuring an artifact one file smaller than the one being proposed**, which
is N-43's defect restated in this unit's own units. Every scope figure above was re-derived against the
staged tree, and the three scope mutations (M1, M1c, M1c control) were **re-run** rather than
re-labelled — the mutation table describes the artifact in the commit, or it describes nothing.

**FULL GATE, AGAINST THE STAGED TREE** *(and `npm run lint` is now a member of the §5.10 list this gate
implements — added in this commit, per the owner's ruling: a verification list that omits a check CI runs
is N-29's asymmetry in miniature)*: `npx tsc --noEmit` clean · `npm run lint` **356/356, 0 errors** ·
`npx vitest run` **1251/103** · `npx vitest run --coverage` exit 0 · `npx next build` succeeds ·
`npm run verify:rendering` OK · `npx playwright test` **70 passed / 30 skipped**.
**Not run locally, and stated rather than implied:** `npm run verify:migrations` (needs a local Postgres;
unchanged by this unit) and `npm run verify:middleware`. **CI ran the first**, below.

**FIRST-RUN DISCIPLINE ON THE `Lint` STEP — DISCHARGED. CI `32137015633` GREEN ON `a3baa88`**, every one
of the fourteen steps `success`, job wall-clock **3m 18s**. Per-step:

| step | wall-clock | | step | wall-clock |
|---|---|---|---|---|
| Set up job | 1s | | Migration coherence | 2s |
| Initialize containers | 21s | | Production build | 34s |
| Checkout | 2s | | Rendering determinism | 0s |
| Set up Node | 5s | | Install Playwright browser | 23s |
| Install dependencies | 14s | | E2E (non-live) | 38s |
| Typecheck | 8s | | Post Set up Node | 5s |
| **Lint** | **5s** | | Stop containers | 1s |
| Unit and architecture tests | 16s | | | |

**The step is the cheapest real check in the chain** — 5s against Typecheck's 8s and Coverage's 20s, on a
job whose setup floor is already ~45s. Placing it beside Typecheck cost nothing measurable, which is what
that placement was betting on.

**AND IT SETTLED SOMETHING THE LOCAL GATE STRUCTURALLY COULD NOT.** `verify-lint.mjs` shells out to
`git ls-files`, and every local run of it — including the staged-tree gate — read *this working copy*.
CI's `actions/checkout` is a real clone on a machine that has never seen this repository, so a green `Lint`
step there is the first evidence that the derivation holds against a checkout rather than against a
developer's index. A guard whose scope comes from git had, until this run, only ever been asked about one
git.

**RAISED:** **N-44** (fixed here), **N-45**, **N-46** (closed here by fix 11).

**U19 · F5, correlation ID in the UI.** N `src/lib/api/error-text.ts` + test · M `AdvisorPanel.tsx` · N
`src/architecture/ui-error-text.test.ts`. **M/S**, deps U1.
**The only Phase 2 item needing a harness the repo does not have.** `vitest.config.ts` collects
`src/**/*.test.ts`, there is no jsdom/RTL, and `HARNESS_GAP` hard-fails on any tracked `*.test.tsx`. So the
tested artifact is a **pure formatter** plus a guard asserting no component renders `error.message`
without it. **This unit must not smuggle in a component-test harness.**


**U18 STAMP ROW** *(standing disposition — an entry cites the runs that existed before its final commit;
the merge SHA and the runs after it are stamped by the next natural docs commit, which is this one):*

| U18 closeout | value |
|---|---|
| merged to `main` | **`f8b2cab`** — fast-forward |
| closeout run | **`32138629746`** — green |
| post-merge `main` run | **`32138982510`** — green, required check satisfied on the merged SHA |

**AND THE CONFIG-PROTECTION HOOK IS LIVE, VERIFIED BY REFUSAL ON 2026-08-20.** U18 disabled the local
`pre:config-protection` hook in order to write `eslint.config.mjs`, and the disable's fate was afterwards
unknown. An audit found the plugin's files pristine against the marketplace copy and no disable in
`~/.claude/settings.json` — but that is an *absence of evidence*, and this plan does not accept one as
proof anywhere else. So the loop was closed the only way it can be closed: with the session restarted so
hooks load fresh, a trivial comment edit to `eslint.config.mjs` was **attempted and BLOCKED**
(`BLOCKED: Modifying eslint.config.mjs is not allowed…`), and `git status` was clean afterwards — the
refusal was total, not a partial write. Recorded here rather than dropped because **a guard believed-live
and a guard shown-live differ by exactly the U18 defect**: five `eslint-disable` comments waiving rules
from a linter that had never run, written by people who could not have seen what they were waiving. The
probe had to go through the `Edit` tool, because the hook matches `Write|Edit|MultiEdit` — a shell `sed`
would have sailed through and proved nothing, which is itself worth knowing.

**DONE 2026-08-20.** Baseline before: typecheck clean, **1251/103**, non-live E2E 70/30, lint 356/356.
After: **1272/105** (+21 — 11 `ERROR_TEXT`, 10 `UI_ERROR_TEXT`), lint **359/359, 0 errors**, non-live E2E
**70/30 unchanged with zero specs edited**, confirmed by execution rather than inferred.

**FINDING BEFORE ANY CODE: THE DISCARD IS TWO SITES, NOT ONE, AND THE SURFACE IS FOURTEEN FILES, NOT ONE.**
The inventory row said `AdvisorPanel.tsx:286` receives a correlation id and discards it. True, and
incomplete. `:248` — `safeErrorMessage` — discards a *second* one from the JSON envelope, and it is the
site users actually reach, because it handles every non-streaming failure. Thirteen further components read
`json?.error?.message` and drop the id sitting beside it in the same object. Measured: **14 files, 14
occurrences, zero `correlationId` in any `.tsx`.** The second site was found only by reading the stream
consumer, and **no envelope regex can see it** — the SSE payload is `{message, correlationId}`, not an
`ApiEnvelope` — so a guard built to the inventory row's description would have reported this unit complete
with half the defect still live. It is pinned separately for that reason.

**WHAT F5 ACTUALLY IS: a type comment that had been false since Phase 0.** `respond.ts:10-13` documents
`correlationId` as "safe to render, quote in a support ticket, or paste into an incident report". Nothing
ever rendered it. The id existed, the server logged it, and the one person who could have quoted it never
saw it. This unit does not add an observability feature so much as make an existing sentence true.

**THE FORMATTER'S LOAD-BEARING CASE IS THE ABSENT ONE, AND THAT IS WHY IT IS A FUNCTION.**
`correlationId` is present **only** on unexpected-exception 500s — `respond.test.ts:524,533,540,546` pin it
*undefined* for 401, 404 and validation failures, which are the errors users actually hit. A template
literal at each call site is therefore correct on the rare path and renders **"Reference: undefined"** on
the common one. Centralising the absent case is the entire value; the present case is the easy half. M3
below is the mutation that proves it, and its red text reads `'Failed to save profile. (Reference: u…' not
to contain 'undefined'` — the defect verbatim.

**SCOPE RULED BY THE OWNER, 2026-08-20: convert `AdvisorPanel`, ratchet the other thirteen.** Three forms
were put up. Converting all fourteen keeps the allowlist empty — U1's virtue, "one word, two units of
consequence" — but turns an **M/S** unit into fourteen user-visible copy changes across all three pillars
that the approved file list does not cover; absorbing that silently is what `CLAUDE.md` §8.1 forbids.
Scoping the guard to `AdvisorPanel` alone is the §5 cut form and is nearly vacuous: it governs one file, so
a new component with a bare read is invisible to it. The ruling took the middle: the guard scans all **65**
tracked `.tsx`, thirteen carry a written-reason allowlist entry, and **every entry is asserted to still
violate** — the `DOMAIN_PURITY_ALLOWLIST` ratchet from `boundaries.test.ts:614-625`, borrowed wholesale.
Fix a file and leave its entry, and this file reddens. **The list can only shrink**, and the thirteen are
named debt rather than ungoverned surface.

**ANTI-VACUITY IS ASSERTED BEFORE ANYTHING ELSE, BECAUSE THIS GUARD CITES U18 AS ITS PRECEDENT AND COULD
HAVE REINTRODUCED U18'S DEFECT.** A source-scanning guard whose inventory can quietly empty is green over
zero files — the one end state the roadmap calls unacceptable. So: the scanned set hard-fails on empty
inside `trackedTsx`, a floor asserts ≥50 UI files, and a second floor asserts ≥14 envelope reads. That
second floor is stable across the ratchet closing, which is the non-obvious part: **a converted call site
still reads `.error.message`** — it just passes the result through `errorText` — so conversion does not
shrink the inventory it is measured against.

**Statements, not lines.** The one place this guard could be brittle, so it is stated rather than
discovered at review. The conversion wraps a read in a call and the formatter routinely spreads that across
four lines; a line-based predicate would call `errorText(\n  json?.error?.message,` a violation. Splitting
the comment-stripped source on `;` ignores newlines entirely. Known cost: a `for (;;)` header splits into
empty fragments — harmless, they contain no read. Comments are stripped first per **N-14**, whose audit
found this repository's guards will match a mention inside a comment, and which fired for real on
`nav-pillars.test.ts`'s first run.

**RED LIST — eight mutations, every one executed, none predicted.**

| # | Mutation | Observed |
|---|---|---|
| M1 | formatter drops the id branch | `ERROR_TEXT` — `expected 'An unexpected internal error occurred.' to be '… (Reference: 3f1c2b0a…)'` |
| M2 | formatter returns the id without the message | `expected 'Reference: 3f1c…' to be 'An unexpected internal error occurred…'` |
| M3 | formatter appends the suffix when there is no id | `expected 'Failed to save profile. (Reference: u…' not to contain 'undefined'` |
| M4 | revert `AdvisorPanel:248` to a bare envelope read | `UI_ERROR_TEXT` names the file **and quotes the offending statement** |
| M5 | revert `AdvisorPanel:286` to a bare SSE read | SSE block red twice — no `errorText(`, no `correlationId` |
| M6 | a new component with a bare read | **green untracked, red after `git add -N`** — §4.2's staged-file rule, both directions |
| M7 | narrow the scan to match nothing | `found zero tracked .tsx files … passes vacuously` — a thrown hard failure, not an assertion |
| M8 | fix an allowlisted file, leave its entry | `ratchet: the allowlist may only shrink … CompareView.tsx — allowlisted but no longer violates` |

**NO BEHAVIOUR CHANGE IS DECLARED, AND THE REASON IS NOT "IT IS SMALL".** No API response byte changes, no
status changes, no envelope changes. The client-side copy for advisor errors gains a `(Reference: …)`
suffix **on unexpected-exception 500s only** — the one class of error where the id exists. Every other
error renders byte-identical text, which M3 is what proves. No spec asserted the client-side copy: the nine
`INTERNAL_ERROR_MESSAGE` assertions in the suite are all API-level, on the envelope, which this unit does
not touch. Re-verified at execution rather than carried over — the full non-live Playwright suite ran
**70/30, unchanged, with no spec edited**.

**§5.7 — the coverage-threshold question, answered explicitly rather than skipped.** `error-text.ts`
measures **100 lines / 100 branches / 100 functions / 100 statements**. It gets **no threshold entry**, and
that is a decision, not an omission: `vitest.config.ts:59-64` excludes `src/lib/{auth,api,supabase}` from
per-engine floors as infrastructure, and U14/U25's precedent added entries for **new directories**, not new
files inside excluded ones. Adding `src/lib/api/**` here would rope in `respond.ts`, `rate-limit-guard.ts`,
`errors.ts` and `deletion-confirmation.ts` and assert a floor over four modules this unit has not measured
or improved. The number above is recorded so the omission is visible.

**N-12 AND N-15 ARE NOT CLOSED BY THIS UNIT, AND THE REGISTER SHOULD NOT PRETEND OTHERWISE.** Both name
"U19, which already opens the advisor UI" as candidate owner. U19 opened two lines of it. `getRemainingBudget`
still has no caller (N-12) and `AdvisorPanel` still does not handle the `aborted` turn status (N-15).
Neither is in this unit's file list, neither is a correlation-id concern, and claiming them because the
unit happened to touch the same file is exactly the absorption §8.1 forbids. **Both remain open, owner
unchanged.**

**U19 CI — run `32366651770`, green on `fdab839`, 18/18 steps.** Every figure this entry claims was
re-measured by CI independently and matched exactly: lint **359 of 359, 0 errors**; **1272/105**; non-live
E2E **70 passed / 30 skipped**. Recorded because the entry's numbers were taken on one developer's machine,
and §5.1 asks what was run, not what was believed.

**WHAT CI PROVED THAT THE LOCAL RUN COULD NOT.** `UI_ERROR_TEXT` is the first artifact in this unit whose
**scanned set is not a constant**: `trackedTsx` shells out to `git ls-files` at run time, so what it
governs depends on the worktree it runs in — every other test here computes over its own inputs. CI ran it
against a **fresh clone's index** rather than a working directory that had been edited all day, and the
anti-vacuity hard-fail is precisely what makes that safe rather than lucky: had the checkout produced no
`.tsx`, the guard **throws** `found zero tracked .tsx files … passes vacuously` instead of passing over an
empty set. That property was written against M7, a mutation the author chose; CI is where it earns its keep
against an environment nobody controls.

**The lint jurisdiction change is confirmed in CI, not just locally: 356 → 359.** The three new files
entered `verify-lint.mjs`'s expected set the moment Git knew them — the same self-inflicted jurisdiction U18
recorded when its own runner acquired an unused import. Staging with `git add -N` before the local run is
what kept this from being a CI discovery.

**Merge SHA and the post-merge run are not recorded here.** They cannot be: an entry cannot cite the run
that validates it without a further commit to hold the citation, and this closeout's own run is that
regress one step out. They ride in the next natural docs commit, per the standing disposition.

**U20 · Slug append-only manifest.** *(§7 ruling 3)* M `id-manifest.json`, `id-stability.test.ts`. **S/M**,
deps none. **Two decisions — §7 decision 6.**
**The trap:** `id === slug` for all 15 supplements today, so a naive namespace is a byte-copy and a test
comparing them passes for the wrong reason. The real proof is a mutation renaming a **slug only**: the slug
namespace goes red while `supplements` stays green.


**U19 STAMP ROW** *(standing disposition):*

| U19 closeout | value |
|---|---|
| merged to `main` | **`1fad2e5`** — fast-forward from `f8b2cab`, 2 commits |
| code run | **`32366651770`** — green on `fdab839`, 18/18 steps |
| closeout run | **`33248922631`** — green on `1fad2e5`, 18/18 steps (the merge gate) |
| post-merge `main` run | **`33249053668`** — green, required check satisfied on the merged SHA |
| `main` verified | `git ls-remote` = `1fad2e5f42a9d22827db84537543fb8b0ed1ef5a`, remote and local match; branch deleted local + remote |

**DONE 2026-08-21.** Baseline before: typecheck clean, **1272/105**. After: **1276/105** (+4 in
`id-stability.test.ts`: 43 → 47 — the relaxed surface assertion, the structural `publicSurfaces` assertion,
and two new per-namespace specs for `supplementSlugs`).

**THE RULING'S PREMISE WAS CHECKED, NOT INHERITED.** Decision 6 rests on *"slugs are persisted in no DB
column"*. If a stored citation carried an `href`, that would be false and the whole `publicSurfaces` design
would be unnecessary. Measured: `Citation` is `{kind, refId, label, detail?}` — **there is no `href`
field**. Hrefs are computed at render time by `citation-href.ts` and never stored. The ruling stands on
evidence rather than on being a ruling.

**AND THE MANIFEST ALREADY DOCUMENTED THE SLUG'S IMPORTANCE WITHOUT GOVERNING IT.** `effects.dereferencedBy`
says citations resolve to `/library/{slug}#effect-{id}`; `papers` says the same. So a **slug** rename
degrades already-stored effect and paper citations to broken links — precisely the failure the manifest
carefully documents for effect *ids*, arriving through a field nothing watched. That is a stronger argument
for this namespace than the one in §7, and it was not in the plan. `effects` and `papers` therefore gain
truthful `publicSurfaces` entries of their own: leaving them `[]` while their own `dereferencedBy` prose
describes a public URL would be a manifest contradicting itself.

**M1 FOUND A DEFECT IN THE GUARD'S OWN FAILURE MESSAGE, WHICH IS WHY MUTATIONS ARE RUN AND NOT PREDICTED.**
The first M1 run printed `This orphans existing user rows ()` — **empty parens**. Before U20 every namespace
was persisted, so that clause was true of all of them; it is **false** for a `publicSurfaces`-only
namespace, which has no user rows to orphan. A guard that reports the wrong reason is a guard a reader
learns to discount. The consequence clause is now **derived from the namespace's own surfaces**, and M1
re-run prints what actually breaks: *"breaks the public surface `/library/{slug}` … a rename 404s every
existing external link; and breaks the public surface `citationHref()` … the slug is recomputed at render
time from ALREADY-STORED citations"*. A predicted mutation table would have shipped the empty parens.

**RED LIST — seven mutations, all executed.**

| # | Mutation | Observed |
|---|---|---|
| M1 | rename a **slug only**, `id` untouched | **`supplementSlugs` RED, `supplements` GREEN** — the headline proof |
| M2 | rename an **id only**, `slug` untouched | **`supplements` RED, `supplementSlugs` GREEN** — the converse; two contracts, not one list twice |
| M3 | extractor reads `.id` instead of `.slug` | **GREEN — recorded as the finding, not as a pass** (below) |
| M4 | namespace with `persistedAt: []` **and** `publicSurfaces: []` | red — `expected [ 'outcomeCategories' ] to deeply equal []` |
| M5 | omit `publicSurfaces` from a namespace | red **twice**: the predicted `Cannot read properties of undefined (reading 'length')`, plus the structural assertion naming the namespace |
| M6 | drop a slug's registration, no tombstone | red — `supplementSlugs: 1 unregistered id(s): creatine` |
| M7 | tombstone a slug, leave it live in seed | red — resurrect + unregistered, 3 assertions |

**M3 IS GREEN AND THAT IS THE HONEST RESULT, NOT A GAP BEING GLOSSED.** `id === slug` for **15 of 15**
supplements, so **no assertion over values can distinguish a `.slug` extractor from a `.id` one**. This was
not merely stated — it was *demonstrated*: M1 was re-run against the wrong extractor and **stayed green**,
47/47, which is exactly the blindness the plan warned about ("a naive namespace is a byte-copy and a test
comparing them passes for the wrong reason"). The mitigation is structural, not assertional:
`LIVE.supplementSlugs` is bound to **`getAllSupplements().map((s) => s.slug)`** — the *identical expression*
`generateStaticParams` uses at `src/app/library/[slug]/page.tsx:22` — so the namespace tracks the real
public surface rather than a field someone chose.
**M3 becomes decidable the day id and slug first diverge for any supplement**, and the first real divergence
must be accompanied by re-running M3, which will then go **red** against the wrong extractor. Written here
rather than left to memory, because that is the only moment this hole closes.

**The `@/lib/evidence` import is legal only because test files are unscanned, and that is stated rather than
leaned on.** `src/data` is a leaf over `src/types` (§4 rule 4, `DATA_IS_A_LEAF`), so this import would be a
B4 violation in a product file. It is permitted because `boundaries.test.ts:252`'s `isTestPath` excludes
`*.test.ts` from the layer scan. That exclusion is deliberate and pre-existing, but a unit relying on it
should say so out loud rather than discover it in review.

**FU-32 — CLOSED BY REMOVING THE COUNT, NOT BY INCREMENTING IT.** The header said "eight namespaces"; there
were 9; U20 makes 10. **A number in prose that has already rotted once has a third instance queued**, so
writing "ten" would be the same defect with a fresh date. It now reads *"every namespace registered in
`id-manifest.json`"*. Recorded as a member of the **counts-written-once** class alongside U15's and U18's
instances: a figure asserted in prose, true when written, unbound to anything that would notice it changing.

**`version` 1 → 2, with a structural assertion rather than a magic-number check.** Asserting `version === 2`
would test that a constant equals itself. What actually needed enforcing is that **every namespace declares
`publicSurfaces`** — M5 shows why: a namespace omitting the key yields `undefined.length`, a TypeError at
best and a silent inheritance of pre-U20 semantics at worst. The assertion checks key **presence** (an
`Array.isArray` test, so an empty list is a valid and meaningful declaration), not truthiness.

**RAISED: N-47** — `dereferenced` and `version` are declared, populated, and asserted by nothing. Not fixed
here: U20 is a schema change under a recorded ruling, and quietly adding assertions for two unrelated fields
is scope creep in the opposite direction (§8.1). Owner **proposed, not assigned**.


**U20 CI — run `33330448415`, green on `08253e5`, 18/18 steps.** Figures re-measured by CI and matched:
lint **359/359, 0 errors**; **1276/105**; non-live E2E 70/30.

**U20 MADE TWO MORE COUNTS FALSE, IN A THIRD FILE — AND THAT IS THE FU-32 CLASS DEMONSTRATING ITS OWN
REACH.** `project-status.md:223` said the guard has *"43 tests, 9 namespaces"*; `:308` said stability is
*"enforced across **9** manifest namespaces"*. Both were true when written and both are now wrong. Removing
the count from the test header while leaving two more standing counts one file over would have been the
same defect at a different address, so they are corrected here **in the same commit**.

**They are corrected by DATING them, not by restating them, and the distinction is deliberate.** FU-32's
remedy was to delete the number, because a guard's header asserting "eight namespaces" is an **undated
standing claim** — it reads as a permanent property and has no owner. `project-status.md` is a status
document, where a measurement *is* the content; the honest form there is not silence but a **dated
observation**: "10, measured 2026-08-21 at U20". A dated measurement that later drifts is visibly stale;
an undated one is silently wrong. **That is the actual lesson of the counts-written-once class** — the
defect is not writing numbers, it is writing them as though they were timeless.

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

**U29 · The conversation-ownership predicate, at both sites.** *(created 2026-09-11 by owner ruling, on
N-48; widened the same day to N-49 at U26's commit 1)* M `src/app/api/advisor/route.ts` · M
`src/services/advisor-actions.ts` · M both tests. **S**, deps **U12**. **Two sites, one predicate:**
(a) the pre-spend check in `POST /api/advisor` below; (b) `confirmAndApply` refuses a `conversationId`
that is not the caller's before `recordBatch` stamps it into the audit row (N-49 — the row's owner was
bound, its conversation reference was not). **If U29 exceeds S when it is planned, it splits into
U29/U30 rather than growing** — ruling, not preference. **Behaviour change (declared), site (a):**
a foreign or non-existent `conversationId` answers **404 before the paid model call**, using U12's unified
404 message, instead of a generic `error` event inside a committed stream after the spend. Call
`conversationBelongsToUser` — the function the three corrected statements wrongly said this route already
called — between validation and `reserveAdvisorTokens`, so no reservation is taken and no model call is
made for a conversation the caller does not own. **Red:** a route test with `conversationBelongsToUser`
mocked `false` must see 404 and `runAdvisorTurn` never called; delete the check and it goes green on the
wrong side. **Sequenced after U12** so the 404 inherits one message rather than authoring a third. **Not
implemented in the U26 session, by ruling.**

> ### **[2026-09-15] HANDOFF TO THE U31 WORKTREE — U29 and U30 are BLOCKED on U31 landing in `main`.**
>
> **Why, in one line:** U29, U30 and U31 edit the same route files, and U31 is in flight on
> `feat/u31-openai-first-party` in a separate worktree. U29 and U30 wait (owner ruling, 2026-09-15).
>
> **This block exists so the U31 session can check reconciliation BEFORE its rebase, not after.** Every
> file U29 or U30 will touch is listed below with what it will do to it. If U31's diff touches a file in
> this list, that file is a rebase conflict waiting to happen and is worth looking at while both
> intentions are still legible.
>
> | File | U29 | U30 | Known to be in U31's diff? |
> |---|---|---|---|
> | `src/app/api/advisor/route.ts` | **YES** — inserts `conversationBelongsToUser` between validation and `reserveAdvisorTokens` | **YES** — `uuidParam.parse()` (no path param today; it reads `body.conversationId`, so possibly not) | **YES** — provider swap |
> | `src/app/api/advisor/route.test.ts` | **YES** — a 404-before-spend pin | — | **YES** |
> | `src/services/advisor-actions.ts` | **YES** — `confirmAndApply` validates `conversationId` (N-49) | — | not seen |
> | `src/app/api/advisor/actions/route.test.ts` | **YES** — its pin | — | not seen |
> | `src/app/api/advisor/actions/[id]/undo/route.ts` | — | **YES** — 1 handler | not seen |
> | `src/app/api/advisor/conversations/[id]/route.ts` | — | **YES** — 1 handler | not seen |
> | `src/app/api/stacks/[id]/route.ts` | — | **YES** — 3 handlers | not seen |
> | `src/app/api/stacks/[id]/items/route.ts` | — | **YES** — 1 handler | not seen |
> | `src/app/api/stacks/[id]/items/[itemId]/route.ts` | — | **YES** — 2 handlers | not seen |
> | `src/app/api/stacks/[id]/evaluate/route.ts` | — | **YES** — 1 handler | not seen |
> | `src/app/api/stacks/[id]/compare/route.ts` | — | **YES** — 1 handler | not seen |
> | `src/app/api/lab-markers/[id]/route.ts` | — | **YES** — 2 handlers | not seen |
> | `src/lib/api/respond.ts` | — | **no** (U30 uses `handle()`'s existing `ZodError` → `validationError` path unchanged) | not seen |
> | `src/lib/validation/schemas.ts` *(or a new module)* | — | **YES** — exports `uuidParam` | not seen |
> | `src/architecture/` | — | **YES** — one new spec | **YES** — `boundaries.test.ts` (`PAID_MODULES`) |
>
> **"Known to be in U31's diff?" is this session's observation from the shared worktree before the split,
> not a reading of U31's branch** — it was measured at 2026-09-15 ~21:20 from `git status`, and U31 has
> continued since. **The U31 session should confirm it against its own diff rather than trust this
> column.** Two of the three it names are certain because they were read directly: the advisor route and
> its test, and `boundaries.test.ts`.
>
> **The one genuine overlap to settle before the rebase** is `src/app/api/advisor/route.ts`: U31 rewrites
> which provider it calls, U29 inserts an ownership check *before* the reservation that precedes that
> call. These are compatible — different lines, different concerns — but they are adjacent, and U29's
> insertion point is defined relative to `reserveAdvisorTokens`, which U31 does not move. **If U31 moves
> or renames the reservation call, U29's plan block needs re-reading before it is implemented.**
>
> **Not a blocker for U31, and stated so it is not mistaken for one:** nothing here asks U31 to change
> anything. U31 lands first, by the same ruling.


> **[2026-09-18, U31] COLUMN CONFIRMED against U31's own diff, exactly as this block asked.** Every row
> is correct. The three it marks **YES** are in U31's diff (`advisor/route.ts`, `advisor/route.test.ts`,
> `boundaries.test.ts`); every row marked "not seen" is genuinely absent from it. **One addition the
> block could not have known:** U31 also touches `src/lib/api/errors.ts` (one line) — adjacent to U30's
> `respond.ts` row rather than overlapping it, and worth a glance when U30 is written.
> **`reserveAdvisorTokens` did not move and was not renamed** — U31's entire edit to that route is one
> hunk renaming three env reads in the `NOT_CONFIGURED` gate — so U29's insertion point is intact and
> the conditional in the paragraph above does not fire.
---

#### U29 PLAN — drafted 2026-09-19, ~~AWAITING OWNER APPROVAL. Nothing below is implemented.~~ **APPROVED AS DRAFTED by the repository owner, 2026-09-19** — route for site 1 (after `enforceRateLimit`, awaited before the `Promise.all`), service for site 2, `getMessages` keeps no `userId` for the stated behavioural reason, byte-identical 404 for foreign and nonexistent, `null` stays valid, **N-69 registered and out of scope**.

**bkit:** registered as `u29-pre-spend-ownership`, phase `plan`; artifact
`docs/01-plan/features/u29-pre-spend-ownership.plan.md`, subordinate, mirroring this entry.

**THE TREE MOVED UNDER THIS UNIT, and the handoff note's line numbers are stale.** Re-read against
`main` at `1a6c080`, not against the 2026-09-15 snapshot. U32 inserted its base-URL pre-flight, so the
advisor route's guard sequence is now:

| line | what runs |
|---|---|
| 79–89 | U32's config + base-URL pre-flight → **503** |
| 91 | `const supabase = await createClient()` |
| 97–98 | `enforceRateLimit` → **429** |
| **99–111** | **← U29's ownership check goes here** |
| 112–121 | `Promise.all([reserveAdvisorTokens, loadAdvisorContext, getMessages])` |

**Exact insertion: after line 98, before line 112.** Bounded on both sides and neither bound is
stylistic — it cannot precede line 91 (it needs the `supabase` client) and it must precede line 112
(`reserveAdvisorTokens` is *inside* that `Promise.all`). It goes **after** the rate limit because the
rate limit is the cheaper refusal and already turns a flood away before any database round trip.

**IT MUST NOT JOIN THE `Promise.all`** (`ecc:architect`, and it is the sharpest point in the answer).
Concurrency would mean the reservation is *already taken* when the check fails. The check is awaited
first; the existing parallel load then runs with one less member. **Cost: one round trip per turn**,
stated rather than hidden.

**PLACEMENT — the one question put to `ecc:architect`: route, service, or repo, given U26 moved
owner-binding into the repo layer?** **Answer: route for site 1, service for site 2 — they differ, and
the difference is the reuse surface.** The route is the only entry point into the turn path;
`confirmAndApply` is a service function that already takes `userId` and already re-validates everything
else in its SC-6 loop, so a check placed anywhere but the service leaves its next caller unguarded.

**This continues U26 rather than contradicting it.** U26 bound the owner where the owner-scoped
statement *is* the action — `appendMessages` uses the update's row count as the check. U29's sites need
a **decision** (404) taken *before* any side effect exists to scope. Both sites call
`conversationBelongsToUser` (`src/lib/advisor/repo.ts:105`), which is already the testable module §4
rule 8 asks for and already maps `false → notFound("Conversation")` at its one existing caller. U29 adds
the second and third call sites of a proven boundary; it does not invent a boundary in a route.

**`getMessages` MUST NOT GAIN A `userId`, and this is the part worth reading twice.** It is exempt for a
real reason — `advisor_messages` has no `user_id` column (`repo-scoping.test.ts:177`) — but the decisive
argument is behavioural: **an implicit filter cannot produce the required 404.** A filtered-to-empty read
is byte-identical to a legitimately empty conversation, so scoping `getMessages` would silently convert a
foreign-id request into a *successful, paid, first-turn* model call. Explicit is not the weaker design
here; it is the only one that answers the question the route has to answer. *(Scoping it may still be
worth doing as pure defence in depth. It would not satisfy N-48, and this unit will not let it be
mistaken for a fix.)*

**FILES, callers enumerated per §9.4:**

| File | Change | Why |
|---|---|---|
| `src/app/api/advisor/route.ts` | **M** — await `conversationBelongsToUser` when `body.conversationId` is non-null; `false` → `notFound("Conversation")` | site 1, N-48 |
| `src/app/api/advisor/route.test.ts` | **M** — the 404-before-spend pin | the guard |
| `src/services/advisor-actions.ts` | **M** — same check in `confirmAndApply`, before `executeBatch` | site 2, N-49 |
| `src/app/api/advisor/actions/route.test.ts` | **M** — its pin | the guard |
| `src/architecture/repo-scoping.test.ts:177-181` | **M** — **prose only.** Its `advisor_messages` reason ends "*which only the GET conversations route calls; N-48*". After this unit that sentence is false | a register that documents a fixed defect as open is the counts-written-once class in a guard |
| `src/lib/advisor/repo.ts` | **unchanged** | `conversationBelongsToUser` already exists and is already tested both ways |

**DECLARED BEHAVIOUR CHANGE, one:** a `POST /api/advisor` naming a conversation the caller does not own,
**or one that does not exist**, answers **404 `Conversation not found.`** — before any reservation and
before any paid call. **The two cases are identical to the byte**: one predicate, one branch, one string
literal via `notFound("Conversation")` (`respond.ts:50`). There is deliberately **no separate
`if (!exists)`**, because a response that distinguishes them is an existence oracle for other users'
conversation ids. Callers using their own conversations see no change. `conversationId: null` stays
valid at both sites — an unbound action batch is legitimate, and the predicate applies only to a
non-null id.

**RED PLAN — ~~six~~ SEVEN mutations, each shown red (§5 rule 2). M7 was added by the code review, which is where it belongs: a mutation nobody thought of until someone attacked the condition:**

| # | Mutation | Must redden |
|---|---|---|
| **M1** | Delete the route's ownership check | the 404 test on site 1 |
| **M2** | **Move the check INTO the `Promise.all`** | the *"`reserveAdvisorTokens` was not called"* assertion — **M2 is the reason that assertion exists**: a 404 test alone stays green while the spend still happens |
| **M3** | Delete the check in `confirmAndApply` | site 2's pin |
| **M4** | Make the check apply to `conversationId: null` too | the unbound-batch test — the fix must not break legitimate null |
| **M5** | Answer a *different* string for nonexistent than for foreign | the byte-identity assertion (message **and** length, U12's shape) |
| **M6** | Restore `repo-scoping.test.ts`'s stale "N-48" reason | the prose assertion that the exemption's reason matches reality |
| **M7** *(added by `ecc:code-reviewer`, 2026-09-20)* | Revert site 2's `!= null` to a truthiness test | the empty-`conversationId` test — `""` is schema-valid at that site |

**§5.2's real requirement, stated because a 404 test looks sufficient and is not:** every site-1 test
asserts **both** the status **and** that `reserveAdvisorTokens` and the adapter were **not called**. A
guard that only checks the status leaves M2 green.

**NEW FINDING, registered not absorbed (§8.1) — N-69.** `recordBatch` stamps `user_id` and
`advisor_actions.conversation_id` carries a foreign key to `advisor_conversations(id)`
(`0004_advisor_actions.sql:16-17`, `on delete set null`) — so a *nonexistent* id is refused by Postgres,
but a **foreign** one is not: the FK constrains existence, never ownership. A future direct caller of
`recordBatch` could therefore persist a row pointing at another user's conversation, and
`repo-scoping.test.ts` would pass because the row's `user_id` is correct. U29 closes the path through
`confirmAndApply`; it does not close `recordBatch` itself.

**RESIDUAL, named because the structure does not cover it:** site 1's check lives in the route, so a
future second entry point into the turn path — a server action, a streaming v2 — re-opens N-48. The turn
orchestration lives in the route today, so there is nothing else to protect; the mitigation is the pinned
test, not the structure. That is a real limit of the recommended placement, not an argument against it.

**REVIEWS — `ecc:code-reviewer`: 0 blocking, 2 advisory, both taken. `ecc:security-reviewer`: 0
blocking, 2 advisory, enumeration published above.**

**ADVISORY 1, TAKEN, AND IT FOUND A REAL HOLE IN THIS UNIT'S OWN FRAMING.** The plan says *"the
predicate applies only to a non-null id."* The code said `conversationId && …`, which is **non-falsy**,
not non-null — a different class. It matters because `confirmSchema.conversationId` is
`z.string().nullish()` with **no `.uuid()`**, unlike the advisor route's schema, so **`""` is a
schema-valid body** (verified: `z.string().nullish().safeParse("").success === true`). A falsy guard
skips the check for it, and `""` is neither "no conversation" nor a value the check can evaluate.
**Fixed here** — the condition is `conversationId != null` — with a test, and **M7** added to the red
plan: reverting to the truthiness test reddens it.

**The blast radius is worth recording even though it is not ours.** With `""` the insert would have
failed Postgres' uuid cast **after `executeBatch` had already committed the stack change**, and that
throw lands in the outer `catch`, which returns `ACTION_ERROR` **without** `rolledBack: true` — so the
client cannot tell a rolled-back batch from an applied-but-unaudited one. **Pre-existing, registered as
N-71, not attributed to this unit** (the reviewer said so unprompted); U29 in fact narrows one route to
it.

**ADVISORY 2, TAKEN: site 2 had no byte-identity test.** Site 1 did. Structurally the two cases cannot
diverge at site 2 today — one branch, one literal — but *"cannot diverge today"* is what a guard is for,
and an M5-style mutation applied only there would have gone uncaught. The symmetric test now exists.

**A THIRD THING THE REVIEW TURNED UP, AND IT IS THE ONE I LIKE LEAST: my own test wiring had N-67's
defect.** The reviewer flagged an indentation slip at `actions/route.test.ts:153`; the slip was the
visible half of a default mock (`conversationBelongsToUser.mockResolvedValue(true)`) that I had
inserted **inside the 401 test instead of the `beforeEach`**. `vi.clearAllMocks()` clears calls but not
implementations, so the default leaked forward and every later test depended on the 401 test having run
first. **The suite was green and order-dependent** — the same mechanism as N-67, in the sibling file, in
the very unit that registered it. Moved to `beforeEach` with the reason written beside it.

**Verified soundness, from the code review, recorded because it is the part that did not need fixing:**
the guard runs after `enforceRateLimit`, awaited, strictly before the `Promise.all`, and a `false`
returns before any of the three members run; `confirmAndApply` has exactly one caller and the check is
unconditional at the top of its `try`; **byte-identity is structural, not merely a shared literal** —
`conversationBelongsToUser` issues ONE query filtered on both `id` and `user_id`, so "exists but not
yours" and "does not exist" are already indistinguishable at the data layer, and the new call sites
inherit that rather than re-deriving it.

**U29's NON-COVERAGE PARAGRAPH — `ecc:security-reviewer`'s enumeration, 2026-09-20.** The question put to
it: *after U29, enumerate every remaining path by which a caller can cause a reservation or a paid call
against a conversation they do not own.* **Verdict: N-48 and N-49 are MITIGATED, not CLOSED.**

1. **A first turn with no `conversationId` — allowed, and the residual spend surface.** The guard fires
   only on a truthy id (`route.ts:117-122`), so a caller who never supplies one always reaches
   `reserveAdvisorTokens` and the model. **There is no conversation to not-own yet, so this is correct
   behaviour and not a hole** — but it means the only cost controls on that path remain
   `enforceRateLimit` and the daily token ledger. Rate limiting bounds the *rate*, not the fact that
   every first turn is a full paid call. **Unchanged by U29, and named rather than folded into "closed".**
2. **TOCTOU — check-then-act at both sites.** The predicate is a plain read; the reservation is a
   separate round trip afterwards. The answer can go stale in the gap. **Registered as N-70**, with the
   uncomfortable detail that this repository already contains the atomic pattern: `appendMessages` puts
   the ownership filter on the write statement itself, so its check *cannot* go stale. Practical
   exploitability today is low — conversations are not transferable — but the asymmetry is real.
3. **`getMessages` remains unscoped** (`repo.ts:120-131`), by the design decision this unit defends: an
   implicit filter cannot answer a 404. After the guard passes, the read leans on the check plus RLS. In
   item 2's window, RLS is doing real work here rather than pure defence in depth. **Stated, because the
   exemption's written reason now says so too.**
4. **The streaming section after the guard is the safe half, and already was.** `createConversation`
   always creates a row owned by the caller; **`appendMessages` re-checks ownership atomically** and
   would throw rather than write into a conversation that stopped being theirs; `settleAdvisorUsage`
   touches only the caller's ledger row. **U29 does not need to touch any of it.**
5. **`/api/lab-import/extract` — confirmed non-applicable, not merely "unchanged".** It has no
   `conversationId` in its request shape and never imports the advisor repo. It reaches
   `createCompletion` through `pdf-adapter.ts`, but carries no conversation-scoped state to
   misappropriate; its spend is bounded by its own rate limit and `maxDuration` under §4 rule 9.
6. **`recordBatch` has exactly one caller today** — `confirmAndApply`, which U29 now guards — and
   `confirmAndApply` has exactly one caller, its route. **The schema gap survives**: a future second
   caller reinherits N-69 with no compiler or migration signal.
7. **Nothing else reaches the paid path.** Grepped, not assumed: `reserveAdvisorTokens` has one caller
   (`route.ts:137`), `createCompletion` has two (`model-adapter.ts:380` — gated; `pdf-adapter.ts:338` —
   item 5). No cron, server action or admin path.

**Why MITIGATED and not CLOSED, in one line:** the attack the unit targets — riding another user's
conversation to spend their budget or bind their audit trail — is closed at both current call sites,
with the *ordering* pinned rather than only the status; what remains is a non-atomic window (N-70), a
schema that constrains existence but not ownership (N-69), and a first-turn path whose only cost control
is the rate limit.

**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build`.
Reviews: `ecc:code-reviewer` on the diff **and** `ecc:security-reviewer` — this unit changes who may
spend money on whose behalf.

**STATED DEVIATION FROM §11, recorded at the owner's instruction rather than left in a report.**
`graphify` could not be run for this unit. The host became **arm64** mid-session and the installed
binary is **x86_64**: `bad interpreter: Bad CPU type in executable`. The same break took out `gh` and
`/usr/local/bin/python3`. **§11 asks for graphify *first*, and it was not available at all**, so this
unit's orientation was `grep` plus a direct read of the route and both call sites — which is the
fallback §11 exists to avoid, used knowingly.

**What follows from that, stated so the next reader can price it:** a grep finds the call sites it is
asked about and cannot volunteer the ones nobody thought to ask about, which is exactly the caller
enumeration §9.4 exists for — so this unit's enumeration rests on the handoff table and two targeted
greps rather than on a graph walk. **The owner will reinstall `gh`, `graphify` and `python3` under
arm64 before U30.** Until then CI figures are read through the **GitHub REST API**, cited as such
wherever they appear, and `/usr/bin/python3` replaces the Homebrew one.

**U29 STAMP ROW** *(standing disposition):*

| U29 closeout | value |
|---|---|
| merged to `main` | **`1f0077c`** — fast-forward from `1a6c080`, 1 commit, 7 files, +477/−3 |
| code run | **`35536919856`** — green on `1f0077c`, **18/18 steps**, on `feat/u29-pre-spend-ownership` |
| post-merge `main` run | **`35537125713`** — green on `1f0077c`, 18/18, required check satisfied on the merged SHA |
| CI figures | ~~**NOT READ — see below.**~~ **BACK-FILLED 2026-09-21, read from run `35536919856`'s log after the arm64 reinstall**: lint **362 of 362, 0 errors** · vitest **1336 / 108 files** · non-live E2E **70 passed / 30 skipped**. **All three match the local run exactly**, which is the check the row could not perform when it was written |
| bkit | **`u29-pre-spend-ownership` → `completed`**, advanced 2026-09-20 as the last step of this closeout |

**[2026-09-21] BACK-FILLED. The paragraph below is kept as written (§7) because it is the record of why the figures were missing, and because the gap it describes lasted one unit and was closed by a toolchain fix rather than by a decision.** `gh` 2.101.0 (arm64, authenticated) read run `35536919856`'s log; the three figures are now in the row above and **match the local run exactly**. **One thing the reinstall did not fix, and it is worth knowing:** the arm64 binary lives at `/opt/homebrew/bin/gh`, which is **not on this shell's `PATH`**, so bare `gh` still resolves to the stale x86_64 binary at `/usr/local/bin/gh` and still fails. The back-fill was run by absolute path. A tool that is installed and unreachable is indistinguishable from one that is not installed, which is the same shape as §10.3's *guardrails that do not run in CI do not exist*.

**THE THREE CI FIGURES ARE MISSING FROM THIS ROW, AND THAT IS A REPORT, NOT AN OMISSION.** Every prior
closeout in this phase re-read lint / vitest / E2E out of the CI log to check them against the local
run. This one could not: `gh` is x86_64 and this host is now arm64, and the REST API's log endpoint
answers **403 unauthenticated** (measured). What the API *does* give without credentials is the run id,
the conclusion and the step count, and those are above. **So the two runs are green and 18/18 — and the
claim "CI measured the same numbers the developer did" is NOT made for this unit**, because nothing
this session could run established it. The figures in the row are local.

**Why it matters more here than it looks:** the non-live E2E count is the one figure this unit could not
produce locally at all, so it is simply absent rather than unverified-but-guessed. §5 rule 1.

**THE SWEEP.** Grepped, not recalled. Three prose sites asserted that `POST /api/advisor` *never* calls
`conversationBelongsToUser` — true when U26 wrote them, false the moment this unit landed.

| Site | Claim | Action |
|---|---|---|
| `docs/project-status.md:223` | "Two findings registered, not absorbed … both owned by U29" | struck and dated; both now addressed, **MITIGATED not closed**, with N-69 and N-70 named |
| `src/lib/advisor/repo.ts:154` | "`POST /api/advisor` never calls `conversationBelongsToUser`" | struck in place; "IT DOES NOW — awaited before the reservation" |
| `src/lib/advisor/repo.test.ts:298` | the same claim, in a test comment | dated addendum; the bump-first filter is still the atomic half, and N-70 records that U29's is not |
| `src/architecture/repo-scoping.test.ts:177` | the same claim again | **already corrected inside the unit — and it was the only one of the four that a test forced** |

**That last row is the finding, and it is worth more than the four edits.** Four copies of one claim
existed; **one** was bound to the code, and that one reddened by itself and could not be left stale. The
other three were prose, and they survived U26 → U31 → U32 untouched because nothing reads prose. The
spec-count sweep of U12/U22/U32 is the same lesson in a different costume: **the fix is never "remember
to grep", it is to bind the claim.** This is the sixth appearance of the counts-written-once class
(FU-32) in this phase.

Spec count is **unchanged at 22** — U29 added assertions to an existing spec rather than a new file,
so the three dated bracket sites are not touched.

**U34 · Post-commit failures report their state honestly.** *(created 2026-09-20 by owner ruling on
N-71; numbering append-only)* M `src/services/advisor-actions.ts` · M its route test · possibly
`src/lib/api/respond.ts`. **S**, deps **U29**, **sequenced after U33 and before the Phase 2 closeout.**

**The defect, stated as the client experiences it:** `executeBatch` has its own `try/catch` that returns
`ACTION_ERROR` with `details: { rolledBack: true }` — a computed fact the client acts on. **`recordBatch`
runs after that block**, so a throw there falls to the outer `catch`, which returns `ACTION_ERROR`
**without** `rolledBack`. The stack change is already committed and the audit row never exists, and the
response cannot be told apart from a batch that rolled back cleanly.

**What U34 must deliver:** after `executeBatch` has committed, any throw before the audit row is
recorded must **either** roll back and say so, **or** answer with a body that states
**applied-but-unaudited** — and the client must be able to distinguish the two. Which of the two is the
right behaviour is U34's design question, not a detail: rolling back is honest but discards work the
user asked for; reporting applied-but-unaudited keeps the work and admits the audit gap. **Both are
defensible; silently returning the same shape as a rollback is not.**

**Red:** force `recordBatch` to throw after a successful `executeBatch` and assert the response
distinguishes the two states — a test that must go red against today's code, which returns the
indistinguishable shape. **Mutation-shown, per §5 rule 2.**

**Non-coverage, named now so U34 does not quietly grow:** this is about **reporting**, not about making
the two writes atomic. A transaction spanning the stack mutation and the audit insert is a different,
larger design, and N-71 does not ask for it.

**U30 · Malformed path params answer 400, not 500.** *(created 2026-09-14 by decision 8(d), on N-51;
numbering append-only)* N a `uuidParam` schema export · M **12 handler entry points across 8 route files**
· M their tests · N a source scan in `src/architecture/`. **S**, deps none. **Scheduled after U29**, and
**not folded into it**: U29 is an ownership check on one route and U30 is a validation shape across eight,
and merging them would put a twelve-file mechanical change under a gate that says nothing about it.
**Behaviour change (declared):** a malformed path parameter answers **400 `VALIDATION_ERROR`** where it
answers 500 today — so a 500 that is currently logged with a correlation id stops being logged at all,
which is the point: it was never an internal error. **Shape:** one exported `uuidParam` schema, a
`.parse()` at each handler after `await params`, and the existing `handle()` → `ZodError` →
`validationError` path carries the 400 with no new machinery. **The scan:** every tracked
`src/app/api/**/route.ts` that reads `params` must parse through `uuidParam`. **Red:** remove one
`.parse()` → the scan names that file; **anti-vacuity** on both inventories (routes scanned, routes
reading `params`), so a regex that stops matching is red rather than green. **Stated non-coverage:**
`itemId` in the stack-item route is compared in JavaScript and never cast, so it is not a 500 risk; whether
it should still be validated for shape is a question U30 answers by validating it anyway (one schema, no
per-parameter judgement) rather than by carving an exception.

---

#### U30 PLAN — drafted 2026-09-21, ~~AWAITING OWNER APPROVAL. Nothing below is implemented.~~ **APPROVED by the repository owner, 2026-09-21**, with five rulings: **(1)** the category B reversal is accepted **on the syntactic/semantic distinction**, and the clause retires per §7 with that reasoning in place; **(2)** the undo route uses `safeParse` + explicit `validationError`, and its being the only handler without `handle()` is registered as **N-72**, owned by **U34**; **(3)** placement in `schemas.ts` accepted with **no tautological conformance assertion — an assertion that cannot go red is not written**, and the reasoning is recorded so nobody adds one later; **(4)** the wrapper is deferred as **FU-33**; **(5)** `graphify label` is not run — an optional LLM relabel that costs money for no unit value.

**bkit:** registered as `u30-uuid-path-params`, phase `plan`; artifact
`docs/01-plan/features/u30-uuid-path-params.plan.md`, subordinate, mirroring this entry.

**STOP HERE FIRST — THIS UNIT REVERSES A RECORDED DECISION, AND THE DECISION'S REASONING IS THE ONE U29
JUST USED.** `route-contract.test.ts:74-77` defines exemption **category B** in these words: *"the id is
caller-supplied, but a malformed or foreign one resolves to 404 — never 400, because a 400
distinguishing 'not a uuid' from 'not yours' is a weak existence oracle."* **Four of U30's eight files
are category B entries** — `advisor/actions/[id]/undo`, `advisor/conversations/[id]`,
`stacks/[id]/compare`, `stacks/[id]/evaluate`. Decision 8(d) created U30; this paragraph is where U30
meets what the guard already says.

**The reversal is defensible, and here is the distinction that makes it so:** a **syntactic** 400
discloses nothing about existence. *"This string is not a UUID"* is knowable from the string alone,
without touching the database — it is a statement about the request, not about the data. The oracle
category B guards against is a **semantic** one: answering differently for *well-formed but foreign*
versus *well-formed and absent*, which is exactly what U29 spent a mutation (M5) making impossible.
**U30 must not touch that.** Well-formed-but-foreign stays 404, byte-identical, forever.

**What the unit therefore owes, per §7:** category B's *"never 400"* clause is **retired, struck with
its rationale, not deleted**, and replaced by the syntactic/semantic split above. **Two assertions in
`route-contract.test.ts` go red on the way** — the stale-exemption check (`:180`) and the set-equality
check (`:204`) — and **that redness is evidence, not breakage**: it is the guard noticing that four
routes it recorded as non-validating now validate.

**THE TWELVE HANDLER SITES.** Measured, not recalled — `grep -Hn "await params"` across the eight
tracked dynamic route files. Every one reads its params with no validation of any kind today; the
"current parse" column is empty for all twelve because there is no parse, which is N-51 in one column.

| # | File | Handler | Param read | Ids | Insertion |
|---|---|---|---|---|---|
| 1 | `advisor/actions/[id]/undo/route.ts` | POST | **:28** | `id` | **see the asymmetry below — this one is not like the others** |
| 2 | `advisor/conversations/[id]/route.ts` | GET | :39 | `id` | `uuidParam.parse(id)` immediately after the read |
| 3 | `stacks/[id]/route.ts` | GET | :17 | `id` | same |
| 4 | `stacks/[id]/route.ts` | PUT | :32 | `id` | same |
| 5 | `stacks/[id]/route.ts` | DELETE | :47 | `id` | same |
| 6 | `stacks/[id]/items/route.ts` | POST | :17 | `id` | same |
| 7 | `stacks/[id]/items/[itemId]/route.ts` | PUT | :61 | **`id`, `itemId`** | **both** parsed |
| 8 | `stacks/[id]/items/[itemId]/route.ts` | DELETE | :77 | **`id`, `itemId`** | **both** parsed |
| 9 | `stacks/[id]/evaluate/route.ts` | POST | :14 | `id` | same |
| 10 | `stacks/[id]/compare/route.ts` | GET | :17 | `id` | same |
| 11 | `lab-markers/[id]/route.ts` | PATCH | :16 | `id` | same |
| 12 | `lab-markers/[id]/route.ts` | DELETE | :30 | `id` | same |

**Twelve handlers, FOURTEEN ids** — rows 7 and 8 take two each. The difference matters twice: once for
the work, and once for the guard, because a text scan for `uuidParam.parse(` is satisfied by a handler
that parses `id` twice and never touches `itemId`.

**THE TWELFTH HANDLER IS NOT LIKE THE OTHER ELEVEN, and the plan's headline claim is false for it
without a decision.** `advisor/actions/[id]/undo/route.ts` **does not use `handle()`** — measured:
`grep -c "handle(async"` returns **0** there and ≥1 in every other file. It reads params at `:28`
*outside* any `try`, and its own catch at `:52` maps **everything** to
`internalError(err, { code: "UNDO_ERROR" })` → **500**. So a thrown `ZodError` there becomes a 500 with
a different code, not a 400. **Proposed:** at that one site use `uuidParam.safeParse(id)` and return
`validationError(parsed.error)` explicitly — the identical 400 body as the other eleven, with no change
to `handle()`, no change to `UNDO_ERROR`'s contract, and no conversion of that handler to `handle()`
(which would be a separate refactor with its own error-contract questions). **The guard must therefore
accept either form**, and that is stated here rather than discovered when the scan reddens.

**PLACEMENT — the one question put to `ecc:architect`: does `uuidParam` belong in
`src/lib/validation/schemas.ts`, and does that module's compile-time conformance pattern apply?**

**Answer: yes to the module, no to the pattern.** The module already owns this predicate **twice** —
`schemas.ts:64` and `:109` both inline `z.string().uuid()` for a `stackId`, and `schemas.test.ts` has a
`uuid-only request schemas` block over them. A new module would create a second place the UUID rule can
drift; `uuidParam` here lets those two be rewritten as `z.object({ stackId: uuidParam })`, one
definition.

**The conformance pattern does NOT apply, and the reason is worth keeping because it is a rule about
when to stop copying a good idea.** The pattern is real (`schemas.ts:136-153`): `src/types` owns a write
contract and `Equal<>` — invariant, via the function-parameter trick — fails `tsc` if the Zod schema
drifts. But a `src/types/` contract for a UUID path parameter could only say `type UuidParam = string`,
and **`Equal<string, string>` is a tautology that cannot go red under any mutation of
`z.string().uuid()` — including deleting `.uuid()`, which is the only mutation that matters.** An
assertion that provably cannot fail is worse than none: it reads like coverage. *(The non-vacuous
version is a branded `Uuid` type threaded through every repo signature — a cross-cutting refactor §3
rule 4 forbids this unit from starting.)*

**THE SCAN — `PATH_PARAM_VALIDATION`, new spec `src/architecture/path-param-validation.test.ts`
(spec count 22 → 23).** A text scan for `uuidParam.parse(` is defeated four ways, and one of them is
live in this unit's own shape: **(i)** the two-id handlers parsing `id` twice; **(ii)** an aliased
import; **(iii)** a parse placed *after* the first repo call, which still 500s; **(iv)** a thirteenth
`[param]` route nobody adds to a list. So the guard is **two layers, both derived from `git ls-files`
rather than from a hand-kept list**:

1. **BEHAVIOURAL.** For every tracked `src/app/api/**/route.ts` whose path contains a `[param]`
   segment, import its exported handlers and assert **400** with each param position in turn filled
   with a non-UUID. Caller-derived, so a new dynamic route is in scope the day it is tracked, and a
   missed `itemId` reddens **by behaviour, not by text** — which kills evasions (i), (ii) and (iv).
2. **ORDERING.** Every identifier destructured from `await params` must reach a validating call
   **before the first I/O call** in that handler — which kills (iii). `auth-coverage.test.ts` already
   has the machinery: per-file I/O-symbol derivation and a position sort.

**Anti-vacuity, on both layers:** the discovered set of dynamic routes is asserted **non-empty and ≥ 8
files / 12 handlers**, because a scan that stops finding routes — a rename, a restructure, a regex that
no longer matches `[` — passes over nothing and reports success.

**DECLARED BEHAVIOUR CHANGE, one:** a malformed path id answers **400 `VALIDATION_ERROR`** instead of
**500**, through the **existing** `ZodError → validationError` path in `handle()` (`respond.ts:251`) —
no new error class, no change to `respond.ts`, no new response shape. **A well-formed id that does not
exist, or is not yours, still answers 404, byte-identical** — U29's property is untouched, and U30 must
not weaken it.

**RED PLAN — ~~seven~~ NINE mutations (§5 rule 2). M8 and M9 were added by the code review, and both attack the guard's blindness rather than the code's behaviour — the failure mode a guard has that a test does not:**

| # | Mutation | Must redden |
|---|---|---|
| **M1** | Remove the parse from one handler | that handler's 400 test **and** the behavioural scan |
| **M2** | In a two-id handler, parse `id` twice and never `itemId` | the `itemId`-position 400 test — **the evasion a text scan cannot see** |
| **M3** | Delete `.uuid()` from `uuidParam` | every 400 test; this is the mutation the conformance pattern could not have caught |
| **M4** | Move a parse to **after** the first repo call | the ordering layer (the handler still 500s) |
| **M5** | Add a thirteenth `[param]` route with no validation | the derived discovery — proves the set is derived, not listed |
| **M6** | Narrow route discovery so it matches nothing | the anti-vacuity assertion |
| **M7** | Restore category B's "never 400" clause and its four entries | `route-contract.test.ts`'s stale-exemption (`:180`) and set-equality (`:204`) |
| **M8** *(added by `ecc:code-reviewer`)* | Rewrite a handler as an arrow export and drop its parse | the widened walker sees it — before the fix this passed silently |
| **M9** *(added by `ecc:code-reviewer`)* | `(await params).id` instead of destructuring | *no silent skips* — the handler yields no id and says so |

**CONSIDERED AND NOT CHOSEN, recorded so the next unit does not re-litigate it.** **Middleware: no** — it
would re-derive route shapes from URL regexes (a second source of truth for what the filesystem already
states), duplicate `fail()`'s envelope, and match pages as well as routes. **A `handleParams(params,
schema, fn)` wrapper: the better design, and still not this unit** — it would make the guard unnecessary
*by construction*, which is strictly better than a guard, but it is a twelve-site signature refactor and
`handle()` structurally cannot do it (it receives a thunk and never sees `params`). Registered as the
considered alternative; if the owner prefers it, U30 is a different and larger unit.

**Prior art, cited because this bug class has been found here before:** `advisor-actions.ts:149` carries
U29's note that a falsy-vs-null guard let an unvalidatable id through to Postgres. Same class — a
caller-supplied identifier reaching the database unvalidated — one layer up.

**REVIEWS — `ecc:code-reviewer`: APPROVE, 0 blocking, 2 MEDIUM + 1 LOW + 1 DOC, **all four taken**.
`ecc:security-reviewer`: 0 blocking, answer NO (the paragraph above).**

**THE TWO MEDIUMS WERE THE SAME DEFECT, AND IT IS THE ONE A GUARD CAN HAVE THAT A TEST CANNOT: NOT
"WRONG", BUT "ABSENT".** The walker recognised only `export async function GET(...)`. A handler written
as `export const GET = async (...) => {}`, or one reading `(await params).id` instead of destructuring,
produced **no report at all** — so it failed nothing. The floors are aggregate, so such a route could
sit beside the twelve covered handlers and be checked by nothing.

**Fixed rather than disclosed, because the reviewer proposed the better version and it is better:** the
walker now recognises both declaration shapes, and a new assertion — *every handler in a dynamic route
yields at least one id* — turns an unseen handler into a **failure** instead of an absence. Two more
mutations prove it, beyond the approved seven:

| # | Mutation | Red evidence |
|---|---|---|
| **M8** | Rewrite a handler as an arrow export **and** drop its parse | the guard now **sees** it — `compare/route.ts#GET(id)` reported unvalidated. Before the widening this mutation passed silently, which is the whole finding |
| **M9** | Replace destructuring with `(await params).id` | *"these handlers live in a dynamic route and yielded NO path id"* |

**The LOW was a disclosure that was narrower than its own gap.** The honest-limits comment said the
scanner cannot see I/O reached "through a helper in another module"; the same blindness applies to a
**same-file** local helper, because `ioSymbols` walks imported identifiers only. `items/[itemId]`'s local
`belongsToStack` is exactly that shape. Not live — every handler makes a directly imported I/O call
first, so `firstIo` is pinned before any wrapper runs — but the comment now says what is actually true.

**The DOC item, taken:** the subordinate artifact still read *AWAITING OWNER APPROVAL* after the entry
recorded the approval. Synced, with a note that the artifact carries no status of its own.

**What the review verified rather than assumed, and it is worth recording:** the reviewer re-ran two of
the seven planned mutations (M2, M4) against the working tree and reproduced both, then invented a
third — removing a parse outright — and confirmed the route test fails with `expected 200 to be 400`
**rather than masking a 500**. It also confirmed no two converted fixtures collided on one UUID and no
assertion depended on an old literal.

**U30's NON-COVERAGE PARAGRAPH — `ecc:security-reviewer`'s answer, 2026-09-21. The question was: after
U30, does any 400 body, status, header or timing distinguish a well-formed FOREIGN id from a well-formed
ABSENT id, at any of the fourteen positions? THE ANSWER IS NO, and here is what that rests on.**

1. **The 404 branches are untouched.** U30 inserts a validation call *ahead of* each handler's existing
   lookup and changes no `notFound` branch. `not-found-uniformity.test.ts` — U12's byte-identity guard —
   is not among the changed files and its assertions still pass unmodified.
2. **A malformed id never reaches the database.** In all twelve handlers the parse precedes
   `createClient()`, so there is no query to time. **This is a regression-tested property, not an
   observation**: `PATH_PARAM_VALIDATION`'s ordering rule compares source position against the first I/O
   call, and **M4** is its red proof.
3. **Foreign and absent cost the same.** Both continue down the pre-existing lookup path —
   `getStack`, `belongsToStack`, `conversationBelongsToUser`, `getAction` — doing the identical number
   of queries they did before this unit. U30 adds none and removes none.
4. **The 400 body carries nothing.** `validationError` serialises **only** `fieldErrors`, and for a bare
   (non-object) schema Zod's per-path `fieldErrors` is always `{}` — re-measured here rather than taken
   on trust: `z.string().uuid().safeParse("not-a-uuid").error.flatten()` →
   `{"formErrors":["Invalid uuid"],"fieldErrors":{}}`, and `formErrors` is **not** in the envelope. So
   every malformed id at every position produces the same body: no echo of the value, no route
   variance, nothing that says which position rejected it.
5. **The two-id handlers were the specific risk, and they are clean.** If `itemId` were validated after
   the parent-stack lookup, a 400 on `itemId` would imply *the parent stack exists and is yours* — a
   real oracle. Both parses sit together, before `getStack`. **M2 is the mutation that keeps it that
   way.**

**The limits, carried forward rather than buried:** the guard reads the AST, not the runtime — it cannot
see an id that reaches I/O through a helper in another module, and it treats a `safeParse` whose result
is ignored as validated. Manual review of all twelve handlers confirms none exploits either gap today.
**This is a coverage boundary, not a defect**, and it is why the fourteen behavioural 400 tests exist
beside the guard rather than instead of it.

**STATED NON-COVERAGE — U29's property is untouched, and this paragraph is the commitment.** U30 changes the answer for a **syntactically invalid** id only. **A well-formed id that is foreign and a well-formed id that is absent answer the same 404, to the byte, at every one of the fourteen positions** — that is U29's semantic property, pinned by its own M5, and U30 neither weakens nor re-derives it. The security review's question for this unit is exactly that: *does any 400 body or timing distinguish well-formed-foreign from well-formed-absent at any position* — **and the answer must be no**. A 400 that reached the database to decide would be the oracle category B was written to prevent; `uuidParam.parse` decides from the string, before any I/O, which is why the ordering layer of the guard is a correctness property and not tidiness.

**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured) · `npx next build`.
Reviews: `ecc:code-reviewer` on the diff **and** `ecc:security-reviewer`, because the unit changes what
an unauthenticated scanner can learn from a malformed URL.

**U30 STAMP ROW** *(standing disposition):*

| U30 closeout | value |
|---|---|
| merged to `main` | **`56c8c79`** — fast-forward from `b20c3fb`, 1 commit, 21 files, +911/−99 |
| code run | **`35578789904`** — green on `56c8c79`, **18/18 steps**, on `feat/u30-path-param-validation` |
| post-merge `main` run | **`35579124986`** — green on `56c8c79`, 18/18, required check satisfied on the merged SHA |
| CI figures, re-measured | lint **363 of 363, 0 errors** · vitest **1355 / 109 files** · non-live E2E **70 passed / 30 skipped** |
| bkit | **`u30-uuid-path-params` → `completed`**, advanced 2026-09-21 as the last step of this closeout |

**Read through `gh` again, and checked against local — all three match exactly.** U29's row could not
make that claim and said so; this one can. The toolchain gap lasted exactly one unit.

**THE SWEEP.** Grepped for the two phrases the category B retirement could have made false, plus the
spec count.

| Claim | Site | Action |
|---|---|---|
| "seven executable architecture specs" | `README.md:26`, `docs/project-status.md:333` and `:473`, `docs/02-design/architecture-boundaries.md:256` | **22 → 23**, each bracket **extended in place**: `… · 22 at U32 · 23 at U30 (2026-09-21)` |
| *"never 400 … a weak existence oracle"* | `docs/01-plan/phase-1-verification-integrity.plan.md:780` — **a CERTIFIED Phase 1 artifact** | **ANNOTATED, NOT REWRITTEN** (the D-3 pattern this plan established): the certified text stands exactly as certified, and a dated note beside it records that the reasoning was **right about the risk and wrong about the remedy**, names the syntactic/semantic split, and points at where the live rule now lives |
| *"must still be 404, never 400"* | `src/app/api/stacks/[id]/items/[itemId]/route.test.ts:114` | **LEFT ALONE — still true.** It is about a malformed **body** against a foreign **item**, which U30 does not touch. A sweep that edits a claim because it matched a grep is worse than one that does not grep |
| category B's own text | `src/architecture/route-contract.test.ts:81` | already retired inside the unit, struck with both halves of the reasoning |

**The third row is the one worth keeping.** Two sites matched *"never 400"*; one was false and one was
true, and they are one line apart in intent. **The certified artifact could not be edited and the true
claim should not be** — so this sweep's output is one annotation, one left-alone, and four dated
counts. Grep finds candidates; only reading decides.

**A note on the annotated artifact, because it is the second time this has come up:** a *certified*
document that becomes false is not the same problem as a stale count. The count gets a dated bracket;
the certification gets an annotation that leaves the original legible, because the value of a certified
artifact is that it records what was believed **at certification**. D-3 established that pattern for
re-labels; this is its first use for a **reversed decision**.

**THE LESSON, and it is about guards rather than routes.** U30's designed deliverable was fourteen
`uuidParam.parse` calls. Its most valuable output was `ecc:code-reviewer`'s two MEDIUM findings, which
were the same defect: **the guard could be blind rather than wrong.** A handler shape the AST walker did
not recognise — an arrow export, or `(await params).id` — produced **no report at all**, so it failed
nothing and looked like coverage. **M8 and M9 exist because of that**, and the fix was not a comment: a
new assertion makes an unseen handler a failure instead of an absence.

**That is a different failure class from anything this phase has recorded so far.** N-67, N-68 and
U29's blocking finding were all *assertions that stopped distinguishing*. This one is an *inventory that
stopped enumerating* — the anti-vacuity family, but per-item rather than per-set: the floors were
aggregate, so a blind handler could hide beside twelve visible ones. **Anti-vacuity on a total does not
imply anti-vacuity on a member.**

**Method rule added to §5 from this unit's own slip:** mutation reverts use a file-copy backup, never
`git checkout --`, because the file under mutation carries the unit's uncommitted work. It is recorded
because it happened here, and because the loss was caught only by reading `git status` afterwards
rather than trusting the revert.

**U31 · The LLM provider becomes OpenAI's first-party API.** *(created 2026-09-14 by the scope amendment
in this document's header and decision 9; numbering append-only — U31 follows U30, it is not inserted)*
M `src/lib/omniroute/**` → **`src/lib/openai/**`** (git mv, 2 files) · M `model-adapter.ts` ·
M `pdf-adapter.ts` · M both paid `route.ts` · M **5 guard sites** in `boundaries.test.ts` · M the
`vitest.config.ts` coverage key · M `.env.example`, both probes, `load-env.ts`, `probe:*` scripts, 3 E2E
specs · M `CLAUDE.md` §4's rule-9 row · M `docs/project-status.md` · N one dated probe record.
**M**, deps none. **Not folded into anything**: it is a provider swap, and U25 is the precedent for
giving one its own unit.

**Why it is M and not L, unlike U25.** U25 was L because it rewrote a wire protocol. **This unit rewrites
none** — `client.ts` was written to OpenAI's shapes on day one (its own header says so), so the protocol
survives and the work is a rename plus two body fields. Sizing that honestly matters: an L label here
would license scope this unit does not have.

**Behaviour changes (declared), three:** (i) the request body's cap field becomes
`max_completion_tokens` — GPT-5-era models reject `max_tokens`; (ii) an optional `reasoning_effort`
appears **only** when `OPENAI_REASONING_EFFORT` is set, never as `undefined`; (iii) **a deployment that
does not update its environment answers 503 `AI_SERVICE_NOT_CONFIGURED`** on both paid paths rather than
calling a gateway that is gone. (iii) is the intended direction: a fallback to the old variable names
would leave a half-migrated repository claiming to be migrated, which is what `RETIRED_PACKAGE` exists to
prevent.

**Order of work, and it is the unit's one real risk control: GUARDS BEFORE THE RENAME.** Re-point
`PAID_MODULES`, `SOLE_PAID_CLIENT`'s key literal and reader pin, `NO_PINNED_MODEL_ID`'s reader pin and the
coverage key **first**, observe them **red** against the still-stale module path, then `git mv` and watch
them go green. A rename done first would make every guard green throughout and prove nothing — which is
precisely how a guard comes to scan an empty set.

**Red:** M1 stale `PAID_MODULES` → `PAID_API_BUDGET`'s governed set empties and its non-vacuity assertion
fires; M2 revert the cap field → the new client body test; M3 send `reasoning_effort` as `undefined` →
the key-absent test; M4 a fourth `OPENAI_API_KEY` reader → `SOLE_PAID_CLIENT`; M5 a hardcoded `gpt-` id →
`NO_PINNED_MODEL_ID` (whose `FAMILIES` already lists `gpt-`, so this confirms the re-point did not blind
it). **Anti-vacuity** on both pinned inventories, observed against the new paths with their counts
reported.

**Stated non-coverage, and it is the whole acceptance story.** No test here can prove the swap works: a
scripted mock accepts any model id and any effort value, and `NO_PINNED_MODEL_ID` forbids either from
living in `src/`. Acceptance is an **owner-run live probe** — `GET /v1/models` confirming the configured
id appears verbatim, then both probe scripts — recorded dated under `docs/05-qa/` beside U25's two, which
are historical and not edited. **The `ClaudeAdapter` port keeps its name**: renaming it opens `agent.ts`
and `src/types/advisor.ts` for zero behavioural gain. That name is now **two providers stale** and is
registered as a follow-up rather than absorbed (§8.1).

**DONE 2026-09-18.** Baseline before: typecheck clean, **1302/107**, lint 361/361 (U22's close,
CI-verified at run `35047441242`). After: **1306/107** (+4, all in `src/lib/openai/client.test.ts`: the
key-presence assertions M3's repair required). Lint **361/361** and the architecture-spec count **21** are
unchanged — this unit renamed files, it added none.

| | before | after |
|---|---|---|
| unit tests | 1302 / 107 | **1306 / 107** |
| lint | 361 / 361, 0 errors | **361 / 361, 0 errors** |
| architecture specs | 21 | **21** |
| coverage, paid client | `src/lib/omniroute/**` 100 · 88.23 · 100 · 100 | **`src/lib/openai/**` 100 · 89.47 · 100 · 100**, floors unchanged |

**What acceptance actually rested on, and it was not the suite.** §5 R1 said no test here can prove the
swap works. That held: the suite was green on a tree whose lab-import path could not have worked, and the
only thing that found out was an owner-authorised live run. **Two probe records, both kept:**
`2026-09-18-u31-openai-probe-record.md` (**FAIL**) and `...-record-2.md` (**PASS**). The first is not
superseded and was not rewritten — it is the red evidence for the repair the second one measures.

**The instrument was the defect, twice over.** Both probes hand-rolled request bodies and still sent
`max_tokens` after this unit moved production to `max_completion_tokens`; they 400'd, and the lab-import
probe then printed `REJECTED — option (a) does not work for this model` — a verdict about the PDF `file`
content part, from a request that never reached it. **N-26 recurring**, and the 2026-08-10 record had to
withdraw its own §2/§3 for exactly this. Repaired by making the probes **import** the production builders
(`buildCompletionBody`; and two cores newly **extracted and exported** from `pdf-adapter.ts`,
`buildTranscriptionRequest` and `pdfContentParts`) rather than re-author them. Nothing was copied, and
production calls the same two functions. **Decision 7B holds against `api.openai.com`** — option (a)
returns 200 and schema-valid candidates on a text PDF *and* an image-only one; `/v1/ocr` 404s.

**Reviewers, both on the rebased diff.** `ecc:code-reviewer` **APPROVE**, 0 critical/high/medium, 1 LOW
which was fixed rather than noted (an unreachable branch in the advisor probe naming a "probe default"
N-53 had deleted — §2.2 rule 7 at diagnostic scale). `ecc:security-reviewer` answered the one question
put to it: **no path sends health context anywhere other than the configured `OPENAI_BASE_URL`** — but
**that URL is merely documented as first-party, never validated.** Truthiness checks only, no scheme or
host assertion, and `.env.example` documents the escape hatch. Registered as **N-63** and **not absorbed**:
it is a deployment control, and a provider rename that quietly acquires one is the scope creep §8.1
forbids. It becomes **U32**, below, and it is **OP-5's precondition**.

**bkit:** feature `u31-openai-first-party`; artifact `docs/01-plan/features/u31-openai-first-party.plan.md`
is **the tracked, versioned record** of this unit's plan → design → do → check → report cycle, subordinate
to this entry (`CLAUDE.md` §9). ~~**`bkit: u31-openai-first-party → completed` is TO BE ADVANCED BY THE MAIN
SESSION.**~~ **[2026-09-18] ADVANCED BY THE MAIN SESSION** — `u31-openai-first-party` → `completed`, in `u26-bind-owner`'s shape (`phaseNumber` 0, `documents.report` pointing at this entry, history row). `matchRate` is left at the **0** that session wrote; raising it would assert a measurement nobody ran (§5.1). The sentence is struck, not deleted (§7), because it is the record of the obligation this closeout correctly refused to discharge from a worktree that could not see the file. `.bkit/state/pdca-status.json` is gitignored and exists only in the main worktree; this unit
was developed in `../supplement-stack-intelligence-u31` and cannot see it. Duplicating a local tracker
into a second checkout would create two states that disagree, which is worse than one that is absent.
**The divergence is stated rather than papered over:** a reader of `bkit_pdca_status` on the main machine
will see `u31-openai-first-party` at `plan` until that session advances it, while this entry and the
artifact show it complete. **This is C3, and it stays open until the main session acts** — §9's condition
holds only while every unit from U26 on is driven to completion, and a unit parked mid-cycle is the
half-use that condition forbids. **N-56 is the same class**, raised here and independently written up by
the main-worktree session; that write-up was **uncommitted** when this branch rebased, so it is not in
this commit and its fuller text should win when it lands.

**U31 STAMP ROW** *(standing disposition):*

| U31 closeout | value |
|---|---|
| merged to `main` | **`f9c34e3`** — fast-forward from `e9a8a73`, 1 commit |
| code run | **`35385164412`** — green on `f9c34e3`, 18/18 steps, on `feat/u31-openai-first-party` |
| post-merge `main` run | **`35385543026`** — green on `f9c34e3`, 18/18, required check satisfied on the merged SHA |
| live evidence | `docs/05-qa/2026-09-18-u31-openai-probe-record.md` (FAIL) · `...-record-2.md` (PASS) |
| bkit tracker | ~~**NOT advanced — main-worktree action, C3**~~ → **advanced by the main session, 2026-09-18** — `u31-openai-first-party` → `completed`. **C3 is discharged.** The advance is a machine-local edit to a gitignored file, so this line is the only tracked evidence it happened — which is why N-56's ruling makes it a standing STAMP ROW line |

**CI re-measured every figure this entry claims and matched exactly:** lint **361 of 361, 0 errors**;
**1306/107**; non-live E2E **70 passed / 30 skipped**.

**THE SWEEP — provider-name and count claims, grepped rather than trusted.** Per U12's lesson.

| # | Site | Disposition |
|---|---|---|
| 1 | `docs/project-status.md` — stack line, §2.4 advisor, §2.6 API layer | **Corrected in the code commit**, in place with dated notes; the U25 union sentence keeps its history and gains `(now src/lib/openai/client.ts, U31)` |
| 2 | `CLAUDE.md` §4 rule 9 row | **Corrected in the code commit** |
| 3 | `docs/05-qa/omniroute-probe-record.template.md` | **STALE — NOT FIXED. Registered as N-65** (below) |
| 4 | Phase 2 plan U25 entry, decision 7/7B, `OMNIROUTE_*` throughout | **Checked, deliberately NOT changed** — dated historical entries (§7 forbids editing them). They describe what was true at U25 |
| 5 | `CLAUDE.md` §5 measured baseline (`859/859 across 73 files`) | **Checked, deliberately NOT changed** — it dates itself to 2026-08-06 and says in its own text that it is a snapshot and that "the authoritative result for any commit is its `push`/`main` run". Self-dating prose does not rot the way an undated count does |
| 6 | Unit-test counts `1294/106`, `1302/107` in the U12 and U22 entries | **Checked, deliberately NOT changed** — each is that unit's dated after-figure, not a current claim |

**The sweep's find is N-65, and it is this unit's own residue.** U31 renamed both probe scripts but not
the artifact they instruct the operator to write into: `docs/05-qa/omniroute-probe-record.template.md` is
still titled *"OP-4 — Omniroute live probe record"*, still tells the reader to copy it to
`omniroute-probe-<date>.md`, and still says it "is the only thing that may close decision 7B" — a
decision ruled on 2026-08-10 and re-established against a different provider today. **Three live pointers
in the renamed probes still name it** (`openai-advisor-probe.ts:31,263`, `openai-labimport-probe.ts:277`).
Neither probe record written today used it. **This is the counts-written-once class one level up: not a
number that rotted, but a template that outlived the thing it templates**, still being handed to the next
operator by the very files this unit renamed.

**U32 · The base URL is pinned to first-party by default.** *(created 2026-09-18 by owner ruling on N-63;
numbering append-only)* M `src/lib/openai/client.ts` (or the one place both adapters already read the
variable) · M `.gitignore` · M their tests · N a guard. **S**, deps **U31**. **Sequenced immediately after
U31 and BEFORE U29 — it is OP-5's precondition**, not a parallel nicety: OP-5 cannot be discharged while
the only thing making the provider "first-party" is a sentence in `.env.example`.

**Behaviour change (declared):** the client **refuses** any `OPENAI_BASE_URL` whose host is not
`api.openai.com`, unless **`OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL=1`** is set. An override is **logged
once at startup with the host** — once, because a per-request log of an operator's chosen host is noise
that trains people to ignore it, and with the host because an override whose destination is not in the
log is not an audit record. A deployment that today points at a proxy keeps working **by setting the
variable**, which is the point: the escape hatch stays, and stops being silent.

**N-64, folded in:** one line of `.gitignore` hardening so `.env*.local*` **backups** cannot be committed.
Today `.gitignore:27` is `.env*.local`, which does **not** match `.env.local.bak-u31probe` — a file this
session created while repairing N-57 and had to notice and delete by hand before staging. A credential
file that `git status` offers to commit is one keystroke from §2.3 rule 14.

**Red:** (a) set `OPENAI_BASE_URL` to a non-first-party host with no override → the client must refuse,
and a test asserting the refusal must go red when the check is removed; (b) set the override → the call
proceeds **and the host appears in exactly one log line**; (c) `touch .env.local.bak` → `git check-ignore`
must match it, and must still match after the pattern change is reverted only if the revert is the bug —
i.e. the mutation is *narrowing the pattern back*. **Mutation-shown, per §5 rule 2.**

**N-65 FOLDED IN — owner ruling 2026-09-18, and declared as a widening rather than absorbed quietly.**
Rename `docs/05-qa/omniroute-probe-record.template.md` → `openai-probe-record.template.md`, retitle it,
drop its claim to be "the only thing that may close decision 7B" (7B is ruled), and re-point the **three
live references** in the two probes (`openai-advisor-probe.ts:31,263`, `openai-labimport-probe.ts:277`).

**This IS a widening of U32's original scope, and saying so is the point** (§8.1): the unit was created
for N-63 and N-64, and N-65 was neither. Three reasons it is folded in rather than left to float:
**(i) U32 already opens `scripts/`** — N-64's `.gitignore` clause and the override's startup log both land
in the same neighbourhood, so the marginal cost is ~4 lines against a second unit's full overhead.
**(ii) The template is the instrument's own documentation.** U32 is the unit that makes the paid client's
configuration auditable; a probe that writes its evidence into a template named for the previous provider
is the same artifact in the same state of disrepair. **(iii) It is N-58's class.** N-58 was the probes
drifting one field from the code they measure; N-65 is the probes pointing at a document that drifted a
whole provider from the evidence they produce. Fixing the first and leaving the second treats a class as
an instance — the mistake U31's own §7 spends a section on.

**What this does NOT license.** A widening with three stated reasons is still a widening, and the next
unit that finds a fourth adjacent thing does not inherit permission from this paragraph. The ruling was
the owner's and was asked for explicitly rather than assumed.

**Stated non-coverage.** A host pin is not taint analysis and is not a network control: it constrains what
*this code* will dial, not what the deployment's egress permits, and an operator who sets the override can
still send health context anywhere. **U32 makes the control code-level and auditable; it does not make it
absolute**, and OP-5's record must say so rather than cite U32 as though it closed the question.

---

#### U32 PLAN — drafted 2026-09-18, ~~AWAITING OWNER APPROVAL. Nothing below is implemented.~~ **APPROVED AS WRITTEN by the repository owner, 2026-09-18**, with **N-66 folded in** and a seventh mutation added. Rulings recorded in the same breath: **N-63 is MITIGATED, not closed**, and that sentence is OP-5's first line of non-coverage; the log is **once per server process**; the refusal is **503 via `NotConfiguredError`**; `.env.example`'s line is corrected in the same commit.

**bkit:** registered as `u32-first-party-base-url`, phase `plan`; artifact
`docs/01-plan/features/u32-first-party-base-url.plan.md`, subordinate, mirroring this entry and not
replacing it (the standing rule from the 2026-09-18 ruling recorded under the register's numbering note).

**PLACEMENT — the one question put to `ecc:architect`, and the answer taken.** *Does the host check
belong in the client module or in the env reader, given `SOLE_PAID_CLIENT`'s boundary?* **Answer: the
client module**, and the reason is measured rather than stylistic — **both paid paths already funnel into
`createCompletion`**: `model-adapter.ts:370` and `pdf-adapter.ts:324` each resolve `deps.baseUrl ??
process.env.OPENAI_BASE_URL` and hand the result to it (verified by reading both call sites, not
inferred). An env-reader placement would have to enumerate the readers — and **`SOLE_PAID_CLIENT`'s reader
ratchet pins readers of `OPENAI_API_KEY` only** (`boundaries.test.ts:1194`), so base-URL readers are
unpinned and a fifth one added tomorrow is green. The decisive failure, though, is **injection**:
`deps.baseUrl` short-circuits an env-reader check by construction, and `ExtractDeps`/advisor deps are
ordinary constructor input rather than a test-only channel.

**Two corrections to this entry's own text, dated rather than rewritten (§7):**
1. ~~"logged **once at startup**"~~ → **once per server process**. A module-load side effect fires during
   `next build`'s RSC evaluation and again on every lambda cold start, and **U28's rendering-determinism
   step makes build-time emissions a live concern**. The log is a module-scope first-call latch inside the
   validator. An operator promised "startup only" reads cold-start repeats as a defect.
2. The entry says *"M `src/lib/openai/client.ts` (or the one place both adapters already read the
   variable)"*. **There is no such one place** — `process.env.OPENAI_BASE_URL` is read in four:
   `model-adapter.ts:365`, `pdf-adapter.ts:244`, `route.ts:74` (presence only), and both probes. The
   parenthetical described a module that does not exist.

**THE SECOND CALL SITE IS NOT A SECOND IMPLEMENTATION, AND IT IS NOT OPTIONAL.** `route.ts:74` is a
presence-only pre-flight today, so a disallowed host would first be noticed **inside** the paid call —
after the response may already be committed. The pure validator is called there too, which keeps the
declared behaviour a 503 at pre-flight. One function, two call sites; the guard asserts both.

**FILES, and the callers enumerated per §9.4:**

| File | Change | Why it is in the list |
|---|---|---|
| `src/lib/openai/client.ts` | **N** `assertFirstPartyBaseUrl` (pure, exported) + call at the top of `createCompletion` | the chokepoint; validates the injected value too |
| `src/app/api/advisor/route.ts:74` | **M** pre-flight calls the validator | keeps the failure a 503 before the stream commits |
| `src/lib/advisor/model-adapter.ts` | **unchanged** | reaches the check through `createCompletion` — enumerated to record that it needs no edit |
| `src/lib/lab-import/pdf-adapter.ts` | **unchanged** | same |
| `scripts/probes/openai-advisor-probe.ts` | **M** import and call the validator; `:31`, `:263` template pointers | dials the same host with the same credential, outside `SOLE_PAID_CLIENT` by design |
| `scripts/probes/openai-labimport-probe.ts` | **M** same; `:277` template pointer | same |
| `.env.example:22-28` | **M** | it currently says *"Point it elsewhere for a proxy or a compatible gateway"* — after this unit that is false without the override, and a template that contradicts the code is N-52's class |
| `.gitignore:27` | **M** `.env*.local` → also match `.env*.local*` | **N-64** |
| `docs/05-qa/omniroute-probe-record.template.md` | **R** → `openai-probe-record.template.md`, retitled, 7B claim dropped | **N-65** |
| `src/architecture/first-party-base-url.test.ts` | **N** | the guard. **Spec count 21 → 22** — three dated sites to update, and this is the count N-52's mechanism question is about |
| `src/lib/openai/client.test.ts` · `src/app/api/advisor/route.test.ts` | **M** | `client.test.ts:18` injects `baseUrl: "https://gw.example"` and `route.test.ts:110` stubs a fake base URL; **both go red on this change and that is correct** — they are the first proof the check binds |

**ERROR TYPE — proposed, and the alternative stated.** Throw `NotConfiguredError(AI_SERVICE_NOT_CONFIGURED)`,
which `NOT_CONFIGURED_TOTALITY` already sanctions and which answers **503**, the same shape U31 declared
for a missing variable. A disallowed host *is* a misconfiguration, and inventing a second error class
would produce a 500 with a correlation id for an operator error the operator can fix. **The alternative —
a distinct `OpenAIError("non-first-party host")` → 500 — is rejected** because it tells the caller nothing
and tells the operator less.

**VALIDATION, parsed rather than matched.** `new URL(x)`, require **`https:`**, compare
`hostname.toLowerCase()` exactly against `api.openai.com`, and reject **userinfo**
(`https://api.openai.com@evil.example` has hostname `evil.example`, but the credential-bearing form is
worth rejecting explicitly), a **trailing dot** (`api.openai.com.`), and any **non-default port**. A
hostname check alone passes `http://api.openai.com`, which is the same host and the wrong transport.

**RED PLAN — seven mutations, each shown red before the fix (§5 rule 2). M7 added by the 2026-09-18 ruling that folded in N-66:**

| # | Mutation | Must redden |
|---|---|---|
| **M1** | Delete the `assertFirstPartyBaseUrl` call from `createCompletion` | the refusal test |
| **M2** | Delete the call from the route pre-flight | the "503 at pre-flight, not mid-call" test |
| **M3** | Relax the scheme check (accept `http:`) | the transport test |
| **M4** | Relax the host comparison to `endsWith("openai.com")` | the lookalike test (`api.openai.com.evil.example`) |
| **M5** | Pre-set the log latch so the override log never emits | the "logged exactly once, with the host" test |
| **M6** | Narrow `.gitignore` back to `.env*.local` | the `git check-ignore` test on `.env.local.bak` |
| **M7** | Add a **third** `src/` reader of `OPENAI_BASE_URL` that skips validation | the extended `SOLE_PAID_CLIENT` reader ratchet (N-66) |

**Anti-vacuity**: the guard asserts its own inventories non-empty — the validator is called from **exactly
two** sites in `src/`, and both probes call it — so a rename that makes the scan match nothing is red
rather than green.

**STATED NON-COVERAGE, and the first line is the one that matters.**
**The override is not a security boundary.** Whoever can set `OPENAI_BASE_URL` can set
`OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL=1`. This control addresses **drift and silence**, not a hostile
deployer — **N-63 is mitigated, not closed**, and OP-5's record must say exactly that rather than cite
U32 as though it settled the question. Beyond that: it is not taint analysis and not an egress control
(this entry's existing paragraph); it is defeated by the same two things that defeat `SOLE_PAID_CLIENT`
— an inline `fetch` in `src/`, or a caller outside `src/` — which is an **inherited** limit, not a new
one, since either already bypasses the budget reservation and rate limit (§4 rule 9).

**N-66 — FOLDED IN BY OWNER RULING 2026-09-18, and declared as a widening rather than absorbed (§8.1).** ~~It is ~10 lines in an existing spec and it is **not in this plan**.~~ `SOLE_PAID_CLIENT`'s reader ratchet is extended to pin readers of **`OPENAI_BASE_URL`** alongside `OPENAI_API_KEY`, so a new module that reads the variable and skips the validator is **red rather than green**.

**The ruling's reason is the one worth keeping: it is what stops U32's own "exactly two call sites" clause from being a count written once.** An anti-vacuity assertion proves the validator is called *somewhere*; only a pinned reader list proves nothing else reads the variable *instead*. Without it this unit ships a control whose scope is a sentence in a plan — which is precisely N-63's defect, reproduced one layer up. The widening is the owner's, asked for explicitly, and the next unit that finds an adjacent ratchet does not inherit permission from this paragraph.


**REVIEWS — `ecc:code-reviewer` BLOCK → fixed → the fix proven; `ecc:security-reviewer` 0 blocking.**

**THE BLOCKING FINDING, AND IT IS THE BEST THING THIS UNIT PRODUCED.** `model-adapter.test.ts`'s three
config-guard fixtures configured `https://gw.example`. The moment this adapter refused a non-first-party
host, each of them threw for the NEW reason *before* reaching the condition it was written to test — and
because every configuration failure carries the one shared `AI_SERVICE_NOT_CONFIGURED` message,
`rejects.toThrow("not configured")` could not tell the causes apart. **N-21's regression guard — the one
written after a hardcoded model id 400'd every advisor turn from a green suite — stopped guarding, and
the suite stayed green.**

**Proven, not argued, in both directions:**

| Check | Before the fix | After the fix |
|---|---|---|
| delete `resolveModel`'s `!model` throw (N-21's own bug) | **21 passed — GREEN over the bug** | **1 failed** — the N-21 test |
| delete the `!baseUrl` clause | *not a valid mutation* — `tsc` rejects it (TS2345/TS2322); the type system holds that line, not the test | same |

Fix: the fixtures are re-pointed to `https://api.openai.com`, so each isolates its own condition again,
and a new test covers the condition that displaced them. **This is §5 rule 2's exact failure class —
a guard that stops guarding invisibly — and it was introduced by the commit that added a security
control.** It is recorded here rather than quietly repaired because the mechanism generalises: an
early-return added ahead of an existing check silently re-points every test that reaches the check
through a shared error message.

**A fourth thing fell out of proving it**, registered as **N-68** and deliberately not fixed: the same
file's "key is absent" test was ALREADY green for the wrong reason before U32 — the same mutation on
`HEAD` leaves 21/21 green. It predates this unit and belongs to whoever owns that guard.

**Three advisories, all taken:** the port comment claimed "any explicit port" is refused, which `new URL`
makes impossible — `:443` normalises away and IS permitted, now stated and pinned by a test; the new
spec's header now names the two evasions it has rather than a general disclaimer (it scans
`git ls-files --cached`, not the working tree — which is exactly why **M7 appeared green on its first
run** — and its call check matches a name, not a binding).

**`ecc:security-reviewer`: 0 blocking, 2 advisory, and its enumeration is written up as OP-5's
non-coverage paragraph in §4.6.** Verdict as ruled: **N-63 MITIGATED, not closed.** Both of its
measurements were re-run independently rather than quoted — every `fetch(` in `src/` outside the client
is a same-origin `/api/…` call from a client component (25 sites), and `package.json` contains no
telemetry SDK (Sentry/Datadog/PostHog/LogRocket/Bugsnag/Honeycomb/New Relic → 0 matches).

**Gate:** `npx tsc --noEmit` · `npm run lint` · `npx vitest run` (count re-measured, not copied) ·
`npx next build`. Reviews: `ecc:code-reviewer` on the diff **and** `ecc:security-reviewer` — this unit
changes a security control's shape, so the second is not optional the way it was for U22.

**U32 STAMP ROW** *(standing disposition):*

| U32 closeout | value |
|---|---|
| merged to `main` | **`104a111`** — fast-forward from `9c07657`, 1 commit, 19 files, +834/−26 |
| code run | **`35412653584`** — green on `104a111`, **18/18 steps**, on `feat/u32-first-party-base-url` |
| post-merge `main` run | **`35412852092`** — green on `104a111`, 18/18, required check satisfied on the merged SHA |
| CI figures, re-measured | lint **362 of 362, 0 errors** · vitest **1328 / 108 files** · non-live E2E **70 passed / 30 skipped** |
| live evidence | **none, and that is the finding** — see `docs/05-qa/2026-09-18-op5-provider-record.md`. No probe was run for this unit; a host pin is testable without a network |
| bkit | **`u32-first-party-base-url` → `completed`**, advanced 2026-09-18 by this session as the last step of this closeout (N-56's standing line) |

**CI matched every local figure exactly** — 362/362, 1328/108, 70/30 — so the suite a fresh clone runs
and the suite CI runs agreed on two machines, again.

**THE OP-5 RECORD IS THE OTHER HALF OF THIS UNIT, and it is filed rather than promised:**
`docs/05-qa/2026-09-18-op5-provider-record.md`. Its shape is the point. The provider's current terms are
**fetched, with URL and read-date**, not recalled: API data is not used for training since 2023-03-01,
and **abuse-monitoring logs retain prompts and responses for up to 30 days by default** — a retention
window that applies to every health-context prompt this application sends unless ZDR is in force. The
DPA page **could not be read** (HTTP 403 on 2026-09-18), so no DPA term is quoted; the record says so
instead of filling the gap. Three account facts are recorded **UNKNOWN**: the deployed base URL and
override state, an executed DPA with its date, and ZDR. **OP-5 stays OPEN and development-only remains in
force**; the record names exactly what would discharge it, and two of the three are procurement facts
that no further work in this repository can supply.

**A host pin is not a data-processing term** — the sentence the record exists to make unavoidable. U32
establishes *where* the bytes go; it establishes nothing about what may be done with them on arrival.

**THE SWEEP.** Grepped, not recalled.

| Claim | Site | Action |
|---|---|---|
| "seven executable architecture specs" | `README.md:26`, `docs/project-status.md:325` and `:465`, `docs/02-design/architecture-boundaries.md:255` | **21 → 22**, each bracket **extended in place**, never stacked: `observed at U12: 20 · 21 at U22 · 22 at U32 (2026-09-18)` |
| the spec count itself | `ls src/architecture/*.test.ts` → **22** | re-measured, not copied |
| `NOT_CONFIGURED_TOTALITY`'s sanctioned list | three files, unchanged | U32 adds **conditions** to existing sanctioned throws and **no fourth throw site** — verified, since a fourth would have reddened the equality |
| N-52's README per-spec counts (36/30 vs 47/31) | `README.md:26` | **still left registered and unfixed** — a third unit has now declined to absorb them, which is itself the argument for N-52's mechanical fix |

**The sweep found nothing new, and the reason is worth one line:** this unit's claims were checked by
guards as they were written, so the prose that would normally drift had nowhere to drift from. That is
what the §8 count-binding guard is for, and it is still owed.

**THE LESSON, and it is not the one this unit set out to teach.** U32's designed deliverable was a host
pin. Its most valuable output was `ecc:code-reviewer`'s BLOCKING finding: **the commit that added a
security control silently disabled N-21's regression guard**, because an early return placed ahead of an
existing check re-points every test that reaches that check through a shared error message. Proven both
ways — with `resolveModel`'s `!model` throw deleted the suite was **21/21 green** before the fix and
**1 failed** after it. Two further instances of the same mechanism were found while proving it: **N-67**
(a `vi.stubEnv` that never unstubs, so this unit's own override test switched the new pin off for every
later test in the file, including the 200 happy path) and **N-68** (the same file's "key is absent" test
has been green for the wrong reason since before U32 — the mutation leaves `HEAD` at 21/21 too).

Three appearances, one mechanism: **an assertion that cannot distinguish why it passed will stop
distinguishing, and nothing will say so.** N-67 and N-68 become **U33** by the owner's ruling of
2026-09-18.

**Method note, fifth appearance of the measurement-through-a-filter class in this phase's tooling
half:** **M7 first ran GREEN** — 54 passed — because the mutant file was untracked and both guards scan
`git ls-files --cached`. The guards were right; the mutation was not reaching the tree they read. It
reddened ×2 once `git add -N` put it in the index. The spec's header now states that boundary rather than
leaving the next person to rediscover it.


**U33 · Test isolation, and config failures that can be told apart.** *(created 2026-09-18 by owner
ruling on N-67 and N-68; numbering append-only — U33 follows U32)* M `vitest.config.ts` · M
`src/lib/api/errors.ts` · M the three `NotConfiguredError` throw sites · M the config-guard tests in
`model-adapter.test.ts`, `lab-import.test.ts`, `route.test.ts` · M `not-configured-totality.test.ts`.
**S**, deps **U32**. **Sequenced after U30 and before the Phase 2 closeout.**

**Two halves, and they are one finding seen twice.**

**(a) `unstubEnvs: true` in `vitest.config.ts`** — so a `vi.stubEnv` cannot outlive the test that set it.
**Every test that reddens is fixed on its merits, not re-stubbed** (the owner's words, and the whole
point): a test that only passed because a previous test's environment leaked into it was not testing what
its title claims. Three files call `vi.stubEnv` today — `route.test.ts`, `model-adapter.test.ts`,
`lab-import.test.ts` — and the count of reddened tests is **unknown until the flag is flipped**, which is
the first thing this unit measures rather than predicts.

**(b) `NotConfiguredError` carries a machine-readable reason** — `missing-key | missing-model |
missing-base-url | disallowed-host` — **and the config-guard tests assert on the reason, not on the
shared message.** This is the direct fix for the mechanism that produced all three findings: one message
for every configuration failure makes `rejects.toThrow("not configured")` structurally unable to say
*why* it passed, so any early return added ahead of an existing check silently re-points every test
behind it. **It also closes N-68's pre-existing instance** — the "key is absent" test that has been green
for the wrong reason since before U32.

**The client boundary is not crossed.** `src/lib/openai/client.ts` imports nothing and must keep
importing nothing, so the `disallowed-host` reason is constructed by the **callers** that already own the
sanctioned throw — the two adapters — from `baseUrlPermitted`'s boolean. The client keeps throwing its
own `OpenAIError("config")` backstop. If this unit finds itself adding an import to that module, the
design is wrong and the unit stops.

**Red:** (a) with `unstubEnvs` on, the pre-fix suite must show a **non-zero** reddened set, recorded
verbatim — a flag that reddens nothing was not needed; (b) delete any one of the four conditions and the
test naming **that reason** must fail while the other three still pass — which is precisely what today's
suite cannot do. **Mutation-shown, per §5 rule 2.**

**Non-coverage.** A reason code is for tests and logs, not for clients: the **response** stays a 503 with
`AI_SERVICE_NOT_CONFIGURED` and no reason, because which environment variable is unset is internal state
and §2.3 rule 13 does not bend for a convenient debugging aid. `NOT_CONFIGURED_TOTALITY` must be extended
to assert that too, or this unit hands the next one a way to leak configuration detail through an error
object that already crosses a boundary.

### Group E — cuttable

**U21 · FU-24, cited artifacts must be tracked.** ~~N `src/architecture/cited-artifact.test.ts`. **S**.~~
**— [2026-09-14] CUT, per decision 8(a), on this entry's own stated precondition.** The predicate it
required *before starting* cannot be written in one sentence; measured, the inventory is **21 citations
across 11 non-archive `docs/` files**, at least 5 of them dated historical records §7 forbids rewriting.
**FU-24 stays open as a register row.** Original entry preserved below, unmodified, per §7.
**The counting predicate must be stated before this unit starts, or its inventory is undefined.** A first
pass counted 4 live citations; the claim→observed pass found **≥5** documents citing the untracked
`test-results/…/error-context.md` under a looser reading. Proposed predicate: *a non-archive `docs/` file
citing a `test-results/` path as primary evidence for a present-tense claim* — then re-measure. Either
way the guard needs a dated-record exemption, or it demands rewriting history, which §7 forbids.

**U22 · ~~FU-25 / FU-26~~ → FU-26 only: a fresh clone can run the E2E suite.** ~~**L**. A *live* CI E2E job needs secrets in a public repo (`phase-0-plan-review.md` §P-03). Achievable
scope: FU-26 (fresh-clone runnability) + per-worker seeded accounts + a **non-live** CI E2E job over the 59
credential-free specs.~~ Live-in-CI is **decision 3**, not an engineering unit.
**— [2026-09-14] RE-SCOPED, not cut, per decision 8(b).** The struck text is struck for a reason worth
stating: **one third of its "achievable scope" was delivered by U14**, which added the non-live CI E2E
stage, and the "59 credential-free specs" figure was true when written and is **82 specs / 19
`[LIVE]`-tagged** as measured 2026-09-14 (CI: 70 passed / 30 skipped). A cut-order entry that prices work
already done prices nothing.
**The re-scoped U22 is FU-26 alone.** M `package.json` (a script) · M `README.md`. **S**, deps none. A new
clone cannot run the suite today: `npx playwright install --with-deps chromium` exists **only** in
`ci.yml`, and the failure presents as dozens of specs failing at once, which reads like an application
regression rather than a missing binary. **FU-25 (per-worker user isolation) is now a dated register
row** — every authed spec still logs in as the single `DEMO_EMAIL` account — deferred to whichever phase
adds a live E2E job, which **ruling 3** keeps out of this repository's CI. That is a consequence of an
existing ruling, not a new deferral.

> ### **[2026-09-15] U22 PLAN — first unit after decision 8; awaiting plan approval before any edit.**
>
> **Problem, measured rather than restated.** FU-26 says a fresh clone cannot run the E2E suite. Measured
> 2026-09-15: `npx playwright install --with-deps chromium` appears in **exactly one tracked file**,
> `.github/workflows/ci.yml:265`. `package.json` has **no** install script — `test:e2e` is bare
> `playwright test` — and `README.md:56` documents `npm run test:e2e` with no prerequisite beside it. So
> the only way to learn the step is to read the CI workflow, and the failure when you do not is dozens of
> specs failing at once, which U17 recorded as reading like "a catastrophic application regression rather
> than a missing binary". **The original observation is sharper than "not installed" and is worth keeping:**
> the cache held `chromium-1234` while `@playwright/test` wanted `-1223` — **newer, not older** — so
> "my browsers are installed" was actively misleading. This machine still shows both (`1223` and `1234`),
> so the condition is reproducible here.
>
> **Scope, per decision 8(b): FU-26 only.** The non-live CI E2E job is U14's and already exists; FU-25 is
> a register row. **S**, deps none.
>
> **Design — three parts, and one deliberate non-part.**
> 1. **`package.json`: `"test:e2e:install": "playwright install chromium"`.** Note **no `--with-deps`**,
>    and that asymmetry with CI is the one real design decision here. `--with-deps` installs OS packages
>    through the system package manager; it is correct on a disposable Linux runner and wrong on a
>    developer's machine, where it needs sudo and may prompt or fail. Documenting CI's exact string would
>    hand developers a command that fails precisely when they most need it. **The guard therefore compares
>    the browser, not the command** (below).
> 2. **`README.md`:** one row beside the existing `test:e2e` row, naming the install script as a
>    first-run prerequisite. The run table at `:55-56` is where a reader already looks.
> 3. **`E2E_BROWSER_PARITY`** — N `src/architecture/e2e-browser-parity.test.ts`. Asserts that the browser
>    named by `package.json`'s install script and the browser named by `ci.yml`'s install step are the
>    **same string**, that the README names the script, and that both inventories are non-empty. Without
>    it this unit is a README edit, and §3.5 is explicit that a documented rule nothing runs will rot —
>    this repository has already proved it 16 times.
>
> **The non-part, stated because FU-26 proposed it:** the register's own suggestion was *"a `postinstall`
> or a documented `npx playwright install chromium` step"*. **A `postinstall` is deliberately not taken**,
> on FU-26's own stated ground — *"adding a `postinstall` download to `npm ci` would change CI's install
> step, which needs its own behaviour-compatibility proof"* — and that ground is stronger now than when it
> was written, because CI's install step is load-bearing for four stages that did not exist then. It would
> also download a browser for every `npm ci` that never runs a test.
>
> **Behaviour change: NONE, and the reason is not "it is small".** No application code, no response byte,
> no status, no envelope, no CI step. `test:e2e` itself is unchanged, so no existing invocation moves.
> The additions are one script, one README row, one test file.
>
> **Red (planned).** **M1:** change the script's browser to `firefox` → parity guard red, naming both
> strings. **M2:** delete the README row → guard red on the "README names the script" clause. **M3:** point
> the guard's `ci.yml` reader at a path that matches nothing → anti-vacuity red, thrown, not a green run
> over an empty inventory. ~~**M4:** the honest one — **empty the browser cache and run `npm run test:e2e`
> before and after the documented command.**~~ **[2026-09-15, owner substitution before execution]** The
> shared cache must not be emptied — the U31 worktree depends on it. **M4 instead points
> `PLAYWRIGHT_BROWSERS_PATH` at an empty scratch directory** and runs the suite before and after the
> documented install with that variable set. Same claim, no shared-state side effect, and **reproducible
> by the next reader**, which the cache-emptying form was not.
>
> **Files.** M `package.json` · M `README.md` · N `src/architecture/e2e-browser-parity.test.ts` · M this
> document · N `docs/01-plan/features/u22-fresh-clone-e2e.plan.md` (bkit artifact, subordinate).
> **`ci.yml` is not touched**, so GATE D1 does not apply.
>
> **Sequencing, per the owner 2026-09-15:** U29 and U30 wait for U31, because all three edit the same
> route files. U22 touches none of them, so it runs now and is independent of the U31 worktree.
>
> **Risk, stated:** the README's run table at `:26` says "**seven** executable architecture specs" — a
> count this unit makes falser still (20 → 21). It is the same counts-written-once class U12 hit, it is
> **in the file this unit edits**, and it is therefore in scope for this unit's closeout sweep rather
> than a later one.

**DONE 2026-09-15.** Baseline before: typecheck clean, **1294/106**, lint 360/360 (U12's close, CI-verified
at run `34919261813`). After: **1302/107** (+8, all in `e2e-browser-parity.test.ts`: 4 rules + 4
self-tests), lint **361/361, 0 errors**, build succeeds. Re-measured after the last edit, none copied.

| U22 | before | after |
|---|---|---|
| tracked files naming the browser install | **1** (`ci.yml:265` only) | **3** — `ci.yml`, `package.json`, `README.md` |
| a fresh clone running `npm run test:e2e` | **37 failed** / 29 skipped / 34 passed, exit 1 | after one documented command: **70 passed / 30 skipped**, exit 0 |
| what binds the documented step to CI's | nothing | `E2E_BROWSER_PARITY`, 4 rules + 4 self-tests |
| unit tests | 1294 / 106 | **1302 / 107** |

**Files touched.** M `package.json` (one script) · M `README.md` (one run-table row + one dated
observation) · N `src/architecture/e2e-browser-parity.test.ts` · M this document · N
`docs/01-plan/features/u22-fresh-clone-e2e.plan.md`. **`.github/workflows/ci.yml` is NOT touched**, so
GATE D1 does not apply — verified by `git diff` showing zero lines against it.

**RED LIST — four mutations, every one executed, verbatim.**

| # | Mutation | Observed |
|---|---|---|
| M1 | script installs `firefox`, CI installs `chromium` | `package.json installs ["firefox"] but ci.yml installs ["chromium"]. A developer following the documented step would install a different browser from the one CI runs the suite on.` |
| M2 | delete the README row | `README.md does not mention the install script, so the fresh-clone reader is back to reading ci.yml — which is the whole of FU-26.: expected [] to deeply equal [ 'test:e2e:install' ]` |
| M3 | CI inventory matches nothing | `found no \`playwright install <browser>\` step in ci.yml. A parity check with nothing to compare against passes vacuously.: expected [] to have a length of 1` |
| M4 | **the claim, not the guard** — `PLAYWRIGHT_BROWSERS_PATH` at an empty scratch directory, suite run before and after the documented install | **before:** `37 failed · 29 skipped · 34 passed`, exit **1**, with `Error: browserType.launch: Executable doesn't exist at …/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell` ×37 · **after** `npm run test:e2e:install` (exit 0) with the same variable set: **`70 passed · 30 skipped`**, exit **0**, launch errors **0** |

The TDD red came first and is not counted as a mutation: the guard on the unmodified repository failed
2 of 8, naming FU-26 — *"no script in package.json installs a Playwright browser, so a fresh clone can
only learn the command by reading .github/workflows/ci.yml"*.

**M4 IS THE ONE THAT MATTERS, AND TWO THINGS ABOUT IT ARE WORTH RECORDING.** First, its **after** figure
— 70 passed / 30 skipped — is **exactly CI's**, which is the strongest available evidence that a fresh
clone following the README now runs the same suite CI runs, rather than something adjacent to it.
Second, **the first attempt at reading M4's own output was wrong, and the method is why.** A filtered
`tail -30 | grep` reported *"29 skipped, 34 passed"* with no failure line, because the failed-spec list
is longer than 30 lines and pushed the `37 failed` summary out of the window. Two runs of the same
command appeared to disagree. The run was redone with the full output captured to a file, and the
before-state is `37 failed`. **A measurement taken through a filter that can hide the thing being
measured is not a measurement** — the same class as this phase's counts-written-once, arriving through
the tooling rather than the prose. One incidental datum it surfaced: before the install 29 specs skip,
after it 30, because one spec skips at runtime only once a browser exists to evaluate the condition.

**`--with-deps` IS DELIBERATELY ABSENT FROM THE SCRIPT, AND THE GUARD IS SHAPED AROUND THAT.** CI runs
`playwright install --with-deps chromium`; the script runs `playwright install chromium`. The flag
installs OS packages through the system package manager — correct on a disposable Linux runner, wrong on
a developer machine where it needs sudo and may prompt or fail. Asserting command equality would force
one of the two to be wrong, so the guard compares **which browser**, which is the thing that actually has
to agree.

**NO BEHAVIOUR CHANGE, and no security review — stated rather than skipped silently.** No application
code moves: the diff is one `package.json` script, one README row, one test file. There is no request
path, no response byte, no envelope, no trust boundary, and nothing an authenticated caller can reach, so
`ecc:security-reviewer` was **not** run, by the owner's instruction and for that reason. `test:e2e`
itself is unchanged, so no existing invocation moves.

**ecc:code-reviewer — VERDICT: APPROVE — 0 blocking, 2 advisory.** It independently reproduced M1–M3 on
temp copies, confirmed `package.json` stays valid JSON in the file's existing style, and probed five
bypass shapes the plan named — composite action, YAML block scalar, variable-named browser, comment-only
mention, bare `playwright install` — finding that **every one degrades to a loud failure rather than a
silent pass**, which is the property this kind of parity check needs. It did **not** reproduce M4
(expensive and network-dependent) and said so; M4's figures are this session's, recorded as such.
**Advisory 1 TAKEN:** the block-scalar limitation of `workflowRunLines` is now a written comment in the
file, saying which side needs widening if CI's step is ever rewritten that way. **Advisory 2 NOT
absorbed** — registered as **N-52**.

**bkit:** feature `u22-fresh-clone-e2e`; artifact subordinate to this entry.

**U22 CI — run `35047441242`, green on `13cd0fd`, 18/18 steps.** Every figure this entry claims was
re-measured by CI and matched exactly: lint **361 of 361, 0 errors**; **1302/107**; non-live E2E
**70 passed / 30 skipped**. That last pair is also **M4's after-figure**, which is the point: the suite a
fresh clone runs after the documented install is the same suite CI runs, measured twice by different
machines.

**U22 STAMP ROW** *(standing disposition):*

| U22 closeout | value |
|---|---|
| merged to `main` | **`13cd0fd`** — fast-forward from `e077ced`, 1 commit |
| code run | **`35047441242`** — green on `13cd0fd`, 18/18 steps, on `feat/u22-fresh-clone-e2e` |
| post-merge `main` run | **`35047626093`** — green on `13cd0fd`, 18/18, required check satisfied on the merged SHA |

**THE COUNTS-WRITTEN-ONCE SWEEP — and it found something about the *correction pattern itself*.**
Grepped rather than trusted, per U12's lesson. Three sites carry the `[2026-09-14, observed at U12: 20]`
note this unit moves to 21, and each is **extended in place rather than given a second note**:

| # | Site | Was | Now |
|---|---|---|---|
| 1 | `docs/project-status.md:309` | `[2026-09-14, observed at U12: 20]` | `· 21 at U22 (2026-09-15)` appended inside the same bracket |
| 2 | `docs/project-status.md:449` | same | same |
| 3 | `docs/02-design/architecture-boundaries.md:255` | same | same |
| 4 | `README.md:26` | dated to 21 **in the code commit**, since this unit edits that file | — |

**THE FINDING IS THE SHAPE, NOT THE NUMBER.** "Date beside, never rewrite" (§7) is the right rule for a
*claim*, and it is the wrong rule for a *monotonically changing count*: applied literally, every unit
that adds a spec appends another dated note to the same three sites, and the note grows without bound
while the reader's question — how many are there? — gets harder to answer each time. This is the fifth
appearance of the counts-written-once class and **the first where the correction mechanism is itself
the problem**. Extending one bracket rather than stacking brackets is a stopgap, not a fix.
**The fix is N-52's**, and this sweep is why that row says the honest answer is probably not "update the
numbers": a count in prose rots by construction, so either drop it and keep the file names, or bind it
mechanically the way `doc-truth.test.ts` binds §4's table. **N-52 is left registered and unfixed here,
by the owner's instruction** — correcting `README.md`'s per-spec figures (36→47, 30→31) is not this
unit's scope, and doing it would be the absorption §8.1 forbids.

**Checked and deliberately NOT changed:** `docs/04-report/phase-0-integration-enforcement.report.md:29`
and `docs/04-report/phase-1-verification-integrity.report.md:278` — dated historical records (the latter
says "counts measured 2026-08-06" in its own text), which §7 forbids editing. Same disposition as U12's.

**THE M4 METHOD CORRECTION, RECORDED AS A LESSON RATHER THAN A FOOTNOTE.** This unit's own
measurement was misread once before it was read right, and the mechanism deserves its own line in the
register of recurring classes. A filtered `tail -30 | grep` over the before-run reported *"29 skipped,
34 passed"* and **no failure line at all**, because the list of failing specs is longer than thirty lines
and had pushed the `37 failed` summary out of the window. Two runs of the identical command appeared to
disagree, which is what prompted redoing it with full output captured to a file — where the before-state
is unambiguously `37 failed · 29 skipped · 34 passed`, exit 1. **A filter that can hide the thing being
measured is not a measurement.** It is the same class this phase keeps meeting — a figure taken once,
under conditions that are not restated when it is reused — arriving this time **through the tooling
rather than through the prose**, which is why it is worth naming separately: every earlier appearance was
a number in a document, and this one was a number on a terminal. Counted as the class's fifth appearance
(FU-32 · U19 · U20 · U12 · here).

**U23 · Roadmap item 1's residue.** ~~M `respond.ts` (add `path`, `userId`; a real sink). **S/M**.~~ Deferred:
"target a real sink" implies a logging dependency and an operational decision this plan does not take.
**— [2026-09-14] CUT, per decision 8(c), on that ground unchanged and re-verified:** `respond.ts` still
logs through `console.error` with a code and a correlation id, no `path`, no `userId`, no sink; nothing
since 2026-08-10 touched that line. **The residue is carried to the Phase 2 closeout as stated residue**,
exactly as the deployed-database residue was under decision 5, and **named there as an input to the next
operational phase**. A cut that leaves a roadmap item's residue unnamed is how the item disappears.

### Sequence

```
Group A   U1 → U2                                   [error contract]      GATE A1
Group B   U3 → U4 → U5 → U6 → U7                    [paid-API control]    GATE B1
Group C   U8 → U9 → U10 → ~~U11~~ · U12→D            [persistence]         GATE C1 discharged 2026-08-10
                                                                          remainder → U26 — CLOSED 2026-09-11
Group D   U13 → U27 → U28 → U14 → U15 · U16 → U17 · U18 · U19 · U20 · U24 · U25 · U26 · U12 · U31 → U32 → U29 → U30   GATE D1, D2
Group E   ~~U21~~ · U22 · ~~U23~~                     [cuttable — DISSOLVED 2026-09-14, decision 8]
          U29 → U30 → U22(re-scoped, FU-26 only) → CLOSEOUT      [decision 8's path]
```
**[2026-09-14] Group E is dissolved by decision 8.** Two of its three entries are cut (U21, U23) and the
third is re-scoped to **S** and moves into the run to closeout, so the phase's remaining path is exactly
**U29 → U30 → U22 → closeout**. The group's heading and entries stay where they are, struck rather than
deleted (§7): the cut order's reasoning is the record of *why* each was cuttable, and one of them
(U22) turned out not to be.
> ### ~~**[2026-09-14] THE TWO 2026-09-14 RULINGS WERE MADE INDEPENDENTLY AND THEIR SEQUENCES HAVE NOT BEEN RECONCILED.**~~
> **[2026-09-18] RETIRED — they were reconciled, and by the owner rather than by an editor.** The note is
> kept because its reasoning is the record of why the order was left open (§7): where U31 sat relative to
> U22 was a decision neither ruling had made, and inventing one here would have been the silent narrowing
> §8.1 forbids. **It was made** — see the SEQUENCING ADDENDUM of 2026-09-15 in §7, which supersedes both
> lines: **decision-8 docs → U22 → U31 → U29 → U30 → closeout.** U22 landed 2026-09-15 (`13cd0fd`), so
> the decision-8 path line above — `U29 → U30 → U22 → CLOSEOUT` — is itself now stale in its U22 term and
> is left struck-in-place rather than rewritten. Original text follows.
>
> **[2026-09-14] THE TWO 2026-09-14 RULINGS WERE MADE INDEPENDENTLY AND THEIR SEQUENCES HAVE NOT BEEN
> RECONCILED.** Decision 8 ruled the run to closeout as **U29 → U30 → U22 → closeout** and did not know
> U31 existed; decision 9 appended **U31** to Group D and did not know U22 had been re-scoped into that
> run. Both lines are left standing above, unmerged and dated, because **where U31 sits relative to U22 is
> a sequencing decision neither ruling made** — it is the owner's, not an editor's, and inventing an order
> here would be exactly the silent narrowing §8.1 forbids. What *is* settled by both: U29 precedes U30,
> and the phase does not close until U22 and U31 have both landed or been dispositioned.
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
   **— [2026-09-14] NOT TAKEN AS A CUT; RE-SCOPED instead, per decision 8(b) — and this list itself named
   the outcome: "keep the ~S fresh-clone half" is precisely what U22 now is.** What the list could not know
   is that U14 would deliver the non-live CI E2E job, which is why re-scoping beat cutting.
2. **U23** — residue; the sink is an operational decision.
   **— [2026-09-14] TAKEN, per decision 8(c). Cut on this ground, unmodified. Roadmap item 1's residue is
   carried to the Phase 2 closeout as stated residue and named as an input to the next operational phase.**
3. **U11** — weak red proof by nature; FU-20 survives as a register row at no cost. **— TAKEN 2026-08-10.
   Cut on this ground, unmodified. FU-20 remains open as a register row.**
4. **U21** — real but process-shaped.
   **— [2026-09-14] TAKEN, per decision 8(a). Cut on this ground plus a measurement the list did not have:
   21 citations across 11 non-archive files, at least 5 of them dated historical records. FU-24 remains
   open as a register row.**
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

**Trust boundaries touched:** U3, U4, U5, U7, U9, U10, U12, U14, U16, **U17 (irreversible deletion)**, U26 *(added 2026-09-11)*,
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
   ✅ **SHIPPED 2026-08-11 EXACTLY AS DECLARED (`c514f50`), and verified by the thing that had to verify
   it.** The owner-run smoke observed an expired token (`expiresInSeconds:−37`) refreshed and persisted on
   a plain navigation, with `Set-Cookie` on the document response — beside a control on the **same route**
   with a fresh token showing no refresh and no cookie. Sign-out, the anonymous redirect and every page
   load were unchanged. **The extra round-trip per matched navigation is real and is not measured**: it is
   one `auth.getUser()` per matched request, and **N-36** records that the matcher is broad enough for that
   to include non-application requests.
8. **U14** *(renumbered from #7 when U27 was created)* — a `Content-Security-Policy-Report-Only` header
   appears on every matched response. Report-Only enforces nothing in a browser, but it is a response-byte
   change and is declared as one.
9. **U28** *(added 2026-08-11 when the unit was created; append-only numbering, like U-numbers — U28
   ships BEFORE U14 but was created after it, so it takes the next number rather than forcing a renumber.)*
   — **clean-env builds stop emitting static HTML.** 20 prerendered pages become server-rendered.
   **Credentialed builds are unchanged — asserted, not assumed:** route table and response headers were
   compared before and after on the same tree and are identical. The honest cost: a deployment with no
   Supabase env vars loses static serving for those routes. That configuration is not production and does
   not function as an app anyway.
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

## 7. Decisions needed — **six ruled 2026-08-08; a seventh raised 2026-08-10, half of it still open; an eighth and a ninth ruled 2026-09-14**

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
| **8** | Group E's disposition, and N-51 | **RULED 2026-09-14** — U21 cut · U22 re-scoped to FU-26 · U23 cut · **N-51 taken as U30** | **U30** (new), **U22** (re-scoped); FU-24/FU-25 and roadmap item 1's residue become register rows |
| **8** | Group E's disposition, and N-51 | **RULED 2026-09-14** — U21 cut · U22 re-scoped to FU-26 · U23 cut · **N-51 taken as U30** | **U30** (new), **U22** (re-scoped); FU-24/FU-25 and roadmap item 1's residue become register rows |

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

### Decision 8 — **Group E's disposition, and whether N-51 is taken** *(raised 2026-09-14 by U12's closeout; ruled the same day)*

**Why it was a decision and not a sizing call.** Group E is the cuttable group, and a cut list written on
2026-08-10 had by 2026-09-14 been overtaken in two directions at once: one entry's work was partly
delivered by a *different* unit, and a new finding (N-51) arrived with no owner. Cutting or keeping on the
old reasoning would have been cutting against figures that no longer held. The orientation report that
preceded this ruling is read-only and its measurements are recorded beside each clause below, so the next
reader does not re-derive them.

> ### **RULING — 2026-09-14, by the owner. Four clauses.**
>
> **(a) U21 — CUT.** Ground, stated rather than paraphrased: **the counting predicate cannot be stated in
> one sentence.** U21's own entry made that its precondition — *"the counting predicate must be stated
> before this unit starts, or its inventory is undefined"* — and the attempt to state it fails on two
> undecidable terms in the plan's own proposal ("primary evidence", "present-tense claim"): neither can be
> read off the text by a scanner. **Measured 2026-09-14:** **21 citations of a `test-results/` path across
> 11 non-archive `docs/` files** — against the entry's predicted 4 on a first pass and ≥5 on a looser
> reading. At least 5 of those 11 are **dated historical records** (the Phase 0 and Phase 1 reports, the
> two closeout checks, the live-E2E baseline) which §7 forbids rewriting. So a guard here needs an
> exemption list longer than its violation list, or it demands rewriting history. **FU-24 survives as a
> register row** — the finding is real, only the guard is not worth building. *(If a future phase wants it,
> the honest form is narrower: forbid a **new** citation to an untracked path and grandfather today's 21 by
> date. Recorded as a suggestion, not a commitment.)*
>
> **(b) U22 — RE-SCOPED, not cut.** Its **L** entry is struck below with its reason: **U14 delivered the
> non-live CI E2E job**, one of the three things U22's "achievable scope" named, and the entry's "59
> credential-free specs" was true when written and is **82 specs / 19 `[LIVE]`-tagged** as measured
> 2026-09-14, with CI reporting 70 passed / 30 skipped. **The re-scoped U22 is FU-26 only** — fresh-clone
> runnability: a script and a README step so a new clone can run the non-live E2E suite without reading
> `ci.yml`, which is the only place `npx playwright install --with-deps chromium` exists today. **Size S,
> deps none.** **FU-25 (per-worker user isolation) becomes a dated register row**, deferred to whichever
> phase adds a live E2E job — which **ruling 3** keeps out of this repository's CI, so the deferral is a
> consequence of an existing ruling rather than a new one.
>
> **(c) U23 — CUT.** Deferral ground **unchanged and re-verified 2026-09-14**: `respond.ts` still logs
> through `console.error` with a code and a correlation id, no `path`, no `userId`, and no sink exists;
> nothing since 2026-08-10 touched that line. Roadmap item 1's residue (`path`, `userId`, a real sink) is
> **carried to the Phase 2 closeout as stated residue** — exactly as the deployed-database residue was
> under decision 5 — and **named there as an input to the next operational phase**. A cut that leaves a
> roadmap item's residue unnamed is how an item disappears; this one is named.
>
> **(d) N-51 — TAKEN, as `U30`.** Not folded into U29, and not left as a register row. **Measured
> 2026-09-14:** **8 route files, 12 handler entry points**, every one parsing its path parameter inline as
> `const { id } = await params` with **no schema and no shared helper**; **7 of the 8** pass that value
> into a Supabase filter on a `uuid` primary key, so a malformed id throws at PostgREST and surfaces as a
> **500 with a correlation id** for what is really a 400. (`itemId` in the stack-item route is the
> exception — compared in JavaScript, never cast.) It is taken because the fix is mechanical and the
> plumbing already exists: `handle()` catches `ZodError` and maps it to `validationError`, so one schema
> plus one `.parse()` per handler needs no new machinery. **Validating inside `handle()` does not work** and
> the reason is recorded so nobody re-proposes it: `handle()` receives a closure and never sees `params`.

---

### Decision 9 — **OpenAI's first-party API replaces Omniroute on both paid routes** *(raised and ruled 2026-09-14 by owner instruction)*

**Why it is a decision and not a sizing call.** The provider behind the paid boundary is changing for the
**second** time in this phase. U25 moved it from a package marker (`@anthropic-ai/sdk`) to a module marker
(`src/lib/omniroute/client.ts`) because a gateway reached over HTTP has no package to bind an import-graph
rule to. That reasoning is unchanged by this swap — OpenAI's API is also plain HTTP — so the question is
not *whether* the boundary survives but **what the boundary is named**, and that is a decision because
five guards and one coverage key are pinned to the literal string `omniroute`.

> ### **RULING — 2026-09-14, by the owner. Two clauses.**
>
> **9A — Full rename.** `src/lib/omniroute/` → `src/lib/openai/`; `OMNIROUTE_*` → `OPENAI_*`; both probe
> scripts, their npm script names, `.env.example`, the three E2E specs, `CLAUDE.md` §4's rule-9 row and
> `docs/project-status.md` all move with it. **Rejected: keeping the old names for a smaller diff.** A
> repository whose env vars, module path and file headers describe a gateway it no longer contacts is
> lying in the one place §4 rule 9 asks a reader to trust. The two dated U25 probe records under
> `docs/05-qa/` are **historical and are not edited** (§7 of `CLAUDE.md`: retire, do not erase).
>
> **9B — `reasoning_effort` is environment-carried, with no default, omitted when unset.** The owner's
> instruction named `reasoning effort: none`. That value is **not** written into `src/`. **Rejected:
> defaulting the field to `"none"` in code** — it would hardcode a claim about which values a provider
> this repository has never contacted accepts, which is N-21's exact failure one field to the left, and
> `CLAUDE.md` §2.2 rule 7 forbids it. `CompletionRequest.reasoningEffort` is typed `string`, not a union,
> for the same reason. The cost of 9B is stated rather than hidden: **an unset variable silently gets the
> model's own default effort**, which may cost more per turn than the owner intends. That is a deployment
> fact, surfaced in `.env.example`, not something a code default should paper over.
>
> **No `openai` package** (confirmed by the same instruction). The call stays on plain `fetch`: the module
> marker *is* the paid boundary, and `src/lib/openai/client.ts` must keep its zero imports to stay inside
> `DOMAIN_IS_PURE`.

**What this ruling does NOT license, stated because the previous swap needed it said too.** A rank-2
instruction changes what is built. It does not suspend §2.1's safety gate (`stream: false` stays explicit
— model tokens must not reach a socket before the gate), §2.2 rule 7, or the `usage: null` contract that
keeps an unreported turn from settling the ledger to zero.

> ### **SEQUENCING ADDENDUM — 2026-09-15, by the owner.**
>
> **Two rulings were made on 2026-09-14 by two sessions that did not know about each other.** Decision 8
> re-scoped **U22** to FU-26 only and created **U30**; decision 9 (above) created **U31**. Neither ruling
> could account for the other, so neither §5 sequence line as written by either session is correct on its
> own. This addendum is the reconciliation and it supersedes both.
>
> **Order:** decision-8 docs commit → **U22** → **U31** → **U29** → **U30** → closeout.
>
> **Why U31 goes before U29 and U30 rather than after.** U29 (the conversation-ownership predicate) and
> U30 (path-param validation across 12 handler entry points) both edit route files U31 also edits —
> `src/app/api/advisor/route.ts` and `src/app/api/lab-import/extract/route.ts` among them. U31's edits to
> those files are a **rename of four environment reads**, mechanical and already complete; U29's and U30's
> are behaviour changes with their own declared response-shape consequences. Landing the rename first means
> those two units are written once against the final variable names, instead of being written against
> `OMNIROUTE_*` and then rebased onto a rename. **U29 and U30 wait for U31.**
>
> **This does not renumber anything.** Numbering stays append-only; only the execution order moves. U30
> remains decision 8(d)'s unit and U31 remains decision 9's, whatever order they land in.
>
> **Landing constraint for U31's branch.** U31 is developed on `feat/u31-openai-first-party` in a separate
> worktree. Once the decision-8 docs commit reaches `main`, the branch is rebased onto it **before** its CI
> run. **This document will conflict** — both sessions edited §5, §7 and §9. The resolution is the merged
> version already held on the U31 branch, which contains **both** rulings: decision 8 with its U30 entry
> and clause (d), and decision 9 with U31. Neither ruling is dropped in favour of the other.
> `CLAUDE.md` §10 rule 4 does not forbid this rebase — it protects the historical **v2–v13 chain**, not an
> unmerged feature branch.

**Obliges:** **U31** (§5, Group D), the sequence line in §5, and the sizing line in §9. **Inherits U25's
honest limit:** no test in this repository can prove the swap works, because a scripted mock accepts any
model id and any effort value. Acceptance is the owner-run live probe recorded dated under `docs/05-qa/`.

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
      half-met, and that is deliberate rather than overlooked.)* **[2026-08-11] THE HALF-MET CLAUSE IS
      DISCHARGED.** U14 landed the build-and-serve stage and it is **green on run `31473581501`**
      (`a1a9fc0`, full non-live suite, 70/30). Both halves are now enforced on every push, so the
      criterion is met **and** CI-enforced — the first time this repository has verified a response byte
      anywhere but on a developer's machine.
- [x] **`npm run lint` either lints a non-empty file set or does not exist.** Check: `LINT_SCOPE` asserts
      ≥ N files, or `package.json` has no `lint` script. *(Both branches are acceptable; the unacceptable
      state is a script that appears to gate and does not.)* ✅ **MET 2026-08-18 by U18, on the CONFIGURE
      branch.** `LINT_SCOPE` asserts **356 of 356** tracked source files, **0** exempt, **0** errors, and
      derives that expected set from `git ls-files` rather than from `eslint.config.mjs` — shown red at
      **356 of 356 unlinted** against `ignores: ["**"]` (M1). *(The check as written says "≥ N files",
      which a config-derived guard could satisfy while linting almost nothing: **M1c produced exactly that
      — a green run reporting "39 of 39" with 316 files unlinted.** The criterion is met by the
      git-derived form, and the counterfactual is recorded in U18's entry precisely because the criterion's
      own wording does not exclude the weaker one.)*
- [x] **A user can export their data and delete all of it across the 12 tables**, with the surviving auth
      identity stated in the response. Check: both route tests green; a test asserts the export payload
      passes through no logging path. ✅ **MET 2026-08-17 by U16 (`a087715`) + U17 (`55c74f6`).**
      `GET /api/account/export` returns all twelve tables with a `notIncluded[]` statement of what it
      omits; `DELETE /api/account` empties all twelve behind a typed confirmation literal and reports
      per-table counts plus the two **retained** items — the `auth.users` identity and the rate-limiter
      counters — which is the half the 2026-08-08 rewording added. Deletion completeness, both cascades,
      the `SET NULL` on `advisor_actions` and cross-user isolation are proved by `npm run verify:migrations`
      against a real Postgres in CI; OP-7 discharged 2026-08-17, `0010` live on the deployed database.
      **[TICKED 2026-08-18 BY U18 — see N-44.]** `docs/roadmap.md`'s copy of this criterion was ticked by
      U17's closeout and this one was not, with the same evidence available to both. Nothing binds the two
      lists, in either direction; the parity guard is deferred to Phase 2 closeout with its shape recorded
      in N-44.
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
      **[2026-09-18, added at U22 closeout] This closeout owes two binding guards of the same shape, named
      here so that "re-derived at close" cannot quietly become "re-typed at close."** Each binds something
      that today lives as prose in two places with nothing between them:
      1. **The N-44 parity guard** — a stable id on every criterion, present in both this §8 and
         `docs/roadmap.md`'s Phase 2 list, asserting **tick-state parity and never text equality** (the two
         wordings differ by design). Deferred to this closeout by U18 with its shape already written down;
         the security-headers instance is still divergent in `roadmap.md`, deliberately.
      2. **A count-binding guard for the "N executable architecture specs" figure** — derive the count from
         the `src/architecture/` listing and assert every documented occurrence agrees, the way
         `doc-truth.test.ts` already binds §4's rule table. This is what **retires the stacked date brackets**
         at the three sites U12 and U22 dated in turn (`docs/project-status.md` ×2,
         `docs/02-design/architecture-boundaries.md`), and it settles the mechanism half of **N-52** — whose
         remaining question is whether `README.md`'s per-file counts get bound or dropped.
      **Owner: the closeout. Neither is built now.** *(Why here rather than as two new register rows: both
      are the property this criterion already asserts for the register — re-derived, not copied — applied to
      the criteria list and to a count that no longer fits "date beside, never rewrite", because a
      monotonically changing number restacks a bracket every time a unit moves it.)*

---

## 9. Sizing

**~~23~~ ~~24~~ ~~25~~ ~~26~~ ~~27~~ ~~28~~ ~~29~~ ~~30~~ 31 proposed units** (U1–U22, **U24**, **U25**, **U26**, **U29**, **U30**, **U31**, **U32**, **U33** and **U34**, plus U23 deferred). Rough shape:
**~~7~~ ~~8~~ ~~9~~ ~~10~~ ~~11~~ 12 S/S-M · ~~12~~ 13 M · ~~3~~ ~~4~~ 3 L · 1 M/L**.
*(**[2026-09-20]** **U34 is S** — created by the owner's ruling on N-71, which `ecc:code-reviewer` found while tracing the blast radius of an empty `conversationId` in U29's diff. **Of 31 proposed, 28 are live.** The fourth unit this phase created by a review finding, after U26, U29 and U33.)* *(**[2026-09-18]** **U33 is S** — created by the owner's ruling on N-67 and N-68, both raised while U32 was being reviewed. **Of 30 proposed, 27 are live** (cut: U11, U21, U23). A unit created by a review finding is the third of this phase — U26, U29 and now U33 — which is the measurable form of the claim that the review step pays for itself.)*
*(**[2026-09-14, decision 8]** applied on top of decision 9's line rather than instead of it, since both
ruled the same day: **U30 is S**, and **U22 falls from L to S** on re-scoping — the one **L** that leaves
this count. **Cut to date: U11, U21, U23.** Of 28 proposed, **25 are live**. The gross count rises while
the work in flight falls, which is what append-only numbering does, and why the live count is stated
beside it rather than left to subtraction.)*
*(U31 — added 2026-09-14 by the scope amendment and decision 9 — is **M**, and the sizing is load-bearing:
U25 was **L** because it rewrote a wire protocol, and U31 rewrites none. `client.ts` was written to
OpenAI's shapes from the start, so this is a rename across 21 tracked files plus two request-body fields.
Calling it L would license scope it does not have; calling it S would hide that it edits five guard sites
and a coverage key.)* *(U30 — added 2026-09-14 by decision 8(d) on N-51 — is **S**.)*
*(U29 — added 2026-09-11 by owner ruling on N-48 — is **S**: one
call inserted before the reservation, one route test, one declared behaviour change.)* *(U26 — added 2026-08-10 by GATE C1's discharge — is **S/M**:
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
