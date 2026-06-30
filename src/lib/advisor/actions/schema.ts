// Domain/Application — Zod payload schemas for the 5 advisor proposal tools (v7).
// Design Ref: §3.2 — each proposal payload is Zod-validated; add/edit reuse the
// SAME field rules as stackItemInputSchema so the confirm route can re-parse with
// the existing item schema before any write. Plan SC-3 (grounding), SC-6 (re-validate).
import { z } from "zod";

const timing = z
  .enum(["morning", "midday", "evening", "pre-workout", "with-meal", "bedtime"])
  .nullable();
const frequency = z
  .enum(["daily", "workout-days", "as-needed", "weekly"])
  .nullable();

export const addItemPayloadSchema = z.object({
  supplementId: z.string().min(1).max(80),
  dose: z.number().positive(),
  unit: z.string().min(1).max(20),
  timing: timing.default(null),
  frequency: frequency.default(null),
  reason: z.string().max(300).nullable().default(null),
});

export const removeItemPayloadSchema = z.object({
  stackItemId: z.string().min(1),
});

export const editItemPayloadSchema = z
  .object({
    stackItemId: z.string().min(1),
    dose: z.number().positive().optional(),
    unit: z.string().min(1).max(20).optional(),
    timing: timing.optional(),
    frequency: frequency.optional(),
  })
  .refine(
    (p) =>
      p.dose !== undefined ||
      p.unit !== undefined ||
      p.timing !== undefined ||
      p.frequency !== undefined,
    { message: "At least one field must change", path: ["dose"] },
  );

export const generateProtocolPayloadSchema = z.object({
  stackName: z.string().min(1).max(120),
  intent: z.string().min(1),
  items: z.array(z.unknown()).min(1), // each re-parsed via stackItemInputSchema in module-2
});

export const attachProductPayloadSchema = z.object({
  stackItemId: z.string().min(1),
  productId: z.string().min(1),
});

/** Only the user-editable subset the confirm card may submit (SC-5). */
export const editableFieldsSchema = z
  .object({
    dose: z.number().positive().optional(),
    unit: z.string().min(1).max(20).optional(),
    timing: timing.optional(),
    frequency: frequency.optional(),
  })
  .strict();

export type AddItemPayloadParsed = z.infer<typeof addItemPayloadSchema>;
export type EditItemPayloadParsed = z.infer<typeof editItemPayloadSchema>;
