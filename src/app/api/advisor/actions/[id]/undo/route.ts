// Application — POST /api/advisor/actions/:id/undo (Design §4.2). Replays the
// stored inverse via the existing repos and flips the audit row to 'undone'.
// RLS scopes the action to its owner; double-undo is guarded by status. SC-7.
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAction, markUndone } from "@/lib/db/advisor-action-repo";
import { executeIntent } from "@/lib/advisor/actions/execute";
import { fail, ok, notFound, unauthorized } from "@/lib/api/respond";

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

    await executeIntent(supabase, user.id, action.inverse);
    await markUndone(supabase, id);

    return ok({ id, undone: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Undo failed.";
    return fail("UNDO_ERROR", message, 500);
  }
}
