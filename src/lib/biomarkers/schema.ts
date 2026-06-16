// Domain layer — PURE. Validates biomarker seed integrity (Design §1.2, §3.3).
import { z } from "zod";
import { EVIDENCE_GRADES } from "@/types";
import {
  BIOMARKER_DIRECTIONS,
  BIOMARKER_RELATIONS,
} from "@/types/biomarker";
import type { Biomarker, BiomarkerRelevanceRule } from "@/types/biomarker";

export const biomarkerSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    aliases: z.array(z.string().min(1)),
    canonicalUnit: z.string().min(1),
    unitConversions: z.record(z.string(), z.number().positive()),
    refLow: z.number().nullable(),
    refHigh: z.number().nullable(),
  })
  .refine(
    (b) => b.refLow === null || b.refHigh === null || b.refHigh >= b.refLow,
    { message: "refHigh must be >= refLow" },
  )
  .refine(
    // The canonical unit must be present with factor 1 (normalized key).
    (b) => {
      const key = b.canonicalUnit.toLowerCase().replace(/µ/g, "u").replace(/\s+/g, "");
      return b.unitConversions[key] === 1;
    },
    { message: "canonicalUnit must map to factor 1 in unitConversions" },
  );

export const biomarkerRelevanceSchema = z.object({
  id: z.string().min(1),
  biomarkerId: z.string().min(1),
  supplementId: z.string().min(1),
  trigger: z.enum(BIOMARKER_DIRECTIONS as [string, ...string[]]),
  relation: z.enum(BIOMARKER_RELATIONS as [string, ...string[]]),
  evidenceGrade: z.enum(EVIDENCE_GRADES as [string, ...string[]]),
  rationale: z.string().min(1),
});

/** Validate the biomarker registry; throws (dev/test) on malformed data. */
export function validateBiomarkers(biomarkers: Biomarker[]): Biomarker[] {
  return z.array(biomarkerSchema).parse(biomarkers) as Biomarker[];
}

/** Validate the relevance dataset; throws (dev/test) on malformed data. */
export function validateBiomarkerRelevance(
  rules: BiomarkerRelevanceRule[],
): BiomarkerRelevanceRule[] {
  return z.array(biomarkerRelevanceSchema).parse(rules) as BiomarkerRelevanceRule[];
}
