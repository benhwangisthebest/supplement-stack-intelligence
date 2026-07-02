// Domain/Application — Zod input schemas shared by client forms and server handlers.
// Design Ref: §6, §7 — server-side validation; §10.4 — Zod for schemas.
import { z } from "zod";
import {
  OUTCOME_CATEGORIES,
  SUPPLEMENT_FORMS,
} from "@/types";

const outcome = z.enum(OUTCOME_CATEGORIES as [string, ...string[]]);
const intent = z.union([outcome, z.literal("experimental")]);
const form = z.enum(SUPPLEMENT_FORMS as [string, ...string[]]);

export const profileInputSchema = z.object({
  goals: z.array(outcome).default([]),
  diet: z.string().max(200).nullable().default(null),
  riskTolerance: z.enum(["low", "moderate", "high"]).nullable().default(null),
  allergies: z.array(z.string().max(80)).default([]),
  medications: z.array(z.string().max(120)).default([]),
  avoidedIngredients: z.array(z.string().max(80)).default([]),
  formPreferences: z.array(form).default([]),
  caffeineSensitivity: z.boolean().nullable().default(null),
  experienceLevel: z
    .enum(["beginner", "intermediate", "advanced"])
    .nullable()
    .default(null),
  notes: z.string().max(2000).nullable().default(null),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const labMarkerInputSchema = z
  .object({
    marker: z.string().min(1).max(120),
    value: z.number().finite(),
    unit: z.string().min(1).max(40),
    referenceLow: z.number().finite().nullable().default(null),
    referenceHigh: z.number().finite().nullable().default(null),
    date: z.string().nullable().default(null),
    notes: z.string().max(500).nullable().default(null),
  })
  .refine(
    (m) =>
      m.referenceLow === null ||
      m.referenceHigh === null ||
      m.referenceHigh >= m.referenceLow,
    { message: "referenceHigh must be >= referenceLow", path: ["referenceHigh"] },
  );
export type LabMarkerInput = z.infer<typeof labMarkerInputSchema>;

export const stackInputSchema = z.object({
  name: z.string().min(1).max(120),
  intent,
  mode: z.enum(["current", "planned"]).default("current"),
  description: z.string().max(500).nullable().default(null),
});
export type StackInput = z.infer<typeof stackInputSchema>;

export const generateProtocolSchema = z.object({
  stackId: z.string().uuid(),
});
export type GenerateProtocolInput = z.infer<typeof generateProtocolSchema>;

// daily-checkin v10 — one idempotent check-in per day (Design §4.2).
const goalRating = z.number().int().min(1).max(5);
export const checkinInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  ratings: z.record(outcome, goalRating).default({}),
  taken: z.array(z.string().max(80)).default([]),
  scheduled: z.array(z.string().max(80)).default([]),
  note: z.string().max(1000).nullable().default(null),
  sideEffect: z.string().max(500).nullable().default(null),
});
export type CheckinInputSchema = z.infer<typeof checkinInputSchema>;

export const matchProductsSchema = z.object({
  stackId: z.string().uuid(),
});
export type MatchProductsRequest = z.infer<typeof matchProductsSchema>;

export const stackItemInputSchema = z
  .object({
    supplementId: z.string().max(80).nullable().default(null),
    customName: z.string().max(120).nullable().default(null),
    dose: z.number().positive(),
    unit: z.string().min(1).max(20),
    timing: z
      .enum(["morning", "midday", "evening", "pre-workout", "with-meal", "bedtime"])
      .nullable()
      .default(null),
    frequency: z
      .enum(["daily", "workout-days", "as-needed", "weekly"])
      .nullable()
      .default(null),
    reason: z.string().max(300).nullable().default(null),
    notes: z.string().max(500).nullable().default(null),
  })
  .refine((i) => i.supplementId !== null || i.customName !== null, {
    message: "Either supplementId or customName is required",
    path: ["supplementId"],
  });
export type StackItemInput = z.infer<typeof stackItemInputSchema>;
