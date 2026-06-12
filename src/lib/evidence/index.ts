// Domain layer — PURE. Imports only seed data + types (Design §9.2, §9.4).
// Design Ref: §2.3 — lib/evidence provides supplement->effect lookups & grade resolution.
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { SEED_EFFECTS } from "@/data/seed-effects";
import { SEED_PAPERS } from "@/data/seed-papers";
import type {
  Effect,
  EvidenceGrade,
  OutcomeCategory,
  Paper,
  Supplement,
} from "@/types";

/** Optional injection point for tests; defaults to seed data. */
export interface EvidenceLibrary {
  supplements: Supplement[];
  effects: Effect[];
  papers: Paper[];
}

export const defaultLibrary: EvidenceLibrary = {
  supplements: SEED_SUPPLEMENTS,
  effects: SEED_EFFECTS,
  papers: SEED_PAPERS,
};

// Numeric ranking so we can compare grades (A is strongest).
const GRADE_RANK: Record<EvidenceGrade, number> = { A: 4, B: 3, C: 2, D: 1 };

export function compareGrades(a: EvidenceGrade, b: EvidenceGrade): number {
  return GRADE_RANK[b] - GRADE_RANK[a]; // ascending strength order (A first)
}

export function isStrongerGrade(a: EvidenceGrade, b: EvidenceGrade): boolean {
  return GRADE_RANK[a] > GRADE_RANK[b];
}

export function getAllSupplements(lib: EvidenceLibrary = defaultLibrary): Supplement[] {
  return lib.supplements;
}

export function getSupplementById(
  id: string,
  lib: EvidenceLibrary = defaultLibrary,
): Supplement | undefined {
  return lib.supplements.find((s) => s.id === id);
}

export function getSupplementBySlug(
  slug: string,
  lib: EvidenceLibrary = defaultLibrary,
): Supplement | undefined {
  return lib.supplements.find((s) => s.slug === slug);
}

export function getEffectsForSupplement(
  supplementId: string,
  lib: EvidenceLibrary = defaultLibrary,
): Effect[] {
  return lib.effects.filter((e) => e.supplementId === supplementId);
}

export function getEffectsByOutcome(
  outcome: OutcomeCategory,
  lib: EvidenceLibrary = defaultLibrary,
): Effect[] {
  return lib.effects.filter((e) => e.outcomeCategory === outcome);
}

/**
 * The single best (highest-grade) effect a supplement has for a given outcome.
 * Used by the evaluator's evidence-fit and dose-fit rules (Design §11.4).
 */
export function getBestEffectForOutcome(
  supplementId: string,
  outcome: OutcomeCategory,
  lib: EvidenceLibrary = defaultLibrary,
): Effect | undefined {
  return getEffectsForSupplement(supplementId, lib)
    .filter((e) => e.outcomeCategory === outcome)
    .sort((a, b) => compareGrades(a.grade, b.grade))[0];
}

export function getPaperById(
  id: string,
  lib: EvidenceLibrary = defaultLibrary,
): Paper | undefined {
  return lib.papers.find((p) => p.id === id);
}

export function getPapersForEffect(
  effect: Effect,
  lib: EvidenceLibrary = defaultLibrary,
): Paper[] {
  return effect.paperIds
    .map((id) => getPaperById(id, lib))
    .filter((p): p is Paper => p !== undefined);
}

export function getRelatedSupplements(
  supplementId: string,
  lib: EvidenceLibrary = defaultLibrary,
): Supplement[] {
  const supp = getSupplementById(supplementId, lib);
  if (!supp) return [];
  return supp.relatedSupplementIds
    .map((id) => getSupplementById(id, lib))
    .filter((s): s is Supplement => s !== undefined);
}

/** Case-insensitive search over name + aliases (Design §5.4 Library search). */
export function searchSupplements(
  query: string,
  lib: EvidenceLibrary = defaultLibrary,
): Supplement[] {
  const q = query.trim().toLowerCase();
  if (!q) return lib.supplements;
  return lib.supplements.filter((s) => {
    if (s.name.toLowerCase().includes(q)) return true;
    return s.aliases.some((a) => a.toLowerCase().includes(q));
  });
}
