// Infrastructure — StackItem persistence (Design §4 /api/stacks/:id/items).
// Ownership is enforced by RLS via the parent stack (Design §3.3 policies).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StackItem } from "@/types";
import type { StackItemInput } from "@/lib/validation/schemas";
import { toStackItem } from "./mappers";
import type { StackItemRow } from "./types";

export async function listItems(
  supabase: SupabaseClient,
  stackId: string,
): Promise<StackItem[]> {
  const { data, error } = await supabase
    .from("stack_items")
    .select("*")
    .eq("stack_id", stackId);
  if (error) throw error;
  return (data as StackItemRow[]).map(toStackItem);
}

export async function addItem(
  supabase: SupabaseClient,
  stackId: string,
  input: StackItemInput,
): Promise<StackItem> {
  const { data, error } = await supabase
    .from("stack_items")
    .insert({
      stack_id: stackId,
      supplement_id: input.supplementId,
      custom_name: input.customName,
      dose: input.dose,
      unit: input.unit,
      timing: input.timing,
      frequency: input.frequency,
      reason: input.reason,
      notes: input.notes,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toStackItem(data as StackItemRow);
}

export async function updateItem(
  supabase: SupabaseClient,
  itemId: string,
  input: StackItemInput,
): Promise<StackItem> {
  const { data, error } = await supabase
    .from("stack_items")
    .update({
      supplement_id: input.supplementId,
      custom_name: input.customName,
      dose: input.dose,
      unit: input.unit,
      timing: input.timing,
      frequency: input.frequency,
      reason: input.reason,
      notes: input.notes,
    })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw error;
  return toStackItem(data as StackItemRow);
}

export async function deleteItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<void> {
  const { error } = await supabase.from("stack_items").delete().eq("id", itemId);
  if (error) throw error;
}
