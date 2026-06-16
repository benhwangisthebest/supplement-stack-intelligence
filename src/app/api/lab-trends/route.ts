// Application — GET /api/lab-trends (Design §4.1). Auth-guarded.
// Reads canonical timeline points (panelled + legacy rows) and runs the pure
// trend engine. No DB writes; computation is deterministic.
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listTimelinePoints } from "@/lib/db/lab-panel-repo";
import { computeTrends } from "@/lib/lab-trends";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export async function GET() {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const supabase = await createClient();
    const points = await listTimelinePoints(supabase, user.id);
    return ok(computeTrends(points));
  });
}
