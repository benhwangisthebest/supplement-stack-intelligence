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

// ---- advisor-actions v7: product attachment (DB-only column; the StackItem domain
// type intentionally does NOT carry product_id — the attachment affects no evaluation,
// so it stays a persistence detail). Migration 0004. ---------------------------------

/** The product_id currently attached to an item (null if none) — for undo snapshots. */
export async function getItemProductId(
  supabase: SupabaseClient,
  itemId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("stack_items")
    .select("product_id")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw error;
  return (data?.product_id as string | null | undefined) ?? null;
}

/**
 * What the caller believes `product_id` holds right now. `{ current }` makes the
 * write a compare-and-set; `"unconditional"` is the old last-writer-wins write,
 * named so that no caller gets it by omission.
 */
export type ProductExpectation = { current: string | null } | "unconditional";

/**
 * Attach (or clear, with null) a matched product on a stack item. Returns whether
 * the row was written.
 *
 * [Phase 4 U10, FU-1] With `{ current }`, the expected value is part of the
 * UPDATE's WHERE clause, so Postgres writes only if the column still holds what
 * the caller read. Zero rows back means another write got there first: the
 * caller's read is stale, and so is any inverse built from it. `null` needs
 * IS NULL, because `= NULL` matches no row.
 */
export async function setItemProduct(
  supabase: SupabaseClient,
  itemId: string,
  productId: string | null,
  expect: ProductExpectation,
): Promise<boolean> {
  let query = supabase
    .from("stack_items")
    .update({ product_id: productId })
    .eq("id", itemId);
  if (expect !== "unconditional") {
    query =
      expect.current === null
        ? query.is("product_id", null)
        : query.eq("product_id", expect.current);
  }
  const { data, error } = await query.select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
