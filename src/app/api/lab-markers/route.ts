// Application — /api/lab-markers (Design §4.1). Auth-guarded + Zod-validated.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { createLabMarker, listLabMarkers } from "@/lib/db/lab-marker-repo";
import { labMarkerInputSchema } from "@/lib/validation/schemas";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export async function GET() {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const supabase = await createClient();
    const markers = await listLabMarkers(supabase, user.id);
    return ok(markers);
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const body = await request.json();
    const input = labMarkerInputSchema.parse(body);
    const supabase = await createClient();
    const marker = await createLabMarker(supabase, user.id, input);
    return ok(marker, 201);
  });
}
