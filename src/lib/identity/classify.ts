// Domain — identity-cards (v9). PURE. Nearest-profile classifier over the
// declarative archetype taxonomy. Design Ref: §3.3. Plan SC: deterministic +
// TOTAL (always returns a result, never throws/null) + anti-over-claim guard
// (SC5/SC10) — thin data or a weak match resolves to `emerging`.
import { ARCHETYPES } from "./archetypes";
import type {
  ArchetypeDef,
  ArchetypeId,
  ConfidenceLevel,
  TraitAxis,
  TraitVector,
} from "@/types/identity";

/**
 * Per-axis distance weights. `dataDepth` is weighted 0: it drives CONFIDENCE, not
 * identity STYLE, so a thin-data user is never pulled toward a low-depth archetype
 * (Design §3.3). Individual archetypes may override via `def.weights`.
 */
export const DEFAULT_AXIS_WEIGHTS: Record<TraitAxis, number> = {
  evidenceRigor: 1,
  riskAppetite: 1,
  breadth: 1,
  foundationalFocus: 1,
  dataDepth: 0,
};

/** Below this closeness, no archetype is a confident fit → `emerging`. */
export const MIN_MATCH = 0.35;

const STYLE_AXES: readonly TraitAxis[] = [
  "evidenceRigor",
  "riskAppetite",
  "breadth",
  "foundationalFocus",
];

/** Weighted Euclidean distance between a trait vector and an archetype target. */
function weightedDistance(v: TraitVector, def: ArchetypeDef): number {
  let sumSq = 0;
  let sumW = 0;
  for (const axis of Object.keys(DEFAULT_AXIS_WEIGHTS) as TraitAxis[]) {
    const w = def.weights?.[axis] ?? DEFAULT_AXIS_WEIGHTS[axis];
    if (w === 0) continue;
    const d = v[axis] - def.target[axis];
    sumSq += w * d * d;
    sumW += w;
  }
  return sumW === 0 ? 0 : Math.sqrt(sumSq / sumW); // normalized to axis scale [0,1]
}

/** matchScore ∈ [0,1]: 1 = exact, decreasing with distance. */
function toMatchScore(distance: number): number {
  return Math.max(0, 1 - distance);
}

export interface Classification {
  archetype: ArchetypeId;
  matchScore: number; // [0,1] closeness to the winning archetype (0 for emerging)
}

/**
 * Classify a trait vector. TOTAL: returns the nearest archetype, or `emerging`
 * when confidence is emerging (thin data) or no archetype is close enough.
 * Deterministic tie-break: lower ARCHETYPES index wins (stable ordering).
 */
export function classify(v: TraitVector, confidence: ConfidenceLevel): Classification {
  if (confidence === "emerging") return { archetype: "emerging", matchScore: 0 };

  let best: ArchetypeDef | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const def of ARCHETYPES) {
    const dist = weightedDistance(v, def);
    if (dist < bestDist) {
      bestDist = dist;
      best = def;
    }
  }

  const matchScore = best ? toMatchScore(bestDist) : 0;
  if (!best || matchScore < MIN_MATCH) return { archetype: "emerging", matchScore };
  return { archetype: best.id, matchScore };
}

// Re-export for the integrity test (Plan SC10) and any internal reuse.
export { weightedDistance, STYLE_AXES };
