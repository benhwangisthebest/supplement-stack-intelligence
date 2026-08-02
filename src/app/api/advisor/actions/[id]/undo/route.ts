// Application — POST /api/advisor/actions/:id/undo (Design §4.2). Replays the
// stored inverse(s) via the existing repos and flips the audit row(s) to 'undone'.
// RLS scopes the action to its owner; double-undo is guarded by status. SC-7.
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
import { fail, internalError, ok, notFound, unauthorized } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const supabase = await createClient();

  try {
    const action = await getAction(supabase, id);
    if (!action) return notFound("Action");
    if (action.status === "undone") {
      return fail("ALREADY_UNDONE", "This action has already been undone.", 409);
    }

    // Grouped undo for a batch; single-row undo otherwise (incl. legacy v7 rows).
    const rows = action.batchId
      ? (await getActionsByBatch(supabase, action.batchId)).filter(
          (r) => r.status === "applied",
        )
      : [action];

    // Reverse in REVERSE apply order so dependent writes unwind correctly.
    for (let i = rows.length - 1; i >= 0; i--) {
      await executeIntent(supabase, user.id, rows[i].inverse);
      await markUndone(supabase, rows[i].id);
    }

    return ok({ id, undone: true, batchId: action.batchId, count: rows.length });
  } catch (err) {
    return internalError(err, { code: "UNDO_ERROR" });
  }
}
