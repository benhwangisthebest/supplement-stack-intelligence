// Infrastructure — Stack persistence (Design §4 /api/stacks).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stack } from "@/types";
import type { StackInput } from "@/lib/validation/schemas";
import { toStack } from "./mappers";
import type { StackRow } from "./types";

export async function listStacks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Stack[]> {
  const { data, error } = await supabase
    .from("stacks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as StackRow[]).map(toStack);
}

export async function getStack(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<Stack | null> {
  const { data, error } = await supabase
    .from("stacks")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toStack(data as StackRow) : null;
}

export async function createStack(
  supabase: SupabaseClient,
  userId: string,
  input: StackInput,
): Promise<Stack> {
  const { data, error } = await supabase
    .from("stacks")
    .insert({
      user_id: userId,
      name: input.name,
      intent: input.intent,
      mode: input.mode,
      description: input.description,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toStack(data as StackRow);
}

export async function updateStack(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: StackInput,
): Promise<Stack> {
  const { data, error } = await supabase
    .from("stacks")
    .update({
      name: input.name,
      intent: input.intent,
      mode: input.mode,
      description: input.description,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return toStack(data as StackRow);
}

export async function deleteStack(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("stacks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
