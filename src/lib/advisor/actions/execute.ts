// Application/Infrastructure — executes a confirmed proposal via the EXISTING repos.
// This is the ONLY place advisor-actions writes data, and it writes exclusively
// through the same repo functions the stack/protocol/product routes already use —
// so "engines/repos are the only writers" holds (Plan SC-2). [U10 (b), (c)] The
// exceptions are advisor-only compare-and-set variants in the same repo
// (`updateItemAtVersion`, `deleteItemAtVersion`, `restoreItem`): still repo
// functions, but Stack Lab does not call them. Pure intent/inverse mapping stays
// in actions/apply.ts; this module supplies the runtime snapshots.
//
// [Phase 4 U10 (c)] Every write to an existing item expects the version it read
// (migration 0011), and every inverse records the version the forward write
// left, so undo and rollback write only over what the action wrote (N-105).
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addItem,
  deleteItemAtVersion,
  listItems,
  restoreItem,
  setItemProduct,
  updateItemAtVersion,
} from "@/lib/db/stack-item-repo";
import { createStack, deleteStack } from "@/lib/db/stack-repo";
import { reportInternalError } from "@/lib/api/respond";
import { forwardIntent, inverseIntent } from "./apply";
import type {
  ActionProposal,
  EditableProposalFields,
  ItemVersionExpectation,
  WriteIntent,
} from "@/types/advisor-action";
import type { StackItem } from "@/types";

export interface ExecuteResult {
  /** The reversal to persist for undo (SC-7). */
  inverse: WriteIntent;
  resultingItemId: string | null;
  createdStackId: string | null;
  /** edit_item / attach_product: the item as the write left it, for a later action on it in the batch. */
  after?: StackItem;
}

/** The version an item was read at. Every item read after migration 0011 carries one. */
function versionOf(item: StackItem): number {
  if (item.version === undefined) throw new Error("stack item carries no version");
  return item.version;
}

/**
 * Apply a re-validated proposal. `priorItem` MUST be supplied for remove_item /
 * edit_item / attach_product (the route loads it from the owned stack). Runtime
 * ids/prior values are captured here and threaded into the pure inverse mapping.
 */
export async function executeProposal(
  supabase: SupabaseClient,
  userId: string,
  proposal: ActionProposal,
  priorItem: StackItem | null,
  edits?: EditableProposalFields,
): Promise<ExecuteResult> {
  switch (proposal.type) {
    case "add_item": {
      const intent = forwardIntent(proposal, { edits });
      if (intent.op !== "add_item") throw new Error("intent mismatch");
      const item = await addItem(supabase, intent.stackId, intent.input);
      return {
        inverse: inverseIntent(proposal, { createdItemId: item.id, createdVersion: item.version }),
        resultingItemId: item.id,
        createdStackId: null,
      };
    }
    case "remove_item": {
      if (!priorItem) throw new Error("remove_item requires priorItem");
      // [Phase 4 U10 (b), (c)] Deleted only if the item still holds the version
      // that was read. The inverse re-adds `priorItem`, so if another write
      // changed the item since, that inverse would restore a state that was not current.
      if (!(await deleteItemAtVersion(supabase, priorItem.id, versionOf(priorItem)))) {
        throw new StaleWriteError();
      }
      return {
        inverse: inverseIntent(proposal, { priorItem }),
        resultingItemId: null,
        createdStackId: null,
      };
    }
    case "edit_item": {
      if (!priorItem) throw new Error("edit_item requires priorItem");
      const intent = forwardIntent(proposal, { edits, priorItem });
      if (intent.op !== "update_item") throw new Error("intent mismatch");
      // [Phase 4 U10 (b), (c)] The same compare-and-set as remove_item.
      const after = await updateItemAtVersion(supabase, priorItem.id, intent.input, versionOf(priorItem));
      if (!after) throw new StaleWriteError();
      return {
        inverse: inverseIntent(proposal, { priorItem, writtenVersion: after.version }),
        resultingItemId: priorItem.id,
        createdStackId: null,
        after,
      };
    }
    case "generate_protocol": {
      const intent = forwardIntent(proposal);
      if (intent.op !== "create_stack_with_items") throw new Error("intent mismatch");
      const stack = await createStack(supabase, userId, intent.stack);
      const created: { itemId: string; version: number }[] = [];
      for (const input of intent.items) {
        const item = await addItem(supabase, stack.id, input);
        created.push({ itemId: item.id, version: versionOf(item) });
      }
      return {
        inverse: inverseIntent(proposal, { createdStackId: stack.id, createdItems: created }),
        resultingItemId: null,
        createdStackId: stack.id,
      };
    }
    case "attach_product": {
      if (!priorItem) throw new Error("attach_product requires priorItem");
      const intent = forwardIntent(proposal);
      if (intent.op !== "set_item_product") throw new Error("intent mismatch");
      // [Phase 4 U10, FU-1; (c)] Written only while the item holds the version
      // `priorItem` was read at, so its product is still the one the inverse
      // restores. Not applied is a failure: executeBatch rolls back and counts
      // the batch; it is never a success.
      const after = await setItemProduct(supabase, intent.itemId, intent.productId, versionOf(priorItem));
      if (!after) throw new StaleWriteError();
      return {
        inverse: inverseIntent(proposal, {
          priorItem,
          priorProductId: priorItem.productId ?? null,
          writtenVersion: after.version,
        }),
        resultingItemId: intent.itemId,
        createdStackId: null,
        after,
      };
    }
  }
}

export interface BatchItemResult {
  proposal: ActionProposal;
  exec: ExecuteResult;
}

/**
 * v8 advisor-experience — apply a re-validated BATCH all-or-nothing (Design §4.2).
 * Executes each action sequentially through executeProposal (the existing repos
 * stay the only writers). On ANY failure it replays the already-applied actions'
 * inverses in REVERSE order (compensating rollback) so the stack is left as it was,
 * then re-throws. Returns each action's ExecuteResult (incl. its inverse) for the
 * audit, in order. `priorItems[i]` pairs with `actions[i]` (null for add/protocol).
 *
 * [U10 (c), N-107] Two actions on one item: the second starts from the item as
 * the first left it, so it expects the version the first wrote and its inverse
 * restores the first's result, not the pre-batch read.
 */
export async function executeBatch(
  supabase: SupabaseClient,
  userId: string,
  actions: { proposal: ActionProposal; edits?: EditableProposalFields }[],
  priorItems: (StackItem | null)[],
): Promise<BatchItemResult[]> {
  const done: BatchItemResult[] = [];
  const latest = new Map<string, StackItem>();
  try {
    for (let i = 0; i < actions.length; i++) {
      const { proposal, edits } = actions[i];
      const read = priorItems[i];
      const prior = read ? (latest.get(read.id) ?? read) : null;
      const exec = await executeProposal(supabase, userId, proposal, prior, edits);
      if (exec.after) latest.set(exec.after.id, exec.after);
      done.push({ proposal, exec });
    }
    return done;
  } catch (err) {
    // [U34, N-74] Compensating rollback, and it now COUNTS ITSELF.
    //
    // It always reversed newest-first; what it never did was say how it went.
    // T-06 (2026-07-30) found this catch swallowing failures with no trace and
    // asked for a LOG; U20 added the log. Nobody went back to the RESPONSE,
    // which has claimed `rolledBack: true` unconditionally ever since — a
    // remedy applied to the half that was reported. The counts below are what
    // let the caller stop guessing.
    const { reverted, unreverted } = await revertAll(supabase, userId, done);
    throw withRollbackOutcome(err, reverted, unreverted);
  }
}

/**
 * Replay a batch's inverses, newest first, and report how many took.
 *
 * Extracted by U34 so the audit-failure path in `confirmAndApply` reverts the
 * SAME way this function's own catch does. Two rollback implementations would
 * be two `rolledBack` semantics, which is the defect this unit exists to end.
 *
 * NEVER THROWS. A rollback that fails is a fact to report, not a second
 * exception to mask the first with — the original cause must survive, which is
 * what `execute.test.ts`'s "re-throws the ORIGINAL failure" pin has held since
 * U20.
 */
export async function revertAll(
  supabase: SupabaseClient,
  userId: string,
  done: BatchItemResult[],
): Promise<{ reverted: number; unreverted: number }> {
  const undo = undoPass(supabase, userId);
  let reverted = 0;
  let unreverted = 0;
  for (let i = done.length - 1; i >= 0; i--) {
    try {
      // [Phase 4 U10, (b), (c)] An inverse is written only over what its action
      // wrote. Not written is thrown here, so it lands in the catch and is
      // counted as unreverted.
      if (!(await undo(done[i].exec.inverse))) throw new StaleWriteError();
      reverted += 1;
    } catch (rollbackErr) {
      unreverted += 1;
      // Best-effort rollback — never mask the original failure with a rollback
      // error, so this is still swallowed rather than re-thrown.
      //
      // But swallowing it SILENTLY was a trust defect (Phase 1 FU-2 → U20): a
      // failed rollback leaves the stack half-applied, which is the one state
      // this function exists to prevent, and there was no log, no correlation
      // id, and no trace of it anywhere. The user sees the original error and
      // reasonably assumes nothing was written.
      //
      // Log-only, deliberately — and `reportInternalError` offers no way to put
      // text in front of a client (see its header), so this cannot reopen the
      // §2.3 rule 13 disclosure a hand-rolled log line might.
      //
      // ~~Every response byte is unchanged.~~ **[2026-09-21, U34] NO LONGER
      // TRUE, and that sentence was the defect.** The log was the whole of
      // T-06's remedy, and a log nobody reads at request time left the
      // response free to claim `rolledBack: true` while this branch ran. The
      // count above is now carried out to the caller, so the log and the
      // response finally agree. **What crosses the boundary is a NUMBER** —
      // the caught error's text stays here, exactly as before.
      reportInternalError(rollbackErr, "ROLLBACK_FAILED");
    }
  }
  return { reverted, unreverted };
}

/** A compare-and-set found the item changed since it was read, so nothing was written. */
class StaleWriteError extends Error {
  constructor() {
    super("stack item changed since it was read");
    this.name = "StaleWriteError";
  }
}

/**
 * Whether a caught error is a not-applied compare-and-set. [U10 (b), FU-77] The
 * service answers it with the existing 409, not a 500. Matched by name, which
 * only `StaleWriteError` sets; `withRollbackOutcome` rethrows the original
 * error, so the name survives the rollback.
 */
export function isStaleWrite(err: unknown): boolean {
  return err instanceof Error && err.name === "StaleWriteError";
}


/**
 * One undo or rollback pass: replays inverses, newest first, each only while its
 * item still holds the version the forward write left. Returns, per inverse,
 * whether it was written. [Phase 4 U10 (c), N-105]
 *
 * Inside one pass, an inverse that restored the state an item had at version r
 * produced a new version n. A later inverse expecting r then expects n: the pass
 * itself wrote n, and it holds exactly the state r held (N-107). Anything else
 * that wrote in between moved the version past n, so that inverse still misses.
 *
 * Fails closed: an inverse recorded before U10 (c) carries no version, so it is
 * not written. The one exception is a remove's re-add from such a row, which is
 * an insert under a new id and overwrites nothing.
 */
export function undoPass(
  supabase: SupabaseClient,
  userId: string,
): (inverse: WriteIntent) => Promise<boolean> {
  const restored = new Map<string, { from: number; to: number }>();
  const expected = (itemId: string, e: ItemVersionExpectation) => {
    const r = restored.get(itemId);
    return r && r.from === e.version ? r.to : e.version;
  };
  const wrote = (itemId: string, e: ItemVersionExpectation, after: StackItem) => {
    if (e.restores !== undefined && after.version !== undefined) {
      restored.set(itemId, { from: e.restores, to: after.version });
    }
  };

  return async (inverse) => {
    switch (inverse.op) {
      case "update_item": {
        if (!inverse.expect) return false;
        const at = expected(inverse.itemId, inverse.expect);
        const after = await updateItemAtVersion(supabase, inverse.itemId, inverse.input, at);
        if (!after) return false;
        wrote(inverse.itemId, inverse.expect, after);
        return true;
      }
      case "set_item_product": {
        if (!inverse.expect) return false;
        const at = expected(inverse.itemId, inverse.expect);
        const after = await setItemProduct(supabase, inverse.itemId, inverse.productId, at);
        if (!after) return false;
        wrote(inverse.itemId, inverse.expect, after);
        return true;
      }
      case "delete_item":
        if (!inverse.expect) return false;
        return deleteItemAtVersion(supabase, inverse.itemId, expected(inverse.itemId, inverse.expect));
      case "add_item":
        // [N-104] Back under its id, version and product.
        if (inverse.restore) return restoreItem(supabase, inverse.stackId, inverse.restore, inverse.input);
        await addItem(supabase, inverse.stackId, inverse.input);
        return true;
      case "delete_stack": {
        const expectItems = inverse.expectItems;
        if (!expectItems) return false;
        // The protocol's stack goes only if it still holds exactly the items the
        // protocol created, each at the version it was created at: a user's
        // added or edited item is never deleted with it.
        const want = new Map(expectItems.map((e) => [e.itemId, expected(e.itemId, { version: e.version })]));
        const items = await listItems(supabase, inverse.stackId);
        if (items.length !== want.size || items.some((i) => want.get(i.id) !== i.version)) return false;
        for (const [itemId, version] of want) {
          if (!(await deleteItemAtVersion(supabase, itemId, version))) return false;
        }
        // N-108: an item added between this read and the delete below goes with
        // the stack. Closing that needs the two in one transaction (an RPC).
        if ((await listItems(supabase, inverse.stackId)).length > 0) return false;
        await deleteStack(supabase, userId, inverse.stackId);
        return true;
      }
      case "create_stack_with_items":
        // A forward intent only; no action records it as an inverse.
        return false;
    }
  };
}

/**
 * Attach a rollback outcome to the original failure, without replacing it.
 *
 * MUTATES AND RETHROWS THE ORIGINAL rather than wrapping it, deliberately, for
 * three reasons that each rule out the alternatives:
 *   * the message, stack and identity of the real cause survive untouched —
 *     `execute.test.ts`'s "re-throws the ORIGINAL failure" pin predates this
 *     unit and must keep passing unedited;
 *   * a wrapper would have to copy `cause.message` into its own, and this file
 *     is scanned by `error-disclosure.test.ts` (`src/lib/**`), which flags a
 *     `.message` read off a caught binding — the guard would be right to;
 *   * `internalError(err)` then logs the same `name`/`message`/`stack` it
 *     logged before, so the log record does not move either.
 */
function withRollbackOutcome(err: unknown, reverted: number, unreverted: number): unknown {
  if (err instanceof Error) return Object.assign(err, { reverted, unreverted });

  // [2026-09-21, U34, from `ecc:security-reviewer`] A NON-ERROR THROW IS NOT
  // STRINGIFIED HERE, and the first version of this line did exactly that.
  //
  // `logInternalError` already handles a non-Error throw safely and says so in
  // its own comment: it records the value's TYPE and SHAPE and "the value
  // itself is never copied, because nothing here knows what it holds".
  // `new Error(String(err))` would have undone that protection one call
  // earlier — an object with a custom `toString` or `Symbol.toPrimitive` would
  // have had its text lifted into a `message` the logger then writes out in
  // full. No throw site in this chain rejects with such a value today, which
  // is precisely why it was easy to miss.
  //
  // So the wrapper carries FIXED text, and the original is reported first
  // through the same safe path rather than dropped — the counts survive and
  // the diagnosis survives, neither at the other's expense.
  reportInternalError(err, "BATCH_NON_ERROR_THROW");
  return Object.assign(new Error("Batch apply failed."), { reverted, unreverted });
}

/** The rollback outcome a caught batch failure carries, when it carries one. */
export interface RollbackOutcome {
  reverted: number;
  unreverted: number;
}

/**
 * Read the rollback outcome off a caught error, or `null` when it has none.
 *
 * `null` is a meaningful third answer and not a default: a throw that never
 * reached `executeBatch`'s rollback rolled nothing back, and must NOT be
 * reported as a clean rollback. That distinction is the outer catch's `details:
 * undefined`, pinned since U11.
 */
export function rollbackOutcomeOf(err: unknown): RollbackOutcome | null {
  if (typeof err !== "object" || err === null) return null;
  const candidate = err as { reverted?: unknown; unreverted?: unknown };
  if (typeof candidate.reverted !== "number" || typeof candidate.unreverted !== "number") {
    return null;
  }
  return { reverted: candidate.reverted, unreverted: candidate.unreverted };
}
