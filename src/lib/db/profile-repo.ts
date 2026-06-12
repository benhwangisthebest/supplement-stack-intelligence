// Infrastructure — UserProfile persistence (Design §4 /api/profile).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types";
import type { ProfileInput } from "@/lib/validation/schemas";
import { toUserProfile } from "./mappers";
import type { UserProfileRow } from "./types";

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toUserProfile(data as UserProfileRow) : null;
}

export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileInput,
): Promise<UserProfile> {
  const row = {
    user_id: userId,
    goals: input.goals,
    diet: input.diet,
    risk_tolerance: input.riskTolerance,
    allergies: input.allergies,
    medications: input.medications,
    avoided_ingredients: input.avoidedIngredients,
    form_preferences: input.formPreferences,
    caffeine_sensitivity: input.caffeineSensitivity,
    experience_level: input.experienceLevel,
    notes: input.notes,
  };
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return toUserProfile(data as UserProfileRow);
}
