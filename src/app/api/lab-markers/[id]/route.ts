// Application — /api/lab-markers/:id (Design §4.1). Delete own marker.
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { deleteLabMarker } from "@/lib/db/lab-marker-repo";
import { handle, ok, unauthorized } from "@/lib/api/respond";

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
