# Phase 1 — Verification Integrity: closeout report

**Date:** 2026-08-06 · **Plan:** `docs/01-plan/phase-1-verification-integrity.plan.md` (Approved)
**Baseline at Phase 0 close:** 524 tests / 42 files · **At Phase 1 close: 859 tests / 73 files**
**Verdict: COMPLETE WITH FOLLOW-UP.** One criterion is PARTIAL and blocked on credentials no agent can
supply (U17's live half); everything else is met and evidenced below.

> **This report was itself fact-checked before publication.** Eight independent read-only reviewers, one
> per governing document, re-derived every present-tense claim by command; a ninth certified the tree.
> The pass corrected **five** claims in this report — including two figures in the follow-up register that
> had been carried from U13 unchallenged — and produced FU-27 and FU-28. Corrections are marked in place
> rather than silently applied; §3.3's FU-22 row is the clearest example.
>
> The certification is `docs/reviews/phase-1-closeout-check.md` — **PHASE 1 COMPLETE WITH FOLLOW-UP**,
> nine findings, zero Critical, zero Major, with its own independent criteria table and five guard
> mutations chosen to test shapes this report does *not* cover. All eight actionable findings were fixed
> in the commit that publishes it rather than deferred.

Figures here are dated snapshots. **CI is the authority for any given commit** — the `push`/`main` run on
that SHA, not this document.

---

## 1. What the phase was for

The 2026-07 side-effect-engine cycle shipped **two Criticals with 385 tests passing**, a clean typecheck
and a successful build (`docs/archive/2026-07/side-effect-engine/`). That is the incident `CLAUDE.md` §5's
lesson was written from — *green is not verified*. Phase 0 then closed at 524 tests across 42 files. Phase 1's job was to make a green
run mean something: not more tests, but tests **shown to fail against the bug they target**, plus
executable bindings for claims the repository was making in prose.

Two properties govern every guard below, and both were violated somewhere in this phase and caught:

- **§6.2.2 — a surviving mutation is a finding, not a test to rewrite.** Three mutations survived
  (U14's M2, U13's two). None was edited away; each is recorded, and one produced a new rule.
- **§4.2 — the staged-file rule.** Guards derive inventories from `git ls-files --cached`, so a mutation
  on a *new* file passes green until `git add -N`. Every new-file guard below was proven **both ways**:
  false green unstaged, red staged. A guard proven only the second way is proving less than it looks.

---

## 2. Unit-by-unit outcomes

| Unit | Outcome | SHA |
|---|---|---|
| Plan approval | Approved | `b685c3c` |
| **U1** route-test pattern (checkins) | DONE — Gate A1 passed, re-planning clause never fired | `7a9bd35` |
| **U2** read-only / no-body routes | DONE | `a7d3501` |
| **U3** Zod-validated mutation routes | DONE | `3069651` |
| **U10** `execute.ts` inverse-intent + rollback | DONE — 24 pins | `d8ee450` |
| **U5** `AUTH_COVERAGE` guard | DONE — both §6.2.3 auth-placement shapes proven | `e84d4ad` |
| **U6** `RLS_COVERAGE` guard | DONE | `01b8770` |
| **U11** extract confirm-and-apply to `src/services` | DONE — the phase's only rank-1 refactor; Gates C1+C2 | `0af6d2c` |
| **U4** advisor route tests | DONE | `f306923` |
| **U19** item↔stack ownership at route level | DONE — **behaviour change #1** (404) | `3417cfb` |
| **U12** reachability 2/7 → 7/7 | DONE | `9338b43` |
| **U7** `mappers.ts` row-fixture tests | DONE | `ce44dbe` |
| **U9** `schemas.ts` accept/reject boundaries | DONE | `c2b37a7` |
| **U8** migrations ↔ row types (`SCHEMA_DRIFT`) | DONE — Gate B1; 12↔12 total, no exemption list | `29098fc` |
| **U20** rollback failures reported | DONE — log-only; response bytes unchanged | `d08885c` |
| **U21** conversation ownership at route level | DONE — **behaviour change #2** (404) | `882d53e` |
| **U14** bind `CLAUDE.md`'s enforcement claims (`DOC_TRUTH`) | DONE | `92ecb14` |
| **U15** close C-11; audit the boundary header | DONE | `d803d8f` |
| **U13** per-engine coverage floors + C-12 (`HARNESS_GAP`) | DONE — Gate D1 | `5e5c943` |
| — self-inflicted defect: NUL bytes in the boundary guard | Fixed, reported, own commit | `eddcfc8` |
| **U18** `DOMAIN_IS_PURE` as a ratchet | DONE — closes D-4 and §4 rule 5 | `2856d7f` |
| **FU-23 rider** total CI-step binding | DONE | `3108f55` |
| **U16** `[LIVE]` tags + shared-user race + build-then-start | DONE — Gate E1, closes C-9 | `4246044` |
| **U17** E2E baseline | **PARTIAL — BLOCKED(env)** | `2443305` |

Units **U-DEFER-*** and the cut list: nothing was cut. Group E was marked cuttable in the plan and was
delivered anyway.

---

## 3. Red-evidence record (exit criterion 8)

Every string below was **re-executed against the certified tree on 2026-08-06** in a disposable
worktree and pasted from the run — not transcribed from a unit report. That matters: the criterion
exists because Phase 0 recorded self-reported claims that later had to be re-proved.

### 3.1 Route and engine units

**U4 / U1–U3 — auth bypass with an identity** (the §6.2.1 corrected form; deleting the guard outright
crashes on `user.id` before it can answer, which is why the row was corrected). **Scoped to one route
file — `src/app/api/stacks/route.ts` — so this is an excerpt, not the whole programme's output**; the
same mutation applied at the shared helper would redden a large fraction of the 23 route test files.
Labelled per closeout finding **P1-5**, which caught it presented as if it were a full run:
```
× GET /api/stacks > returns 401 when unauthenticated
  → expected 200 to be 401
× POST /api/stacks > returns 401 when unauthenticated
  → expected 201 to be 401
```

**U7 — `toCheckin` maps `created_at` → `updated_at`:**
```
× toCheckin > maps every field, with checkin_date landing on `date`
  → expected { id: 'chk-1', userId: 'usr-1', …(8) } to deeply equal { …(8) }
    - "createdAt": "2026-01-01T00:00:00Z",
```

**U9 — widen `.positive()` to `.min(0)`:**
```
× stackItemInputSchema — the dose boundary > rejects dose = 0
  → expected true to be false
```
*(§6.2 predicted `expected success to be false`; the actual assertion reads `expected true to be false`.
The mutation is caught; the predicted string was approximate. Recorded rather than reconciled.)*

**U12 — delete a context field from the `evaluateStack` call** — matches §6.2's prediction verbatim:
```
× runEvaluation — 7/7 context-field reachability (U12) > context field "labMarkers" reaches an observable output
  → context field "labMarkers" did not reach an observable output.
× … > covers every field the production caller passes to evaluateStack
  → expected [ Array(6) ] to deeply equal [ 'checkins', 'items', …(5) ]
```

**U19 — defeat the item↔stack membership check** (`return true`):
```
× PUT /api/stacks/:id/items/:itemId > checks membership BEFORE parsing the body (U19)
  → expected 400 to be 404
× PUT … > 404s — writing nothing — for an item that is NOT in the verified stack (U19)
  → expected 200 to be 404
× DELETE … > 404s — deleting nothing — for an item that is NOT in the verified stack (U19)
  → expected 200 to be 404
× DELETE … > reports NOT_FOUND identically for a foreign stack and a foreign item
  → expected 404 to be 200
```
The last line is the one that matters — but it pins **less than its title suggests**, and the closeout
review caught the overstatement. What is actually asserted is that both answer the same **status** and the
same **`NOT_FOUND` code**, so neither carries an existence oracle there; a 403 would have confirmed the
item exists. The human-readable `error.message` still differs — `notFound("Stack")` yields
`Stack not found.` and `notFound("Item")` yields `Item not found.` — and that field is **not** pinned.
The residual disclosure is small (learning "the item isn't in it" implies the stack *is* yours, which is
your own data), but the claim was stronger than the guard. Recorded as **FU-28**; the fix is one message
for both plus a pin on it.

**U20 — remove `reportInternalError(rollbackErr, "ROLLBACK_FAILED")`:**
```
× executeBatch — all-or-nothing rollback > reports every failed rollback step under ROLLBACK_FAILED
  → expected "spy" to be called 2 times, but got 0 times
```

**U21 — bypass the conversation ownership check:**
```
× GET /api/advisor/conversations/:id > returns 404 for a conversation the caller does not own
  → expected 200 to be 404
× … > checks ownership with the CALLER's id, not the path id alone
  → expected "spy" to be called with arguments: [ {}, 'u1', 'c1' ]
× … > does not fail open when the ownership check itself throws
  → expected 200 to be 500
```

### 3.2 Architecture guards

**U13 — `HARNESS_GAP`**, against a `git add -N`-staged `src/components/Widget.test.tsx` containing
`expect(1).toBe(2)` — a **failing** test that would never have run:
```
→ HARNESS_GAP: these files are tracked but not matched by vitest include;
  they would never run. This file skips them as tests while vitest skips them
  as uncollected, so they are governed by nothing and assert nothing:
    src/components/Widget.test.tsx
```
**U13 — N1 anti-rot**, breaking the `include` parser so it reads nothing:
```
→ could not read `include` from vitest.config.ts: expected 0 to be greater than 0
```

**U14 — all five, re-executed:**
```
M1 rename a bound test title (B4b: -> B4zz:)
   → DOC_TRUTH: §4 claims a rule is enforced by a test that does not exist.
     This is the exact failure the guard exists for: the document promises
     enforcement a reader will not re-verify:  B4b

M2 flip rule 7 "Not enforced" -> "**Enforced**"
   → DOC_TRUTH: §4 marks a rule Enforced without naming what enforces it.
     Name the test file and its rule ids, or mark the row Not enforced. A bare
     "Enforced" is a promise no reader can check and no guard can bind:  rule 7

M3 CI trigger branches ["**"] -> [main]
   → DOC_TRUTH: §5 says CI runs on EVERY branch push, but ci.yml's push trigger is
     not `branches: ["**"]`.

M4 revert §4 rule 5 to "Not enforced" while DOMAIN_IS_PURE exists
   → DOC_TRUTH: §4 understates enforcement — a guard now exists for a rule the
     table still calls unenforced.  rule 5: §4 says not enforced, but DOMAIN_IS_PURE: exists

M5 (FU-23 rider) undeclared 6th CI step
   → DOC_TRUTH: §5's declared CI steps and ci.yml's `run:` steps have diverged.
       §5 declares: npm ci → npm run typecheck → npm test → npm run test:coverage → npm run build
       ci.yml runs: … → npm run build → npm run lint
```
**M2 originally SURVIVED.** Rule 7's row named no enforcer, so flipping it bound nothing. Per §6.2.2 it
was recorded as a finding and answered with a *new rule* — every row calling itself Enforced must name
an enforcer. The text above is that new rule firing.

**U16 — all six:**
```
M16-1 untag a gated describe
      → LIVE_TAGGING: this block is gated on E2E_LIVE but its title carries no
        "[LIVE]" tag …  tests/e2e/mvp-core-loop-e2e.spec.ts:7  describe "L3: core loop"
M16-2 untag the TEST-level gate
      → … medication-interactions.spec.ts:34  test "the Medications profile field offers autocomplete suggestions"
M16-3 over-tag the ungated parent describe
      → LIVE_TAGGING: this block carries "[LIVE]" but is not gated on E2E_LIVE — it
        runs with no credentials.
M16-4 git add -N a new gated spec:  unstaged → 10 passed (FALSE GREEN) · staged → red
N16-1 break the gate detector      → 8 of 10 red
N16-2 revert the body-brace fix    → 4 red, including shape 2
```

**U18 — `DOMAIN_IS_PURE`:**
```
M1 @/lib/db in a true engine → src/lib/stack-evaluator/rules.ts:3  [DOMAIN_IS_PURE]
                                pure engine directories may not reach persistence (CLAUDE.md §4.5)
M2 delete src/lib/auth's reason → src/lib/auth exemption reason is too thin
M3 drop an allowlist entry      → four DOMAIN_IS_PURE violations at identity/context.ts:6–9
M4a allowlist a pure file       → src/lib/safety/index.ts — allowlisted but no longer violates
M4b allowlist a missing file    → src/lib/gone/removed.ts — allowlisted but does not exist
```

**U8 — the nullability half, both directions.** Criterion 3 calls this half "built, not cut" and Gate B1
says "plus nullability both ways", but neither recorded a string — the closeout Check flagged that as
**P1-4**, since a summary phrase is exactly what criterion 8 forbids. Re-executed at closeout, both
directions red with distinct messages:
```
D1  drop `not null` from checkins.taken in 0006_checkins.sql
    → SCHEMA_DRIFT: nullability disagrees between the migration and the row type.
      The second direction is the dangerous one — the compiler will not ask for a
      null check the database can still deliver:
        CheckinRow.taken: type says non-null, checkins.taken is nullable
          — an unhandled null reaches the domain

D2  make CheckinRow.taken `string[] | null` in src/lib/db/types.ts
    → …same header…
        CheckinRow.taken: type says nullable, checkins.taken is NOT NULL
          — dead null-handling downstream
```

**U5, U6, U8, U10, U11, U15** — remaining reds recorded in the plan at Gates A2, B1, C1/C2 and the criterion-5
annotation, and not repeated here. Notable among them: **U8's M1 produced both predicted strings from a
single mutation** (`column has no field` and `field has no column`), and **U11's Gate C2 was proven in
both directions** — red with the planted leak, green with the same leak once the inventory extension was
reverted, which is what proves the extension is doing the work rather than something else.

### 3.3 Surviving mutations — recorded, not fixed

| # | Mutation | Why it survived |
|---|---|---|
| FU-21 | U13's branchy `__probe` in an engine dir | `src/lib/safety` fell only to **96.11 %** against its 88 floor; **34 more** uncovered statements were needed. The direct cost of D-2's anti-flake margin, chosen deliberately. **Sharpened at closeout — see below.** |

**The coverage gate does fire — proven at closeout, and it had never been shown.** Both mutations above
survived, so nothing in `docs/` demonstrated that Phase 1's coverage gate had ever failed a build while
criterion 6 was ticked on "enforced by a CI step". The closeout Check chose a third mutation and I
re-ran it: deleting `src/lib/lab-trends/lab-trends.test.ts` gives
```
npx vitest run              → Tests  849 passed (849)          # GREEN
npx vitest run --coverage   → lib/lab-trends | 93.02 | 65 | 100 | 93.02
  ERROR: Coverage for branches (65%) does not meet "src/lib/lab-trends/**" threshold (71%)
                            → exit code 1                       # RED
```
Two things worth keeping. First, `npm test` stayed green while `npm run test:coverage` went red — the
two-distinguishable-failure-modes argument in `ci.yml`'s comment, demonstrated rather than asserted.
Second, and against expectation: the **`lines`** floor would have survived (95.34 % → 93.02 %, floor 85).
It was the **`branches`** floor that caught it. So the floors doing real work are the branch floors —
exactly the ones D-2 forbids on `protocol-builder` and keeps 10 pp of slack on everywhere else. FU-21's
trade-off is therefore sharper than it was written: the anti-flake margin is spent on the most sensitive
instrument in the set.
| FU-22 | Delete all 40 of U9's validation tests | The floor did not fire: `src/lib/validation` fell **97.96 % → 90.36 %**, still clear of its 87 floor. `schemas.ts` itself fell 100 % → **85.14 %**, i.e. **85 % of it is executed with U9 deleted** — by route tests, 10 of the 23 route files importing it directly and calling `.parse()`. So U9 added mostly *assertions*, not coverage. **The originally-registered figure for this row was "~0.01 pp" and it was wrong by three orders of magnitude**; re-measured at closeout and corrected here and in plan §12. The conclusion is unchanged and the correction strengthens it: a 7.6 pp drop in a directory can pass a floor set 10 pp below measured, which is exactly the D-2 trade-off FU-21 describes. |
| U14 M2 | Flip an unenforced row to Enforced | Rule 7 named no enforcer. **Closed** by a new rule (§3.2 above). |

---

## 4. Guard inventory

Seven executable architecture specs, counts measured 2026-08-06:

| Guard | Tests | Binds |
|---|---:|---|
| `boundaries.test.ts` | **36** | layer rules B1–B5, tree partition, `DOMAIN_IS_PURE`, `HARNESS_GAP` |
| `error-disclosure.test.ts` | **30** | no internal error text crosses the API boundary |
| `schema-type-drift.test.ts` | **23** | 12 migrations ↔ 12 row types, total both ways |
| `doc-truth.test.ts` | **21** | `CLAUDE.md` §4's table and §5's CI claim |
| `rls-coverage.test.ts` | **14** | every `create table` has RLS + a policy |
| `auth-coverage.test.ts` | **13** | every route handler calls `getUser()` before any I/O |
| `e2e-live-tagging.test.ts` | **11** | `E2E_LIVE` gating ↔ `[LIVE]` tags, both ways |

**Six of the seven** derive their inventory from `git ls-files --cached`, so a verdict is a property of
the repository rather than of one working tree. `doc-truth.test.ts` is the exception: it reads two fixed
documents (`CLAUDE.md`, `ci.yml`) from the working tree via `fs.readFileSync`, so its verdict tracks the
tree rather than the index — visible in §3.2, where U14's M2 red is produced by an *unstaged* edit.

---

## 5. The two deliberate behaviour changes

Everything else in this phase is behaviour-preserving. These two are not, and both were pre-declared:

1. **U19** (`3417cfb`) — `PUT`/`DELETE /api/stacks/:id/items/:itemId` now answer **404** when the item is
   not in the verified stack, and answer it **before parsing the body**. A foreign stack and a foreign
   item are reported identically.
2. **U21** (`882d53e`) — `GET /api/advisor/conversations/:id` now answers **404** for a conversation the
   caller does not own, replacing an empty **200**. The route previously passed the path id straight to
   `getMessages` and relied on RLS.

**U20 is not a third.** It adds a log line; all 24 U10 pins and all 49 advisor route pins were re-run
**unedited** afterwards, so the response contract is proven untouched rather than asserted.

---

## 6. U17 — PARTIAL, BLOCKED(env)

Full record: `docs/05-qa/phase-1-live-e2e-baseline.md`.

**Non-live baseline, met in full:** 59 passed / 30 skipped / **0 failed**, 89 tests in 23 files, at
`4246044`, `2026-08-05T18:02:16Z`–`18:02:40Z`, against a **production build** — the first time that is
true in this repository. Every skip is `[LIVE]`-tagged.

**No live run was performed. No live figure is recorded, and none was simulated.** Seven owner-only
items block it:

1. `NEXT_PUBLIC_SUPABASE_URL` 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` 3. `SUPABASE_SERVICE_ROLE_KEY`
4. `API_ANTHROPIC_KEY` 5. `SEED_DEMO_EMAIL` / `SEED_DEMO_PASSWORD` 6. migrations `0003`–`0007` applied to
that project 7. a seeded demo user (`npm run db:seed`)

*(Names only. No value appears in any document produced by this phase.)*

**The `fetch failed` artifact (review finding T-14) is resolved.** Login is a **server action**, so the
string is Node's undici text, not the browser's. Both modes were reproduced from source with no
credentials: unset env yields `Supabase is not configured`; env-set-but-host-unreachable yields
`fetch failed` exactly. The 2026-07-30 artifact therefore proves the Supabase env **was** configured and
the host was unreachable — never an Anthropic-key problem. **T-14 upheld, and its severity understated:**
the Anthropic key gates the advisor specs, while the login helper gates all 30 live tests.

The artifact itself is gone from disk and was never tracked in git. **This phase's own verification runs
may be what destroyed it** — Playwright clears `test-results/` on every run — and that cannot be ruled
out. Recorded as **FU-24** with the rule that would have preserved it.

---

## 7. Exit criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Every route file has ≥1 test asserting 401, happy path, and 400 where it validates input; non-validating files enumerated | **MET** — 23 route files, 23 route test files; the 9 exempt files enumerated in plan §10.1 |
| 2 | `mappers.ts` ≥ 90 % stmts · `execute.ts` ≥ 80 % · `validation/schemas.ts` ≥ 80 % | **MET** — re-measured 2026-08-06: **100 / 100 / 100** statements. It was never re-measured after the units landed; it has been satisfiable for some time. |
| 3 | Schema↔type drift check shown red against a renamed column | **MET** (U8) |
| 4 | Reachability guard covers 7/7 `evaluateStack` context fields | **MET** (U12) |
| 5 | Auth- and RLS-coverage guards shown red against a `git add -N`-staged non-compliant file (§4.2) | **MET** — both halves, both ways |
| 6 | Coverage thresholds for every pure engine dir, enforced by a CI step; no `branches` threshold within 10 pp of measured (D-2) | **MET** (U13) — 14 directories, margin 500× the observed jitter |
| 7 | `[LIVE]` on every `E2E_LIVE`-gated describe | **MET** (U16) — 17/17 files, 18 blocks; the criterion's implicit block count was off by one and the guard is right |
| 8 | Every guard added in this phase has its red output recorded in `docs/` | **MET — by §3 of this report** |
| 9 | A dated live-E2E baseline exists | **PARTIAL** — non-live half met in full; live half BLOCKED(env), §6 |
| 10 | `DOMAIN_IS_PURE` enforced, with named exemptions carrying written reasons | **MET** (U18) |
| 11 | `tsc` clean · `vitest run` green · `next build` succeeds · CI green on the integration commit | **MET** — CI run [`31033669440`](https://github.com/benhwangisthebest/supplement-stack-intelligence/actions/runs/31033669440) on `2443305`, `main`: 859/73, `Compiled successfully` |

**10 of 11 met; #9 PARTIAL and blocked on credentials.**

---

## 8. Follow-up register — final state

| # | From | Status |
|---|---|---|
| FU-1 … FU-11 | U4/U5/U6/U10/U11/U19 | as recorded in plan §12, which is authoritative for provenance |
| FU-12 … FU-19 | §10.1/U7/U9/U12 | as recorded in plan §12 — **including FU-16** (11 of 12 `src/lib/db` modules unit-untested, 15.65 % statements, exercised through routes only) |
| FU-20 | U8 | **Open, UNOWNED** — 4 of 12 row types live outside `src/lib/db/types.ts`; a placement question, not a coverage gap |
| FU-21 | U13 | **Open, inherent** — coverage floors catch layer-scale regressions only; the cost of D-2 |
| FU-22 | U13 | **Deferred, a caution** — coverage ≠ verification |
| FU-23 | U13 | **CLOSED** by the rider (`3108f55`) |
| **FU-24** | U17 | **Open, process** — a review cited an untracked artifact; it is now gone. Rule: copy cited artifacts into `docs/` in the same commit. |
| **FU-25** | U16 | **Open, UNOWNED — blocks CI E2E.** Per-worker user isolation is still missing; U16 serialised live runs instead. |
| **FU-26** | U17 | **Open, small** — a fresh clone cannot run E2E (unpinned browser); presents as 36 specs failing at once. |
| **FU-27** | closeout | **Open — needs a product decision.** The shipped nav renders **four** top-level items for signed-in users; §1 and `product-direction.md` both say three. The rule was **not** relaxed to match the code. |
| **FU-28** | closeout | **Open, small.** U19's "reported identically" claim was stronger than its guard — `error.message` differs between a foreign stack and a foreign item and is unpinned. |

---

## 9. Deferred to Phase 2

Named here so nothing is dropped silently:

- **F5** — surface the correlation ID in the UI (observability; Phase 1 excluded it explicitly).
- **F3** — typed error class for `NOT_CONFIGURED`; sequenced after U1–U4's envelope pins, which now exist.
- **Slug policy manifest** — reference-ID append-only contract (`CLAUDE.md` §2.4 rule 16) has no
  executable manifest.
- **FU-16** — unit tests for the 11 untested `src/lib/db` modules.
- **FU-20** — row-type placement refactor (needs caller enumeration per §9.4).
- **FU-21 / FU-22** — characterise what the coverage floors actually catch, rather than tightening them.
- **FU-25** — per-worker E2E user isolation, the prerequisite for a CI E2E job.
- **§4 rules 7, 8, 9** — client-components-take-props, trust-boundaries-in-testable-modules, and
  budget+rate-limit on paid APIs remain **unenforced**, correctly marked so in `CLAUDE.md` §4 and now
  bound by `DOC_TRUTH` so they cannot quietly be relabelled.
