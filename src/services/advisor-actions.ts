// Application — the advisor's confirm-and-apply trust boundary (Phase 1 U11).
//
// EXTRACTED VERBATIM from `src/app/api/advisor/actions/route.ts`. This is a
// behaviour-preserving move, pinned by the differential response tests in
// `src/app/api/advisor/actions/route.test.ts` (plan Gate C1): every one of the
// nine distinct (status, code) outcomes was captured green against the route
// BEFORE this file existed, and must stay green unchanged afterwards.
//
// WHY IT MOVED. CLAUDE.md §4 rule 8 — every trust boundary belongs in a
// testable module, not in a route handler. This is the repository's only LLM →
// write path: it re-loads context server-side, re-validates the proposal
// against fresh owned data (SC-6), runs the authoritative cumulative safety
// gate (SC-4), executes all-or-nothing through the existing repos, and records
// an inverse for undo (SC-7). None of that was reachable except through a Next
// route export.
//
// ---------------------------------------------------------------------------
// THE HAZARD THIS MOVE CREATES, AND WHAT CLOSES IT (plan §6.1)
// ---------------------------------------------------------------------------
// `src/architecture/error-disclosure.test.ts` used to discover its inventory
// from `src/app/api/**/route.ts` only. Moving these catch blocks here would
// have taken the repository's most safety-critical error boundary OUT of its
// own guard — a net reduction in enforcement disguised as a refactor, which no
// test would have reported. U11's definition of done therefore includes
// extending that guard's inventory to `src/services/**`. If you are reading
// this file and that extension is gone, the protection is gone with it.
//
// The two `internalError(...)` calls below are the reason: both take a raw
// thrown value, and both are one careless `message: err.message` away from
// re-opening Phase 0 finding C-8 (CLAUDE.md §2.3 rule 13).
import type { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  generateProtocolPayloadSchema,
  removeItemPayloadSchema,
  type SelectedAction,
} from "@/lib/advisor/actions/schema";
import { stackItemInputSchema } from "@/lib/validation/schemas";
import { recordBatch, type NewAction } from "@/lib/db/advisor-action-repo";
import { fail, internalError, ok, validationError } from "@/lib/api/respond";
import type { ActionProposal } from "@/types/advisor-action";
import type { AdvisorContext } from "@/types/advisor";
import type { StackItem } from "@/types";

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

/**
 * Apply a confirmed batch of advisor proposals for one authenticated user.
 *
 * The caller has already authenticated and parsed the request body; everything
 * from re-loading context onward happens here. Returns the response to send —
 * the route adds nothing to it.
 */
export async function confirmAndApply(
  supabase: SupabaseClient,
  userId: string,
  actions: SelectedAction[],
  conversationId: string | null,
): Promise<NextResponse> {
  try {
    const ctx = await loadAdvisorContext(supabase, userId);

    // SC-6: re-validate EVERY selected action against fresh, owned data. Any stale
    // or unowned action rejects the WHOLE batch (all-or-nothing, Design §4.2).
    const priorItems: (StackItem | null)[] = [];
    for (const { proposal } of actions) {
      const checked = await revalidate(supabase, userId, proposal, ctx);
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
      results = await executeBatch(supabase, userId, actions, priorItems);
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
    const records = await recordBatch(supabase, userId, batchId, newActions);

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
