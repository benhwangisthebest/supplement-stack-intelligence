// Application/Infrastructure — executes a confirmed proposal via the EXISTING repos.
// This is the ONLY place advisor-actions writes data, and it writes exclusively
// through the same repo functions the stack/protocol/product routes already use —
// so "engines/repos are the only writers" holds (Plan SC-2). Pure intent/inverse
// mapping stays in actions/apply.ts; this module supplies the runtime snapshots.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addItem,
  deleteItem,
  getItemProductId,
  setItemProduct,
  updateItem,
} from "@/lib/db/stack-item-repo";
import { createStack, deleteStack } from "@/lib/db/stack-repo";
import { reportInternalError } from "@/lib/api/respond";
import { forwardIntent, inverseIntent } from "./apply";
import type {
  ActionProposal,
  AttachProductPayload,
  EditableProposalFields,
  WriteIntent,
} from "@/types/advisor-action";
import type { StackItem } from "@/types";

export interface ExecuteResult {
  /** The reversal to persist for undo (SC-7). */
  inverse: WriteIntent;
  resultingItemId: string | null;
  createdStackId: string | null;
}

/**
 * Apply a re-validated proposal. `priorItem` MUST be supplied for remove_item /
 * edit_item (the route loads it from the owned stack). Runtime ids/prior values are
 * captured here and threaded into the pure inverse mapping.
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
        inverse: inverseIntent(proposal, { createdItemId: item.id }),
        resultingItemId: item.id,
        createdStackId: null,
      };
    }
    case "remove_item": {
      if (!priorItem) throw new Error("remove_item requires priorItem");
      await deleteItem(supabase, priorItem.id);
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
      await updateItem(supabase, priorItem.id, intent.input);
      return {
        inverse: inverseIntent(proposal, { priorItem }),
        resultingItemId: priorItem.id,
        createdStackId: null,
      };
    }
    case "generate_protocol": {
      const intent = forwardIntent(proposal);
      if (intent.op !== "create_stack_with_items") throw new Error("intent mismatch");
      const stack = await createStack(supabase, userId, intent.stack);
      for (const item of intent.items) await addItem(supabase, stack.id, item);
      return {
        inverse: inverseIntent(proposal, { createdStackId: stack.id }),
        resultingItemId: null,
        createdStackId: stack.id,
      };
    }
    case "attach_product": {
      const { stackItemId } = proposal.payload as AttachProductPayload;
      const prior = await getItemProductId(supabase, stackItemId);
      const intent = forwardIntent(proposal);
      if (intent.op !== "set_item_product") throw new Error("intent mismatch");
      await setItemProduct(supabase, intent.itemId, intent.productId);
      return {
        inverse: inverseIntent(proposal, { priorProductId: prior }),
        resultingItemId: stackItemId,
        createdStackId: null,
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
 */
export async function executeBatch(
  supabase: SupabaseClient,
  userId: string,
  actions: { proposal: ActionProposal; edits?: EditableProposalFields }[],
  priorItems: (StackItem | null)[],
): Promise<BatchItemResult[]> {
  const done: BatchItemResult[] = [];
  try {
    for (let i = 0; i < actions.length; i++) {
      const { proposal, edits } = actions[i];
      const exec = await executeProposal(supabase, userId, proposal, priorItems[i], edits);
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
  let reverted = 0;
  let unreverted = 0;
  for (let i = done.length - 1; i >= 0; i--) {
    try {
      await executeIntent(supabase, userId, done[i].exec.inverse);
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

/** Execute a stored WriteIntent (used by undo to replay the inverse). */
export async function executeIntent(
  supabase: SupabaseClient,
  userId: string,
  intent: WriteIntent,
): Promise<void> {
  switch (intent.op) {
    case "add_item":
      await addItem(supabase, intent.stackId, intent.input);
      return;
    case "update_item":
      await updateItem(supabase, intent.itemId, intent.input);
      return;
    case "delete_item":
      await deleteItem(supabase, intent.itemId);
      return;
    case "create_stack_with_items": {
      const stack = await createStack(supabase, userId, intent.stack);
      for (const item of intent.items) await addItem(supabase, stack.id, item);
      return;
    }
    case "delete_stack":
      await deleteStack(supabase, userId, intent.stackId);
      return;
    case "set_item_product":
      await setItemProduct(supabase, intent.itemId, intent.productId);
      return;
  }
}
