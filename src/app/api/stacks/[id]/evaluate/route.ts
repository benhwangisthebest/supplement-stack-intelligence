// Application — POST /api/stacks/:id/evaluate (Design §4.2). The core-loop endpoint.
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { runEvaluation } from "@/services/evaluation";
import { handle, notFound, ok, unauthorized } from "@/lib/api/respond";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const supabase = await createClient();
    const result = await runEvaluation(supabase, user.id, id);
    if (!result) return notFound("Stack");
    return ok(result);
  });
}
