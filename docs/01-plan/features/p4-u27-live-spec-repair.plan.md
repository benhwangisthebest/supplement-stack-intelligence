# P4 · U27 — Live E2E spec repair, from the owner's first live baseline

> Cycle artifact, subordinate to `docs/01-plan/phase-4-product-completion.plan.md` (U27 row; N-124,
> N-125, N-126). It carries no approval status of its own. **Mode: SUPERVISED** under a standing approval.
> Opened 2026-10-08 at anchor `e6a0c13`, in worktree `../ssi-u27`, branch `test/p4-u27`. Registered with
> bkit at open (RC-4). Commit and CI ids are in bkit and the unit report, not here, because this file is
> inside the commit they are measured on.
>
> **Nothing under `src/` changed, and no package file or `CLAUDE.md` line changed.** No live call was made:
> every claim marked *unverified until the owner's live re-run* is exactly that.

## 1. Scope and input

The owner ran `E2E_LIVE=1` at `e6a0c13` on 2026-10-08: **92 passed, 8 failed, 0 skipped** (3.9 min). The
`[LIVE]` specs had not run since the Phase 1 exception. The brief split the 8 failures:

- **Group A (5): test drift.** Fix the test, not the app. Each fix must prove the same user-visible claim
  or a stronger one, through real routes and selectors. Deleting a test, weakening an assertion, or adding
  `skip`/`fixme` is a stop.
- **Group B (3): advisor behaviour.** Not fixed. Registered as N-124…N-126 with queue entries Q-29…Q-31.

*May touch:* the five group-A specs, `tests/e2e/helpers.ts` (a shared step only), the phase plan, the
decision queue and this file. The owner's error-context snapshots (`test-results/`, untracked, on the
owner's machine) were read for every failure. The brief's diagnosis was checked against the code and
the snapshots rather than taken as given. It held for four specs, and §2.2 corrects the fifth.

## 2. Group A — cause, fix, before → after

### 2.1 `advisor-actions.spec.ts:51` — confirm an `add_item`, then undo it

**Cause, confirmed.** The snapshot's error is `SyntaxError: Unexpected end of JSON input` at
`:82`, a `GET /api/stacks/{id}/items`. `src/app/api/stacks/[id]/items/route.ts` exports **`POST` only**,
and has since v1 (`910d773`), so the GET has no handler and the body is empty. The stack's items are
served by `GET /api/stacks/[id]` (`route.ts:10`) through `getStackDetail`, which returns
`{ stack, items, flags }` (`src/services/evaluation.ts:64-76`).

**Fix.** A local `stackItems(page, id)` reads `data.items` from `GET /api/stacks/:id` and requires a 2xx.

- **Before:** proved that confirm returns 201 with an action id. It then crashed, so it never checked
  that the edited dose was written, or the undo and re-undo.
- **After:** confirm 201 → a magnesium item at the **edited** 350 mg is in the stack → undo 200
  `undone: true` → **magnesium is gone from the stack** (new) → re-undo 409 `ALREADY_UNDONE`. The claim is
  stronger: undo is shown to remove the row, not only to answer `undone`.

### 2.2 `advisor-experience.spec.ts:38` — a 2-action batch, then one undo reverses both

**Cause: the brief's hypothesis does not hold.** The brief suspected the body predated U10 (c)'s
compare-and-set or U16's validation. Neither applies. The body passes `confirmSchema`
(`src/lib/advisor/actions/schema.ts:98-115`). The 400 comes from re-validation in the service:
`revalidate` parses the `edit_item` payload with `editItemPayloadSchema` (`src/services/advisor-actions.ts`,
`case "edit_item"`). That schema refines *"At least one field must change"* (`schema.ts:29-44`). The spec
sent `payload: { stackItemId }` with the dose only in `edits`, and the outer catch turns the `ZodError` into
`validationError` (`advisor-actions.ts`, last lines). The refine dates from v7 (`1e4e6fa`, 2026-06-30). The
spec dates from v8 (`26034f6`, 2026-07-01), so **this spec has failed this way since it was written**.

**The 400 response body**, reproduced offline: a throwaway probe used `route.test.ts`'s own mocks, posted
the spec's exact body to the real route and service, and was then deleted (RC-2; `git status` clean
afterwards):

```json
{"data":null,"error":{"code":"VALIDATION_ERROR","message":"Invalid input.","details":{"fieldErrors":{"dose":["At least one field must change"]}}}}
```

The probe's other case shows that with `payload: { stackItemId, dose: 3000 }` and `edits: { dose: 4000 }`
the same route returns 201, and the `edits` reaching `executeBatch` are `{ dose: 4000 }`. `editToInput`
applies `edits` over the payload (`src/lib/advisor/actions/apply.ts:56-70`). That probe mocks the database,
so the live 201 is *unverified until the owner's live re-run*. 4000 IU is the top of vitamin D's studied
range (`seed-supplements.ts`, `generalDose.max`), under `DOSE_CRIT_RATIO` 2.5, and neither item has a
drug interaction that could reach `SAFETY_BLOCK`.

**Second defect on the same path.** `:77` read items through the same `GET /api/stacks/{id}/items` as
§2.1, so the test would have failed there next. That read is fixed the same way.

**Fix.** The `edit_item` proposal carries the field it changes (`dose: 3000`), as a model proposal must.
Both members are checked after apply, and the test stack is deleted afterwards.

- **Before:** proved nothing past the 400. The batch and the grouped undo were never exercised.
- **After:** 201 with `batchId` and 2 results → **magnesium present and vitamin D at the card's 4000, not
  the proposal's 3000** (new: both members applied, and edits win) → one undo answers `count: 2` →
  magnesium gone and vitamin D back at 2000. Stronger.

### 2.3 `biomarker-intelligence.spec.ts:39` — a low vitamin D lab plus vitamin D in a stack

**Cause, confirmed.** After adding the marker, the spec went to `/stack-lab` and asserted the note there.
The snapshot shows that page: the stack list and the daily check-in, with no evaluation. The note renders
only in `StackWorkspace` after **Evaluate stack** (`/stack-lab/[id]`). No stack containing vitamin D was
opened or evaluated. Had the flag rendered, the regex `/relevant to your labs|below the reference range/`
would have matched both the flag's title and its explanation, a strict-mode error.

**Fix.** The marker save is awaited and must be 2xx. A new vitamin D stack is built and evaluated through
the UI (`buildAndEvaluateStack`, §3), and two single-element assertions follow. The flag's title is
*"Could be relevant to your labs"* (an `h4`, `FlagCard.tsx:20`). Its explanation contains
*"Your 25-OH Vitamin D is below the reference range"*, the copy `biomarkerRelevance` builds
(`src/lib/safety/index.ts`), and `src/lib/biomarkers/to-flags.ts:32` is the evaluator's only caller of it.
The trend flag's copy contains neither phrase. The stack is deleted in `finally`.

- **Before:** could not pass: no evaluation existed on the page it looked at.
- **After:** a low marker is saved, then evaluating a vitamin D stack shows the lab-relevance flag with
  its explanation. The claim is the same, now actually exercised, and pinned to one element per assertion.

### 2.4 `lab-timeline-actions.spec.ts:13` — CSV upload, review gate, commit

**Cause, confirmed.** `:42` expected a heading `/lab timeline/i`. There is none in `src/`. The section is
`<h3>Current markers & trends</h3>` (`src/app/profile/page.tsx:73`). The snapshot confirms it, and shows
the upload, review and commit had already succeeded.

**Fix.** That heading is static, so asserting it alone would prove nothing about the commit. Instead the
test now counts timeline points per biomarker from `GET /api/lab-trends` (`TrendSignal.points`)
**before** the upload. It approves one named row (`Approve 25-OH Vitamin D`) and awaits a 2xx from
`POST /api/lab-import/commit`. Then it requires exactly **one more** 25-OH Vitamin D point and **no new**
`Magnesium (serum)` point; the CSV's `Magnesium` row resolves to that marker through the alias
`magnesium`. Ferritin is not a curated biomarker, so it never reaches the timeline and is not asserted.
Last, the heading and the row button `View 25-OH Vitamin D history` (`LabTimeline.tsx:72`) must be
visible, showing `N readings` once N > 1. The demo account keeps its data across runs, so the claim is a
delta, not an absolute.

- **Before:** the gate assertions (disabled with nothing approved) were real. After commit it asserted a
  heading that does not exist.
- **After:** the same gate assertions, plus proof that **only the approved row was saved** and that the
  timeline shows it. Stronger.

### 2.5 `medication-interactions.spec.ts:48` — warfarin plus fish oil gives the escalation banner

**Cause, confirmed.** The same shape as §2.3: after saving warfarin, the spec asserted the banner on
`/stack-lab`, where the snapshot shows no evaluation. The banner copy exists (`StackWorkspace.tsx:179`).
It renders when a flag is critical and in an interaction category. `fish-oil--anticoagulant` is a
supplement–drug `warning` (`src/data/seed-interactions.ts:11-19`), which `mapSeverity` escalates to
`critical` (`src/lib/interactions/to-flags.ts:35-38`).

**Fix.** Two checks are added: the `Remove warfarin` chip must appear before saving, and *Saved* after.
The save button is named (`Save profile`) instead of `/save/i`. A fish oil stack is then built and
evaluated, and the banner asserted. In `finally` the stack is deleted and **warfarin is removed and the
profile saved again**, restoring the seeded `medications: []` (`src/lib/db/seed.ts:85`).

- **Before:** could not pass: no evaluation existed on the page it looked at.
- **After:** a saved warfarin entry plus an evaluated fish oil stack shows the clinician-escalation banner.
  The claim is the same, now actually exercised.

## 3. The shared step, and the shared account

`buildAndEvaluateStack(page, name, items)` in `tests/e2e/helpers.ts` drives the same UI steps as the
passing `mvp-core-loop-e2e.spec.ts`: placeholder `Sleep stack`, **Create**, the first combobox, `Dose`,
`Unit`, **Add**, **Evaluate stack**. It awaits each POST's own response and requires a 2xx, and requires
`Items (n)`. It returns the stack id.

**Why the new specs delete what they create.** The advisor treats the most recent current stack as active
(`pickActiveStack`, `src/lib/advisor/context-loader.ts:36-40`). A stack left by a spec therefore becomes
the advisor's context on the **next** live run. The owner's snapshot shows one such leftover,
*"v8 batch test"*. For the same reason, §2.5 restores the profile's medications.

**One effect predates this unit.** The pre-U27 medication spec saved warfarin and never removed it, and in
the owner's run it ran **after** the advisor specs. Unless the account has been reseeded since, the
demo profile now probably lists warfarin, and N-125's test (Q-30) will see a medication on the re-run.
`npm run db:seed` resets the profile (`medications: []`), labs and stacks.

## 4. Verification (no live calls)

| Check | Result |
|---|---|
| `npx tsc --noEmit` (includes `tests/`) | clean |
| `npm run lint` | 433 of 433 tracked files, 0 errors |
| `npx vitest run` | 2153/2153 across 152 files |
| `npm run test:coverage` | thresholds pass |
| `npx next build` · `npm run verify:bundle` | succeeds · OK, every route within 1 % |
| Non-live E2E (`npx playwright test`) | **70 passed / 30 skipped**, unchanged from the closeout gate |
| `E2E_LIVE=1 npx playwright test --list` on the five files | 17 tests collected, every `[LIVE]` title intact (`LIVE_TAGGING` green in vitest) |
| Routes and selectors | each traced to its source line in §2 and §3 |

**Unverified until the owner's live re-run:** every behaviour in §2 that needs Supabase or the model,
which is all five fixes past their first request.

**Expected re-run:** 97 passed, 3 failed (N-124…N-126), provided the demo account matches the seed's
assumptions. N-125's outcome may differ on the first re-run, for the reason in §3.

## 5. Group B — registered, not fixed

| Row | Spec | Queue |
|---|---|---|
| **N-124** | `advisor-actions-ui.spec.ts:12` — the model asked for confirmation in prose instead of calling the propose tool | Q-29 |
| **N-125** | `advisor-experience-actions.spec.ts:28` — *"Is creatine safe with my meds?"* abstained, with no Sources | Q-30 |
| **N-126** | `advisor-experience-actions.spec.ts:41` — the batch card, against `prompt.ts:21`'s one change per reply | Q-31 |

The observed replies are quoted in the register rows. The snapshots' conversation sidebars also list
earlier, owner-typed questions. Those are health data (CLAUDE.md §2.3 rule 15) and are **not** quoted
anywhere in this repository. All three rows carry to Phase 5 unless the owner rules otherwise.
