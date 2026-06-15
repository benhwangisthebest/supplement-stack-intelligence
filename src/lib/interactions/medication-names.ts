// Domain layer — PURE. Known medication names for Profile autocomplete (Design §5.4).
import { MEDICATION_ALIASES } from "@/data/medication-aliases";

/** Sorted, de-duplicated list of every recognizable medication name (generic + brand). */
export function knownMedicationNames(): string[] {
  const names = new Set<string>();
  for (const alias of MEDICATION_ALIASES) {
    names.add(alias.canonical);
    for (const brand of alias.brands) names.add(brand);
  }
  return [...names].sort();
}
