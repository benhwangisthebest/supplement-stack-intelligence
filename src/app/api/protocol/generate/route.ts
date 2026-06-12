// Application — POST /api/protocol/generate (Design §4.2). I/O only; rules live in lib/protocol-builder.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getStack } from "@/lib/db/stack-repo";
import { listItems } from "@/lib/db/stack-item-repo";
import { getProfile } from "@/lib/db/profile-repo";
import { listLabMarkers } from "@/lib/db/lab-marker-repo";
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

    const [profile, labMarkers, stackItems] = await Promise.all([
      getProfile(supabase, user.id),
      listLabMarkers(supabase, user.id),
      listItems(supabase, stackId),
    ]);

    // Plan SC: ephemeral, deterministic generation from profile (no Protocol persisted).
    const result = generateProtocol({ profile, labMarkers, stackItems });
    return ok(result);
  });
}
