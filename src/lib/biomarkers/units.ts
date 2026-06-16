// Domain layer — PURE. Unit normalization + conversion (Design §11.4).
// Plan SC: SAFETY-CRITICAL — a mis-converted value produces a wrong flag.
// Strategy: factor-only model; unknown unit → null (skip comparison, never guess).
import type { Biomarker } from "@/types/biomarker";

/** Normalize a unit string for lookup: lowercase, µ→u, strip spaces. */
export function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase().replace(/µ/g, "u").replace(/\s+/g, "");
}

/**
 * Convert (value, unit) → the biomarker's canonical unit.
 * Returns null when the unit is unknown for this biomarker (caller skips the
 * range comparison rather than risk a wrong result). Pure & deterministic.
 */
export function toCanonical(
  value: number,
  unit: string,
  biomarker: Biomarker,
): number | null {
  const key = normalizeUnit(unit);
  const factor = biomarker.unitConversions[key];
  if (factor === undefined) return null;
  return value * factor;
}
