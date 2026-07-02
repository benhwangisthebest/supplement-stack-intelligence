// Application — GET /api/identity (Design §4.2). Auth-guarded, RLS via existing
// repos. Derives the user's IdentityCard + per-stack archetypes from server-loaded
// owned data only (no request body, no client-trusted input). Plan SC9.
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { handle, ok, unauthorized } from "@/lib/api/respond";
import { loadIdentityContext } from "@/lib/identity/context";
import { deriveStackArchetype, deriveUserIdentity } from "@/lib/identity";
import type { IdentityCard, StackArchetype } from "@/types/identity";

export const dynamic = "force-dynamic";

interface IdentityPayload {
  card: IdentityCard;
  stackArchetypes: StackArchetype[];
}

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  return handle<IdentityPayload>(async () => {
    const supabase = await createClient();
    const ctx = await loadIdentityContext(supabase, user.id);

    // Pure derivations (lib/identity) — deterministic, no I/O.
    const card = deriveUserIdentity(ctx);
    const stackArchetypes = ctx.stacks.map((stack) => deriveStackArchetype(stack, ctx));

    return ok<IdentityPayload>({ card, stackArchetypes });
  });
}
