// SERVER-SIDE props builders for the Profile page's client components (Phase 3
// U9 (b), CLAUDE.md §4 rule 7). The page calls these and passes the results down,
// so ProfileForm, LabMarkerTable and LabMarkerModal import nothing from src/lib or
// src/data at runtime. Client modules may import this file's TYPES only; a runtime
// import is a CLIENT_TAKES_PROPS failure.
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";
import { normalizeMarker } from "@/lib/biomarkers";
import {
  markerCatalogEntry,
  markerSuggestions,
  type MarkerCatalogEntry,
} from "@/lib/biomarkers/marker-catalog";
import { knownMedicationNames } from "@/lib/interactions/medication-names";
import type { LabMarker } from "@/types";

/** Medication autocomplete options for ProfileForm. */
export function medicationSuggestions(): string[] {
  return knownMedicationNames();
}

export interface MarkerCatalog {
  /** Datalist options, as `markerSuggestions()` returns them. */
  suggestions: string[];
  /**
   * `markerCatalogEntry(key)` for every key it can return non-null for. That
   * function matches `name.trim().toLowerCase()` exactly against each biomarker's
   * lowercased name and aliases, so those strings are the only keys that can hit.
   * A key with surrounding whitespace can never be looked up (the lookup key is
   * trimmed) and is omitted. Each value is the lib's own answer for that key, so
   * first-biomarker-wins ordering is inherited, not re-implemented.
   */
  entries: Readonly<Record<string, MarkerCatalogEntry>>;
}

export function markerCatalog(): MarkerCatalog {
  const entries: Record<string, MarkerCatalogEntry> = {};
  for (const b of SEED_BIOMARKERS) {
    for (const n of [b.name, ...b.aliases]) {
      const key = n.toLowerCase();
      if (!key || key !== key.trim() || Object.hasOwn(entries, key)) continue;
      const entry = markerCatalogEntry(key);
      if (entry) entries[key] = entry;
    }
  }
  return { suggestions: markerSuggestions(), entries };
}

/**
 * Lab-marker row id → `normalizeMarker(row.marker)`, for the history modal's
 * "which readings belong to this biomarker" filter. Built from the same `markers`
 * array the page passes to LabTimeline, so every row the modal sees has an entry.
 */
export function biomarkerIdsByMarker(markers: LabMarker[]): Readonly<Record<string, string | null>> {
  return Object.fromEntries(markers.map((m) => [m.id, normalizeMarker(m.marker)]));
}
