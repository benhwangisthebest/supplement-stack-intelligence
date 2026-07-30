// Domain layer — PURE. Validates seed integrity (Design §1.2).
import { z } from "zod";
import {
  EVIDENCE_GRADES,
  OUTCOME_CATEGORIES,
  SUPPLEMENT_FORMS,
} from "@/types";
import type { EvidenceLibrary } from "@/lib/evidence";
import { defaultLibrary } from "@/lib/evidence";

const doseRangeSchema = z
  .object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    unit: z.string().min(1),
  })
  .refine((d) => d.max >= d.min, { message: "dose max must be >= min" });

export const supplementSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  category: z.string().min(1),
  description: z.string().min(1),
  commonForms: z.array(z.enum(SUPPLEMENT_FORMS as [string, ...string[]])),
  mechanismSummary: z.string().min(1),
  sideEffects: z.array(z.string()),
  contraindications: z.array(z.string()),
  allergenTags: z.array(z.string()),
  generalDose: doseRangeSchema,
  relatedSupplementIds: z.array(z.string()),
  tags: z.array(z.string()),
});

export const effectSchema = z.object({
  id: z.string().min(1),
  supplementId: z.string().min(1),
  name: z.string().min(1),
  outcomeCategory: z.enum(OUTCOME_CATEGORIES as [string, ...string[]]),
  grade: z.enum(EVIDENCE_GRADES as [string, ...string[]]),
  confidence: z.enum(["high", "moderate", "low"]),
  summary: z.string().min(1),
  relevantPopulation: z.string().min(1),
  studiedDose: doseRangeSchema,
  mechanismTags: z.array(z.string()),
  paperIds: z.array(z.string()),
});

// v13 (evidence-disclosure): provenance fields removed. This schema was the SECOND
// mechanism compelling fabrication — `link: z.string().url()` demanded a well-formed
// URL, so with no real source, a placeholder was the only way to pass validation.
// TypeScript could not catch this one: a Zod schema is a runtime structure the
// compiler cannot cross-check against the Paper type. Keep the two in step by hand.
// Plan SC: SC-1
export const paperSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  population: z.string(),
  intervention: z.string(),
  dose: z.string(),
  duration: z.string(),
  outcomes: z.string(),
  limitations: z.string(),
  summary: z.string().min(1),
});

export interface SeedValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Validates shape (Zod) + referential integrity:
 *  - unique ids
 *  - every effect.supplementId resolves to a supplement
 *  - every effect.paperId resolves to a paper
 *  - every relatedSupplementId resolves to a supplement
 */
export function validateSeed(
  lib: EvidenceLibrary = defaultLibrary,
): SeedValidationResult {
  const errors: string[] = [];

  for (const s of lib.supplements) {
    const r = supplementSchema.safeParse(s);
    if (!r.success) errors.push(`supplement ${s.id}: ${r.error.issues[0]?.message}`);
  }
  for (const e of lib.effects) {
    const r = effectSchema.safeParse(e);
    if (!r.success) errors.push(`effect ${e.id}: ${r.error.issues[0]?.message}`);
  }
  for (const p of lib.papers) {
    const r = paperSchema.safeParse(p);
    if (!r.success) errors.push(`paper ${p.id}: ${r.error.issues[0]?.message}`);
  }

  const suppIds = new Set(lib.supplements.map((s) => s.id));
  const paperIds = new Set(lib.papers.map((p) => p.id));

  assertUnique(lib.supplements.map((s) => s.id), "supplement", errors);
  assertUnique(lib.supplements.map((s) => s.slug), "supplement slug", errors);
  assertUnique(lib.effects.map((e) => e.id), "effect", errors);
  assertUnique(lib.papers.map((p) => p.id), "paper", errors);

  for (const e of lib.effects) {
    if (!suppIds.has(e.supplementId)) {
      errors.push(`effect ${e.id} references missing supplement ${e.supplementId}`);
    }
    for (const pid of e.paperIds) {
      if (!paperIds.has(pid)) {
        errors.push(`effect ${e.id} references missing paper ${pid}`);
      }
    }
  }
  for (const s of lib.supplements) {
    for (const rid of s.relatedSupplementIds) {
      if (!suppIds.has(rid)) {
        errors.push(`supplement ${s.id} references missing related ${rid}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function assertUnique(ids: string[], label: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}
