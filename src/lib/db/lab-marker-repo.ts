// Infrastructure — LabMarker persistence (Design §4 /api/lab-markers).
import type { SupabaseClient } from "@supabase/supabase-js";
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
  const { data, error } = await supabase
    .from("lab_markers")
    .insert({
      user_id: userId,
      marker: input.marker,
      value: input.value,
      unit: input.unit,
      reference_low: input.referenceLow,
      reference_high: input.referenceHigh,
      date: input.date,
      notes: input.notes,
    })
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
