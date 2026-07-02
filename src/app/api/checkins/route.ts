// Application — /api/checkins (daily-checkin v10, Design §4.2). Auth-guarded,
// RLS via checkin-repo. GET returns recent history + consistency; POST upserts
// today's check-in idempotently. No client-trusted derivation.
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { handle, ok, unauthorized } from "@/lib/api/respond";
import { listCheckins, upsertCheckin } from "@/lib/db/checkin-repo";
import { computeConsistency } from "@/lib/checkin";
import { checkinInputSchema } from "@/lib/validation/schemas";
import type { CheckinInput, DailyCheckin } from "@/types/checkin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  return handle(async () => {
    const days = Number(new URL(request.url).searchParams.get("days")) || 90;
    const supabase = await createClient();
    const checkins = await listCheckins(supabase, user.id, days);
    return ok({ checkins, consistency: computeConsistency(checkins) });
  });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  return handle<{ checkin: DailyCheckin }>(async () => {
    const input = checkinInputSchema.parse(await request.json()) as CheckinInput;
    const supabase = await createClient();
    const checkin = await upsertCheckin(supabase, user.id, input);
    return ok({ checkin });
  });
}
