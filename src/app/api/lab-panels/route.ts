// Application — GET /api/lab-panels (Design §4.1). Auth-guarded.
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listPanels } from "@/lib/db/lab-panel-repo";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export async function GET() {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const supabase = await createClient();
    const panels = await listPanels(supabase, user.id);
    return ok(panels);
  });
}
