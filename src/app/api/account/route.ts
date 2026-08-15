// Application — DELETE /api/account (roadmap 8, write half; Phase 2 U17).
// Auth-guarded. Irreversibly deletes the caller's rows across the twelve
// user-owned tables.
//
// THE HIGHEST-RISK ROUTE IN THIS REPOSITORY. Everything it does is
// irreversible, and the database function behind it runs with definer
// privileges. Three properties carry that risk, each pinned by test:
//
//   1. CONFIRMATION. A DELETE without the exact literal deletes nothing — and
//      "nothing" is asserted as ZERO CALLS to the repository, not merely as a
//      400 response. GATE D2.
//   2. SCOPE. The route passes no user id anywhere. `delete_all_user_data()`
//      derives its owner from `auth.uid()` in the database; there is nothing
//      here to get wrong, which is the point.
//   3. HONEST FAILURE. If the RPC fails, the response is a 500 with NO deletion
//      counts. A partial or unknown outcome must never be reported as success.
//
// WHAT SURVIVES, and why the response says so rather than leaving a user to
// find out: the `auth.users` identity row (deleting it needs the service-role
// key, which §2.3 rule 14 confines to the dev seed script) and `api_rate_limits`
// rows, which carry `user_id` but are SELECT-only and excluded from the twelve.
// "Delete my data" is satisfiable here; "delete my account" is not.
//
// NOTHING ON THIS PATH LOGS THE RESULT. Deletion counts are health-data-adjacent
// — they reveal how many lab panels, side effects and advisor exchanges a person
// had. §2.3 rule 15 applies, and the proof is behavioural, in two halves
// (route.test.ts here, delete-repo.test.ts one layer down), because a spy in a
// file that mocks the repository cannot see the repository — U16's M5.
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteAllForCaller } from "@/lib/db/delete-repo";
import { handle, ok, unauthorized, validationError } from "@/lib/api/respond";
import { deleteAccountSchema } from "@/lib/api/deletion-confirmation";

// The confirmation contract lives in `@/lib/api/deletion-confirmation` — a route
// module may export only handlers and route config (Next type-checks the rest
// against `never`), and §4 rule 8 wants a trust boundary in a testable module
// anyway. See that file's header.

/** Stated in the response, per U16's `notIncluded` precedent. */
const RETAINED = [
  {
    what: "Your account identity — email address and sign-in metadata.",
    where: "Supabase's `auth.users`.",
    why:
      "Deleting it requires the service-role key, which this application deliberately does not hold " +
      "outside its development seed script. Your data has been deleted; your account still exists. " +
      "To remove the account itself, contact the operator.",
  },
  {
    what: "Rate-limiter counters.",
    where: "`api_rate_limits`.",
    why:
      "Rows there are keyed on an opaque bucket rather than on you, and are removed only when the " +
      "account itself is. They record request timing, not health information.",
  },
];

export async function DELETE(request: Request) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();

    // Parsed BEFORE any client is created and before anything is read, so the
    // unconfirmed path cannot touch the database even incidentally.
    const body = await request.json().catch(() => ({}));
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const supabase = await createClient();
    const result = await deleteAllForCaller(supabase);

    return ok({
      deleted: result.deleted,
      totalRowsDeleted: result.totalRows,
      retained: RETAINED,
    });
  });
}
