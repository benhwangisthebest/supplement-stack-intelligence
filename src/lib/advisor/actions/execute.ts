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
    // Compensating rollback: reverse what already succeeded, newest first.
    for (let i = done.length - 1; i >= 0; i--) {
      try {
        await executeIntent(supabase, userId, done[i].exec.inverse);
      } catch (rollbackErr) {
        // Best-effort rollback — never mask the original failure with a rollback
        // error, so this is still swallowed rather than re-thrown.
        //
        // But swallowing it SILENTLY was a trust defect (Phase 1 FU-2 → U20): a
        // failed rollback leaves the stack half-applied, which is the one state
        // this function exists to prevent, and there was no log, no correlation
        // id, and no trace of it anywhere. The user sees the original error and
        // reasonably assumes nothing was written.
        //
        // Log-only, deliberately. Every response byte is unchanged — the original
        // error still propagates below, and `reportInternalError` offers no way to
        // put text in front of a client (see its header), so this cannot reopen
        // the §2.3 rule 13 disclosure the way a hand-rolled log line might.
        reportInternalError(rollbackErr, "ROLLBACK_FAILED");
      }
    }
    throw err;
  }
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
