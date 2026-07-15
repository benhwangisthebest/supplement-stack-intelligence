// Application — /api/side-effects (side-effect-engine v11, Design §4.2). Auth-guarded,
// RLS via side-effect-repo. GET returns the user's recent structured reports for the
// Profile timeline. Writes happen through POST /api/checkins (same date semantics).
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { handle, ok, unauthorized } from "@/lib/api/respond";
import { listSideEffectReports } from "@/lib/db/side-effect-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  return handle(async () => {
    const days = Number(new URL(request.url).searchParams.get("days")) || 90;
    const supabase = await createClient();
    const reports = await listSideEffectReports(supabase, user.id, days);
    return ok({ reports });
  });
}
