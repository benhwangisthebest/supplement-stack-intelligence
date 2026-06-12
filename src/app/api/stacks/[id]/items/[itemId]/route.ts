// Application — /api/stacks/:id/items/:itemId (Design §4.1). Update / remove item.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getStack } from "@/lib/db/stack-repo";
import { deleteItem, updateItem } from "@/lib/db/stack-item-repo";
import { stackItemInputSchema } from "@/lib/validation/schemas";
import { handle, notFound, ok, unauthorized } from "@/lib/api/respond";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id, itemId } = await params;
    const supabase = await createClient();
    if (!(await getStack(supabase, user.id, id))) return notFound("Stack");
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
    const supabase = await createClient();
    if (!(await getStack(supabase, user.id, id))) return notFound("Stack");
    await deleteItem(supabase, itemId);
    return ok({ id: itemId });
  });
}
