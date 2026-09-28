# p4-u10-confirm-surface — PDCA cycle artifact for Phase 4 U10, landing (a)

> **Register:** `docs/01-plan/phase-4-product-completion.plan.md` §4, U10 row. **Mode:** SUPERVISED, deterministic.
> **Anchor:** HEAD `29b9e65`. **Rulings in force:** D-14 (a), counts only, so U34's *"ONLY NUMBERS CROSS THE
> BOUNDARY"* (`src/services/advisor-actions.ts:145-150`) stands. N-69: `recordBatch` is not touched.
> §2.1 rule 6: advisory copy comes from `src/lib/safety`.
> **Authority:** the owner's standing approval for U10 (2026-09-28), verbatim in the phase plan §6. It does not cover
> the two strings, the aborted-turn message, or files outside *May touch*. This artifact is subordinate to the phase
> plan and carries no approval status of its own (CLAUDE.md §9).
> **bkit:** registered as `p4-u10-confirm-surface` before any U10 work. U9 was registered retroactively at the
> same time as `p4-u9-export-labels`, at its completed state.

## 1. Problem (the row's three reds)

| # | Defect at HEAD | Carried item |
|---|---|---|
| 1 | `executeProposal`'s `attach_product` reads `product_id` and then writes it unconditionally (`execute.ts:88-91` at HEAD). Two confirms can both read before either writes. The second persists an inverse restoring a value that was not current when it wrote | FU-1 |
| 2 | The confirm route returns `PARTIALLY_APPLIED` with `details: { reverted, unreverted }`. `ActionProposalCard` renders only `error.message`, the generic 500 text, so the counts are dropped | FU-34, N-71 (product half) |
| 3 | On abort the route returns with no final event (`src/app/api/advisor/route.ts:281-285`). The pending bubble stays blank. A `done` carrying `aborted` is also unhandled | N-15 |

## 2. Approach

1. **Compare-and-set in the UPDATE** (`src/lib/db/stack-item-repo.ts:100-131`). `setItemProduct(…, expect)` now
   takes `{ current }` or the named `"unconditional"`, so no caller gets the old write by omission. `{ current }` adds
   `.eq("product_id", v)` (or `.is("product_id", null)`, since `= NULL` matches no row) to the WHERE clause. The
   function returns `true` only if `.select("id")` returns a row. No migration and no RPC change.
2. **Forward attach** (`execute.ts:95`) expects the value it read. If the write does not apply, it throws
   `StaleProductError` (`:200`), so `executeBatch` rolls back and counts. It never reports success.
3. **Batch rollback** (`revertOne`, `execute.ts:213-223`, called from `revertAll` `:169`). An attach is reverted only
   if the item still holds the product this batch set. Otherwise the throw is counted as `unreverted`, which feeds the
   existing counts. `confirmAndApply`'s audit-failure rollback calls `revertAll`, so it gets this too, with no edit to
   the service.
4. **Undo replay** (`executeIntent`, `execute.ts:311`) passes `"unconditional"` explicitly. The stored inverse
   carries no expected value, so this is N-101 (§5), owned by the undo route.
5. **PARTIALLY_APPLIED** (`ActionProposalCard.tsx:84`, `outcome-copy.ts`). One sentence from a template with
   `{reverted}` and `{unreverted}`. Only those two fields are read, and only as non-negative integers. Anything else
   in `details` cannot reach the screen.
6. **Aborted** (`AdvisorPanel.tsx:141-147`, `:287`, `:309`, `:324`). A `done` with `status: "aborted"`, and a
   stream that closes with no `done` or `error` event, replace the pending bubble with the aborted message. The
   second case is what the route sends today.
7. **Copy path (rule 7).** Both panels are `"use client"`, so neither may import `@/lib/safety`
   (CLIENT_TAKES_PROPS). `advisorOutcomeCopy` (`src/lib/safety/index.ts:594-600`) holds plain strings. The server
   page passes it as a prop, because a function cannot cross that boundary. That needs
   `src/app/advisor/page.tsx`, which the owner added to *May touch* at AC-4 (N-103, the same case as N-98).

## 3. Files

| File | Change | In *May touch*? |
|---|---|---|
| `src/lib/db/stack-item-repo.ts` + test | `setItemProduct` only: `ProductExpectation`, WHERE clause, boolean. 4 new tests; 1 existing test passes an expectation | yes |
| `src/lib/advisor/actions/execute.ts` + test | forward CAS, `revertOne`, undo explicit. 3 new tests; 4 existing mocks return `true` / assert the 4th argument | yes |
| `src/components/advisor/{AdvisorPanel,ActionProposalCard}.tsx`, `outcome-copy.ts` (new) + tests | props, abort handling, partial sentence. 6 new panel tests; 1 prop added to the card test's render | yes |
| `src/lib/safety/index.ts` + `safety.test.ts` | `advisorOutcomeCopy`; both strings added to the banned-language sweep | yes, approved at AC-4 |
| `src/app/advisor/page.tsx` | passes `outcomeCopy={advisorOutcomeCopy}` | widened by the owner at AC-4 (N-103) |
| this artifact, the phase plan, bkit state | records | yes |

Not touched: `recordBatch`, `src/services/advisor-actions.ts`, `supabase/migrations/`, `src/types/**`, the undo
route, any allowlist in `src/architecture/*.test.ts`.

## 4. Red evidence

| Id | Run | Result |
|---|---|---|
| R1 (AC-1, the interleaving) | HEAD code, new `execute.test.ts` + `stack-item-repo.test.ts` | 6 fail. Interleaving: both confirms read `null`. The first writes `p1`, and the second then writes `p2` unconditionally. The second **fulfils** with inverse `{ productId: null }`, a before-value that was not current when it wrote (`p1` was): `expected 'fulfilled' to be 'rejected'`. Rollback case: `expected { reverted: 1, unreverted: 0 } to deeply equal { reverted: 0, unreverted: 1 }`. Repo: no `product_id` filter; returns `undefined` |
| R2 (AC-2, AC-3) | HEAD UI, new `AdvisorPanel.test.tsx` cases | 4 fail. Both PARTIALLY_APPLIED cases: `Unable to find … /not all of it could be undone/` (the shown text; the matcher follows the approved text since AC-4). Both aborted cases: `Unable to find … The advisor stopped before finishing this answer.` |
| M1 | repo: expected-value branch disabled | 2 repo tests red (equality filter, IS NULL filter) |
| M2 | forward attach passes `"unconditional"` | interleaving + expectation + stateful inverse tests red (3) |
| M3 | forward attach ignores a not-applied result | interleaving test red |
| M4 | rollback skips the CAS branch | rollback-count test red |
| M5 | `if (!settled) h.onAborted()` removed | stream-closes case red |
| M6 | `status === "aborted"` branch disabled | done-aborted case red |
| M7 | card drops `partiallyAppliedText` | both PARTIALLY_APPLIED cases red |
| M8 | fill appends `JSON.stringify(details)` | both PARTIALLY_APPLIED cases red (SENTINEL and exact text) |

M1–M8 ran on a scratch copy (R-3). Each file was restored by copying back its backup, and `diff -r src <scratch>/src`
was empty afterwards. The new file is under `git add -N`, so it was never restored by checkout (§5 rule 11).

## 5. Carried items and new findings

| Id | Disposition |
|---|---|
| **FU-1** | **CLOSED.** Compare-and-set in the UPDATE (`stack-item-repo.ts:122-128`), expected = the value read (`execute.ts:95`). A non-applied write throws and is rolled back and counted. R1 + M1–M3 |
| **FU-34** | **CLOSED.** PARTIALLY_APPLIED renders one sentence with both counts (`ActionProposalCard.tsx:84`, `outcome-copy.ts`). R2 + M7/M8 |
| **N-71 (product half)** | **CLOSED.** A correct `PARTIALLY_APPLIED` no longer stops at the log: the user sees the counts. The API half was closed by U34 |
| **N-15** | **CLOSED.** An `aborted` done and a stream with no final event both render `advisorOutcomeCopy.aborted` (`AdvisorPanel.tsx:141-147`, `:324`). R2 + M5/M6 |
| **N-101** *(new)* | Undo's replay of `set_item_product` is last-writer-wins (`execute.ts:311`). The stored inverse carries no expected value, so undo restores the prior product even if the item's product changed after the confirm. The forward product is in the audit row's `payload`, so a fix belongs in `src/app/api/advisor/actions/[id]/undo/route.ts`, which is outside U10. **OPEN → U10 landing (b)** (owner, 2026-09-28) |
| **N-102** *(new)* | The same class as FU-1 for `edit_item` / `remove_item`. Their inverse is built from `priorItem`, which `revalidate` loads from context before the write (`advisor-actions.ts:99-107`). `updateItem` / `deleteItem` then write unconditionally. An interleaved edit can persist an inverse whose before-state was not current. Outside U10's row (product only). **OPEN → U10 landing (b)** (owner, 2026-09-28) |
| **N-103** *(new)* | The brief's *May touch* omitted the prop path, as N-98 did for U6 (c). `AdvisorPanel` is `"use client"`, so the copy reaches it only as a prop from `src/app/advisor/page.tsx`. **CLOSED at AC-4 (2026-09-28):** the owner widened *May touch* to that file for the `outcomeCopy` prop |

| **N-104** *(new, review)* | A `remove_item` inverse never carries `product_id` (`apply.ts:136` → `itemToInput` → `addItem`), so undoing a remove drops the attached product. Predates U10. **OPEN → U10 landing (b)** (owner, 2026-09-28) |
| **FU-77** *(new, review)* | A stale compare-and-set surfaces as the generic 500 `ACTION_ERROR`, not the 409 `STALE_PROPOSAL`. The mapping needs `advisor-actions.ts` (out of U10 under D-14 (a)). UX only. **OPEN → U10 landing (b)** (owner, 2026-09-28) |

## 6. Stop at AC-4: the two strings (shown, then approved 2026-09-28)

`src/lib/safety/index.ts` → `advisorOutcomeCopy`:

- **partiallyApplied, as shown:** ~~"This didn't finish, and not all of it could be undone (undone: {reverted}, not undone: {unreverted}), so please check your stack in Stack Lab before trying again."~~
- **partiallyApplied, as approved (owner amendment):** "This didn't finish, and some changes couldn't be undone ({reverted} undone, {unreverted} not undone). Please check your stack in Stack Lab before trying again."
- **aborted (approved as shown):** "The advisor stopped before finishing this answer. You can send your question again."

**Why each claim is computed (§2.2 rule 7):** `PARTIALLY_APPLIED` is returned only when `unreverted > 0`
(`advisor-actions.ts` `batchFailure`), so *"some changes couldn't be undone"* is the count. *"didn't finish"* is the
failed request. The aborted string makes no claim about what was saved: a stream that dropped after the route
persisted would make *"nothing was saved"* false, so the string does not say it. Neither string blames the user or
diagnoses anything, and both say what to do next.

## 7. Verification

- AC-5: rule-8 component tests for `AdvisorPanel` and `ActionProposalCard` are green. No advisor-action route file
  is touched, so no new route tests are owed. `npx vitest run src/architecture`: 30 files green, no new spec file.
- AC-6 review (fresh subagent, scratch copy, 2026-09-28): **PASS WITH ADVISORIES**, no BLOCKING finding. It ran 49 files and 752 tests, plus `tsc`, and its own nine mutations went red. **Asked whether any path still records an inverse from a stale read:** the forward attach, the batch rollback and the audit-failure rollback are closed, because `setItemProduct` is the only writer of `product_id`. Still open: undo's replay (N-101) and `edit_item`/`remove_item` (N-102), both outside U10. Also raised: N-104 and FU-77. It judged the held `page.tsx` edit *"necessary and correct"* and recommended approving it. Copy nit: the counts do not say that they count actions.
- AC-7 (G on the staged tree, clean worktree): runs after the owner's approval.
