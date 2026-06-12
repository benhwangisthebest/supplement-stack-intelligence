// Application — /api/stacks (Design §4.1). List / create stacks.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { createStack, listStacks } from "@/lib/db/stack-repo";
import { stackInputSchema } from "@/lib/validation/schemas";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export async function GET() {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const supabase = await createClient();
    return ok(await listStacks(supabase, user.id));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const input = stackInputSchema.parse(await request.json());
    const supabase = await createClient();
    return ok(await createStack(supabase, user.id, input), 201);
  });
}
