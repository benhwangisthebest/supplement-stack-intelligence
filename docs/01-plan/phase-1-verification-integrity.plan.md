# Phase 1 — Verification integrity (Plan)

> **Status: APPROVED 2026-08-03.** Approved by the user after review, with all five open decisions ruled on
> — see §7. No Phase 1 unit has been executed yet; Group A is the next unit.
>
> This header previously read *"DRAFT — awaiting user approval. Nothing in this document has been
> executed."* That was accurate while it stood. It is updated here at the moment of approval rather than
> left to drift: Phase 0 shipped nine units under a header still reading DRAFT, which was raised as
> closeout finding **C-3**. The original wording is recorded rather than erased, per `CLAUDE.md` §7.
>
> As an Approved plan this document is **rank 5** in the source-of-truth hierarchy (`CLAUDE.md` §6) — it
> outranks the roadmap's sequencing, and is outranked by the non-negotiable rules, the user's current
> instruction, and `CLAUDE.md` itself.
>
> **Created:** 2026-08-03 · **Approved:** 2026-08-03 · **Base:** `main` @ `7fbcd7aa0e45b527170d5e2995f1fe1fe025baeb`
> **Scope authority:** `docs/roadmap.md` § "Phase 1 — Verification integrity"
> **Predecessor:** `docs/04-report/phase-0-integration-enforcement.report.md` ·
> `docs/05-qa/phase-0-final-check.md` (Phase 0 certified **COMPLETE WITH FOLLOW-UP**, 2026-08-03)
>
> **Measurements in this document are dated, not pinned to a tip SHA.** A pinned baseline went stale twice
> during Phase 0. Re-measure before quoting; the commands are given inline.

---

## 1. Objective

Make a green test run mean something.

Phase 0 made the repository re-verify its own *structure*. Phase 1 makes it verify its own *behaviour*.
Today 524 tests pass while **23 of 23 API route files have zero tests**, **12 of 12 `src/lib/db` modules
have zero tests**, and the sole LLM-driven write path (`execute.ts`) is untested outside live E2E. A green
suite currently proves the engines work and the layering holds. It does not prove a route rejects an
unauthenticated caller.

**This phase adds no product features and changes no behaviour.** It contains exactly one production-code
change: a behaviour-preserving extraction (U11).

---

## 2. Measured baseline (2026-08-03)

| Fact | Value | Command |
|---|---|---|
| API route files | **23** | `git ls-files 'src/app/api/**/route.ts' \| wc -l` |
| Exported handlers in them | **31** (12 GET, 12 POST, 3 PUT, 3 DELETE, 1 PATCH) | `… \| xargs grep -hoE 'export async function (GET\|POST\|PUT\|DELETE\|PATCH)' \| sort \| uniq -c` |
| Route files with a route test | **0** | `git ls-files 'src/app/api/**/*.test.ts' \| wc -l` |
| Route files calling `getUser()` | **23 / 23** | `… \| xargs grep -l getUser \| wc -l` |
| Route files using `handle()` | **19** | `… \| xargs grep -l 'handle(' \| wc -l` |
| Route files performing `.parse(` | **14** (so **9** take no validated body) | `… \| xargs grep -l '\.parse(' \| wc -l` |
| `src/lib/db` modules / tests | **12 / 0** | `git ls-files 'src/lib/db/*.ts'` |
| `src/app/api/advisor/actions/route.ts` | **230 lines** | `wc -l` |
| `src/lib/advisor/actions/schema.ts` | exists, 66 lines | `wc -l` |
| Migrations | **7** (`0001`–`0007`), DDL regular, zero drops/renames | `ls supabase/migrations` |
| `evaluateStack` context fields | **7** (`stack, items, profile, labMarkers, trends, sideEffectReports, checkins`) | `src/services/evaluation.ts:49` |
| E2E spec files | **23**, of which **17** reference `E2E_LIVE`, **0** carry `[LIVE]` | `ls tests/e2e/*.spec.ts` |
| Coverage thresholds | `src/lib/stack-evaluator/**` only (U-DEFER-5) | `vitest.config.ts:35` |
| Suite | 524 tests / 42 files | `npx vitest run` |

**Roadmap figures this supersedes.** The roadmap says the advisor route is "~190 lines" (measured **230**;
~138 lines actually move to a service and ~33 to the existing `schema.ts`) and "all 23 routes" (correct per
*file*, but the sizing driver is **31 handlers**). `docs/project-status.md` §2.6:210 says "23, of which **20** use
`handle()` at **28** call sites"; measured **19** files at **26** call sites. These are recorded, not
silently corrected in place — correcting `project-status.md` is out of this unit's scope and belongs to
whichever Phase 1 unit next opens that file.

---

## 3. Scope

**In scope** — the roadmap's eight Phase 1 items, its migration/testing/security requirements, and the
register items dispositioned to Phase 1 in §5.

**Out of scope**, restated from the roadmap so it is not re-litigated per unit: no product features; no
content grounding; no observability (Phase 2); no component-test backfill beyond safety-critical
components; no new engines. Additionally out of scope here: branch protection (C-6 — a user decision,
§7), and any repository-settings change.

---

## 4. Two defects in the roadmap's own exit criteria

Found while sizing. Both make a criterion unmeetable as written; both need a decision before the unit that
targets them starts.

**4.1 — "Every route file has ≥ 1 test each asserting 401, 400, and the happy path."**
**9 of 23** route files perform no `.parse(` and several handlers accept no input at all. They are
structurally incapable of returning 400. The criterion needs a **written-reason exemption list** in the
house `EXEMPT_LAYERS` shape, or it can never be satisfied honestly.

**DISCHARGED 2026-08-04 → §10.1.** The 9 were recounted and each read individually; the list sorts them into
three structural reasons (no input at all · path param only · coerced query param). The defect diagnosis
above was correct and the count held. Criterion 1 is now met.

**4.2 — "Auth-coverage and RLS-coverage tests fail on a deliberately non-compliant new file."**
House style derives inventory from `git ls-files --cached`. An **unstaged** new file is invisible to the
guard, so the mutation would pass green and *look* like proof. Every such mutation must be `git add -N`'d,
and the unit report must say so. This is exactly the "a test not shown red is not a guard" failure the
repository has already been bitten by.

---

## 5. Disposition inventory — every candidate accounted for

No item is silently dropped. 9 → Phase 1 unit · 5 → deferred with reason · 4 → needs-user-decision ·
2 → closed/record-only · 1 → excluded.

| Item | Disposition | Reason |
|---|---|---|
| **C-5** `NO_UI_IMPORT` ratified | **Closed — record only** | Already documented and ratified in `CLAUDE.md` §4. Nothing left to run. Revisited by U15 only if its claim→observed pass finds the header describes B5 wrongly. |
| **C-9** `[LIVE]` tags | **Phase 1 — U16** | Roadmap item 6 names it verbatim. Measured: 17 gated files, **0** tags. |
| **C-10** archive staged despite exclusion | **Closed — record only** | Content verified correct; only the staging *decision* was unrecorded, and that record now exists. No executable claim available. |
| **C-11** tree partition ignores loose files/symlinks | **CLOSED 2026-08-05 by U15** | Both halves fixed: `EXEMPT_ROOT_FILES` (empty, written-reason bar, stale-entry check) and a no-tracked-symlink assertion. Red against a staged `src/middleware.ts` and a staged symlink — the latter also tripped `B2b`, which is direct evidence a symlink really does smuggle a forbidden dependency past a name-based rule. |
| **C-12 / U-DEFER-4** `.tsx` neither scanned nor executed | **CLOSED 2026-08-05 by U13** | Detector shipped in `boundaries.test.ts`'s harness-sanity block, beside U15's C-11 work. It parses `include` out of `vitest.config.ts` rather than hardcoding it, so changing the config cannot silently un-govern the rule. Red against a `git add -N`-staged `src/components/Widget.test.tsx` containing `expect(1).toBe(2)` — a **failing** test that would never have run: `tracked but not matched by vitest include; they would never run`. No jsdom/RTL, as specified. |
| **F3** typed error class for `NOT_CONFIGURED` | **Deferred → Phase 2** | Roadmap Phase 2 item 2 owns it. It touches `handle()`, the boundary U1–U4's envelope assertions pin; sequence it *after* those pins exist. |
| **F5** surface correlation ID in UI | **Deferred → Phase 2** | Observability; Phase 1 excludes it explicitly. |
| **F6** route-level reachability, 4 fixed handlers | **Phase 1 — U4** | Closed as a by-product of the advisor route tests. |
| **F7** detector gaps (destructured bodies, two-arg `.then`) | **Deferred, with a condition** | Both are honestly declared, and no route uses either form; closing now is speculative (§8). **Condition:** if U11 introduces either form in `src/services/**`, F7 becomes in-scope for U11. |
| **D-2** branch coverage ±0.02 pp | **Phase 1 — U13, as a design constraint** | Not a unit but a rule: no `branches` threshold within 10 pp of measured, and none on directories containing `src/lib/protocol-builder/rules.ts`. Record it beside the threshold block so it is not later "tightened" into a flake. |
| **D-4** domain-purity scope (3 files vs 8) | **CLOSED 2026-08-05 by U18** | Ruling applied and settled BROADER than the narrow reading: enforcement covers all of `src/lib` except four named exemptions (`auth`, `api`, `supabase`, plus **`db`**, which the ruling did not name — a layer cannot reach itself). Both counts re-measured and confirmed: **3** files under the narrow `@/lib/db` reading, **8** under §4.5's literal wording. The 3 are allowlisted as a **ratchet** — a test asserts each still violates, so the list can only shrink. |
| **Supplement slug policy** | **RULED 2026-08-03 → scheduled Phase 2 (ID manifest)** | Ruling: slugs join the append-only stability contract; renames require a tombstone/redirect entry, as reference-data IDs do (`CLAUDE.md` §2.4 rule 16). Implementation lands with the Phase 2 manifest, where the binding target exists. See §7 decision 3. |
| **`boundaries.test.ts` claim→observed pass** | **Phase 1 — U15** | The technique caught three real defects in R3b. `boundaries.test.ts`'s header is the one that never received it. Highest yield per unit cost in the phase. |
| **U-DEFER-1** tags `v2`…`v13` | **RULED 2026-08-03 → criterion retired** | v12 `51d2134` precedes v11 `d89cf1c`, so honest ordered tags are impossible; §10.4 forbids rewriting the chain; milestone identity already lives in `docs/archive/*/_INDEX.md`. Retired in `docs/roadmap.md` with rationale recorded, not deleted. See §7 decision 4. |
| **C-6** branch protection | **Excluded from units — user decision** | §7 decision 1. |
| **§4 rule 5** domain purity | **See D-4** | Blocked on the same scope decision. |
| **§4 rule 7** client components take props | **Deferred → Phase 3/4; optional S ratchet** | Enforcing today fails 7 of 31 components; fixing them is a product change Phase 1 excludes. A *ratchet* (allowlist the 7 with written reasons, fail an 8th) is in-scope-shaped and cheap — on the cut list, not the core list. |
| **§4 rule 8** trust boundaries in testable modules | **Partially Phase 1 — U11**; general rule deferred | U11 is the concrete increment. A general mechanical "is this a trust boundary?" rule is unbuildable without a definition and would be speculative abstraction. |
| **§4 rule 9** budget + rate limit on paid APIs | **Deferred → Phase 2** | Roadmap Phase 2 item 3 owns it verbatim. |

---

## 6. Units

Size key: **S** = one focused test file or a config change · **M** = a guard with fixtures, or ~5–10 route
tests · **L** = a refactor plus its tests.

| ID | Goal | Files | Size | ≈ tests | Deps |
|---|---|---|---|---|---|
| **U1** | Establish the route-test pattern on one route; settle the harness question. | N `src/app/api/checkins/route.test.ts` | S | 6 | — |
| **U2** | Route tests for the **6** read-only / no-body route files. | N 6 × `route.test.ts` | M | 24 (delivered) | U1 |
| **U3** | Route tests for the **12** Zod-validated mutation route files (excl. advisor) — 11 new here; `checkins` is U1's. | N 11 × `route.test.ts` | M | 58 (delivered) | U1 |
| **U4** | Route tests for the advisor route files; closes **F6**. **4 new files** — the fifth, `advisor/actions/route.test.ts`, already exists as U11's Gate C1 pins, which U4 EXTENDS and must not weaken or rewrite. | N 4 × `route.test.ts`, M `advisor/actions/route.test.ts` | M | ~20 | U1, U11 |
| **U5** | `AUTH_COVERAGE` guard — every tracked route handler calls `getUser()` before any I/O. | N `src/architecture/auth-coverage.test.ts` | M | ~8 | — |
| **U6** | `RLS_COVERAGE` guard — every `create table` has a matching RLS enable + policy. | N `src/architecture/rls-coverage.test.ts` | M | ~8 | — |
| **U7** | Row-fixture tests for all `mappers.ts` functions. | N `src/lib/db/mappers.test.ts` | M | ~28 | — |
| **U8** | Schema↔type drift check binding migrations to `src/lib/db/types.ts`. | N `src/architecture/schema-type-drift.test.ts` | L | ~12 | U6 |
| **U9** | Accept/reject boundary tests for `src/lib/validation/schemas.ts`. | N `src/lib/validation/schemas.test.ts` | M | ~26 | — |
| **U10** | `execute.ts` tests — repo call + inverse-intent per proposal type, incl. reverse-order rollback. | N `src/lib/advisor/actions/execute.test.ts` | M | ~24 | — |
| **U11** | Extract advisor confirm-and-apply to `src/services/advisor-actions.ts`, behaviour-preserving — **and extend the error-disclosure guard's inventory to `src/services/**`**. | N service + test; M route, `schema.ts`, `error-disclosure.test.ts` | L | ~22 | U10 |
| **U12** | Reachability guard 2/7 → 7/7 `evaluateStack` context fields; write the pattern down. | M `src/services/evaluation.test.ts`, M design doc | M | +5 | — |
| **U13** | Coverage thresholds for every pure engine dir, enforced in CI; close C-12. | M `vitest.config.ts`, `.github/workflows/ci.yml`, `package.json` | S | +1 guard | U2–U4, U7, U9, U10 |
| **U14** | Doc-truth guard — bind `CLAUDE.md` §4's enforcement table and §5's CI-trigger sentence. | N `src/architecture/doc-truth.test.ts` | S | ~6 | — |
| **U15** | Claim→observed pass over `boundaries.test.ts`'s header; close **C-11**. | M `boundaries.test.ts`, M design doc | S | +3 | — |
| **U18** | `DOMAIN_IS_PURE` ratchet per ruling 2 — enforce purity on true engine directories; register `src/lib/{auth,api,supabase}` as named exemptions with written reasons. Closes **D-4** and `CLAUDE.md` §4 rule 5. | M `src/architecture/boundaries.test.ts`, M `docs/02-design/architecture-boundaries.md`, M `CLAUDE.md` §4 table | S | ~4 | U15 |
| **U19** | Route-level ownership check on `/api/stacks/:id/items/:itemId` — verify the item belongs to the **verified parent stack**; 404 on mismatch. Added 2026-08-04 from a U3 finding. | M `src/app/api/stacks/[id]/items/[itemId]/route.ts`, M its `route.test.ts`, possibly M `src/lib/db/stack-item-repo.ts` | S | +2 | U3 |
| **U20** | `executeBatch`'s inner rollback `catch` calls `reportInternalError(err, "ROLLBACK_FAILED")` — a **log-only** addition; the response contract is untouched. Added 2026-08-04 per FU-2's U11 assessment. | M `src/lib/advisor/actions/execute.ts`, M its `.test.ts` | S | +2 | U11 |
| **U21** | Route-level ownership on `GET /api/advisor/conversations/:id` — **the U19 shape applied to conversation reads**. Today the handler passes the path id to `getMessages(supabase, id)` and never passes the caller's id; the route's own comment says it relies on migration 0003's RLS. Pass the caller id, or add an equivalent membership check; **404 on a foreign conversation**. Added 2026-08-04 from U4 follow-up 1. | M `src/app/api/advisor/conversations/[id]/route.ts`, M its `route.test.ts`, possibly M `src/lib/advisor/repo.ts` | S | ~4 | U4 |
| **U16** | E2E honesty — `[LIVE]` tags (**C-9**), kill the shared-user race, build-then-start `webServer`. | M `playwright.config.ts`, M 17 specs, N tag guard | M | ~4 | — |
| **U17** | Dated live-E2E baseline; investigate the `fetch failed` login artifact. | N `docs/05-qa/phase-1-live-e2e-baseline.md`, M `project-status.md` | M | 0 | U16 |

#### Correction to the U2 / U3 / U4 file counts (2026-08-04)

The rows above originally read **9 / 10 / 4**. Recounted from `git ls-files --cached` and each file's
handlers, the buckets are **6 / 12 / 5** — 23 route files in total, which is unchanged.

**Where the error came from, so it is not repeated.** §2's baseline says *"Route files performing `.parse(`
— 14 (so **9** take no validated body)"*. Both figures are correct, but they count **all 23 routes,
advisor included**. U2 then took the 9 verbatim while U3 said "excl. advisor" and U4 claimed the advisor
files separately — so the three advisor routes with no validated body (`advisor/conversations`,
`advisor/conversations/[id]`, `advisor/actions/[id]/undo`) were counted **twice**, once in U2's 9 and once
inside U4's bucket. The remaining drift (U3's 10, U4's 4) has no derivation and was an estimate.

**The criteria were never ambiguous** — "read-only / no-body", "Zod-validated mutation, excl. advisor",
"advisor" partition the 23 files exactly once each, which is why U2 and U3 could be delivered against the
criteria while the counts were wrong. Sizing numbers derived from a baseline table must state whether they
are scoped the same way as the unit that consumes them.

#### 6.0.1 U8's discovery scope — RATIFIED 2026-08-05

U8's row reads *"binding migrations to `src/lib/db/types.ts`"*. Taken literally, that reading **cannot
satisfy its own gate**. `types.ts` declares **8** row types; the migrations create **12** tables. The other
four row shapes are private to two repo modules (see **FU-20**). Binding only `types.ts` therefore leaves
four tables unbound, and Gate B1 forbids resolving that with an exemption — so the narrow reading is
unsatisfiable by construction, not merely inconvenient.

**Ruling: the guard's scope is the binding's scope.** U8 discovers row types **by shape** — every
`interface <Name>Row` in tracked, non-test `src/lib/**` — rather than from a hardcoded file list. This
makes the binding genuinely total (12 ↔ 12) and means a row type added in a *new* repo module is guarded
automatically instead of silently escaping. `types.ts` is where these types *should* live; it is not the
boundary of what must be *checked*.

Generalisable, and the reason this is recorded rather than just done: **when a unit's stated file scope and
its gate disagree, the gate wins** — the gate states the property, the file list was an estimate of where
the property would be enforced. The estimate is the cheaper thing to be wrong about.

### 6.1 The U11 hazard — stated explicitly because it is invisible

`src/architecture/error-disclosure.test.ts` discovers its inventory with
`git ls-files --cached -- src/app/api` filtered to `/route.ts` (lines 96, 108), and its header declares the
limitation at line 61: *"anything in a file outside `src/app/api/**/route.ts`"* is not caught. Lines
306–308 show it explicitly protects the three advisor routes.

**Therefore moving the confirm-and-apply catch blocks into `src/services/advisor-actions.ts` moves the
repository's most safety-critical error boundary out of its own guard** — a net *reduction* in enforcement,
disguised as a behaviour-preserving refactor, that no test would report. Extending the scanned set to
`src/services/**` is part of U11's definition of done, not optional polish, and gate C2 is the only thing
that proves it landed.

*(Verified independently by the plan's author against the guard source, 2026-08-03.)*

### 6.1.1 U19 — the stack-item ownership gap, as measured (2026-08-04)

Found while writing U3's route tests. Recorded here with its **current-state facts**, so the unit is
scoped against what is true rather than against an alarm.

**What the route does today.** `PUT` and `DELETE` on `/api/stacks/:id/items/:itemId` verify ownership of
the **parent stack** — `getStack(supabase, user.id, id)` — and then call `updateItem(supabase, itemId, …)`
/ `deleteItem(supabase, itemId)`. The item id is never checked against the stack that was verified.

**What actually protects it.** Migration `0001_init.sql`'s `own_stack_items` policy derives ownership from
the parent stack via `auth.uid()`, so a write to an item under **another user's** stack fails the RLS
check. **This is not a live cross-user vulnerability**, and the unit must not be written up as if it were.

**What remains reachable.** Same-user cross-stack editing: a caller who owns both stacks A and B can pass
A in the path and an item id belonging to B, and the write lands on B. Harmless today — it is the caller's
own data either way — but it means the route's stated contract ("an item of *this* stack") is not enforced
by the route.

**Why it is worth closing anyway.** The route currently has no ownership property of its own; it borrows
one from the database. Anything that later reads these rows through a path where RLS does not apply — a
service-role client, a background job, a future admin surface — inherits no protection at all. This is
CLAUDE.md §4 rule 8 in miniature: the trust boundary should live in a testable module.

**Current state is pinned, not silent.** `src/app/api/stacks/[id]/items/[itemId]/route.test.ts` carries a
header stating the gap and a test asserting the item id is passed through verbatim. **U19 must update that
test and header** — leaving them would make the file assert the old behaviour against the new code.

**Mutation proof for U19:** restore the pass-through (drop the new item↔stack check) and the mismatch case
must go red on the 404. A bypass-with-identity probe is *not* the right mutation here — the auth check is
not what changed.

**DELIVERED 2026-08-04, with one ruling.** U19 landed the check as a local `belongsToStack` over the
existing `listItems` — no new repo function, so no new mapper fixture test (§5.6). Mutation M1 (restore the
pass-through) turned **five** tests red; M2 (check membership against a body-supplied stack id) turned one.

**Ruling — the 400 → 404 ordering is RATIFIED.** Placing the membership check *before*
`stackItemInputSchema.parse` changes a second observable: a malformed body aimed at an item outside the
verified stack now answers **404, not 400**. That is broader than "404 on mismatch" as written above, so it
was raised rather than absorbed, and the user ratified it on 2026-08-04. The reason it is right: a 400
there would confirm to an outsider that the item exists, and an ownership-class check preceding validation
is exactly what U3 already pinned on the sibling `PUT /api/stacks/:id` ("checks ownership BEFORE parsing
the body"). Consistency between the two routes is the point.

### 6.2 Mutation proofs

A test not shown red against the bug it targets is not a guard. One deliberate defect per unit, with the
expected red text, is specified in full in the unit-decomposition analysis and summarised here:

| ID | Deliberate defect | Expected red |
|---|---|---|
| U1–U4 | **Preferred — bypass with an identity:** `const user = (await getUser()) ?? { id: "u1" };` | `expected 200 to be 401`, plus envelope mismatch on `error.code: "UNAUTHORIZED"`. *Deleting* the guard outright is the weaker variant — see §6.2.1 |
| U5 | Delete the auth lines from one route; **and** `git add -N` a new route lacking `getUser()`; **and** break the glob | site-naming failure; plus `found 0 tracked route files; a guard that scans nothing passes vacuously` |
| U6 | Delete `enable row level security` from `0007`; then delete its policy | names table + migration file; second: `RLS enabled but no policy — denies all access, a silent outage, not a safe default` |
| U7 | In `toStack`, map `created_at` → `updated_at` | field-level value mismatch naming the mapper |
| U8 | Rename a column in a migration; then rename the TS field; then drop a row from the binding map | `SCHEMA_DRIFT … column has no field / field has no column`; plus `RowType … is not bound to a table` |
| U9 | Widen a `.positive()` to `.min(0)` | `rejects dose = 0: expected success to be false` |
| U10 | Reverse the rollback loop; delete the rollback `catch`; read `prior` after the write | inverse-order mismatch; rollback not called; wrong `inverse.productId` |
| U11 | **Differential**: pin all 8 outcome triples before extraction, then mutate a 409 to 400 → `expected 400 to be 409`. **Coverage half**: add `message: err.message` in the new service → error-disclosure **must** go red naming `src/services/advisor-actions.ts` | if it stays green, the inventory extension did not land |
| U12 | Delete one field from the `evaluateStack({…})` call, per field | `context field "labMarkers" did not reach an observable output` |
| U13 | Add a branchy `__probe` export to an engine dir; `git add -N` an empty `*.test.tsx` | threshold failure naming the directory; `tracked but not matched by vitest include; it would never run` |
| U14 | Rename a `B4b:` test title; flip a "Not enforced" row to "Enforced"; change the CI trigger to `["main"]` | table/guard mismatch naming both sides |
| U15 | `git add -N` a loose `src/middleware.ts` | `TREE_PARTITION: … neither in a scanned layer nor exempt` |
| U18 | Add `import { getStack } from "@/lib/db/stacks";` to a true-engine file (e.g. `src/lib/stack-evaluator/rules.ts`) | `DOMAIN_IS_PURE: src/lib/stack-evaluator/rules.ts:N imports "@/lib/db/stacks" — pure engine directories may not reach persistence (CLAUDE.md §4.5).` Second (exemption integrity): delete the written reason for `src/lib/auth` → `exemption reason is too thin`, the existing rule-6 assertion. Third (anti-vacuity): confirm the guard still passes on the 3 known engine violations only if they are explicitly allowlisted — an un-allowlisted 4th must fail. |
| U16 | Remove `[LIVE]` from a gated describe | `LIVE_TAGGING: … gated on E2E_LIVE but its title carries no "[LIVE]" tag` |
| U17 | Not a guard — a dated measurement. Integrity control: record exact commands, env-var **names** (never values), timestamps, per-spec results; strike through the superseded "61/71"/"79/10" figures rather than deleting them (§7). | — |

#### 6.2.1 Correction to the U1–U4 row (2026-08-03, proven by U1)

The row above originally specified *deleting* `if (!user) return unauthorized();` and predicted
`expected 200 to be 401`. **That prediction cannot hold on any route that dereferences `user`.** With the
guard deleted, `user` is `null` and the handler crashes on `user.id` before it can respond, so the test
fails with:

```
AssertionError: expected 500 to be 401
```

Red, but for the wrong reason: it proves the handler *crashed*, not that data *leaked*. A route that 500s
on anonymous callers is still failing closed. Substituting an identity instead —
`const user = (await getUser()) ?? { id: "u1" };` — lets the handler run to completion, so the test fails
with `expected 200 to be 401`: unambiguous evidence of a **leak**, which is the defect these guards exist
to catch.

**Rule for U2–U4:** prefer the bypass-with-identity variant. Where the deletion variant is also run, accept
either red form and state in the unit report which one was produced and why. Whether a given route 500s or
200s under deletion depends on whether it dereferences `user` before responding — do not treat one expected
string as universal.

*Evidence: U1, `src/app/api/checkins/route.test.ts`; four mutations run in a disposable worktree,
mutation M1 (deletion) → `expected 500 to be 401`, M2/M3 (bypass) → `expected 200 to be 401`.*

#### 6.2.2 Mutations must target observable behaviour, not the line you think is load-bearing (2026-08-04, U3)

A mutation that leaves behaviour unchanged proves nothing, and it is easy to write one by accident.

**The case that produced this rule.** `/api/stacks/:id/items` passes the ownership-verified path id to
`addItem`. To prove that mattered, U3 mutated the route to prefer a body-supplied `stackId`:

```ts
addItem(supabase, (input as { stackId?: string }).stackId ?? id, input)
```

**All four tests stayed green.** `stackItemInputSchema` strips unknown keys, so `input.stackId` is
`undefined` and the fallback silently restored the original behaviour. The mutation was a no-op.

**So the protection came from Zod's strip, not from the route line under test.** Substituting a
concretely wrong value instead — `addItem(supabase, "s-other", input)` — went red immediately:
`expected "spy" to be called with arguments: [ {}, 's1', …(1) ]`.

**Rules that follow:**

1. **Prefer wrong-value probes over plausible-attack probes.** A mutation should change what the code
   *does*, not merely add a path an upstream layer neutralises. If a mutation survives, that is a
   finding to report — never a test to quietly rewrite until it fails.
2. **Do not reason about safety from a route line alone.** Several route-level properties in this
   repository are actually enforced by Zod's unknown-key strip or by RLS. `U5`'s `AUTH_COVERAGE` design
   must state which layer it is asserting about and must not infer a behavioural guarantee from the
   presence or absence of a line in a handler.
3. **A surviving mutation is evidence about the *system*, not only about the test.** The M4 survival is
   how §6.1.1's ownership finding and this rule were both discovered.

#### 6.2.3 Two auth-placement shapes coexist — U5 must handle both (2026-08-03, U2)

Route handlers in this repository check authentication in **two structurally different places**, and both
are correct because `handle()` passes a returned `NextResponse` straight through:

| Shape | Count (of 23) | Routes |
|---|---|---|
| Guard **before** `handle(...)` | **6** | `checkins`, `identity`, `side-effects`, `advisor`, `advisor/actions`, `advisor/actions/[id]/undo` |
| Guard **inside** the `handle(...)` callback | **17** | everything else, incl. all `stacks/*`, all `lab-*`, `profile`, `products/match`, `protocol/generate`, `advisor/conversations`, `advisor/conversations/[id]` |

*(Measured 2026-08-04 by indentation of the `if (!user) return unauthorized();` line across the 23 tracked
route files — 6 + 17 = 23, and the split cuts across the advisor set rather than aligning with it.)*

The difference is invisible in behaviour and visible only under mutation: deleting the guard yields an
*uncaught* crash in the first shape and a *caught* 500 in the second.

**Consequence for U5:** a guard that looks for `getUser()` at a fixed position, or that assumes a single
statement order, silently misses whichever shape it was not written against — 6 routes or 17, depending
which way it is wrong. `AUTH_COVERAGE` must recognise both — and its own anti-vacuity check must prove it,
by planting a violation in **each** shape and showing the guard goes red for both. A single planted
violation is not sufficient evidence here.

### 6.3 Harness decision (settled in U1)

House style is inline `vi.mock` per file (as `src/services/evaluation.test.ts` does). A shared harness
module cannot live in `src/testing/` without a new `EXEMPT_LAYERS` entry (rule 6), and cannot be named
`*.test.ts` (vitest would collect it and fail with no suite). **Recommendation: inline mocks, no shared
module** — ~15 duplicated lines × 23 files is cheaper than a new governed layer (§3 principle 4).

**Confirmed in U1 (2026-08-03):** inline mocks were sufficient; no shared module was needed. Gate A1 is
green — a route handler is importable and assertable under `environment: "node"`, asserted as `res.status`
plus `await res.json()`, with no Next runtime and no live server.

#### 6.3.1 Normative harness rule — 401 tests must mock the happy path to **succeed**

**Every route test in Phase 1 must follow this. It is not stylistic.**

In a test asserting 401 for an unauthenticated caller, all downstream mocks — repositories, Supabase
client, any collaborator the handler reaches after the auth check — **MUST be configured to succeed**, as
if the request were going to be served normally. Authentication must be the only thing standing between an
anonymous caller and real data.

Leaving those mocks unconfigured makes the test pass for the wrong reason and, worse, go *red* for the
wrong reason: remove the auth check and the assertion fails because the handler threw, not because it
served. The evidence a reviewer reads is then indistinguishable from a crash. This is not hypothetical —
it is exactly what the first draft of U1 produced (§6.2.1).

Corollary: `expect(<repo mock>).not.toHaveBeenCalled()` belongs in the 401 test. It asserts the handler
stopped *before* touching data, which the status code alone does not establish.

### 6.4 Sequence and gates

```
Group A (parallel)   U1 · U5 · U6 · U7 · U9 · U10 · U12 · U14 · U15
                     [COMPLETE 2026-08-05 — all nine delivered]
   ├ GATE A1  U1 green: a route handler is importable and assertable under
   │          environment:"node". If red, the route-test programme is re-planned
   │          before U2 starts.
   └ GATE A2  U5, U6, U10, U12 each shown RED against §6.2, with the red text
              pasted into the unit report. No unit advances on a self-reported
              claim — report §6 records that R1–R3b's claims were self-reported
              and had to be re-proved later.
              DISCHARGED 2026-08-04. All four proven in a disposable worktree,
              red text pasted in the unit report, then reverted green:
                U5  5 reds incl. `found 0 tracked route files; a guard that
                    scans nothing passes vacuously`, covering BOTH §6.2.3
                    auth-placement shapes; + 3 anti-rot detector breaks.
                U6  3 reds incl. `RLS enabled but no policy — denies all
                    access, a silent outage, not a safe default`; + 3 anti-rot.
                U10 4 reds incl. reverse-order rollback
                    `expected [ 'delete:i-new-1', 'delete:i-new-2' ] to deeply
                    equal [ 'delete:i-new-2', 'delete:i-new-1' ]`.
                U12 5 field-deletion reds matching §6.2's predicted text
                    verbatim (`context field "labMarkers" did not reach an
                    observable output`), + 2 required-field wrong-value probes
                    + the anti-drift row.
              Note U10's own §6.2 row needed a STATEFUL mock before the
              read-after-write mutation could be caught — a constant-returning
              mock left it green. That is §6.2.2 in miniature.
Group B              U2 · U3 · U8   → U19          [COMPLETE 2026-08-05]
   ├ GATE B1  U8's binding map asserted total in both directions; any real
   │          mismatch is triaged as a FINDING, never silenced by an exemption.
   │          SATISFIED 2026-08-05. 12 tables ↔ 12 row types, total in BOTH
   │          directions, with no exemption list in the guard at all. The
   │          drift check itself found NO drift: every column has a field,
   │          every field has a column, and nullability agrees column by
   │          column. Proven live by 9 mutations, incl. §6.2's three:
   │            M1 rename a column   → `checkins.createdate → CheckinRow
   │               column has no field` AND `CheckinRow.created_at → checkins
   │               field has no column` (both predicted strings, one mutation)
   │            M2 rename a TS field → the same pair on stacks/StackRow
   │            M3 drop a binding row → `SCHEMA_DRIFT: RowType is not bound
   │               to a table` + the reverse `bound to no RowType` + 11≠12
   │          plus nullability both ways, an orphan table, the §4.2
   │          staged-file pair, and 3 anti-rot detector breaks.
   └ U19 follows U3 rather than joining Group A: it EDITS the route test U3
              created (§6.1.1), so it cannot run in parallel with it. This is the
              plan's dependency logic, not the topical grouping — U19 resembles
              U5's security work but depends on U3's file.
Group C              U11 → U4 · U20 · U21          [COMPLETE 2026-08-05]
   ├ GATE C1  Differential response pins captured and green BEFORE any line
   │          moves. Extraction lands only if all 8 outcome triples are identical.
   │          PASSED — 18 pins over 9 outcomes (see §6.2.1's count note),
   │          re-run UNEDITED after the move, plus four differential mutations.
   └ GATE C2  error-disclosure proven red against a planted `err.message` in
              src/services/** — see §6.1. PASSED — red naming
              src/services/advisor-actions.ts:160, AND shown green with the
              same leak when the inventory extension was reverted, which is
              what proves the extension is doing the work.
              U20 DONE 2026-08-05 (log-only; all 24 U10 pins and all 49 advisor
              route pins re-run unedited, so the response contract is proven
              untouched rather than asserted). U21 DONE 2026-08-05 — the
              phase's SECOND deliberate behaviour change, empty 200 -> 404.

ROUTE-TEST PROGRAMME COMPLETE 2026-08-04 — 23 route files, 23 route test files
   (`git ls-files --cached -- src/app/api | grep -c 'route.test.ts$'` = 23).
   U1 · U2 · U3 · U4 all integrated. Gate A1's re-planning clause never fired.
Group D              U13          [GATE D1 OPEN 2026-08-05 — U13 unblocked]
   └ GATE D1  Groups B and C green. SATISFIED: Group B complete (U8 closed it),
              Group C complete (U20, U21). Group A also complete. U13's own
              deps (U2-U4, U7, U9, U10) were already green. Thresholds set from MEASURED per-directory
              coverage, ≥10 pp below observed, `branches` omitted where D-2
              applies. CI gains a coverage step, or criterion 7 is unmet.
Group E (cuttable)   U16 → U17
   └ GATE E1  C-9 closed (all 17 gated files tagged) before any live baseline
              run, so the document can name what ran by tag.
```

### 6.5 Sizing, honestly

~40 new test files, ~25 modified, **~205–230 new tests** (suite 524 → roughly **730–760**), one refactor,
and ~~one~~ **two deliberate behaviour changes** — U19's 404 on an item/stack mismatch, added 2026-08-04
(§6.1.1), and **U21's 404 on a foreign conversation** (2026-08-05), which replaced an empty 200. The count
was written before U21 existed; U21 is the same ruling applied to a second route, not a new exception.
Everything else is behaviour-preserving. U20 is not a second exception: it adds a log line and leaves every
response byte identical. **3–5× Phase 0** by unit and test count, and it contains the
repository's only rank-1 refactor.

#### Measured route-test cost (U1–U3, 2026-08-04) — use this to size U4 and U19

The estimates above were made before any route test existed. Eighteen now do, so the remaining route work
can be sized from measurement rather than guess:

| | Files | Tests | Lines | Lines/test | Lines/file |
|---|---|---|---|---|---|
| U1 (pattern-setting) | 1 | 6 | 187 | 31 | 187 |
| U2 | 6 | 24 | 546 | 23 | 91 |
| U3 | 11 | 58 | 1,335 | 23 | 121 |
| **Route tests, total** | **18** | **88** | **2,068** | **23** | **115** |

*Counts verified against the working tree at `3069651`: `wc -l` per file summing to 2,068, and per-file
test counts read from a `vitest run src/app/api` listing.*

Cost settled at **~23 lines per test and ~100–120 lines per file**, flat across both units and largely
independent of route complexity. U1 was the outlier by design: its header carries the rationale the other
files cite rather than repeat.

**This confirms §6.3's harness ruling on measurement.** The "~15 duplicated lines × 23 files" figure was
about mock boilerplate specifically, and that part held: measured across the 18 files, the inline mock
blocks run **7–25 lines, mean 10** — the 25 being `protocol/generate`, which mocks six repositories. The
remaining ~100 lines per file are tests and commentary, which no shared harness would have removed.

**Projection for the route work left, revised 2026-08-04 after U11:** U4 at **4 new files ≈ 480 lines,
~20 tests**, plus an extension to the existing `advisor/actions/route.test.ts`. The fifth advisor file was
absorbed by U11: Gate C1 required the confirm-and-apply responses pinned *before* any line moved, so that
route test already exists (406 lines, 18 pins). U19 is an edit to an existing file, not a new one.

**Delivered:** U1 · U2 · U3 · U4 (route tests, **23/23 files**) · U5 · U6 · U10 · U12 (guards) · U11 (the
refactor) · U19 · U21 (the two behaviour changes) · U7 · U9 (boundary tests) · U8 (schema↔type drift,
closing **Group B**) · U20 (the log-only fix) · U14 · U15 (doc-truth and the claim→observed pass, closing
**Group A**). Suite **837 across 72 files**, measured at U15's tip, up from the 524/42 baseline recorded
in §2. Route tests alone account for 23 files.
The **~205–230 new-test** estimate at the top of this section is tracking high, not low: **+313** delivered
with only U13 · U16 · U17 · U18 still open, so the projected total exceeds the range. Recorded, not rewritten — the estimate was made before any unit ran, and its error is the useful
part.

The realistic risk is not that a unit fails. It is that **U11 lands, looks green, and has quietly turned one
409 into a 400, or moved the error boundary outside its guard.** Gates C1 and C2 exist for that and should
not be relaxed.

**Cut order** (first cut at the top): U17 · U16 down to tags-only · U14 · ~~U8's nullability half~~ (built,
not cut — 2026-08-05) · U15 last
(cheapest unit here, and the technique caught three real defects — cutting it is a false economy).
*(U2/U3 were on this list, scoped down to one handler per file. They are delivered in full and no longer
cuttable; U4 is the remaining route unit and inherits that option if the phase needs trimming.)*
**Never cut:** U5, U6 (the stated security requirements), U10, U11 (the sole write path), U12 and U13
(named exit criteria).

---

## 7. Decisions — **taken 2026-08-03**

All five were open when this plan was drafted. All five are now ruled on by the user. Each ruling is
recorded here as the authority for the units that depend on it.

**1. Branch protection (C-6 / U-DEFER-3) — RULED: Option C now, then Option B only after the probe.**
Create the integrity ruleset (`deletion`, `non_fast_forward`, `required_linear_history`,
`bypass_actors: []`) immediately, since it removes the irreversible-loss risk at zero workflow cost. Then
run §8.1's throwaway-ref probe; apply B (required status check `typecheck / test / build`) to `main` **only
if the probe passes in both directions**. If it fails either way, keep C alone and record C-6 as
half-closed. Executed in unit PHASE1-PLAN-PUB — see §8.5 for the observed outcome.

**2. Domain-purity scope (D-4 / §4 rule 5) — RULED: NO.** `src/lib/{auth,api,supabase}` are
**infrastructure, not engines**. They are registered as **named exemptions with written reasons**, and
purity enforcement targets the true engine directories — i.e. the **3** violating files
(`identity/context.ts`, `advisor/context-loader.ts`, `advisor/actions/execute.ts`), not the 8 that §4.5's
literal wording would sweep in. This unblocks the `DOMAIN_IS_PURE` ratchet: it becomes an ~S unit with a
written-reason exemption list, in the established `EXEMPT_LAYERS` shape.

**3. Supplement slug policy — RULED: slugs join the append-only stability contract.** A slug is not free to
change. Renames require a **tombstone / redirect entry**, exactly as reference-data IDs do under
`CLAUDE.md` §2.4 rule 16. The manifest addition is scheduled where this plan proposed it — **Phase 2, with
the ID manifest** — because that is where the binding target exists.

**4. U-DEFER-1 tags — RULED: retire the criterion**, with the rationale recorded rather than deleted. The
chain cannot support honest ordered tags (v12 `51d2134` precedes v11 `d89cf1c` in history), `CLAUDE.md`
§10.4 forbids rewriting the chain to fix it, and **milestone identity already lives in `docs/archive/`**
per-feature with its `_INDEX.md` status record. A tag would add a second, less accurate identity. Retired
in `docs/roadmap.md`, not silently dropped (§7 of `CLAUDE.md`).

**5. Exit-criterion repairs (§4) — RULED: approved as recommended.** A written-reason exemption list covers
the **9** route files that perform no `.parse(` and are therefore structurally incapable of returning 400;
and criterion 5 is reworded, because "reproducible in CI" is **not achievable within Phase 1's stated
scope** (a CI E2E job is out of scope). Both are reflected in §10.

---

## 8. Branch protection — options for decision 1

**No repository setting was changed in producing this section.** Everything below is read-only analysis.

**The spec being satisfied** (`docs/01-plan/phase-0-integration-enforcement.plan.md:296`): *"Minimum ruleset
when done: **require PR, require the CI check, forbid force-push, forbid deletion**."* Four sub-requirements.

**Verified state (2026-08-03).** `main` is the only branch; 0 merge commits; **0 pull requests in repo
history**; `branches/main/protection` → 404; `rulesets` → `[]`; repo public, owner type User, admin true.

**The required status-check context string is `typecheck / test / build`** — the job's `name:`, **not** the
job id `verify` and **not** the workflow name `CI`. Confirmed empirically:
`GET /commits/7fbcd7a/check-runs` returns three runs, all named exactly `typecheck / test / build`,
`app_id=15368`, all `success`. Getting this string wrong is the classic failure mode: the required check
never matches, and every push blocks forever with no passing path.

### 8.1 The question that decides everything

Does a required status check **reject direct pushes outright**, or **evaluate the checks already recorded
against the pushed SHA**?

**It is SHA-keyed** — protection asks *"does this SHA carry a green `typecheck / test / build`?"*, not
*"did this arrive via a PR?"*. **Confidence: high** for classic protection (GitHub's docs describe commits
being pushed to another branch and then merged **or pushed directly** after checks pass); **medium** for the
newer rulesets engine.

**Consequence, and the most important finding here:** because `push: branches: ["**"]` now runs CI on every
branch, the SHA that `main` fast-forwards to is *exactly* the SHA CI already tested. So a required check is
compatible with the ff-only flow — no bypass needed for the normal path.

Because the failure mode of being wrong is a self-inflicted deadlock on a public repo's default branch,
this must be **proved before being applied to `main`**, via a throwaway ref that never touches `main`:
create a ruleset scoped to `refs/heads/probe-target`, push an already-green SHA (expect success), push a
never-tested commit (expect rejection), tear down. Step 2 succeeding is the proof.

### 8.2 Options

| | Blocks force-push | Blocks deletion | Requires CI green on `main` | Keeps ff-push flow | Extra steps/unit | U-DEFER-3 |
|---|---|---|---|---|---|---|
| **A** PR flow + required checks | Yes | Yes | Yes | **No** | +3…+5 | **4 of 4** |
| **B** Required checks, direct push, admin bypass | Yes | Yes | Yes (unless bypassed) | **Yes** | +1 (wait for green) | 3 of 4 |
| **C** Force-push/deletion ruleset only | Yes | Yes | **No** | Yes | **0** | 2 of 4 |

**Option A — PR-based flow.** Classic protection with `required_status_checks.checks:
[{context: "typecheck / test / build", app_id: 15368}]`, `enforce_admins: true`,
`required_pull_request_reviews: {required_approving_review_count: 0}`, `required_linear_history: true`,
`allow_force_pushes: false`, `allow_deletions: false`.
A solo maintainer **must** use review count `0` — GitHub forbids approving your own PR, so any count ≥ 1 is
an unsatisfiable gate. **Its real cost is SHA identity:** of the three merge methods, *merge commit* breaks
the zero-merge invariant (and is rejected by `required_linear_history`), while *squash* and *rebase* keep
history linear but **rewrite commit SHAs** — so the commit that lands on `main` is *not* the commit CI
tested, and squash additionally collapses the granular per-unit history this repo has deliberately kept.
It buys process shape, not a second reviewer.

**Option B — required checks, ff-push preserved.** Same required check, but `enforce_admins: false` and
`required_pull_request_reviews: null`.
**The bypass asymmetry is load-bearing:** under *classic* protection, `enforce_admins: false` exempts admins
from the listed settings (required checks, PR, linear history) but **not** from force-push or deletion —
those are the separate `allow_force_pushes` / `allow_deletions` toggles, which bind admins too. So the
force-push and deletion bars stay real. Under *rulesets*, a `bypass_actors` entry exempts that actor from
**every rule in that ruleset**, including `non_fast_forward` and `deletion` — so a ruleset implementation
must be **split into two** (status-check + bypass; integrity rules with `bypass_actors: []`) or the bypass
silently reopens the force-push hole.
Day-to-day: one extra step — wait for the branch's CI to go green before `git merge --ff-only && git push`.
Honestly stated: on a solo repo the CI gate is advisory for the maintainer. Its value is a guardrail against
accident, not a control against intent.

**Option C — integrity ruleset only.** `POST /rulesets` with `target: branch`,
`conditions.ref_name.include: ["~DEFAULT_BRANCH"]`, `bypass_actors: []`, rules `deletion`,
`non_fast_forward`, `required_linear_history`. `non_fast_forward` blocks force-pushes and rewrites while
permitting exactly the ff updates this workflow performs. **Zero workflow change. Zero extra steps.**

### 8.3 Recommendation — **C now; then B after the probe experiment**

1. **The two halves of C-6 are not equally urgent.** "`main` is force-pushable" is an *irreversible-loss*
   risk; "CI is not required" is a quality risk already mitigated in practice, since CI runs on every branch
   push and the ff-push moves `main` to an already-tested SHA. C removes the irreversible risk at zero cost,
   so there is no reason to hold it behind the harder question.
2. **A is the wrong shape here.** It satisfies U-DEFER-3's letter, but rebase/squash rewrite SHAs — weakening
   the exact property the ff-only flow guarantees — in exchange for a review gate the maintainer satisfies by
   clicking his own button. Net loss.
3. **B is the right end state**, contingent on §8.1's probe.
4. **Record the criterion honestly.** C alone closes **2 of 4** (force-push, deletion). C + B closes **3 of
   4**. The "require PR" clause should be **re-litigated, not blindly satisfied** — it was authored before
   `push: branches: ["**"]` existed, which is precisely what makes a PR unnecessary for CI coverage. That is
   a plan amendment to be written up, not an exception to be taken silently.

### 8.5 Outcome — executed 2026-08-03 (unit PHASE1-PLAN-PUB)

**Option C applied.** Ruleset `main-integrity` (id `20291684`): `deletion`, `non_fast_forward`,
`required_linear_history`, on `~DEFAULT_BRANCH`, `bypass_actors: []`, `current_user_can_bypass: "never"` —
it binds the admin.

**The probe passed in both directions**, settling §8.1 and §8.4's first two flags:

- CI-green SHA `b685c3c` → protected probe ref: **pushed successfully**.
- Never-tested commit `70ecff1` → same ref: **rejected**, `Required status check "typecheck / test / build" is expected.`

So SHA-keyed evaluation holds for the **rulesets** engine (previously medium confidence), and
`strict: true` is satisfied by a ff-push of a pre-tested SHA. **Option B applied to `main`**: required check
`typecheck / test / build` (`app_id` 15368), `strict: true`, `enforce_admins: false`,
`required_linear_history: true`, force-pushes and deletions forbidden. Probe ruleset and branch deleted.

### 8.6 Amendment — the "require PR" clause is **retired** (2026-08-03)

**Ruled by the user; recorded here rather than left as a silent 3-of-4.**

The Phase 0 plan's U-DEFER-3 spec (`docs/01-plan/phase-0-integration-enforcement.plan.md:296`) named four
sub-requirements, one of which was "require PR". That clause is **retired**, for two stated reasons:

1. **It predates the trigger that made it redundant.** It was written when CI's push trigger covered
   `main` and `feat/**` only, so a PR was the only way to guarantee CI ran before integration. Since
   `7fbcd7a`, `push: branches: ["**"]` runs CI on **every** branch, and Option B's required check binds the
   SHA. PR-based CI coverage is now strictly redundant with what is already enforced.
2. **A PR flow would actively weaken SHA integrity** — §8.2 Option A: `rebase` and `squash` both rewrite
   commit SHAs, so the commit landing on `main` would no longer be the commit CI validated. The ff-only
   flow is the only one that puts the byte-identical, CI-validated SHA on `main`. Adopting PRs to satisfy a
   clause whose purpose is already met would trade a real property for a procedural one, and the review
   gate itself is unreal on a single-maintainer repository (GitHub forbids approving your own PR, so the
   count must be 0).

**The underlying risk the clause controlled — untested code reaching `main` — is controlled by the required
status check, which is strictly stronger:** it binds every push, including ones no PR would have covered.

**C-6 / U-DEFER-3 therefore records as CLOSED**, on three implemented sub-requirements plus one retired by
this amendment. What remains true and is *not* claimed closed: `enforce_admins: false` means the required
check is bypassable by the repository admin, so it is a guardrail against accident, not a control against
intent — stated in §8.2 and unchanged by this amendment.

### 8.4 Flagged as inferred, not verified

- SHA-keyed evaluation on direct push — high confidence (classic), medium (rulesets). **The probe settles it; do not skip it.**
- `strict: true` on a direct ff-push is inferred to be trivially satisfied (pre-push `main` is an ancestor). If the probe's success case fails, retry with `strict: false` before concluding the approach is unviable.
- The `RepositoryRole` actor id for admin in ruleset `bypass_actors` (commonly `5`) was **not** verified; the recommended path avoids needing it.
- `7fbcd7a` carries **three** identically-named check runs (from the `main`, `chore/*` and `test/*` pushes — a consequence of the `**` trigger). All succeeded, so it is moot today; but if a `concurrency` cancellation ever leaves the *latest* same-named run `cancelled`, the required check would likely read as failing. Untested edge case; remember it if a push is ever mysteriously rejected.

---

## 9. Doc-truth guard — recommendation

**FOR, in one narrow form. AGAINST the version most people would build.** Detail in §10 of the report; the
design is U14.

**Against binding counts** (test counts, file counts, route counts, LOC, coverage percentages): the
repository already states in `CLAUDE.md` §5 that its own figures are snapshots that will drift and that CI
is authoritative — a guard turning declared-drifting snapshots into build failures contradicts that policy.
Counts also appear across 4–7 files including `docs/archive/**`, which must never be bound because §7
forbids rewriting the historical record. And such a guard fires on every innocuous change, which is how
guards rot into blanket exemptions.

**For binding "X is enforced by Y".** A stale count is a record defect; a stale *enforcement* claim is a
**trust defect** — a reader sees "rule 4 — Enforced — `boundaries.test.ts` — B4, B4b" and stops checking.
If B4b were deleted, nothing today would notice. It is also uniquely cheap to bind, because both sides are
already mechanical: the table names a file and rule ids, and those ids are literal test-title prefixes.

U14 asserts exactly two things: (A) the §4 enforcement table binds to the guards it names — in **both**
directions, so a rule quietly *gained* enforcement without a doc update also fails, and the table covers
rules 1–9 exactly once; (B) the §5 CI-trigger sentence matches `.github/workflows/ci.yml`. Explicitly out of
scope, stated in its header so no one "helpfully" extends it: counts of any kind, and anything under
`docs/archive/**` or in a dated review record.

---

## 10. Exit criteria

The roadmap's seven, plus this plan's own. Countable and drift-proof — each states its command.

- [x] Every route file has ≥ 1 test asserting 401, the happy path, and 400 **where the file validates input**; the non-validating files are enumerated in a written-reason exemption list. (`git ls-files 'src/app/api/**/*.test.ts' | wc -l` = 23) — **MET 2026-08-04.** All four clauses measured, not assumed: 23 route files / 23 route test files; **23/23** assert `toBe(401)`; **23/23** assert `toBe(200)` or `toBe(201)`; **14/14** input-validating files assert `toBe(400)`; and the exemption list for the other **9** is §10.1 below. Previously PARTIAL because only the list was missing.
- [ ] `mappers.ts` ≥ 90 % statements; `execute.ts` ≥ 80 %; `validation/schemas.ts` ≥ 80 %.
- [x] A schema↔type drift check exists and is **shown red** against a deliberately renamed column. — **MET 2026-08-05 by U8.** `src/architecture/schema-type-drift.test.ts`, 23 tests. Renaming `checkins.created_at` to `createdate` in `0006` produced `checkins.createdate → CheckinRow column has no field` **and** `CheckinRow.created_at → checkins field has no column`. The nullability half (§6.5 lists it as cuttable) was **built, not cut**, and is red in both directions.
- [x] Reachability guard covers **7 / 7** `evaluateStack` context fields. — **MET 2026-08-04 by U12.** Baseline recounted at 2/7 before the unit; all 7 fields at the `evaluateStack({…})` call site now carry a differential row, and an anti-drift row parses the call site so an eighth field cannot be added without one. No dead context found — every field reaches an observable output.
- [x] Auth-coverage and RLS-coverage guards are **shown red** against a `git add -N`-staged non-compliant new file (§4.2). — **MET 2026-08-05.** **AUTH_COVERAGE** (U5): a `git add -N`-staged route lacking `getUser()` was caught, plus the glob-break variant → `found 0 tracked route files; a guard that scans nothing passes vacuously`. **RLS_COVERAGE**: the missing half, run during the U14/U15 batch against a new `supabase/migrations/0008_unprotected.sql` creating `public.unprotected_notes` with no RLS. Both directions recorded, because the false-green half is the point of §4.2:

  ```
  UNSTAGED   → Tests  14 passed (14)          ← green, and it looks like proof
  git add -N → RLS_COVERAGE: these tables are created with no `enable row level security`.
                 unprotected_notes (created in supabase/migrations/0008_unprotected.sql)
  ```

  The same both-ways form was independently run for **SCHEMA_DRIFT** (staged rogue row type: 23 passed unstaged → `RowType is not bound to a table` staged) and for **U15's TREE_PARTITION** (staged `src/middleware.ts`: 31 passed unstaged → `neither in a scanned layer nor exempt` staged). Three guards, same property, same evidence shape.
- [x] Coverage thresholds configured for every pure engine directory and enforced by a CI step; no `branches` threshold within 10 pp of measured (D-2). — **MET 2026-08-05 by U13.** **14** pure engine directories carry thresholds in `vitest.config.ts`, every number `measured − 10` from a coverage run at the U15 tip. D-2 honoured twice over: the 10 pp margin is **500× the observed ±0.02 pp jitter**, and `src/lib/protocol-builder` carries **no `branches` key at all**, marked in-place so it is not "completed" later. CI gained a distinct `Coverage thresholds` step (`npm run test:coverage`); the four existing steps are byte-identical, +19/−0. **Five directories are deliberately excluded and named**: `src/lib/{auth,api,supabase}` (infrastructure, per the D-4 ruling), `src/lib/db` (persistence — 15.65 % statements, exercised through routes; FU-16), and `src/lib/{advisor,identity}` (each still holds a file importing `@/lib/db` — U18's subject). **`package.json` needed no change**: the unit row lists it as modified, but `test:coverage` = `vitest run --coverage` already existed, and `@vitest/coverage-v8` is already a devDependency in the lockfile.
- [ ] `[LIVE]` appears on every `E2E_LIVE`-gated describe (`grep -c '\[LIVE\]'` = 17, `grep -l E2E_LIVE | wc -l` = 17).
- [ ] Every guard added in this phase has its **red output recorded in `docs/`** — not self-reported in-session. This is the Phase 0 lesson (report §6) written as a criterion. — **PARTIAL 2026-08-04.** Now in `docs/`: U5, U6, U10 and U12's reds (§6.4 Gate A2), U11's Gate C1/C2 reds (§6.4). Still in-session only: the per-unit reds for U7, U9, U19 and U4. A Phase 1 report under `docs/04-report/` is the natural home; none exists yet.
- [ ] A dated live-E2E baseline exists, recording the exact commands, env-var **names** (never values), timestamps and per-spec results, with the superseded "61/71" and "79/10" figures struck through rather than deleted. **Reworded per ruling 5:** the roadmap's original "reproducible in CI" clause is **removed** — a CI E2E job is out of Phase 1's scope, so requiring it here would make the criterion unmeetable. Reproducibility in CI moves to whichever phase actually adds a CI E2E job.
- [x] **`DOMAIN_IS_PURE` enforced** on true engine directories, with `src/lib/{auth,api,supabase}` registered as named exemptions carrying written reasons (ruling 2), and shown red against an un-allowlisted engine file importing `@/lib/db`. — **MET 2026-08-05 by U18.** Red text: `src/lib/stack-evaluator/rules.ts:3  [DOMAIN_IS_PURE]` / `pure engine directories may not reach persistence (CLAUDE.md §4.5)`. A fourth exemption (`src/lib/db`) was added beyond the ruling's three, with its reason. The three remaining engine violations are allowlisted as a ratchet whose entries must still violate. **`CLAUDE.md` §4's table now reads Enforced, and U14's doc-truth guard polices that in BOTH directions** — reverting the row while the guard exists fails with `rule 5: §4 says not enforced, but DOMAIN_IS_PURE: exists`.
- [ ] `npx tsc --noEmit` clean, `npx vitest run` green, `npx next build` succeeds, CI green on the integration commit.

### 10.1 Route-test 400-exemption list — the 9 files structurally incapable of returning 400

Required by criterion 1 and by §4.1, which called for it *"in the house `EXEMPT_LAYERS` shape"* — a named
entry carrying a written reason, never a bare path. §4.1 specified the **shape**, not the location; absent a
stated home, it lives here, beside the criterion that consumes it.

**Recounted 2026-08-04, not copied from §2:** `git ls-files --cached -- src/app/api | grep '/route\.ts$'`
= **23**, of which `xargs grep -l '\.parse('` = **14**, leaving **9**. Each of the 9 was then read
individually to confirm the absence of a 400 path — the `.parse(` grep is the discovery mechanism, not the
evidence. None of the 9 contains `400`, `badRequest`, `validationError`, or `BAD_REQUEST` anywhere.

**A — no request input of any kind (4).** The handler signature takes no arguments at all, so there is no
value a caller could supply that the route could reject. A 400 test would have to fabricate an input the
handler cannot receive.

| File | Reason |
|---|---|
| `advisor/conversations/route.ts` | `GET()` — zero-arg handler; lists the caller's own conversations from `user.id`. |
| `identity/route.ts` | `GET()` — zero-arg handler; the header states it derives from server-loaded owned data only, *"no request body, no client-trusted input"*. |
| `lab-panels/route.ts` | `GET()` — zero-arg handler; `listPanels(supabase, user.id)`. |
| `lab-trends/route.ts` | `GET()` — zero-arg handler; reads owned rows, then a pure engine. |

**B — path parameter only, unvalidated by design (4).** These take a `[id]` from the URL. It is caller-supplied,
but a malformed or foreign id resolves to **404 / empty**, never 400 — which is deliberate: a 400 that
distinguished "not a uuid" from "not yours" would be a weak existence oracle, the same reasoning that
made §6.1.1's mismatch a 404. **These four are exempt from 400, not from ownership testing**, which is a
separate criterion.

| File | Reason |
|---|---|
| `advisor/actions/[id]/undo/route.ts` | `POST(_request, {params})` — request deliberately unused (underscore-prefixed); unknown id → `notFound("Action")`, already-undone → 409. |
| `advisor/conversations/[id]/route.ts` | `GET(_request, {params})` — request unused; today a foreign id yields an empty list via RLS. **U21 changes this to a 404; it does not add a 400, so this row survives U21.** |
| `stacks/[id]/compare/route.ts` | `GET(_request, {params})` — request unused; unknown/foreign stack → `notFound("Stack")`. |
| `stacks/[id]/evaluate/route.ts` | `POST(_request, {params})` — request unused; unknown/foreign stack → `notFound("Stack")`. |

**C — query parameter, coerced rather than validated (1).**

| File | Reason |
|---|---|
| `side-effects/route.ts` | `GET(request)` reads `?days`, but coerces with `Number(...) \|\| 90` (line 17). There is no rejection branch, so no input can produce a 400. **Recorded honestly: this is lenient coercion, not absence of input** — `?days=abc` and `?days=0` both silently become 90. See **FU-12**; the exemption is correct today either way, because the route cannot 400 whether or not that coercion is later tightened. |

**How this list goes stale, and what to do.** It is prose, so nothing runs it — adding a tenth non-validating
route, or adding `.parse(` to one of these nine, would leave it silently wrong. **FU-13** records that and
names a candidate owner. Until then, re-derive the 9 with the two commands above rather than trusting the
table.

---

## 11. Prerequisites

Phase 0 complete — CI exists on every branch push (`7fbcd7a`), or these tests can silently stop running.
Satisfied.

---

## 12. Follow-up register

Findings surfaced *by* a unit that fall outside that unit's scope. CLAUDE.md §8.1: name it, do not absorb
it. Each row carries an **owner** — the unit expected to act, or an explicit deferral. A row is closed by
the owning unit's report, not by this table.

*(Section added 2026-08-04. The plan had no follow-up section before this; the Phase 0 register in
`docs/05-qa/phase-0-final-check.md` §"Follow-up register" belongs to that phase's Check and is not the
right home for Phase 1 findings.)*

| # | Found by | Finding | Owner |
|---|---|---|---|
| **FU-1** | U10 | `executeProposal`'s `attach_product` reads pre-write state (`getItemProductId`) with no transaction or optimistic lock, so two concurrent confirms can persist an inverse restoring a value that was never current. Ordering alone is the correctness property. | **ASSESSED by U11 2026-08-04 → still open, unowned.** Risk unchanged: `executeProposal` was moved verbatim and still lives in `src/lib/advisor/actions/execute.ts`, which U11 did not touch. A fix belongs there, or in a compare-and-set on `stack_items.product_id` — **not** in the new service. No unit scheduled. |
| **FU-2** | U10 | `executeBatch`'s compensating rollback swallows rollback failures silently — no log, no correlation id — so a failed rollback leaves the stack half-applied with no trace. `respond.ts`'s `reportInternalError` exists for exactly this. | **ASSESSED by U11 2026-08-04 → now owned by U20.** U11 moved no part of `executeBatch`, so the risk is unchanged; what changed is that the fix got cheaper, since `src/services/advisor-actions.ts` already imports `@/lib/api/respond`. Recommended and scheduled as **U20** (log-only; the response contract is untouched). |
| **FU-3** | U5 | `AUTH_COVERAGE` cannot see indirection: a handler doing I/O through a helper in another module reads as clean. U11 moves advisor logic into `src/services/**`, which is on the guard's I/O prefix list — so the guard's answer for the advisor routes must be re-checked after the move. | **CLOSED 2026-08-04 by U11, non-blocking.** Post-move the guard reports `advisor/actions → POST` as `authPos 1382 < firstIo 1676 (createClient)` — still doing work. And on the counterfactual where the service call is the route's ONLY I/O, it reports `firstIo: confirmAndApply`, because `@/services/` is on `IO_MODULE_PREFIXES`. The answer stays meaningful even if all remaining I/O moves behind the service. |
| **FU-4** | U5 | `getUser` is matched by identifier; an aliased import would be invisible to the guard. Declared in the guard's header limitation list. | **Deferred.** No route aliases it; closing now is speculative (§8-style condition: revisit if one ever does). |
| **FU-5** | U6 | `RLS_COVERAGE` does not model `drop policy`, `disable row level security`, `alter policy`, or a later migration weakening an earlier one. | **Deferred.** No migration uses any of these today; this is the guard's most likely route to going stale, so it is recorded rather than closed. |
| **FU-6** | U6 | The guard checks a policy *exists*, never that its `using` clause is correct — `own_stack_items`' parent-stack subquery and a hypothetical `using (true)` are indistinguishable to it. Policy-logic review stays human. | **Deferred**, with a named dependant: **§6.1.1** — U19's whole current-state argument rests on `own_stack_items` being correct, so U19 must read that policy directly rather than trust this guard. |
| **FU-7** | U11 | `error-disclosure` now scans `src/app/api/**/route.ts` **and** `src/services/**/*.ts`, but still **not `src/lib/**`**. A catch block extracted into `src/lib` would reproduce the §6.1 hazard exactly, with no guard — and `src/lib` is where `executeBatch`'s swallowing `catch` already lives. | **Deferred**, condition-bound: in scope for whichever unit next moves error handling into `src/lib`. Note **U20** edits a `src/lib` catch and is the near-term trigger to re-read this row. |
| **FU-9** | U4 | The SSE `error`-event pin is the only test that reads streamed bytes, so its `events()` SSE-parsing helper is duplicated-in-waiting. It has **no legal home**: §6.3's ruling means a shared module cannot live in `src/testing/` without a new `EXEMPT_LAYERS` entry, and cannot be named `*.test.ts`. | **Deferred — no action while there is one SSE route.** Revisit only if a second appears; the ruling, not an oversight, is why it stays inline. |
| **FU-10** | U4 | **F6** ("route-level reachability, 4 fixed handlers") is recorded closed on the strength of §5's disposition row — *"closed as a by-product of the advisor route tests"* — and all 5 advisor handlers now have tests. The **original finding text was not located**, so what was verified is the disposition row, not the underlying finding. | **Deferred, flagged honestly.** If F6's source text surfaces (mvp-transition-check or the closeout review), re-read it against U4's coverage before treating F6 as closed. |
| **FU-11** | U19 | `belongsToStack` costs one extra `listItems` round-trip per PUT/DELETE. Correct and cheap at current stack sizes, but it re-reads a whole list to answer a membership question. | **Deferred, upgrade-bound:** switch to a `getItem` repo function if one ever exists (U7 territory). Not worth creating one for this alone — it would need its own row-fixture test (§5.6) for no behavioural gain. |
| **FU-12** | §10.1 | `side-effects/route.ts:17` coerces `?days` with `Number(…) \|\| 90`, so `?days=abc` **and** `?days=0` both silently become 90. No rejection branch exists, which is *why* the file is 400-exempt. Not a safety issue — the value only widens a read window over the caller's own rows. | **Deferred, unowned.** Tightening it would add a 400 path and **invalidate §10.1's row C**, so the two must move together. Recorded so the exemption is not later read as "this route takes no input". |
| **FU-13** | §10.1 | The 400-exemption list is **prose**. Nothing executes it: adding a tenth non-validating route, or adding `.parse(` to one of the nine, leaves it silently wrong — the exact "documented rule that nothing runs will rot" failure of `CLAUDE.md` §3.5. §4.1 asked for the *`EXEMPT_LAYERS` shape*, which in this repo is executable. | **Open — candidate owner U14.** U14 already binds prose (`CLAUDE.md` §4's table, §5's CI sentence) to executable assertions; this is the same technique on a third document. **Not silently added to U14's scope** — it is a recommendation for the next unit prompt to accept or decline. |
| **FU-14** | U12 | The `sideEffectReports` and `checkins` reachability rows are **coupled**: the only rule observing them needs both, so deleting either turns both rows red. Each field is proven reachable, but neither is proven reachable *independently*. | **Deferred, honestly bounded.** A change making the rule need only one field would not be detected as a coverage loss. No cheap fix without inventing a second rule purely for the test. |
| **FU-15** | U12 | The anti-drift row regex-parses the `evaluateStack({…})` call site out of `src/services/evaluation.ts` source text. A reformat that splits the call across a nested brace would break the parse. | **Deferred, low risk.** It fails **loudly** (the row goes red) rather than silently going vacuous, which is the acceptable failure direction for a drift guard. |
| **FU-16** | U7 | `src/lib/db` holds **12** non-test modules and, after U7, **1** test file — so **11 modules remain untested** (`advisor-action-repo`, `checkin-repo`, `evaluation-flag-repo`, `lab-marker-repo`, `lab-panel-repo`, `profile-repo`, `seed`, `side-effect-repo`, `stack-item-repo`, `stack-repo`, `types`). U7's spec scoped `mappers.ts` only; query construction and filters are untested. | **Open — UNOWNED.** Checked against every open unit: U8 reads `types.ts` **statically** (schema binding, not behaviour); U13 sets thresholds for *pure engine* dirs, and `src/lib/db` is not one. No open unit covers these. Recorded rather than absorbed (§8.1). |
| **FU-17** | U7 | `toCheckin` coalesces `row.ratings ?? {}`, `row.taken ?? []`, `row.scheduled ?? []` — but `0006_checkins.sql:10–12` declares all three `jsonb **not null** default`, and `CheckinRow` declares them non-nullable to match. **The DDL and the type agree; the mapper's defences are dead code.** U7's test reaches them only by casting through `as unknown as CheckinRow`. | **Open — owner U8's nullability half**, which §6.5's cut list names explicitly as a distinct, *cuttable* component. So the ownership is real but conditional: if that half is cut, this row reverts to unowned rather than closing. **Corrects the earlier framing of this row as a "type/reality mismatch": the migration was read, and the type is right.** |
| **FU-18** | U9 | U9 pinned `labMarkerInputSchema.value` as accepting **negative** numbers (`z.number().finite()`, no `.nonnegative()`). The pin now asserts that permissiveness is intentional. **Verification task:** all **13** seeded biomarkers (`src/data/seed-biomarkers.ts`) carry positive `refLow`/`refHigh` — measured, zero negatives — but `marker` is free text (`z.string().min(1).max(120)`), so users are not restricted to the seed. Whether the free-text path *must* permit negatives is unresolved. | **Open — STANDALONE, not U8** (U8 is structural; this is a content question, and Phase 1 is structural work). Must be settled against a **real clinical source**, never model recall — `CLAUDE.md` §2.2 rule 8. Candidates worth checking, flagged as *unverified recall and not to be treated as established*: base-excess-style blood-gas markers. If the answer is "no legitimate negatives", the pin becomes wrong and the schema should gain `.nonnegative()`. |
| **FU-19** | U9 | **Two request-boundary Zod modules have no direct accept/reject tests**: `src/lib/advisor/schema.ts` (`advisorRequestSchema`) and `src/lib/advisor/actions/schema.ts` (`confirmSchema`/`proposalSchema`). Both are covered **transitively** — U4's advisor 400 pins and U11's `VALIDATION_ERROR` pin — which proves *a* rejection occurs, not *which constraint* rejected, so a widened constraint on an unexercised field would survive. | **Deferred, sized.** Cheap (U9's pattern applied twice). **Two earlier counts of this row were wrong and are corrected here:** "two untested schema files" understated the characterisation, then "five" over-counted — `biomarkers/schema.ts`, `interactions/schema.ts` and `lab-import/schema.ts` are each **directly imported and exercised** by their sibling suites, so they were never in this row. |
| **FU-20** | U8 | **Four of the twelve DB row types live outside `src/lib/db/types.ts`**, whose line 1 describes it as holding "DB row shapes": `ConversationRow`, `MessageRow`, `UsageRow` are **private** to `src/lib/advisor/repo.ts`, and `ActionRow` is private to `src/lib/db/advisor-action-repo.ts`. Being private, they cannot be imported or asserted against from anywhere else — U8 reads them as source text. The header does not literally claim exhaustiveness, but it reads that way, and one third of the row types are elsewhere. | **Open — UNOWNED**, placement refactor. Not taken up by U8: moving four types requires enumerating their callers (§9.4, the rule two defects in this project already came from), which is a change with real blast radius rather than a tidy-up. U8's shape-based discovery (§6.0.1) means the guard is correct either way — this row is about where the types *belong*, not about coverage. |
| **FU-21** | U13 | **The 10 pp margin means the coverage floors only catch LAYER-SCALE regressions.** §6.2's specified mutation — a branchy uncovered `__probe` in an engine dir — **SURVIVED**: `src/lib/safety` fell only to 96.11 % against its 88 floor, and **34 further uncovered statements** would have been needed to breach it. This is not a defect in the thresholds; it is the direct cost of D-2's anti-flake requirement, which the plan chose deliberately. | **Open — inherent, recorded not fixed.** Closing it would mean tightening margins into the jitter band, which is the failure D-2 exists to prevent. What the floors DO catch was proven separately (FU-22). Revisit only if branch-coverage determinism is ever fixed upstream. |
| **FU-22** | U13 | Deleting `src/lib/validation/schemas.test.ts` — **40 tests, all of U9** — moved that directory's line coverage by ~0.01 pp, so the floor did not notice. The cause is real and worth knowing: `schemas.ts` is executed by **23 route test files** through `.parse()`, so it was already near-fully *covered* before U9 existed. **U9 added assertions, not coverage.** | **Deferred — a caution, not a bug.** It is the clearest evidence in this repository that coverage measures execution, not verification: a directory can sit at 98 % while its boundary behaviour is unpinned. Do not use these floors as a proxy for test quality. |
| **FU-23** | U13 | U14's CI-step binding checks that the four declared steps EXIST in order; it does not check that no UNDECLARED step exists. U13 added a fifth (`Coverage thresholds`) and the guard stayed green — `CLAUDE.md` §5 was updated by hand, not because anything forced it. | **Open — candidate owner: whichever unit next touches U14.** Making the step list total would have caught this automatically. Registered rather than folded into U13, which had no mandate to edit U14's guard. |
| **FU-8** | U11 | `src/services` has a `LAYER_FLOORS` entry of **1** while holding 2 files. The floor exists to catch a layer silently collapsing to zero; at 1 it now has no headroom to detect the loss of one of the two. | **Deferred.** Raise it when the layer grows again; noted rather than tightened now, because a floor at today's exact count blocks ordinary deletion (the stated reason floors sit below current counts). |
