// Application — GET /api/advisor/conversations/:id (Design §4.1). Auth-guarded.
//
// OWNERSHIP IS CHECKED AT THE ROUTE (Phase 1 U21, the U19 shape applied to
// conversation reads):
//
//   1. the caller is authenticated — `getUser()`;
//   2. the conversation belongs to THAT caller — `conversationBelongsToUser`.
//
// HISTORY, because the previous behaviour was deliberate and documented rather
// than an oversight. This file used to say: "RLS (migration 0003) scopes messages
// to the owning user, so a foreign id simply yields an empty list rather than
// leaking another user's history." That was true, and it is why this was never a
// live vulnerability. What it was NOT is a property of this route — the route
// passed the path id straight to `getMessages` and had no ownership logic at all,
// borrowing one from the database instead. `CLAUDE.md` §4 rule 8: a trust
// boundary belongs in a testable module. Anything that later reads these rows
// through a path where RLS does not apply — a service-role client, a background
// job — inherits no protection from the policy.
//
// A foreign conversation answers 404, not 403 and not an empty 200. The earlier
// test file argued a 404 would be "an existence oracle for another user's
// conversation"; that reasoning applies to 403, which distinguishes "exists but
// is not yours" from "does not exist". A 404 gives the SAME answer to both, so it
// discloses nothing — the ruling §6.1.1 already settled for stack items.
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { conversationBelongsToUser, getMessages } from "@/lib/advisor/repo";
import { handle, notFound, ok, unauthorized } from "@/lib/api/respond";

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
    if (!(await conversationBelongsToUser(supabase, user.id, id))) {
      return notFound("Conversation");
    }
    const messages = await getMessages(supabase, id);
    return ok(messages);
  });
}
