// Infrastructure — self-service data deletion (Phase 2 U17, roadmap 8 write half).
//
// ===========================================================================
// WHY THIS TAKES NO USER ID — and why that is a security property, not a style
// ===========================================================================
// It calls `delete_all_user_data()`, a SECURITY DEFINER function that derives
// its owner from `auth.uid()` INSIDE the database and accepts no arguments.
// Passing a user id from TypeScript would be, at best, decorative: the function
// would ignore it. At worst it is the shape that invites someone to add a
// `p_user_id` parameter to "make it work", which would let any authenticated
// caller erase any account.
//
// A consequence worth stating, because it changes what can be tested here: the
// ownership scoping of this operation is NOT testable from TypeScript. There is
// no wrong-id to substitute — that mutation would be a no-op, which is Phase 1
// §6.2.2's lesson one level down. The proof lives in `npm run verify:migrations`,
// which seeds two users, deletes as one, and asserts the other's rows survive.
//
// ===========================================================================
// WHY ONE RPC AND NOT TWELVE DELETES
// ===========================================================================
// `advisor_usage` is SELECT-only for the end user (migration 0008, Phase 2 U3 —
// so a user cannot reset their own token budget). It is also one of the twelve
// tables the deletion criterion covers. A client-side loop would be filtered to
// zero rows on that table BY RLS, SILENTLY — an RLS denial of DELETE is an empty
// result, not an error (measured, OP-2) — and would report success with the
// user's usage history intact.
//
// The RPC is also the only way this is atomic: supabase-js has no transaction
// API, so twelve separate deletes can half-complete.
import type { SupabaseClient } from "@supabase/supabase-js";
import { USER_OWNED_TABLES } from "./export-repo";

/** Rows removed, per table. Reported so the API can say what it actually did. */
export type DeletionCounts = Record<string, number>;

export interface DeletionResult {
  deleted: DeletionCounts;
  totalRows: number;
}

/**
 * Delete every row the twelve user-owned tables hold for the CALLING user.
 *
 * Throws if the RPC fails. That is deliberate and is pinned by test: a failed
 * deletion must surface as a failure with no counts, never as a partial success.
 * The route turns it into a 500 and reports nothing deleted.
 */
export async function deleteAllForCaller(supabase: SupabaseClient): Promise<DeletionResult> {
  const { data, error } = await supabase.rpc("delete_all_user_data");
  if (error) throw error;

  const deleted = (data ?? {}) as DeletionCounts;

  // The function returns one key per table it deleted from. If that set ever
  // drifts from the export's set, the two halves of the criterion disagree
  // about what "the user's data" means — and the user is the one who finds out.
  const missing = USER_OWNED_TABLES.filter((t) => !(t in deleted));
  if (missing.length > 0) {
    throw new Error(
      `delete_all_user_data() reported no count for: ${missing.join(", ")}. ` +
        "The database function and the application's table set have diverged; refusing to " +
        "report a deletion as complete when a table is unaccounted for.",
    );
  }

  return {
    deleted,
    totalRows: Object.values(deleted).reduce((sum, n) => sum + n, 0),
  };
}
