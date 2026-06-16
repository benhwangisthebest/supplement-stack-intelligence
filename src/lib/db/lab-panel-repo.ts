// Infrastructure layer — lab_panels + panelled lab_markers persistence.
// Design Ref: §4.2 (commit recomputes canonical), §3.3 (additive, legacy-safe).
import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalize } from "@/lib/biomarkers";
import type { LabPanel, LabMarkerTimelinePoint } from "@/types/lab";
import type { LabCommitInput } from "@/lib/lab-import/schema";
import { toLabPanel, toTimelinePoint } from "./mappers";
import type { LabMarkerRow, LabPanelRow } from "./types";

/**
 * Persist an APPROVED set of markers as one dated panel. SAFETY (Design §4.2):
 * biomarker_id + canonical value/unit are recomputed HERE from (rawLabel, value,
 * unit) via lib/biomarkers — the client cannot inject canonical fields. Markers
 * whose unit/marker can't be canonicalized are still stored (raw-only), so they
 * appear in history but never anchor a (wrong) trend.
 */
export async function createPanelWithMarkers(
  supabase: SupabaseClient,
  userId: string,
  input: LabCommitInput,
): Promise<{ panelId: string; markerCount: number; collectedAt: string }> {
  const { data: panel, error: panelError } = await supabase
    .from("lab_panels")
    .insert({
      user_id: userId,
      source: input.source,
      collected_at: input.collectedAt,
    })
    .select("*")
    .single();
  if (panelError) throw panelError;
  const panelRow = panel as LabPanelRow;

  const rows = input.markers.map((m) => {
    const canon = canonicalize(m.rawLabel, m.value, m.unit);
    return {
      user_id: userId,
      panel_id: panelRow.id,
      marker: m.rawLabel,
      value: m.value,
      unit: m.unit,
      reference_low: m.referenceLow,
      reference_high: m.referenceHigh,
      date: input.collectedAt,
      notes: null,
      biomarker_id: canon?.biomarkerId ?? null,
      canonical_value: canon?.canonicalValue ?? null,
      canonical_unit: canon?.canonicalUnit ?? null,
    };
  });

  const { error: markerError } = await supabase.from("lab_markers").insert(rows);
  if (markerError) throw markerError;

  return {
    panelId: panelRow.id,
    markerCount: rows.length,
    collectedAt: panelRow.collected_at,
  };
}

export async function listPanels(
  supabase: SupabaseClient,
  userId: string,
): Promise<LabPanel[]> {
  const { data, error } = await supabase
    .from("lab_panels")
    .select("*")
    .eq("user_id", userId)
    .order("collected_at", { ascending: false });
  if (error) throw error;
  return (data as LabPanelRow[]).map(toLabPanel);
}

/**
 * All trend timeline points for a user: panelled rows (dated by their panel) and
 * legacy rows (dated by their own `date`). Rows lacking a canonical biomarker/
 * value or any date are dropped (can't anchor a trend). Two queries + JS join to
 * avoid depending on PostgREST embedding.
 */
export async function listTimelinePoints(
  supabase: SupabaseClient,
  userId: string,
): Promise<LabMarkerTimelinePoint[]> {
  const [{ data: markerData, error: mErr }, { data: panelData, error: pErr }] =
    await Promise.all([
      supabase.from("lab_markers").select("*").eq("user_id", userId),
      supabase.from("lab_panels").select("*").eq("user_id", userId),
    ]);
  if (mErr) throw mErr;
  if (pErr) throw pErr;

  const collectedById = new Map<string, string>(
    (panelData as LabPanelRow[]).map((p) => [p.id, p.collected_at]),
  );

  const points: LabMarkerTimelinePoint[] = [];
  for (const row of markerData as LabMarkerRow[]) {
    const panelCollectedAt = row.panel_id
      ? (collectedById.get(row.panel_id) ?? null)
      : null;
    const point = toTimelinePoint(row, panelCollectedAt);
    if (point) points.push(point);
  }
  return points;
}
