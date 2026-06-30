// Application — POST /api/advisor/actions (Design §4.2). The trust boundary for
// suggest-then-confirm: auth → re-load context server-side → re-validate the
// proposal + edits against fresh, owned data → authoritative safety gate →
// execute via existing repos → audit with an inverse. The client's canonical
// values are NEVER trusted; only the editable dose/timing subset is merged, then
// re-parsed. Plan SC-4 (safety), SC-5 (edit), SC-6 (server re-validate), SC-7 (audit).
import type { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSupplementById } from "@/lib/evidence";
import { matchProducts } from "@/lib/product-matcher";
import { getStack } from "@/lib/db/stack-repo";
import { loadAdvisorContext } from "@/lib/advisor/context-loader";
import { recheckForProposal } from "@/lib/advisor/safety-recheck";
import { executeProposal } from "@/lib/advisor/actions/execute";
import {
  addItemPayloadSchema,
  attachProductPayloadSchema,
  editItemPayloadSchema,
  editableFieldsSchema,
  generateProtocolPayloadSchema,
  removeItemPayloadSchema,
} from "@/lib/advisor/actions/schema";
import { stackItemInputSchema } from "@/lib/validation/schemas";
import { recordAction } from "@/lib/db/advisor-action-repo";
import { fail, ok, unauthorized, validationError } from "@/lib/api/respond";
import type { ActionProposal, EditableProposalFields } from "@/types/advisor-action";
import type { AdvisorContext } from "@/types/advisor";
import type { StackItem } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ACTION_TYPES = ["add_item", "remove_item", "edit_item", "generate_protocol", "attach_product"] as const;

const confirmSchema = z.object({
  conversationId: z.string().nullish(),
  proposal: z.object({
    type: z.enum(ACTION_TYPES),
    stackId: z.string(),
    payload: z.record(z.unknown()),
    diff: z.array(z.unknown()).optional(),
    editable: z.unknown().optional(),
    rationaleCitations: z.array(z.unknown()).optional(),
  }),
  edits: editableFieldsSchema.optional(),
});

const staleError = (what = "This proposal is no longer valid") =>
  fail("STALE_PROPOSAL", `${what}; please ask the advisor again.`, 409);

type Revalidated = { priorItem: StackItem | null } | { error: NextResponse };

/** Re-ground the proposal against fresh, owned data (SC-6). Returns the prior item
 *  for remove/edit/attach, or a typed error response. */
async function revalidate(
  supabase: SupabaseClient,
  userId: string,
  proposal: ActionProposal,
  ctx: AdvisorContext,
): Promise<Revalidated> {
  // generate_protocol creates a NEW stack — no existing stack required.
  if (proposal.type === "generate_protocol") {
    const pl = generateProtocolPayloadSchema.parse(proposal.payload);
    for (const raw of pl.items) {
      const item = stackItemInputSchema.parse(raw); // SC-6: re-parse every item
      if (item.supplementId && !getSupplementById(item.supplementId)) {
        return { error: fail("NOT_FOUND", `Supplement "${item.supplementId}" not found.`, 404) };
      }
    }
    return { priorItem: null };
  }

  // All other actions target the user's active, owned stack.
  const stack = await getStack(supabase, userId, proposal.stackId);
  if (!stack) return { error: fail("NOT_FOUND", "Stack not found.", 404) };
  if (!ctx.stack || ctx.stack.id !== proposal.stackId) return { error: staleError("The active stack changed") };

  switch (proposal.type) {
    case "add_item": {
      const pl = addItemPayloadSchema.parse(proposal.payload);
      if (!getSupplementById(pl.supplementId)) {
        return { error: fail("NOT_FOUND", `Supplement "${pl.supplementId}" not found.`, 404) };
      }
      return { priorItem: null };
    }
    case "remove_item": {
      const pl = removeItemPayloadSchema.parse(proposal.payload);
      const item = ctx.stackItems.find((i) => i.id === pl.stackItemId);
      return item ? { priorItem: item } : { error: staleError("That item is no longer in the stack") };
    }
    case "edit_item": {
      const pl = editItemPayloadSchema.parse(proposal.payload);
      const item = ctx.stackItems.find((i) => i.id === pl.stackItemId);
      return item ? { priorItem: item } : { error: staleError("That item is no longer in the stack") };
    }
    case "attach_product": {
      const pl = attachProductPayloadSchema.parse(proposal.payload);
      const item = ctx.stackItems.find((i) => i.id === pl.stackItemId);
      if (!item) return { error: staleError("That item is no longer in the stack") };
      const group = matchProducts({ stackItems: ctx.stackItems, profile: ctx.profile }).groups.find(
        (g) => g.stackItemId === pl.stackItemId,
      );
      if (!group?.matches.some((m) => m.product.id === pl.productId)) {
        return { error: staleError("That product is no longer a ranked match for the item") };
      }
      return { priorItem: item };
    }
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  let body;
  try {
    body = confirmSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return fail("BAD_REQUEST", "Invalid request body.", 400);
  }

  const proposal = body.proposal as unknown as ActionProposal;
  const edits = body.edits as EditableProposalFields | undefined;
  const supabase = await createClient();

  try {
    const ctx = await loadAdvisorContext(supabase, user.id);

    const checked = await revalidate(supabase, user.id, proposal, ctx);
    if ("error" in checked) return checked.error;

    // Authoritative pre-apply safety gate (SC-4): hard-block a NEW critical flag.
    const newSafetyFlags = recheckForProposal(ctx, proposal, edits);
    const critical = newSafetyFlags.find((f) => f.severity === "critical");
    if (critical) {
      return fail("SAFETY_BLOCK", critical.title, 409, { flag: critical });
    }

    // Execute via existing repos (the only writers), then audit with the inverse.
    const exec = await executeProposal(supabase, user.id, proposal, checked.priorItem, edits);
    const record = await recordAction(supabase, user.id, {
      conversationId: body.conversationId ?? null,
      actionType: proposal.type,
      payload: proposal.payload as unknown as Record<string, unknown>,
      inverse: exec.inverse,
    });

    return ok(
      {
        actionId: record.id,
        applied: true,
        resultingItemId: exec.resultingItemId,
        createdStackId: exec.createdStackId,
        newSafetyFlags,
      },
      201,
    );
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    const message = err instanceof Error ? err.message : "Action failed.";
    return fail("ACTION_ERROR", message, 500);
  }
}
