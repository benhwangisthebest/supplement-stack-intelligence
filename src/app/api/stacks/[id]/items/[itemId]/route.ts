// Application — /api/stacks/:id/items/:itemId (Design §4.1). Update / remove item.
//
// OWNERSHIP IS CHECKED TWICE, deliberately (Phase 1 U19, plan §6.1.1):
//
//   1. the parent stack belongs to the caller — `getStack(…, user.id, id)`;
//   2. the item belongs to THAT stack — `belongsToStack` below.
//
// Check 2 was missing until U19. The route verified the stack and then acted on
// `itemId` verbatim, so the route's stated contract ("an item of *this* stack")
// was enforced only by migration 0001's `own_stack_items` policy — which derives
// ownership from the parent stack via `auth.uid()`, and therefore blocks
// cross-USER writes but not same-user cross-STACK ones.
//
// That was never a live vulnerability, and this is not a security fix dressed up
// as one. It is CLAUDE.md §4 rule 8: the trust boundary belongs in a testable
// module rather than borrowed from the database. Anything that later reads these
// rows through a path where RLS does not apply — a service-role client, a
// background job — inherits no protection from the policy at all.
//
// A mismatch answers 404, not 403: a 403 would confirm the item exists.
//
// Phase 2 U12 (FU-28): BOTH failures answer the same message, "Stack item not
// found." Until then the stack branch said "Stack not found." and the item
// branch "Item not found." — same status, same code, and a message (one byte
// of Content-Length, too) that told the caller which check failed. The message
// is pinned equal and equal-length in the test, and NOT_FOUND_UNIFORMITY
// (src/architecture) forbids any route from answering two 404 literals.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStack } from "@/lib/db/stack-repo";
import { deleteItem, listItems, updateItem } from "@/lib/db/stack-item-repo";
import { stackItemInputSchema, uuidParam } from "@/lib/validation/schemas";
import { handle, notFound, ok, unauthorized } from "@/lib/api/respond";

/**
 * Is `itemId` an item of `stackId`?
 *
 * Uses the existing `listItems` rather than adding a repo function: this route
 * already makes one round trip for the stack, the lists are small, and a new
 * `getItem` would need its own row-fixture mapper test (CLAUDE.md §5.6) for no
 * behavioural gain. Preferring the smallest change that works (§3.4).
 */
async function belongsToStack(
  supabase: SupabaseClient,
  stackId: string,
  itemId: string,
): Promise<boolean> {
  const items = await listItems(supabase, stackId);
  return items.some((item) => item.id === itemId);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id, itemId } = await params;
    uuidParam.parse(id);
    uuidParam.parse(itemId);
    const supabase = await createClient();
    if (!(await getStack(supabase, user.id, id))) return notFound("Stack item");
    if (!(await belongsToStack(supabase, id, itemId))) return notFound("Stack item");
    const input = stackItemInputSchema.parse(await request.json());
    return ok(await updateItem(supabase, itemId, input));
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id, itemId } = await params;
    uuidParam.parse(id);
    uuidParam.parse(itemId);
    const supabase = await createClient();
    if (!(await getStack(supabase, user.id, id))) return notFound("Stack item");
    if (!(await belongsToStack(supabase, id, itemId))) return notFound("Stack item");
    await deleteItem(supabase, itemId);
    return ok({ id: itemId });
  });
}
