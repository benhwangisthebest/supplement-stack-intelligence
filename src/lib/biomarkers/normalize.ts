// Domain layer — PURE. Lab marker name → canonical biomarker (Design §11.4).
// Plan SC: replaces v1's naive substring matching with an alias registry.
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";
import type { Biomarker } from "@/types/biomarker";

function clean(s: string): string {
  return s.trim().toLowerCase();
}

/** Build a lookup from every known name (id, display name, aliases) → biomarkerId. */
function buildIndex(biomarkers: Biomarker[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const b of biomarkers) {
    index.set(clean(b.id), b.id);
    index.set(clean(b.name), b.id);
    for (const alias of b.aliases) index.set(clean(alias), b.id);
  }
  return index;
}

const DEFAULT_INDEX = buildIndex(SEED_BIOMARKERS);

/**
 * Resolve a free-text marker name → canonical biomarkerId, or null if unknown.
 * Exact (cleaned) match first, then a conservative contains-match against aliases
 * to tolerate "serum ferritin, ng/mL"-style noise. Pure & deterministic.
 */
export function normalizeMarker(
  name: string,
  index: Map<string, string> = DEFAULT_INDEX,
): string | null {
  const key = clean(name);
  if (!key) return null;
  const exact = index.get(key);
  if (exact) return exact;
  // Conservative fallback: a known alias appears as a whole-word-ish substring.
  for (const [alias, id] of index) {
    if (alias.length >= 3 && key.includes(alias)) return id;
  }
  return null;
}
