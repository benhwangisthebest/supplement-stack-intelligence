// Infrastructure — DailyCheckin persistence (daily-checkin v10, Design §4).
// RLS-scoped to the owner via the own_checkins policy (0006). Idempotent daily
// upsert on the (user_id, checkin_date) unique constraint.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckinInput, DailyCheckin } from "@/types/checkin";
import { toCheckin } from "./mappers";
import type { CheckinRow } from "./types";

const CHECKIN_WINDOW_DEFAULT = 90;

/** Recent check-ins, newest first, bounded to a trailing window (days). */
/**
 * EVERY check-in this user has, oldest first — no window.
 *
 * Added by Phase 2 U16. `listCheckins` below defaults to a 90-DAY WINDOW, which
 * is right for a dashboard and silently wrong for a data export: it would omit
 * everything older than 90 days and the response would look complete. Expressing
 * "all of it" as a large `days` argument would be a lie shaped like a parameter,
 * so the export gets a reader that has no window to get wrong.
 */
export async function listAllCheckins(
  supabase: SupabaseClient,
  userId: string,
): Promise<DailyCheckin[]> {
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: true });
  if (error) throw error;
  return (data as CheckinRow[]).map(toCheckin);
}

export async function listCheckins(
  supabase: SupabaseClient,
  userId: string,
  days: number = CHECKIN_WINDOW_DEFAULT,
): Promise<DailyCheckin[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_date", since)
    .order("checkin_date", { ascending: false });
  if (error) throw error;
  return (data as CheckinRow[]).map(toCheckin);
}

/** A single day's check-in, or null. */
export async function getCheckin(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<DailyCheckin | null> {
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("checkin_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? toCheckin(data as CheckinRow) : null;
}

/** Idempotent upsert of today's check-in (one row per user per day). */
export async function upsertCheckin(
  supabase: SupabaseClient,
  userId: string,
  input: CheckinInput,
): Promise<DailyCheckin> {
  const row = {
    user_id: userId,
    checkin_date: input.date,
    ratings: input.ratings,
    taken: input.taken,
    scheduled: input.scheduled,
    note: input.note ?? null,
    side_effect: input.sideEffect ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("checkins")
    .upsert(row, { onConflict: "user_id,checkin_date" })
    .select("*")
    .single();
  if (error) throw error;
  return toCheckin(data as CheckinRow);
}
