// Domain — identity-cards (v9). PURE over the seed evidence library. Classifies a
// SUPPLEMENT (not the user) into a compound archetype from its effects' grades and
// outcome breadth. Design Ref: §3.1, §5.4. Plan SC6. Rationale is descriptive and
// non-diagnostic (honesty.test.ts).
import { getEffectsForSupplement } from "@/lib/evidence";
import type { Effect } from "@/types/effect";
import type {
  SupplementArchetype,
  SupplementArchetypeId,
} from "@/types/identity";

const NAMES: Record<SupplementArchetypeId, string> = {
  "foundational-staple": "Foundational Staple",
  "targeted-specialist": "Targeted Specialist",
  "experimental-edge": "Experimental Edge",
  "broad-spectrum": "Broad-Spectrum",
};

const isHighGrade = (g: "A" | "B" | "C" | "D"): boolean => g === "A" || g === "B";

/**
 * PURE decision over a supplement's effects (Design §3.1) — split out so it is
 * unit-testable with synthetic effects, independent of the seed:
 *  - Experimental Edge — evidence is mostly limited/emerging.
 *  - Foundational Staple — broad AND strongly evidenced.
 *  - Broad-Spectrum — spans many outcomes, mixed strength.
 *  - Targeted Specialist — focused on one/few outcomes with decent evidence.
 */
export function supplementArchetypeFromEffects(
  effects: Effect[],
): { archetype: SupplementArchetypeId; rationale: string } {
  const total = effects.length;
  const distinctOutcomes = new Set(effects.map((e) => e.outcomeCategory)).size;
  const highGradeShare =
    total === 0 ? 0 : effects.filter((e) => isHighGrade(e.grade)).length / total;

  if (total === 0 || highGradeShare < 0.34) {
    return {
      archetype: "experimental-edge",
      rationale:
        total === 0
          ? "No graded effects yet — treat as preliminary."
          : "Evidence here is mostly limited or emerging across its effects.",
    };
  }
  if (distinctOutcomes >= 3 && highGradeShare >= 0.6) {
    return {
      archetype: "foundational-staple",
      rationale: `Broad, well-supported evidence across ${distinctOutcomes} outcome areas.`,
    };
  }
  if (distinctOutcomes >= 4) {
    return {
      archetype: "broad-spectrum",
      rationale: `Spans ${distinctOutcomes} outcome areas with mixed evidence strength.`,
    };
  }
  return {
    archetype: "targeted-specialist",
    rationale: `Focused on ${distinctOutcomes} outcome ${distinctOutcomes === 1 ? "area" : "areas"} with solid evidence.`,
  };
}

/** Seed-backed wrapper: same input id ⇒ same archetype (deterministic). */
export function deriveSupplementArchetype(supplementId: string): SupplementArchetype {
  const { archetype, rationale } = supplementArchetypeFromEffects(
    getEffectsForSupplement(supplementId),
  );
  return { supplementId, archetype, name: NAMES[archetype], rationale };
}

export { NAMES as SUPPLEMENT_ARCHETYPE_NAMES };
