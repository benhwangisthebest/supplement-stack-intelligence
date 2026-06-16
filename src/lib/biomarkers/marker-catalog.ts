// Domain layer — PURE. Biomarker catalog for Profile lab-entry autocomplete
// + unit/range auto-fill (Design §5.4). biomarker-intelligence v3.
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";

export interface MarkerCatalogEntry {
  name: string; // display/canonical name
  unit: string; // canonical unit to auto-fill
  refLow: number | null;
  refHigh: number | null;
}

/** Suggested marker names (display names), sorted for a stable datalist. */
export function markerSuggestions(): string[] {
  return SEED_BIOMARKERS.map((b) => b.name).sort();
}

/**
 * Look up a catalog entry by a typed marker name (case-insensitive, matches
 * display name or any alias). Returns null when unknown.
 */
export function markerCatalogEntry(name: string): MarkerCatalogEntry | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  for (const b of SEED_BIOMARKERS) {
    const names = [b.name, ...b.aliases].map((n) => n.toLowerCase());
    if (names.includes(key)) {
      return { name: b.name, unit: b.canonicalUnit, refLow: b.refLow, refHigh: b.refHigh };
    }
  }
  return null;
}
