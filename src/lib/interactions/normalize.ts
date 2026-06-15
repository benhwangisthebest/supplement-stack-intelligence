// Domain layer — PURE. Medication name normalization (Design §4.1, §11.4).
// Plan SC: brand→generic→drug-class so curation isn't brittle exact-name-only.
import { MEDICATION_ALIASES } from "@/data/medication-aliases";
import type {
  DrugClass,
  MedicationAlias,
  NormalizationResult,
  NormalizedMedication,
} from "@/types/interaction";

function clean(s: string): string {
  return s.trim().toLowerCase();
}

/** Build a lookup from every known name (canonical + brand) → alias entry. */
function buildIndex(aliases: MedicationAlias[]): Map<string, MedicationAlias> {
  const index = new Map<string, MedicationAlias>();
  for (const alias of aliases) {
    index.set(clean(alias.canonical), alias);
    for (const brand of alias.brands) index.set(clean(brand), alias);
  }
  return index;
}

const DEFAULT_INDEX = buildIndex(MEDICATION_ALIASES);

/**
 * Resolve free-text medications → canonical generic + drug classes.
 * Unresolved inputs are returned separately and never treated as "safe".
 * Pure & deterministic; empty/blank inputs are ignored.
 */
export function normalizeMedications(
  medications: string[],
  index: Map<string, MedicationAlias> = DEFAULT_INDEX,
): NormalizationResult {
  const recognized: NormalizedMedication[] = [];
  const unresolved: string[] = [];
  const seen = new Set<string>();

  for (const raw of medications) {
    const key = clean(raw);
    if (!key) continue;
    const alias = index.get(key);
    if (!alias) {
      if (!seen.has(`?${key}`)) {
        unresolved.push(raw.trim());
        seen.add(`?${key}`);
      }
      continue;
    }
    if (seen.has(alias.canonical)) continue;
    seen.add(alias.canonical);
    recognized.push({
      input: raw.trim(),
      canonical: alias.canonical,
      drugClasses: [...alias.drugClasses],
    });
  }

  return { recognized, unresolved };
}

/** Convenience: the union of drug classes across recognized medications. */
export function drugClassesOf(result: NormalizationResult): Set<DrugClass> {
  return new Set(result.recognized.flatMap((m) => m.drugClasses));
}
