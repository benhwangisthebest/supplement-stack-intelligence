import type { OutcomeCategory } from "./primitives";

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

// ---- write contracts (Domain-owned) -----------------------------------------
// These describe the OUTPUT shape (z.infer) of the Zod input schemas in
// lib/validation/schemas.ts — defaults are already resolved, so every
// `.default()` field is REQUIRED-but-nullable, never optional.
//
// Direction: Domain declares the contract; lib/validation CONFORMS to it. The
// correspondence is enforced at compile time by the Equal<> assertions at the
// bottom of schemas.ts, so drift is a type error rather than a silent divergence.

/**
 * TODO(architecture): `intent` should be `StackIntent`, not `string`. It is
 * `string` today only because schemas.ts casts `OUTCOME_CATEGORIES as
 * [string, ...string[]]` (schemas.ts:11-13), which collapses z.enum's inference.
 * Tightening it means dropping those casts and auditing ProfileInput.goals and
 * formPreferences as well — deliberately out of scope for a behavior-preserving
 * repair. Widening it here preserves today's types exactly.
 */
export interface StackInput {
  name: string;
  intent: string;
  mode: StackMode;
  description: string | null;
}

/**
 * NOTE: the "supplementId OR customName is required" rule is a runtime
 * `.refine()` in schemas.ts and is NOT representable here. That was equally
 * true of the previous `z.infer` alias, so this is not a regression — but the
 * Equal<> guard cannot detect a change to that refinement.
 */
export interface StackItemInput {
  supplementId: string | null;
  customName: string | null;
  dose: number;
  unit: string;
  timing: ItemTiming | null;
  frequency: ItemFrequency | null;
  reason: string | null;
  notes: string | null;
}
