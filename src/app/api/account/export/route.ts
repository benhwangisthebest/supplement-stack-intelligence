// Application — GET /api/account/export (roadmap 8, read half; Phase 2 U16).
// Auth-guarded. Returns every row the twelve user-owned tables hold for the
// caller.
//
// NO REQUEST INPUT, so no 400 path exists: `GET()` is a zero-arg handler and
// there is no value a caller could supply for it to reject. That places it in
// category A of the route-test 400-exemption list, which Phase 2 U16 turned
// from prose into `src/architecture/route-contract.test.ts` (FU-13).
//
// NOTHING HERE MAY LOG THE PAYLOAD. It is the caller's complete health record —
// medications, conditions, lab results, side effects — and §2.3 rule 15 says
// health data is not logged. The proof is behavioural, in route.test.ts: every
// `console` method is spied during a real export and asserted never to receive
// a sentinel value. A grep for `console.` in this file would only ever have
// checked this file; the spy covers the whole call path beneath it.
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { exportUserData } from "@/lib/db/export-repo";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export async function GET() {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const supabase = await createClient();
    const data = await exportUserData(supabase, user.id);
    return ok(data);
  });
}
