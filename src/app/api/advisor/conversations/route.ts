// Application — GET /api/advisor/conversations (Design §4.1). Auth-guarded.
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listConversations } from "@/lib/advisor/repo";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const supabase = await createClient();
    const conversations = await listConversations(supabase, user.id);
    return ok(conversations);
  });
}
