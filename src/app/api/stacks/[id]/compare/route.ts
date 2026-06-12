// Application — GET /api/stacks/:id/compare (Design §4.2). Goals vs coverage.
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getStack } from "@/lib/db/stack-repo";
import { listItems } from "@/lib/db/stack-item-repo";
import { getProfile } from "@/lib/db/profile-repo";
import { compareFromProfile } from "@/lib/compare";
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
    if (!(await getStack(supabase, user.id, id))) return notFound("Stack");
    const [items, profile] = await Promise.all([
      listItems(supabase, id),
      getProfile(supabase, user.id),
    ]);
    return ok(compareFromProfile(profile, items));
  });
}
