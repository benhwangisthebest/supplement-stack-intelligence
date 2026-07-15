// Infrastructure — side-effect report persistence (side-effect-engine v11, Design §4).
// RLS-scoped to the owner via the own_side_effects policy (0007). Idempotent
// per-day replace so re-submitting a day's check-in never duplicates rows.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportedSideEffect, SideEffectReport } from "@/types/side-effect";
import { toSideEffectReport } from "./mappers";
import type { SideEffectReportRow } from "./types";

const WINDOW_DEFAULT = 90;

/** Recent reports, newest first, bounded to a trailing window (days). */
export async function listSideEffectReports(
  supabase: SupabaseClient,
  userId: string,
  days: number = WINDOW_DEFAULT,
): Promise<SideEffectReport[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("side_effect_reports")
    .select("*")
    .eq("user_id", userId)
    .gte("report_date", since)
    .order("report_date", { ascending: false });
  if (error) throw error;
  return (data as SideEffectReportRow[]).map(toSideEffectReport);
}

/**
 * Idempotent per-day replace: delete the day's rows, then insert the new set.
 * An empty `reports` array clears the day. De-dups by canonical label to
 * respect the unique(user, date, effect_label) constraint.
 */
export async function replaceReportsForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  reports: ReportedSideEffect[],
): Promise<SideEffectReport[]> {
  const { error: delError } = await supabase
    .from("side_effect_reports")
    .delete()
    .eq("user_id", userId)
    .eq("report_date", date);
  if (delError) throw delError;

  if (reports.length === 0) return [];

  const byLabel = new Map<string, ReportedSideEffect>();
  for (const r of reports) byLabel.set(r.effectLabel, r);

  const rows = [...byLabel.values()].map((r) => ({
    user_id: userId,
    report_date: date,
    effect_label: r.effectLabel,
    severity: r.severity ?? null,
    note: r.note ?? null,
  }));

  const { data, error } = await supabase
    .from("side_effect_reports")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data as SideEffectReportRow[]).map(toSideEffectReport);
}
