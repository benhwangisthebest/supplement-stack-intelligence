// Domain layer — PURE. Validates interaction seed integrity (Design §1.2, §3.3).
import { z } from "zod";
import {
  DRUG_CLASSES,
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
    severity: z.enum(INTERACTION_SEVERITIES as [string, ...string[]]),
    mechanism: z.string().min(1),
    management: z.string().min(1),
    evidenceGrade: z.enum(EVIDENCE_GRADES as [string, ...string[]]),
  })
  .superRefine((rule, ctx) => {
    if (rule.kind === "supplement-drug") {
      if (!rule.drugClass && !rule.drugGeneric) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "supplement-drug rule needs drugClass or drugGeneric",
        });
      }
      if (rule.otherSupplementId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "supplement-drug rule must not set otherSupplementId",
        });
      }
    } else {
      // supplement-supplement
      if (!rule.otherSupplementId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "supplement-supplement rule needs otherSupplementId",
        });
      }
      if (rule.drugClass || rule.drugGeneric) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "supplement-supplement rule must not set drug fields",
        });
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
