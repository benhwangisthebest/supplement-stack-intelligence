import type { OutcomeCategory } from "./index";

export type StackIntent = OutcomeCategory | "experimental";
export type StackMode = "current" | "planned";

export type ItemTiming =
  | "morning"
  | "midday"
  | "evening"
  | "pre-workout"
  | "with-meal"
  | "bedtime";

export type ItemFrequency = "daily" | "workout-days" | "as-needed" | "weekly";

// Design §3.1 — persisted (Supabase)
export interface Stack {
  id: string;
  userId: string;
  name: string;
  intent: StackIntent;
  mode: StackMode;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// Design §3.1 — persisted (Supabase)
export interface StackItem {
  id: string;
  stackId: string;
  supplementId: string | null;
  customName: string | null;
  dose: number;
  unit: string;
  timing: ItemTiming | null;
  frequency: ItemFrequency | null;
  reason: string | null;
  notes: string | null;
  /** v8 advisor-experience: the matched product attached to this item (migration
   *  0004 column). Read-only display field — affects no evaluation, so it's OPTIONAL
   *  and ignored by the engines; the domain still treats items product-agnostically. */
  productId?: string | null;
}
