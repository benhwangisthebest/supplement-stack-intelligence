import { describe, expect, it } from "vitest";
import { getAllSupplements } from "@/lib/evidence";
import type { Effect } from "@/types/effect";
import type { EvidenceGrade, OutcomeCategory } from "@/types";
import {
  deriveSupplementArchetype,
  SUPPLEMENT_ARCHETYPE_NAMES,
  supplementArchetypeFromEffects,
} from "./supplement-archetypes";

let seq = 0;
function eff(outcome: OutcomeCategory, grade: EvidenceGrade): Effect {
  seq += 1;
  return {
    id: `eff-${seq}`,
    supplementId: "test",
    name: `${outcome} effect`,
    outcomeCategory: outcome,
    grade,
    confidence: "moderate",
    summary: "Studied for this outcome.",
    relevantPopulation: "adults",
    studiedDose: { min: 1, max: 2, unit: "g" },
    mechanismTags: [],
    paperIds: [],
  };
}

describe("supplementArchetypeFromEffects (pure branches)", () => {
  it("→ experimental-edge when evidence is mostly limited/emerging", () => {
    const { archetype } = supplementArchetypeFromEffects([
      eff("mood", "C"),
      eff("focus", "D"),
      eff("gut", "C"),
    ]);
    expect(archetype).toBe("experimental-edge");
  });

  it("→ experimental-edge for a supplement with no graded effects", () => {
    expect(supplementArchetypeFromEffects([]).archetype).toBe("experimental-edge");
  });

  it("→ foundational-staple when broad AND strongly evidenced", () => {
    const { archetype } = supplementArchetypeFromEffects([
      eff("foundational", "A"),
      eff("longevity", "A"),
      eff("deficiency", "B"),
    ]);
    expect(archetype).toBe("foundational-staple");
  });

  it("→ broad-spectrum for many outcomes with mixed strength", () => {
    const { archetype } = supplementArchetypeFromEffects([
      eff("sleep", "A"),
      eff("focus", "B"),
      eff("stress", "C"),
      eff("mood", "C"),
    ]);
    expect(archetype).toBe("broad-spectrum");
  });

  it("→ targeted-specialist for a focused, decently-graded supplement", () => {
    const { archetype } = supplementArchetypeFromEffects([
      eff("training", "A"),
      eff("recovery", "B"),
    ]);
    expect(archetype).toBe("targeted-specialist");
  });
});

describe("deriveSupplementArchetype (seed-backed)", () => {
  it("classifies every seed supplement to a valid, named archetype", () => {
    for (const supp of getAllSupplements()) {
      const result = deriveSupplementArchetype(supp.id);
      expect(result.supplementId).toBe(supp.id);
      expect(SUPPLEMENT_ARCHETYPE_NAMES[result.archetype]).toBe(result.name);
      expect(result.rationale.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for a given supplement", () => {
    expect(deriveSupplementArchetype("creatine")).toEqual(
      deriveSupplementArchetype("creatine"),
    );
  });
});
