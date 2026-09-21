// Domain/Application — Zod input schemas shared by client forms and server handlers.
// Design Ref: §6, §7 — server-side validation; §10.4 — Zod for schemas.
import { z } from "zod";
import {
  OUTCOME_CATEGORIES,
  SUPPLEMENT_FORMS,
} from "@/types";
import { normalizeSideEffect } from "@/lib/side-effects/vocab";
import type { ReportedSideEffect } from "@/types/side-effect";
import type {
  StackInput as DomainStackInput,
  StackItemInput as DomainStackItemInput,
} from "@/types/stack";

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

/**
 * A UUID taken from a URL path segment (Phase 2 U30, finding N-51).
 *
 * WHY IT LIVES HERE AND NOT IN A MODULE OF ITS OWN: this file already owned
 * the predicate twice — `generateProtocolSchema` and `matchProductsSchema`
 * both inlined `z.string().uuid()` for a `stackId`, and both now use this.
 * One definition, one place for the rule to change.
 *
 * WHY THERE IS NO `src/types/` CONFORMANCE ASSERTION BESIDE IT, unlike the two
 * write contracts at the bottom of this file — and this is a decision, not an
 * omission (owner ruling, 2026-09-21). A domain contract for this could only
 * say `type UuidParam = string`, and `Equal<string, string>` is a TAUTOLOGY:
 * it cannot go red under any mutation of the schema below, including deleting
 * `.uuid()`, which is the only mutation that matters. An assertion that
 * provably cannot fail is worse than none, because it reads like coverage.
 * The non-vacuous version is a branded `Uuid` threaded through every repo
 * signature — a cross-cutting refactor, not this unit's (§3 rule 4).
 *
 * What DOES guard it: `path-param-validation.test.ts` (every id validated,
 * before any I/O, by the validator imported from here) and the per-route 400
 * tests. Behaviour, not types.
 */
export const uuidParam = z.string().uuid();

export const stackInputSchema = z.object({
  name: z.string().min(1).max(120),
  intent,
  mode: z.enum(["current", "planned"]).default("current"),
  description: z.string().max(500).nullable().default(null),
});
export type StackInput = z.infer<typeof stackInputSchema>;

export const generateProtocolSchema = z.object({
  stackId: uuidParam,
});
export type GenerateProtocolInput = z.infer<typeof generateProtocolSchema>;

// side-effect-engine v11 — a structured report; free text is normalized to the
// canonical vocabulary server-side, and an unrecognized label is rejected (400)
// so a non-canonical string can never fabricate a correlation (Design §4.2).
export const reportedSideEffectSchema = z
  .object({
    effectLabel: z.string().min(1).max(80),
    severity: z.number().int().min(1).max(3).optional(),
    note: z.string().max(500).optional(),
  })
  .transform((r, ctx): ReportedSideEffect => {
    const canonical = normalizeSideEffect(r.effectLabel);
    if (!canonical) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effectLabel"],
        message: `Unrecognized side-effect: ${r.effectLabel}`,
      });
      return z.NEVER;
    }
    return {
      effectLabel: canonical,
      severity: r.severity as 1 | 2 | 3 | undefined,
      note: r.note,
    };
  });

// daily-checkin v10 — one idempotent check-in per day (Design §4.2).
const goalRating = z.number().int().min(1).max(5);
export const checkinInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  ratings: z.record(outcome, goalRating).default({}),
  taken: z.array(z.string().max(80)).default([]),
  scheduled: z.array(z.string().max(80)).default([]),
  note: z.string().max(1000).nullable().default(null),
  sideEffect: z.string().max(500).nullable().default(null),
  // side-effect-engine v11 — structured, canonical reports (additive; defaults []).
  sideEffects: z.array(reportedSideEffectSchema).max(20).default([]),
});
export type CheckinInputSchema = z.infer<typeof checkinInputSchema>;

export const matchProductsSchema = z.object({
  stackId: uuidParam,
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

// ---- Domain conformance (architecture-boundary-repair, Module 3) -------------
// src/types owns these write contracts; the Zod schemas above must CONFORM to
// them. This inverts the old direction, where src/types/advisor-action.ts
// imported z.infer aliases from this file (Domain → Application).
//
// Equal<> is INVARIANT (the function-parameter-position trick). A naive
// `A extends B ? B extends A` comparison is covariant and lets required↔optional
// drift pass silently — exactly the drift a changed `.default()` would produce.
// If either schema diverges, Expect<> fails its `extends true` constraint and
// tsc reports TS2344 right here. Type-level only: zero runtime cost.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

export type _StackInputConformsToDomain = Expect<Equal<StackInput, DomainStackInput>>;
export type _StackItemInputConformsToDomain = Expect<
  Equal<StackItemInput, DomainStackItemInput>
>;
