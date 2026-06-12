// Application — /api/stacks/:id/items (Design §4.1). Add an item to an owned stack.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getStack } from "@/lib/db/stack-repo";
import { addItem } from "@/lib/db/stack-item-repo";
import { stackItemInputSchema } from "@/lib/validation/schemas";
import { handle, notFound, ok, unauthorized } from "@/lib/api/respond";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const supabase = await createClient();
    if (!(await getStack(supabase, user.id, id))) return notFound("Stack");
    const input = stackItemInputSchema.parse(await request.json());
    return ok(await addItem(supabase, id, input), 201);
  });
}
