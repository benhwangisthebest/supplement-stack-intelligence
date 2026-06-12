// Application — /api/profile (Design §4.1). Auth-guarded + Zod-validated.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getProfile, upsertProfile } from "@/lib/db/profile-repo";
import { profileInputSchema } from "@/lib/validation/schemas";
import { handle, ok, unauthorized } from "@/lib/api/respond";

export async function GET() {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const supabase = await createClient();
    const profile = await getProfile(supabase, user.id);
    return ok(profile);
  });
}

export async function PUT(request: NextRequest) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();
    const body = await request.json();
    const input = profileInputSchema.parse(body); // throws ZodError -> 400
    const supabase = await createClient();
    const profile = await upsertProfile(supabase, user.id, input);
    return ok(profile);
  });
}
