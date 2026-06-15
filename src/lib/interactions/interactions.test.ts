import { describe, expect, it } from "vitest";
import { SEED_INTERACTIONS } from "@/data/seed-interactions";
import { MEDICATION_ALIASES } from "@/data/medication-aliases";
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { containsBannedLanguage } from "@/lib/safety";
import type { StackItem } from "@/types/stack";
import {
  findInteractions,
  hasMedicationInteraction,
  interactionsForSupplement,
  normalizeMedications,
} from "./index";
import { toInteractionFlags, hasCriticalInteraction } from "./to-flags";
import { validateAliases, validateInteractionRules } from "./schema";

function item(supplementId: string | null): StackItem {
  return {
    id: `item-${supplementId ?? "custom"}`,
    stackId: "stack-1",
    supplementId,
    customName: null,
    dose: 1,
    unit: "mg",
    timing: null,
    frequency: null,
    reason: null,
    notes: null,
  };
}

describe("lib/interactions — normalize", () => {
  it("resolves brand → generic → drug class", () => {
    const { recognized, unresolved } = normalizeMedications(["Coumadin"]);
    expect(unresolved).toEqual([]);
    expect(recognized[0]).toMatchObject({
      canonical: "warfarin",
      drugClasses: ["anticoagulant"],
    });
  });

  it("passes through unknown medications without throwing", () => {
    const { recognized, unresolved } = normalizeMedications(["dragon tonic"]);
    expect(recognized).toEqual([]);
    expect(unresolved).toEqual(["dragon tonic"]);
  });

  it("ignores blank entries and de-duplicates", () => {
    const { recognized } = normalizeMedications(["", "  ", "warfarin", "Coumadin"]);
    expect(recognized).toHaveLength(1);
  });
});

describe("lib/interactions — findInteractions", () => {
  it("detects a supplement↔drug-class interaction", () => {
    const findings = findInteractions({
      medications: ["warfarin"],
      stackItems: [item("fish-oil")],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "fish-oil--anticoagulant",
      kind: "supplement-drug",
      counterpart: "anticoagulant",
    });
  });

  it("detects a supplement↔supplement interaction within a stack", () => {
    const findings = findInteractions({
      medications: [],
      stackItems: [item("magnesium"), item("zinc")],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("supplement-supplement");
  });

  it("returns empty (not error) when there is nothing to flag", () => {
    expect(
      findInteractions({ medications: [], stackItems: [item("creatine")] }),
    ).toEqual([]);
    expect(
      findInteractions({ medications: ["aspirin"], stackItems: [] }),
    ).toEqual([]);
  });

  it("is deterministic — identical input yields identical output", () => {
    const input = {
      medications: ["Coumadin", "metformin"],
      stackItems: [item("fish-oil"), item("berberine")],
    };
    expect(findInteractions(input)).toEqual(findInteractions(input));
  });

  it("sorts findings by severity (serious/warning first)", () => {
    const findings = findInteractions({
      medications: ["warfarin", "lisinopril"], // fish-oil warning + l-theanine info
      stackItems: [item("fish-oil"), item("l-theanine")],
    });
    expect(findings[0].severity).toBe("warning");
    expect(findings.at(-1)?.severity).toBe("info");
  });
});

describe("lib/interactions — to-flags mapping", () => {
  it("maps a supplement-drug warning to a critical medication-caution flag", () => {
    const findings = findInteractions({
      medications: ["warfarin"],
      stackItems: [item("fish-oil")],
    });
    const flags = toInteractionFlags(findings);
    expect(flags[0]).toMatchObject({
      severity: "critical",
      category: "medication-caution",
      evidenceLevel: "B",
    });
    expect(hasCriticalInteraction(findings)).toBe(true);
  });

  it("maps a supplement-supplement finding to an interaction-risk flag", () => {
    const findings = findInteractions({
      medications: [],
      stackItems: [item("magnesium"), item("zinc")],
    });
    const flags = toInteractionFlags(findings);
    expect(flags[0].category).toBe("interaction-risk");
  });

  it("targets the stack item row when a resolver is provided", () => {
    const findings = findInteractions({
      medications: ["warfarin"],
      stackItems: [item("fish-oil")],
    });
    const flags = toInteractionFlags(findings, {
      supplementToItemId: { "fish-oil": "item-fish-oil" },
    });
    expect(flags[0].stackItemId).toBe("item-fish-oil");
  });
});

describe("lib/interactions — protocol helper", () => {
  it("flags a conflicting suggestion but is false without meds", () => {
    expect(hasMedicationInteraction("berberine", ["metformin"])).toBe(true);
    expect(hasMedicationInteraction("berberine", [])).toBe(false);
    expect(hasMedicationInteraction("creatine", ["metformin"])).toBe(false);
  });
});

describe("lib/interactions — library lookup", () => {
  it("returns rules where the supplement is primary or counterpart", () => {
    const rules = interactionsForSupplement("zinc");
    expect(rules.length).toBeGreaterThan(0);
    expect(
      rules.every(
        (r) => r.supplementId === "zinc" || r.otherSupplementId === "zinc",
      ),
    ).toBe(true);
  });
});

describe("lib/interactions — dataset integrity", () => {
  const supplementIds = new Set(SEED_SUPPLEMENTS.map((s) => s.id));

  it("passes Zod validation (aliases + rules)", () => {
    expect(() => validateAliases(MEDICATION_ALIASES)).not.toThrow();
    expect(() => validateInteractionRules(SEED_INTERACTIONS)).not.toThrow();
  });

  it("references only real seed supplements", () => {
    for (const rule of SEED_INTERACTIONS) {
      expect(supplementIds.has(rule.supplementId)).toBe(true);
      if (rule.otherSupplementId) {
        expect(supplementIds.has(rule.otherSupplementId)).toBe(true);
      }
    }
  });

  it("has unique rule ids", () => {
    const ids = SEED_INTERACTIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("meets the minimum curated coverage (≥8 supp↔drug, ≥3 supp↔supp)", () => {
    const drug = SEED_INTERACTIONS.filter((r) => r.kind === "supplement-drug");
    const pair = SEED_INTERACTIONS.filter(
      (r) => r.kind === "supplement-supplement",
    );
    expect(drug.length).toBeGreaterThanOrEqual(8);
    expect(pair.length).toBeGreaterThanOrEqual(3);
  });

  it("produces no banned/diagnostic language across all curated copy", () => {
    for (const rule of SEED_INTERACTIONS) {
      expect(containsBannedLanguage(rule.mechanism)).toBe(false);
      expect(containsBannedLanguage(rule.management)).toBe(false);
    }
    // Every rule, when rendered through safetyCopy, stays clean.
    const allFindings = findInteractions({
      medications: MEDICATION_ALIASES.map((a) => a.canonical),
      stackItems: SEED_SUPPLEMENTS.map((s) => item(s.id)),
    });
    for (const flag of toInteractionFlags(allFindings)) {
      expect(containsBannedLanguage(flag.title)).toBe(false);
      expect(containsBannedLanguage(flag.explanation)).toBe(false);
      expect(containsBannedLanguage(flag.recommendation)).toBe(false);
    }
  });
});
