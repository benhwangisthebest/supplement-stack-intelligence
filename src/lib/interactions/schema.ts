// Domain layer — PURE. Validates interaction seed integrity (Design §1.2, §3.3).
import { z } from "zod";
import {
  DRUG_CLASSES,
  FOOD_DIRECTIONS,
  INTERACTION_KINDS,
  INTERACTION_SEVERITIES,
} from "@/types/interaction";
import { EVIDENCE_GRADES } from "@/types";
import type { InteractionRule, MedicationAlias } from "@/types/interaction";

const drugClass = z.enum(DRUG_CLASSES);

export const medicationAliasSchema = z.object({
  canonical: z.string().min(1),
  brands: z.array(z.string().min(1)),
  drugClasses: z.array(drugClass).min(1),
});

export const interactionRuleSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(INTERACTION_KINDS as [string, ...string[]]),
    supplementId: z.string().min(1),
    drugClass: drugClass.optional(),
    drugGeneric: z.string().min(1).optional(),
    otherSupplementId: z.string().min(1).optional(),
    // supplement-food (v12)
    direction: z.enum(FOOD_DIRECTIONS as [string, ...string[]]).optional(),
    food: z.string().min(1).optional(),
    timing: z.string().min(1).optional(),
    severity: z.enum(INTERACTION_SEVERITIES as [string, ...string[]]),
    mechanism: z.string().min(1),
    management: z.string().min(1),
    evidenceGrade: z.enum(EVIDENCE_GRADES as [string, ...string[]]),
  })
  .superRefine((rule, ctx) => {
    const add = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    // Fields that belong only to the food kind must be absent otherwise.
    const hasFoodFields = Boolean(rule.direction || rule.food);

    if (rule.kind === "supplement-drug") {
      if (!rule.drugClass && !rule.drugGeneric) {
        add("supplement-drug rule needs drugClass or drugGeneric");
      }
      if (rule.otherSupplementId) {
        add("supplement-drug rule must not set otherSupplementId");
      }
      if (hasFoodFields) add("supplement-drug rule must not set food fields");
    } else if (rule.kind === "supplement-supplement") {
      if (!rule.otherSupplementId) {
        add("supplement-supplement rule needs otherSupplementId");
      }
      if (rule.drugClass || rule.drugGeneric) {
        add("supplement-supplement rule must not set drug fields");
      }
      if (hasFoodFields) {
        add("supplement-supplement rule must not set food fields");
      }
    } else {
      // supplement-food (v12)
      if (!rule.direction) add("supplement-food rule needs direction");
      if (!rule.food) add("supplement-food rule needs food");
      if (rule.drugClass || rule.drugGeneric || rule.otherSupplementId) {
        add("supplement-food rule must not set drug/other-supplement fields");
      }
    }
  });

/** Validate the alias dataset; throws (dev/test) on malformed data. */
export function validateAliases(aliases: MedicationAlias[]): MedicationAlias[] {
  return z.array(medicationAliasSchema).parse(aliases) as MedicationAlias[];
}

/** Validate the interaction dataset; throws (dev/test) on malformed data. */
export function validateInteractionRules(
  rules: InteractionRule[],
): InteractionRule[] {
  return z.array(interactionRuleSchema).parse(rules) as InteractionRule[];
}
