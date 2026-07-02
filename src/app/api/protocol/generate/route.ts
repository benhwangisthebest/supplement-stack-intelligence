// Application — POST /api/protocol/generate (Design §4.2). I/O only; rules live in lib/protocol-builder.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getStack } from "@/lib/db/stack-repo";
import { listItems } from "@/lib/db/stack-item-repo";
import { getProfile } from "@/lib/db/profile-repo";
import { listLabMarkers } from "@/lib/db/lab-marker-repo";
import { listTimelinePoints } from "@/lib/db/lab-panel-repo";
import { listCheckins } from "@/lib/db/checkin-repo";
import { computeTrends } from "@/lib/lab-trends";
import { analyzeCheckins } from "@/lib/checkin";
import { generateProtocol } from "@/lib/protocol-builder";
import { generateProtocolSchema } from "@/lib/validation/schemas";
import { handle, notFound, ok, unauthorized } from "@/lib/api/respond";

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();

    const { stackId } = generateProtocolSchema.parse(await request.json());
    const supabase = await createClient();

    // stackId is the accept target + alreadyInStack source; verify ownership.
    const stack = await getStack(supabase, user.id, stackId);
    if (!stack) return notFound("Stack");

    const [profile, labMarkers, stackItems, points, checkins] = await Promise.all([
      getProfile(supabase, user.id),
      listLabMarkers(supabase, user.id),
      listItems(supabase, stackId),
      listTimelinePoints(supabase, user.id),
      listCheckins(supabase, user.id),
    ]);

    // Plan SC: ephemeral, deterministic generation from profile (no Protocol persisted).
    // daily-checkin v10: bounded, evidence-subordinate feedback nudge (server-derived
    // from the user's own check-ins — never client-supplied).
    const trends = computeTrends(points);
    const feedbackSignal = analyzeCheckins(checkins).feedback;
    const result = generateProtocol({ profile, labMarkers, trends, stackItems, feedbackSignal });
    return ok(result);
  });
}
