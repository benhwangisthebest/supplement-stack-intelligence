// Application — POST /api/advisor/actions/:id/undo (Design §4.2). Replays the
// stored inverse(s) via the existing repos and flips the audit row(s) to 'undone'.
// The repo binds the action to its owner (U26) and RLS backs it; double-undo is
// guarded by status. SC-7.
// v8 advisor-experience: if the action belongs to a BATCH (batch_id set), undo is
// GROUPED — every still-applied sibling is reversed in REVERSE apply order so the
// whole multi-action change is undone in one click (Design §3.3).
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  getAction,
  getActionsByBatch,
  markUndone,
} from "@/lib/db/advisor-action-repo";
import { executeIntent } from "@/lib/advisor/actions/execute";
import {
  fail,
  internalError,
  ok,
  notFound,
  unauthorized,
  validationError,
} from "@/lib/api/respond";
import { uuidParam } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;

  // [U30, N-51] `safeParse` + an explicit `validationError`, NOT the bare
  // `uuidParam.parse(...)` the other eleven handlers use — because this
  // handler does not run inside `handle()` (N-72). Its own catch maps
  // everything to `internalError(..., { code: "UNDO_ERROR" })` → 500, so a
  // thrown ZodError here would be a 500 with the wrong code rather than the
  // 400 every other route gets for free. The body is identical to theirs;
  // only the route to it differs. N-72 is owned by U34, which decides whether
  // this handler moves onto `handle()` or stays exempt with a written reason.
  const parsedId = uuidParam.safeParse(id);
  if (!parsedId.success) return validationError(parsedId.error);
  const supabase = await createClient();

  try {
    const action = await getAction(supabase, user.id, id);
    if (!action) return notFound("Action");
    if (action.status === "undone") {
      return fail("ALREADY_UNDONE", "This action has already been undone.", 409);
    }

    // Grouped undo for a batch; single-row undo otherwise (incl. legacy v7 rows).
    const rows = action.batchId
      ? (await getActionsByBatch(supabase, user.id, action.batchId)).filter(
          (r) => r.status === "applied",
        )
      : [action];

    // Reverse in REVERSE apply order so dependent writes unwind correctly.
    for (let i = rows.length - 1; i >= 0; i--) {
      await executeIntent(supabase, user.id, rows[i].inverse);
      await markUndone(supabase, user.id, rows[i].id);
    }

    return ok({ id, undone: true, batchId: action.batchId, count: rows.length });
  } catch (err) {
    return internalError(err, { code: "UNDO_ERROR" });
  }
}
