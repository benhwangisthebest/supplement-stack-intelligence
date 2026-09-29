// Infrastructure — StackItem persistence (Design §4 /api/stacks/:id/items).
// Ownership is enforced by RLS via the parent stack (Design §3.3 policies).
//
// [Phase 4 U10 (c)] EVERY UPDATE IS A COMPARE-AND-SET ON (id, version). It sets
// version = expected + 1 WHERE id = … AND version = expected (migration 0011), so
// a write built from a stale read matches no row. A filter here carries an id
// (or the parent stack's id) and a version, never a field value: a PostgREST
// filter travels in the URL query string, which the API gateway logs (FU-78,
// §2.3 rule 15). A delete removes the row, so any later compare-and-set on it
// misses. An insert takes version 0 from the column default.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StackItem } from "@/types";
import type { StackItemInput } from "@/lib/validation/schemas";
import { toStackItem } from "./mappers";
import type { StackItemRow } from "./types";

/** `toStackItem`, plus the version, which the shared mapper does not carry. */
export function toVersionedItem(row: StackItemRow): StackItem {
  return { ...toStackItem(row), version: row.version };
}

export async function listItems(
  supabase: SupabaseClient,
  stackId: string,
): Promise<StackItem[]> {
  const { data, error } = await supabase
    .from("stack_items")
    .select("*")
    .eq("stack_id", stackId);
  if (error) throw error;
  return (data as StackItemRow[]).map(toVersionedItem);
}

/** The item columns an input sets. Never `version`, which only a compare-and-set moves. */
function columnsOf(input: StackItemInput) {
  return {
    supplement_id: input.supplementId,
    custom_name: input.customName,
    dose: input.dose,
    unit: input.unit,
    timing: input.timing,
    frequency: input.frequency,
    reason: input.reason,
    notes: input.notes,
  };
}

export async function addItem(
  supabase: SupabaseClient,
  stackId: string,
  input: StackItemInput,
): Promise<StackItem> {
  const { data, error } = await supabase
    .from("stack_items")
    .insert({ stack_id: stackId, ...columnsOf(input) })
    .select("*")
    .single();
  if (error) throw error;
  return toVersionedItem(data as StackItemRow);
}

/**
 * Write `set` only while the item holds `expected`, moving it to `expected + 1`.
 * Returns the written item, or null when no row matched: the item changed or was
 * deleted since `expected` was read.
 */
async function writeAtVersion(
  supabase: SupabaseClient,
  itemId: string,
  set: Record<string, unknown>,
  expected: number,
): Promise<StackItem | null> {
  const { data, error } = await supabase
    .from("stack_items")
    .update({ ...set, version: expected + 1 })
    .eq("id", itemId)
    .eq("version", expected)
    .select("*");
  if (error) throw error;
  const rows = (data ?? []) as StackItemRow[];
  return rows.length > 0 ? toVersionedItem(rows[0]) : null;
}

/** How many times a Stack Lab edit re-reads the version before giving up. */
export const STACK_LAB_ATTEMPTS = 3;

/**
 * Stack Lab's edit. The user's own edit wins over whatever is there, as it always
 * has, so this re-reads the version and retries when another write lands between
 * its read and its write. [U10 (c), AC-6] It still moves the version, so an
 * advisor inverse built before it misses rather than overwriting it.
 */
export async function updateItem(
  supabase: SupabaseClient,
  itemId: string,
  input: StackItemInput,
): Promise<StackItem> {
  for (let attempt = 0; attempt < STACK_LAB_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from("stack_items")
      .select("version")
      .eq("id", itemId)
      .single();
    // No row is PGRST116 here, the error `.single()` on the update raised before.
    if (error) throw error;
    const written = await writeAtVersion(supabase, itemId, columnsOf(input), (data as { version: number }).version);
    if (written) return written;
  }
  throw new Error("stack item changed on every attempt");
}

export async function deleteItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<void> {
  const { error } = await supabase.from("stack_items").delete().eq("id", itemId);
  if (error) throw error;
}

// ---- advisor writes (Phase 4 U10 (b), (c)) -----------------------------------
// The advisor builds each inverse from the item as it read it. If another write
// lands in between, that inverse would restore a state that was not current, so
// every advisor write expects the version it read. Stack Lab does not call these.

/**
 * An advisor edit, applied only while the item holds `expectedVersion`. Null if not.
 *
 * Writes ONLY dose, unit, timing and frequency, the four columns an advisor edit
 * can change (`editToInput`); the other fields of `input` are ignored. A rollback
 * or undo restores the same four, which are all the edit changed.
 */
export async function updateItemAtVersion(
  supabase: SupabaseClient,
  itemId: string,
  input: StackItemInput,
  expectedVersion: number,
): Promise<StackItem | null> {
  const set = { dose: input.dose, unit: input.unit, timing: input.timing, frequency: input.frequency };
  return writeAtVersion(supabase, itemId, set, expectedVersion);
}

/** Attach (or clear, with null) a matched product, only while the item holds `expectedVersion`. */
export async function setItemProduct(
  supabase: SupabaseClient,
  itemId: string,
  productId: string | null,
  expectedVersion: number,
): Promise<StackItem | null> {
  return writeAtVersion(supabase, itemId, { product_id: productId }, expectedVersion);
}

/** Delete the item only while it holds `expectedVersion`. Returns whether it did. */
export async function deleteItemAtVersion(
  supabase: SupabaseClient,
  itemId: string,
  expectedVersion: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("stack_items")
    .delete()
    .eq("id", itemId)
    .eq("version", expectedVersion)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Postgres unique_violation: the primary key is taken. */
const UNIQUE_VIOLATION = "23505";

/**
 * Undo of a remove (N-104): put the item back under its id, at the version it
 * was deleted at, with its product. An item's versions only rise while it
 * exists, so no read can hold a later one, and a reader still holding this one
 * read exactly this state. Returns false when the id is taken again, which only
 * another restore can do; nothing is overwritten.
 */
export async function restoreItem(
  supabase: SupabaseClient,
  stackId: string,
  restore: { itemId: string; version: number; productId: string | null },
  input: StackItemInput,
): Promise<boolean> {
  const { error } = await supabase
    .from("stack_items")
    .insert({
      id: restore.itemId,
      stack_id: stackId,
      ...columnsOf(input),
      product_id: restore.productId,
      version: restore.version,
    })
    .select("id");
  if (error && (error as { code?: string }).code === UNIQUE_VIOLATION) return false;
  if (error) throw error;
  return true;
}
