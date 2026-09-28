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

// ---- Phase 4 U10 (b), N-102: compare-and-set for the advisor's edit and remove ----
// The advisor builds an edit's or a remove's inverse from the item as it read it.
// If another write lands between that read and this one, the inverse restores
// values that were not current, and undo would erase that write. So the advisor
// writes only WHERE the item still holds what it read. Zero rows back means it
// did not; the caller treats that as stale. Stack Lab's own edits keep
// `updateItem` / `deleteItem` above, unchanged.

/**
 * Narrow a query to the item still holding `expected` in its structured columns.
 *
 * reason, notes and custom_name are NOT compared. They are the user's free text,
 * and a PostgREST filter travels in the URL query string, which the API gateway
 * logs (§2.3 rule 15). A concurrent change to only those three is therefore not
 * detected. null needs IS NULL, because `= NULL` matches no row.
 */
function whereItemHolds<Q extends { eq(c: string, v: unknown): Q; is(c: string, v: null): Q }>(
  query: Q,
  expected: StackItemInput,
): Q {
  const nullable: [string, string | null][] = [
    ["supplement_id", expected.supplementId],
    ["timing", expected.timing],
    ["frequency", expected.frequency],
  ];
  let q = query.eq("dose", expected.dose).eq("unit", expected.unit);
  for (const [column, value] of nullable) q = value === null ? q.is(column, null) : q.eq(column, value);
  return q;
}

/**
 * An advisor edit, applied only if the item still holds `expected`. Null if it did not.
 *
 * Writes ONLY dose, unit, timing and frequency, the four columns an advisor edit
 * can change (`editToInput`); the other fields of `input` are ignored. The WHERE
 * clause does not compare free text, so writing it back from the advisor's read
 * would silently undo a concurrent Stack Lab edit to reason, notes or custom_name
 * (AC-6 review, A1). A rollback restores the same four, which are all the edit
 * changed.
 */
export async function updateItemIfUnchanged(
  supabase: SupabaseClient,
  itemId: string,
  input: StackItemInput,
  expected: StackItemInput,
): Promise<StackItem | null> {
  const query = supabase
    .from("stack_items")
    .update({ dose: input.dose, unit: input.unit, timing: input.timing, frequency: input.frequency })
    .eq("id", itemId);
  const { data, error } = await whereItemHolds(query, expected).select("*");
  if (error) throw error;
  const rows = (data ?? []) as StackItemRow[];
  return rows.length > 0 ? toStackItem(rows[0]) : null;
}

/** `deleteItem`, applied only if the item still holds `expected`. Returns whether it was. */
export async function deleteItemIfUnchanged(
  supabase: SupabaseClient,
  itemId: string,
  expected: StackItemInput,
): Promise<boolean> {
  const query = supabase.from("stack_items").delete().eq("id", itemId);
  const { data, error } = await whereItemHolds(query, expected).select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
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
 * What the caller believes `product_id` holds right now. Every write is a
 * compare-and-set. [U10 (b), N-101] The `"unconditional"` variant is gone: undo's
 * replay was its last caller, and it now expects the product the attach wrote.
 */
export type ProductExpectation = { current: string | null };

/**
 * Attach (or clear, with null) a matched product on a stack item. Returns whether
 * the row was written.
 *
 * [Phase 4 U10, FU-1] The expected value is part of the
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
  const query = supabase
    .from("stack_items")
    .update({ product_id: productId })
    .eq("id", itemId);
  const { data, error } = await (
    expect.current === null
      ? query.is("product_id", null)
      : query.eq("product_id", expect.current)
  ).select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
