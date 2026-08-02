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
import { cumulativeRecheck } from "@/lib/advisor/safety-recheck";
import { executeBatch } from "@/lib/advisor/actions/execute";
import {
  addItemPayloadSchema,
  attachProductPayloadSchema,
  editItemPayloadSchema,
  editableFieldsSchema,
  generateProtocolPayloadSchema,
  removeItemPayloadSchema,
} from "@/lib/advisor/actions/schema";
import { stackItemInputSchema } from "@/lib/validation/schemas";
import { recordBatch, type NewAction } from "@/lib/db/advisor-action-repo";
import { fail, internalError, ok, unauthorized, validationError } from "@/lib/api/respond";
import type { ActionProposal, EditableProposalFields } from "@/types/advisor-action";
import type { AdvisorContext } from "@/types/advisor";
import type { StackItem } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ACTION_TYPES = ["add_item", "remove_item", "edit_item", "generate_protocol", "attach_product"] as const;

const proposalSchema = z.object({
  type: z.enum(ACTION_TYPES),
  stackId: z.string(),
  payload: z.record(z.unknown()),
  diff: z.array(z.unknown()).optional(),
  editable: z.unknown().optional(),
  rationaleCitations: z.array(z.unknown()).optional(),
});

// v8 advisor-experience: the confirm body is a SELECTED SUBSET of proposals
// (selective confirm, Design §5.1). A legacy single `{ proposal, edits }` body is
// coerced into a length-1 batch for back-compat with the v7 client.
const confirmSchema = z.union([
  z.object({
    conversationId: z.string().nullish(),
    actions: z
      .array(
        z.object({
          proposal: proposalSchema,
          edits: editableFieldsSchema.optional(),
        }),
      )
      .min(1),
  }),
  z.object({
    conversationId: z.string().nullish(),
    proposal: proposalSchema,
    edits: editableFieldsSchema.optional(),
  }),
]);

/** Normalize either body shape to a list of {proposal, edits}. */
function toActions(
  body: z.infer<typeof confirmSchema>,
): { proposal: ActionProposal; edits?: EditableProposalFields }[] {
  if ("actions" in body) {
    return body.actions.map((a) => ({
      proposal: a.proposal as unknown as ActionProposal,
      edits: a.edits as EditableProposalFields | undefined,
    }));
  }
  return [
    {
      proposal: body.proposal as unknown as ActionProposal,
      edits: body.edits as EditableProposalFields | undefined,
    },
  ];
}

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

  const actions = toActions(body);
  const conversationId = body.conversationId ?? null;
  const supabase = await createClient();

  try {
    const ctx = await loadAdvisorContext(supabase, user.id);

    // SC-6: re-validate EVERY selected action against fresh, owned data. Any stale
    // or unowned action rejects the WHOLE batch (all-or-nothing, Design §4.2).
    const priorItems: (StackItem | null)[] = [];
    for (const { proposal } of actions) {
      const checked = await revalidate(supabase, user.id, proposal, ctx);
      if ("error" in checked) return checked.error;
      priorItems.push(checked.priorItem);
    }

    // Authoritative CUMULATIVE pre-apply safety gate over the projected combined
    // stack (SC-4, Design §3.2): a NEW critical flag — even one only the combination
    // introduces — hard-blocks the entire batch.
    const newSafetyFlags = cumulativeRecheck(ctx, actions);
    const critical = newSafetyFlags.find((f) => f.severity === "critical");
    if (critical) {
      return fail("SAFETY_BLOCK", critical.title, 409, { flag: critical });
    }

    // Execute all-or-nothing via existing repos; compensating rollback on failure.
    let results;
    try {
      results = await executeBatch(supabase, user.id, actions, priorItems);
    } catch (err) {
      // The batch was rolled back, so `rolledBack` stays — it is a computed fact
      // the client acts on. The exception itself goes to the log under a
      // correlation id (CLAUDE.md §2.3 rule 13); it used to be returned verbatim.
      return internalError(err, { code: "ACTION_ERROR", details: { rolledBack: true } });
    }

    // Audit all applied actions under one batch_id → grouped one-click undo (SC-7).
    const batchId = crypto.randomUUID();
    const newActions: NewAction[] = results.map((r) => ({
      conversationId,
      actionType: r.proposal.type,
      payload: r.proposal.payload as unknown as Record<string, unknown>,
      inverse: r.exec.inverse,
    }));
    const records = await recordBatch(supabase, user.id, batchId, newActions);

    const perAction = records.map((rec, i) => ({
      actionId: rec.id,
      resultingItemId: results[i].exec.resultingItemId,
      createdStackId: results[i].exec.createdStackId,
    }));

    return ok(
      {
        applied: true,
        batchId,
        results: perAction,
        newSafetyFlags,
        // Back-compat with the v7 single-action client shape:
        actionId: perAction[0].actionId,
        resultingItemId: perAction[0].resultingItemId,
        createdStackId: perAction[0].createdStackId,
      },
      201,
    );
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return internalError(err, { code: "ACTION_ERROR" });
  }
}
