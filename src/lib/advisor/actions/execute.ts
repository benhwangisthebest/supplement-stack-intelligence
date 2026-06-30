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
