// Application — /api/stacks/:id (Design §4.1). Get (w/ items+flags) / update / delete.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { deleteStack, getStack, updateStack } from "@/lib/db/stack-repo";
import { getStackDetail } from "@/services/evaluation";
import { stackInputSchema } from "@/lib/validation/schemas";
import { handle, notFound, ok, unauthorized } from "@/lib/api/respond";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const supabase = await createClient();
    const detail = await getStackDetail(supabase, user.id, id);
    if (!detail) return notFound("Stack");
    return ok(detail);
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const supabase = await createClient();
    if (!(await getStack(supabase, user.id, id))) return notFound("Stack");
    const input = stackInputSchema.parse(await request.json());
    return ok(await updateStack(supabase, user.id, id, input));
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const supabase = await createClient();
    if (!(await getStack(supabase, user.id, id))) return notFound("Stack");
    await deleteStack(supabase, user.id, id);
    return ok({ id });
  });
}
