# p4-u10c-version-cas — PDCA cycle artifact for Phase 4 U10, landing (c)

> **Register:** `docs/01-plan/phase-4-product-completion.plan.md` §4, U10 row; N-104, N-105, N-106, N-107, FU-78.
> **Mode:** SUPERVISED, deterministic + one migration. **Anchor:** HEAD `9195437` (main CI `36499655078`: success).
> **Rulings in force:** Box 1 (verbatim in the phase plan §6, U10 rulings): FU-78 is a dated exception that expires
> when (c) lands, and (c) uses one additive migration, `stack_items.version integer not null default 0`. D-14 (a),
> counts only. N-69: `recordBatch` untouched. §2.3 rule 15. R-3: the reviewer works on a scratch copy.
> **Authority:** Box 1's standing approval (branch, commit, push the branch). It does **not** cover the migration file,
> the `src/types` diff, or the fast-forward of `main`, which waits until the owner has applied 0011 to the deployed
> database. This artifact is subordinate to the phase plan and carries no approval status of its own (CLAUDE.md §9).
> **bkit:** `p4-u10-confirm-surface`, `landing: "c"`.

## 1. Problem

| Item | Defect at HEAD |
|---|---|
| **FU-78 / N-106** | The (b) compare-and-set put the item's values in the WHERE clause (`whereItemHolds`), so `supplement_id`, `dose`, `unit`, `timing`, `frequency` (and `product_id` for an attach) travelled in the request URL, which the gateway logs. Free text was left out for that reason, so a concurrent change to it went undetected |
| **N-105** | Undo of edit, add and protocol, and the batch rollback of add and protocol, replayed unconditionally (`executeIntent`) |
| **N-107** | A second action on one item in a batch compared against the pre-batch read and always answered 409 |
| **N-104** | A remove's inverse re-added the item under a new id, without its product |

## 2. Approach

1. **Migration 0011** (§5) adds `version`. Nothing bumps it but the application, so every update sets
   `version = expected + 1` WHERE `id = …` AND `version = expected` (`writeAtVersion`, `stack-item-repo.ts:70`). Zero
   rows back means the item changed or went since `expected` was read. The only filters on `stack_items` anywhere
   are `id`, `stack_id` and `version`.
2. **Advisor writes** (`stack-item-repo.ts:135-196`): `updateItemAtVersion` (writes the four edit columns),
   `setItemProduct`, `deleteItemAtVersion`, `restoreItem`. The forward edit, remove and attach expect the version of
   the item `revalidate` read (`execute.ts:71-126`). The attach no longer re-reads the product: the version pins it.
3. **Inverses record what they expect** (`apply.ts:116-183`): an edit or attach inverse carries
   `expect: { version: <written>, restores: <read> }`; an add's carries the created version; a protocol's carries the
   items it created with their versions; a remove's carries `restore: { itemId, version, productId }`.
4. **One replay path** (`undoPass`, `execute.ts:275`) serves undo and rollback, so the two cannot disagree (U34).
   It writes each inverse only at its expected version. Inside one pass, an inverse that restored the state at
   version r and produced n lets a later inverse expecting r expect n, which is how a batch that acted twice on one
   item unwinds (N-107). A protocol's stack is deleted only if it holds exactly its created items at their created
   versions (N-108 is the residue). Rows without a version fail closed (N-109). `executeIntent` and `undoAction` are
   deleted; the undo route runs one pass per request (`[id]/undo/route.ts:75`).
5. **N-107 forward:** `executeBatch` hands a second action on an item the item as the first left it (`execute.ts:162`).
6. **N-104:** `restoreItem` re-inserts under the same id, at the version it was deleted at, with its product. A live
   item's versions only rise, so no reader can hold a later one, and a reader holding this one read exactly this
   state. A taken id answers false (23505); nothing is overwritten.
7. **Stack Lab's edit** (`updateItem`, `:96`) keeps last-writer-wins but reads the version and writes at it, retrying up
   to `STACK_LAB_ATTEMPTS` (3) times, so an advisor inverse built before it misses.

**Copy.** None new. Undo reuses the approved `partiallyApplied` sentence exactly as (b) does. `src/lib/safety` untouched.
**`recordBatch`:** untouched. The versions ride inside the `inverse` jsonb it already stores.

## 3. Files

The migration; `src/types/stack.ts`, `src/types/advisor-action.ts` (§5, approved); `src/lib/db/types.ts`
(`StackItemRow.version`, B1) and one fixture field in `src/lib/db/mappers.test.ts`, both by owner widening; `stack-item-repo.ts` + test;
`actions/apply.ts`, `execute.ts` + tests, new `version-cas.test.ts` and `__testing__/fake-stack-db.ts` (an in-memory
`stacks` + `stack_items` that applies filtered writes as Postgres does); the undo route + test; the phase plan; this
artifact. **Not touched:** `recordBatch`, `src/services/**` (no mapping change was needed), the Stack Lab routes
(their repo functions changed underneath them), `src/lib/safety`, allowlists, `package.json`, workflows, `CLAUDE.md`.

## 4. Writers of `stack_items` (AC-6)

| Writer | Path | Version | Test |
|---|---|---|---|
| Stack Lab add | `POST /api/stacks/:id/items` → `addItem` (`stack-item-repo.ts:51`) | new row, column default 0; never set by the insert | repo: *addItem never sets a version*; version-cas: *a Stack Lab add starts at version 0* |
| Stack Lab edit | `PUT …/items/:itemId` → `updateItem` (`:96`) | read, write at it, `+1`, retry ×3 | repo: `updateItem` ×4; version-cas: *a Stack Lab edit that loses a race re-reads and still lands* |
| Stack Lab remove | `DELETE …/items/:itemId` → `deleteItem` (`:115`) | row gone; any later compare-and-set misses | version-cas: *an advisor undo after a Stack Lab delete re-creates nothing* |
| Stack delete | `DELETE /api/stacks/:id` → `deleteStack` (`stack-repo.ts:78`) → cascade (`0001_init.sql:51`) | rows gone | none needed; file not touched |
| Advisor | `execute.ts` via the repo functions above | compare-and-set | `execute.test.ts`, `version-cas.test.ts` |
| Dev seed | `src/lib/db/seed.ts:96` (service role, dev only) | insert, default 0 | none needed; not touched |
| Account deletion | `delete_user_data`, `0010_delete_user_data.sql:111` | rows gone | none needed; not touched |

No writer outside *May touch* needed a change.

## 5. For approval (STOP): the migration and the `src/types` diff

`supabase/migrations/0011_stack_item_version.sql`, one statement, no policy change: RLS is per row, and
`own_stack_items` (`0001_init.sql:99-108`, `for all`, no column list) covers the new column like every other. The
`RLS_COVERAGE` spec stays green; migration coherence applies it on `postgres:16` in branch CI (D-15 (b): local `psql`
does not run on this machine).

`src/types`: `StackItem.version?: number`; `ItemVersionExpectation { version; restores? }`; on `WriteIntent`,
optional `restore` (`add_item`), `expect` (`update_item`, `delete_item`, `set_item_product`) and `expectItems`
(`delete_stack`). All optional, because stored rows predate them. Both are shown verbatim in the owner report.

## 6. Acceptance criteria and red evidence (HEAD `9195437`)

The behavioural tests in `version-cas.test.ts` run the real repos and executor against the fake table. Run at HEAD in
a scratch worktree, with a three-line shim mapping `undoPass` onto HEAD's `undoAction`: **16 red, 3 green** (the two
*nobody touched* controls and the version-0 insert).

| AC | Test (`version-cas.test.ts` unless named) | Red at HEAD |
|---|---|---|
| AC-2 FU-78, N-106 | every request filters on ids and versions only | `expected [ 'dose', 'frequency', 'id', …(5) ] to deeply equal [ 'id', 'stack_id', 'version' ]` |
| AC-2 | `stack-item-repo.test.ts`: every export classified; each write filters on `id`/`version` only, no sentinel value outside the body | new (derived from the module's exports) |
| AC-3 N-105 | undo of edit / add / protocol (item edited) / protocol (item added) after a Stack Lab write | `expected [ true ] to deeply equal [ false ]` ×4: the undo overwrote or deleted the user's write |
| AC-3 | rollback of add / protocol edited mid-batch | `expected { reverted: 1, unreverted: 0 } to deeply equal { reverted: 0, unreverted: 1 }` ×2 |
| AC-4 N-107 | two edits of one item; grouped undo of them; edit then remove | `StaleWriteError: stack item changed since it was read` ×3 |
| AC-4 | rollback of two edits of one item | `{ reverted: 1, unreverted: 0 }` vs `{ reverted: 2, unreverted: 0 }` |
| AC-5 N-104 | undo of a remove restores id, product, free text | `expected undefined to match object { stack_id: 's1', dose: 200, …(2) }`: re-added under a new id |
| AC-5 | rollback of attach then remove of one item | `{ reverted: 1, unreverted: 1 }` vs `{ reverted: 2, unreverted: 0 }` |
| AC-6 | Stack Lab edit losing a race; undo after a Stack Lab delete | version not moved; undo threw instead of answering false |

**Mutations** (working tree, each restored by file copy and `cmp`-checked; suites: `src/lib/advisor/actions`, the
repo test, the undo and confirm route tests, 185 tests): M1 drop the `version` filter → 9 red. M2 no `+1` → 13. M3
batch ignores the item the first action left → 7. M4 no chaining in `undoPass` → 3. M5 restore drops `product_id` → 3.
M6 protocol undo skips its pre-check → 4. M7 a versionless edit inverse replays → 1. M8 a `dose` filter added back
→ 21. M9 Stack Lab gives up after one miss → 2. M10 a remove's inverse carries no `restore` → 7. After the
review (A1, A2; 187 tests): M11 protocol undo drops its second `listItems` re-check → 1. M12 the undo route builds a
pass per row → 1. Both had survived the reviewer's mutations; the tests that catch them were added in this landing.

## 7. Carried items and new findings

| Id | Disposition |
|---|---|
| **N-104** | **CLOSED.** `apply.ts:152`, `restoreItem` (`stack-item-repo.ts:181`), `undoPass` `add_item`. AC-5 reds + M5/M10 |
| **N-105** | **CLOSED.** `undoPass` (`execute.ts:275`) for undo and `revertAll` (`:199`). AC-3 reds + M1/M2/M6/M7 |
| **N-106** | **CLOSED.** The version covers every column, free text included, with no value filter and no RPC |
| **N-107** | **CLOSED.** `execute.ts:162` forward, `undoPass` chaining backward. AC-4 reds + M3/M4 |
| **FU-78** | **(a) CLOSED**, and Box 1's dated exception with it. AC-2 red + M8. **(b) OPEN:** the `partiallyApplied` comment in `src/lib/safety/index.ts` still names only the confirm route; `src/lib/safety` is outside (c)'s *May touch* |
| **N-108** *(new)* | Protocol undo's residual windows: an item added between the last check and the stack delete goes with the stack; a write between the check and an item's delete leaves a partial undo (counted). `stacks` has no version. A partial undo reports 0 undone although some protocol items were deleted, and retries keep failing the count check (review A3: nothing overwritten, but the count is not the whole truth). Needs an RPC. **OPEN** |
| **N-109** *(new)* | Rows recorded before (c) carry no version: their edit, add, protocol and attach undos answer 409 `STALE_UNDO` and stay applied. A legacy remove still re-adds under a new id. **OPEN, by design** |
| **N-110** *(new, review A4)* | Undo of a remove whose stack the user has since deleted: `restoreItem` maps only 23505 to false, so the FK or RLS refusal throws, and the undo route answers the generic 500 with earlier rows already marked undone. `revertAll` counts it. Same as the pre-(c) re-add. **OPEN** |

**Deploy order.** The code reads and writes `version`, so it must not reach production before 0011 is applied. 0011
alone is safe under the current code: the column has a default, and nothing reads it.

## 8. Verification

- Working tree, before staging: `tsc` clean · lint 0 errors (the three new files linted directly) · 1880/1881 unit
  tests; the one red is `MIGRATION_TOOLING`'s *tracked set equals on-disk set*, because 0011 is not yet tracked. It
  clears when the file is staged.
- **AC-8 review** (fresh subagent, scratch worktree, 2026-09-28): **BLOCKING, one finding.** B1: `SCHEMA_DRIFT` red once 0011 is
  tracked (`stack_items.version` has no field on `StackItemRow`, `src/lib/db/types.ts:83`); the fix is outside *May touch*,
  so it stopped for the owner. **Resolved** under the approvals below: `version: number` on `StackItemRow` (required: the first
  approval's `version?` failed `SCHEMA_DRIFT`'s nullability check in the formal G, since the column is NOT NULL), the
  mapper fixture given `version: 0`, and the repo's local `VersionedRow` deleted. Advisories: A1 and A2 (surviving mutations) fixed with tests; A3 folded into N-108; A4 → N-110;
  A5 is the deploy order in §7; A6 is Stack Lab by design. **Q1** (stale writes): no advisor-path write can land from a
  stale read; residue N-108. It judged reusing the version on re-insert safe and the chaining sound. **Q2** (values in
  URLs): none; every `stack_items` filter is `id`, `stack_id` or `version`. Its own 15 mutations: 13 red, 2 survived (now red).
- **Pre-run of G** (clean worktree, unstaged-equivalent, 2026-09-28): tsc clean · lint 426/426 · build ok · `verify:bundle` OK ·
  E2E 70 passed, 30 `[LIVE]` skipped · `vitest run` and `test:coverage` each 1880/1881, the one red being B1.
- **Owner approval (2026-09-28), verbatim:** *"Approved, 2026-09-28: (1) migration 0011 exactly as shown; (2) the src/types diff
  exactly as shown; (3) May touch widened to src/lib/db/types.ts for `version?: number;` on StackItemRow, and delete the
  now-redundant local VersionedRow. Stage, run the formal G on the staged tree in a clean worktree, commit, push
  fix/p4-u10c, run the bounded CI poll, and stop with the SQL for me to apply, as the brief says."*
- **Formal G, first run** (staged tree, clean worktree, 2026-09-28): red, 1 test: `SCHEMA_DRIFT` *agrees on nullability*,
  `StackItemRow.version: type says nullable, stack_items.version is NOT NULL`. Everything else green (tsc, lint 426/426,
  build, `verify:bundle`, E2E 70 / 30 skipped). Stopped; not committed.
- **Owner approval (2026-09-29), verbatim:** *"Approved, 2026-09-29: (1) src/lib/db/types.ts StackItemRow gets `version: number;`
  (required: the column is NOT NULL); (2) May touch widened to src/lib/db/mappers.test.ts to add `version: 0,` to the row
  fixture at :353. Restage, run the formal G on the staged tree in a fresh clean worktree, commit, push fix/p4-u10c and run
  the bounded CI poll. When branch CI is green, fast-forward main (0011 is applied and verified), delete and prune the
  branch. No further stop needed unless something goes red."* The owner reported 0011 applied to the deployed database
  and verified as `version integer not null default 0` (2026-09-29).
- **AC-9 G** (staged tree, fresh clean worktree, 2026-09-29): tsc clean · lint 426/426, 0 errors · 1883/1883 in 148 files ·
  architecture 30 files / 470 · `test:coverage` exit 0, no floor edited · `next build` ok (the existing supabase-js Edge
  Runtime warning only) · `verify:bundle` OK · E2E 70 passed, 30 `[LIVE]` skipped. This line was added after the gate,
  so the committed tree differs from the gated one by it alone. Branch CI: see the commit's run.
