// Application — POST /api/lab-import/commit (Design §4.2).
// Persists an APPROVED set of markers as one dated panel. The schema requires
// ≥1 marker (the confirm gate, server-enforced) and carries NO canonical fields
// — the repo recomputes biomarker_id + canonical value/unit via lib/biomarkers.
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createPanelWithMarkers } from "@/lib/db/lab-panel-repo";
import { labCommitSchema } from "@/lib/lab-import/schema";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const input = labCommitSchema.parse(await request.json());
    const supabase = await createClient();
    const result = await createPanelWithMarkers(supabase, user.id, input);
    return ok(result, 201);
  });
}
