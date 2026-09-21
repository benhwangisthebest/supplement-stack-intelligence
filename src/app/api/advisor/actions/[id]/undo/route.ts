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
import { fail, handle, ok, notFound, unauthorized } from "@/lib/api/respond";
import { uuidParam } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  // [U34, N-72] THIS HANDLER NOW USES `handle()` LIKE THE OTHER ELEVEN, and
  // the reason is not uniformity.
  //
  // `await params` and `await createClient()` used to sit OUTSIDE the try. A
  // throw at either escaped the handler entirely, so Next.js answered with a
  // non-envelope 500 carrying **no correlation id** — the one 500 in this
  // application invisible to the log. Moving the boundary outward is what
  // closes that, structurally rather than by remembering.
  //
  // What the move does NOT buy, stated because U34's plan first claimed it
  // did: `auth-coverage.test.ts` and `error-disclosure.test.ts` already
  // scanned this file — the first derives its set from `git ls-files`, the
  // second names the file at `:395`. There was never a coverage gap here.
  //
  // `{ code: "UNDO_ERROR" }` preserves the declared code. The move is about
  // where the catch lives, not about re-labelling a response.
  //
  // [U30, N-51] And the bare `uuidParam.parse(id)` is back, identical to the
  // other eleven: a ZodError inside `handle()` is a 400 `VALIDATION_ERROR`
  // for free, so the `safeParse` special case U30 needed here is gone. M9
  // pins that the 400 is byte-identical either way.
  return handle(async () => {
    const { id } = await params;
    uuidParam.parse(id);
    const supabase = await createClient();

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
  }, { code: "UNDO_ERROR" });
}
