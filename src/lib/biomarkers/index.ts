// Domain layer — PURE, deterministic biomarker engine (Design §11.4).
// Plan SC: real biomarker→supplement relevance (replaces naive string matching);
// unit-correct; feeds Stack Evaluation, Protocol ranking, and Library. No I/O.
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";
import { SEED_BIOMARKER_RELEVANCE } from "@/data/seed-biomarker-relevance";
import type { EvidenceGrade, LabMarker } from "@/types";
import type { StackItem } from "@/types/stack";
import type {
  Biomarker,
  BiomarkerDirection,
  BiomarkerRelevanceRule,
  LabFinding,
  LabSignal,
} from "@/types/biomarker";
import { normalizeMarker } from "./normalize";
import { toCanonical } from "./units";

export { normalizeMarker } from "./normalize";
export { toCanonical, normalizeUnit } from "./units";
export type { LabFinding, LabSignal } from "@/types/biomarker";

const REGISTRY: Map<string, Biomarker> = new Map(
  SEED_BIOMARKERS.map((b) => [b.id, b]),
);

// Lab signal weight by evidence grade (bounded; clamped to [-1, 1] after summing).
const GRADE_WEIGHT: Record<EvidenceGrade, number> = { A: 1, B: 0.7, C: 0.4, D: 0.2 };

export type MarkerStatus = BiomarkerDirection | "in-range" | "unknown";

/**
 * The user's marker status vs ranges. User-entered reference range wins over the
 * registry's population range (Design §11.4). "unknown" when the unit can't be
 * converted — caller must NOT emit a finding (no guessing).
 */
export function statusOf(marker: LabMarker, biomarker: Biomarker): MarkerStatus {
  const value = toCanonical(marker.value, marker.unit, biomarker);
  if (value === null) return "unknown";
  const low = marker.referenceLow ?? biomarker.refLow;
  const high = marker.referenceHigh ?? biomarker.refHigh;
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  return "in-range";
}

interface NormalizedMarker {
  marker: LabMarker;
  biomarker: Biomarker;
  status: BiomarkerDirection; // only "low" | "high" retained
}

/** Resolve markers to (biomarker, status), keeping only out-of-range, known-unit ones. */
function resolveMarkers(labMarkers: LabMarker[]): NormalizedMarker[] {
  const out: NormalizedMarker[] = [];
  for (const marker of labMarkers) {
    const id = normalizeMarker(marker.marker);
    if (!id) continue;
    const biomarker = REGISTRY.get(id);
    if (!biomarker) continue;
    const status = statusOf(marker, biomarker);
    if (status === "low" || status === "high") {
      out.push({ marker, biomarker, status });
    }
  }
  return out;
}

/**
 * Core entry (evaluator surface): findings where a user's out-of-range biomarker
 * matches a relevance rule against a supplement in the stack.
 * Deterministic: identical input → identical (deep-equal) output.
 */
export function assessLabMarkers(
  input: { labMarkers: LabMarker[]; stackItems: StackItem[] },
  rules: BiomarkerRelevanceRule[] = SEED_BIOMARKER_RELEVANCE,
): LabFinding[] {
  const resolved = resolveMarkers(input.labMarkers);
  const suppIds = new Set(
    input.stackItems
      .map((i) => i.supplementId)
      .filter((id): id is string => id !== null),
  );

  const findings: LabFinding[] = [];
  const seen = new Set<string>();
  for (const { biomarker, status } of resolved) {
    for (const rule of rules) {
      if (rule.biomarkerId !== biomarker.id || rule.trigger !== status) continue;
      if (!suppIds.has(rule.supplementId)) continue;
      if (seen.has(rule.id)) continue;
      seen.add(rule.id);
      findings.push({
        ruleId: rule.id,
        biomarkerId: biomarker.id,
        biomarkerName: biomarker.name,
        supplementId: rule.supplementId,
        status,
        relation: rule.relation,
        rationale: rule.rationale,
        evidenceGrade: rule.evidenceGrade,
      });
    }
  }
  // caution before support, then by name for stability.
  return findings.sort((a, b) => {
    if (a.relation !== b.relation) return a.relation === "caution" ? -1 : 1;
    return a.supplementId.localeCompare(b.supplementId);
  });
}

/**
 * Protocol surface: a bounded ranking signal for one supplement given the user's
 * labs. Deficient/relevant markers (support) push up; cautions push down.
 */
export function labBoost(
  supplementId: string,
  labMarkers: LabMarker[],
  rules: BiomarkerRelevanceRule[] = SEED_BIOMARKER_RELEVANCE,
): LabSignal {
  const resolved = resolveMarkers(labMarkers);
  let score = 0;
  let topName: string | null = null;
  let topAbs = 0;
  let rationale: string | null = null;

  for (const { biomarker, status } of resolved) {
    for (const rule of rules) {
      if (
        rule.supplementId !== supplementId ||
        rule.biomarkerId !== biomarker.id ||
        rule.trigger !== status
      ) {
        continue;
      }
      const w = GRADE_WEIGHT[rule.evidenceGrade];
      const contribution = rule.relation === "support" ? w : -w;
      score += contribution;
      if (Math.abs(contribution) > topAbs) {
        topAbs = Math.abs(contribution);
        topName = biomarker.name;
        rationale = rule.rationale;
      }
    }
  }

  const clamped = Math.max(-1, Math.min(1, score));
  return { score: clamped, biomarkerName: topName, rationale };
}

/** Lookup a biomarker by canonical id (registry stays otherwise encapsulated). */
export function getBiomarker(id: string): Biomarker | undefined {
  return REGISTRY.get(id);
}

/**
 * Lab-import surface (Design §4.2): resolve a raw marker + (value, unit) to its
 * canonical id and value. Returns null when the marker is unrecognized or the
 * unit can't be converted (caller stores raw-only; never guesses a canonical
 * value — same safety rule as statusOf). PURE — reuses normalize + toCanonical.
 */
export function canonicalize(
  markerName: string,
  value: number,
  unit: string,
): { biomarkerId: string; canonicalValue: number; canonicalUnit: string } | null {
  const id = normalizeMarker(markerName);
  if (!id) return null;
  const biomarker = REGISTRY.get(id);
  if (!biomarker) return null;
  const canonicalValue = toCanonical(value, unit, biomarker);
  if (canonicalValue === null) return null;
  return { biomarkerId: id, canonicalValue, canonicalUnit: biomarker.canonicalUnit };
}

/** Library surface: every rule involving a supplement, with its biomarker. */
export function biomarkersForSupplement(
  supplementId: string,
  rules: BiomarkerRelevanceRule[] = SEED_BIOMARKER_RELEVANCE,
): { biomarker: Biomarker; rule: BiomarkerRelevanceRule }[] {
  const out: { biomarker: Biomarker; rule: BiomarkerRelevanceRule }[] = [];
  for (const rule of rules) {
    if (rule.supplementId !== supplementId) continue;
    const biomarker = REGISTRY.get(rule.biomarkerId);
    if (biomarker) out.push({ biomarker, rule });
  }
  return out;
}
