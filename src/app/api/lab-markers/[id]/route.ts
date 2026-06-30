// Application — /api/lab-markers/:id (Design §4.1). Edit or delete own marker.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { deleteLabMarker, updateLabMarker } from "@/lib/db/lab-marker-repo";
import { labMarkerInputSchema } from "@/lib/validation/schemas";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const input = labMarkerInputSchema.parse(await request.json());
    const supabase = await createClient();
    return ok(await updateLabMarker(supabase, user.id, id, input));
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const supabase = await createClient();
    await deleteLabMarker(supabase, user.id, id);
    return ok({ id });
  });
}
