// Domain/Application — Zod schemas for lab-import (Design §4, §7).
// Plan SC: every boundary validated — extract input, adapter output, commit body.
// SAFETY: the adapter's JSON output MUST pass `parsedCandidateSchema` or it is
// rejected as EXTRACTION_FAILED — never silently coerced, never persisted.
import { z } from "zod";
import { LAB_SOURCES } from "@/types/lab";

const source = z.enum(LAB_SOURCES as unknown as [string, ...string[]]);

/** One marker as transcribed/parsed from a document. Review-only (not stored). */
export const parsedCandidateSchema = z.object({
  rawLabel: z.string().min(1).max(200),
  value: z.number().finite(),
  unit: z.string().min(1).max(40),
  referenceLow: z.number().finite().nullable().default(null),
  referenceHigh: z.number().finite().nullable().default(null),
  biomarkerId: z.string().max(80).nullable().default(null),
  confidence: z.enum(["high", "low"]).default("low"),
});
export type ParsedCandidate = z.infer<typeof parsedCandidateSchema>;

/** The raw shape we ask the extraction adapter (Claude) to emit. */
export const adapterOutputSchema = z.object({
  markers: z
    .array(
      z.object({
        rawLabel: z.string().min(1).max(200),
        value: z.number().finite(),
        unit: z.string().min(1).max(40),
        referenceLow: z.number().finite().nullable().optional(),
        referenceHigh: z.number().finite().nullable().optional(),
      }),
    )
    .max(200), // bounded to cap cost/abuse (Design §7)
});
export type AdapterOutput = z.infer<typeof adapterOutputSchema>;

/** Column-mapping for the paste flow: which column index holds which field. */
export const columnMapSchema = z.object({
  marker: z.number().int().min(0),
  value: z.number().int().min(0),
  unit: z.number().int().min(0),
  referenceLow: z.number().int().min(0).nullable().default(null),
  referenceHigh: z.number().int().min(0).nullable().default(null),
});
export type ColumnMap = z.infer<typeof columnMapSchema>;

/**
 * Body for POST /api/lab-import/commit. Note: canonical fields are deliberately
 * absent — the server recomputes them from (value, unit) via lib/biomarkers
 * (Design §4.2 defense-in-depth). The client cannot inject canonical values.
 */
export const labCommitSchema = z.object({
  collectedAt: z.string().min(1), // ISO date
  source: source,
  markers: z
    .array(
      z.object({
        rawLabel: z.string().min(1).max(200),
        value: z.number().finite(),
        unit: z.string().min(1).max(40),
        referenceLow: z.number().finite().nullable().default(null),
        referenceHigh: z.number().finite().nullable().default(null),
      }),
    )
    .min(1) // at least one APPROVED marker — enforces the confirm gate server-side
    .max(200),
});
export type LabCommitInput = z.infer<typeof labCommitSchema>;
