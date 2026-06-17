// Application — GET /api/advisor/conversations/:id (Design §4.1). Auth-guarded.
// RLS (migration 0003) scopes messages to the owning user, so a foreign id
// simply yields an empty list rather than leaking another user's history.
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/lib/advisor/repo";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const supabase = await createClient();
    const messages = await getMessages(supabase, id);
    return ok(messages);
  });
}
