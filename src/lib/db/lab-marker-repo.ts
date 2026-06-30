// Infrastructure — LabMarker persistence (Design §4 /api/lab-markers).
import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalize } from "@/lib/biomarkers";
import type { LabMarker } from "@/types";
import type { LabMarkerInput } from "@/lib/validation/schemas";
import { toLabMarker } from "./mappers";
import type { LabMarkerRow } from "./types";

export async function listLabMarkers(
  supabase: SupabaseClient,
  userId: string,
): Promise<LabMarker[]> {
  const { data, error } = await supabase
    .from("lab_markers")
    .select("*")
    .eq("user_id", userId)
    .order("marker", { ascending: true });
  if (error) throw error;
  return (data as LabMarkerRow[]).map(toLabMarker);
}

export async function createLabMarker(
  supabase: SupabaseClient,
  userId: string,
  input: LabMarkerInput,
): Promise<LabMarker> {
  // Canonicalize so manual entries become timeline points too (recognized markers
  // only — same rule as the upload path). Default the date to today so the point
  // has a timeline axis; without a date `toTimelinePoint` drops the row.
  const canon = canonicalize(input.marker, input.value, input.unit);
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("lab_markers")
    .insert({
      user_id: userId,
      marker: input.marker,
      value: input.value,
      unit: input.unit,
      reference_low: input.referenceLow,
      reference_high: input.referenceHigh,
      date,
      notes: input.notes,
      biomarker_id: canon?.biomarkerId ?? null,
      canonical_value: canon?.canonicalValue ?? null,
      canonical_unit: canon?.canonicalUnit ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toLabMarker(data as LabMarkerRow);
}

export async function updateLabMarker(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: LabMarkerInput,
): Promise<LabMarker> {
  // Re-canonicalize on edit so the timeline/chart reflect the new value/unit.
  const canon = canonicalize(input.marker, input.value, input.unit);
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("lab_markers")
    .update({
      marker: input.marker,
      value: input.value,
      unit: input.unit,
      reference_low: input.referenceLow,
      reference_high: input.referenceHigh,
      date,
      notes: input.notes,
      biomarker_id: canon?.biomarkerId ?? null,
      canonical_value: canon?.canonicalValue ?? null,
      canonical_unit: canon?.canonicalUnit ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return toLabMarker(data as LabMarkerRow);
}

export async function deleteLabMarker(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("lab_markers")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
