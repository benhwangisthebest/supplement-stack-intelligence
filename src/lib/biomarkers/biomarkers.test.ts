import { describe, expect, it } from "vitest";
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";
import { SEED_BIOMARKER_RELEVANCE } from "@/data/seed-biomarker-relevance";
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { containsBannedLanguage } from "@/lib/safety";
import type { LabMarker } from "@/types";
import type { StackItem } from "@/types/stack";
import {
  assessLabMarkers,
  biomarkersForSupplement,
  labBoost,
  normalizeMarker,
  statusOf,
  toCanonical,
} from "./index";
import { toLabFlags } from "./to-flags";
import { validateBiomarkers, validateBiomarkerRelevance } from "./schema";

function lab(partial: Partial<LabMarker> & { marker: string; value: number; unit: string }): LabMarker {
  return {
    id: `l-${partial.marker}`,
    userId: "u1",
    referenceLow: null,
    referenceHigh: null,
    date: null,
    notes: null,
    ...partial,
  };
}

function item(supplementId: string): StackItem {
  return {
    id: `item-${supplementId}`,
    stackId: "s1",
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

const biomarkerById = new Map(SEED_BIOMARKERS.map((b) => [b.id, b]));

describe("lib/biomarkers — normalize", () => {
  it("resolves an alias to a canonical biomarker id", () => {
    expect(normalizeMarker("Serum Magnesium")).toBe("magnesium-serum");
    expect(normalizeMarker("25-OH-D")).toBe("vitamin-d-25oh");
  });

  it("returns null for an unknown marker", () => {
    expect(normalizeMarker("dragon enzyme")).toBeNull();
  });
});

describe("lib/biomarkers — units", () => {
  const vitD = biomarkerById.get("vitamin-d-25oh")!;

  it("converts nmol/L → ng/mL for 25-OH vitamin D", () => {
    // 75 nmol/L ≈ 30 ng/mL (factor 0.4006)
    expect(toCanonical(75, "nmol/L", vitD)).toBeCloseTo(30.045, 2);
  });

  it("treats the canonical unit as factor 1", () => {
    expect(toCanonical(42, "ng/mL", vitD)).toBe(42);
  });

  it("returns null for an unknown unit (no guessing)", () => {
    expect(toCanonical(75, "made-up", vitD)).toBeNull();
  });
});

describe("lib/biomarkers — statusOf + range precedence", () => {
  const vitD = biomarkerById.get("vitamin-d-25oh")!;

  it("uses the registry range when the user gives none", () => {
    expect(statusOf(lab({ marker: "vitamin d", value: 20, unit: "ng/mL" }), vitD)).toBe("low");
  });

  it("prefers the user's reference range over the registry's", () => {
    const m = lab({ marker: "vitamin d", value: 25, unit: "ng/mL", referenceLow: 20 });
    expect(statusOf(m, vitD)).toBe("in-range"); // 25 >= user low 20, despite registry low 30
  });

  it("reports unknown when the unit can't be converted", () => {
    expect(statusOf(lab({ marker: "vitamin d", value: 25, unit: "??" }), vitD)).toBe("unknown");
  });
});

// [Phase 4 U21, Q-25] A user-entered bound is in the unit the row states, so it
// converts with the value's factor; a catalog bound is already canonical. Before
// U21 only the value converted, so 100 nmol/L against 75–250 nmol/L read "low".
describe("lib/biomarkers — statusOf compares value and range in one unit (U21)", () => {
  const vitD = biomarkerById.get("vitamin-d-25oh")!;

  // Every accepted (marker, unit) pair, derived from the catalog so a new
  // conversion is covered the day it is added.
  const allPairs = SEED_BIOMARKERS.flatMap((b) =>
    Object.entries(b.unitConversions).map(([unit, factor]) => ({ b, unit, factor })),
  );

  it("covers at least ten non-canonical (marker, unit) pairs", () => {
    expect(allPairs.filter((p) => p.factor !== 1).length).toBeGreaterThanOrEqual(10);
  });

  it.each(allPairs.map((p) => [p.b.id, p.unit, p] as const))(
    "%s in %s: a user range in the entered unit gives the correct status",
    (_id, _unit, { b, unit, factor }) => {
      // The catalog range expressed in the entered unit (a stand-in user range).
      const low = b.refLow === null ? null : b.refLow / factor;
      const high = b.refHigh! / factor;
      const at = (value: number) =>
        statusOf(lab({ marker: b.name, value, unit, referenceLow: low, referenceHigh: high }), b);
      const mid = low === null ? high * 0.5 : (low + high) / 2;
      expect(at(mid)).toBe("in-range");
      expect(at(high * 0.95)).toBe("in-range");
      expect(at(high * 1.5)).toBe("high");
      if (low !== null) {
        expect(at(low * 1.05)).toBe("in-range");
        expect(at(low * 0.5)).toBe("low");
      }
    },
  );

  it.each(allPairs.map((p) => [p.b.id, p.unit, p] as const))(
    "%s in %s: the catalog fallback gives the correct status",
    (_id, _unit, { b, unit, factor }) => {
      const at = (value: number) => statusOf(lab({ marker: b.name, value, unit }), b);
      const high = b.refHigh! / factor;
      expect(at(high * 0.95)).toBe("in-range");
      expect(at(high * 1.5)).toBe("high");
      if (b.refLow !== null) expect(at((b.refLow / factor) * 0.5)).toBe("low");
    },
  );

  it("Q-25 probe: 100 nmol/L against the user's 75–250 nmol/L is in range", () => {
    const m = lab({ marker: "vitamin d", value: 100, unit: "nmol/L", referenceLow: 75, referenceHigh: 250 });
    expect(statusOf(m, vitD)).toBe("in-range");
  });

  it("a user low bound in nmol/L mixed with the catalog high bound", () => {
    const at = (value: number) =>
      statusOf(lab({ marker: "vitamin d", value, unit: "nmol/L", referenceLow: 75 }), vitD);
    expect(at(100)).toBe("in-range"); // 40.06 ng/mL: ≥ 75 nmol/L, ≤ catalog 100 ng/mL
    expect(at(50)).toBe("low");
    expect(at(300)).toBe("high"); // 120.18 ng/mL > catalog 100 ng/mL
  });

  it("a value equal to its user bound is in range", () => {
    const m = lab({ marker: "vitamin d", value: 75, unit: "nmol/L", referenceLow: 75, referenceHigh: 250 });
    expect(statusOf(m, vitD)).toBe("in-range");
    expect(statusOf({ ...m, value: 250 }, vitD)).toBe("in-range");
  });

  it("direction is not inverted: a low mmol/L magnesium reads low", () => {
    const mg = biomarkerById.get("magnesium-serum")!;
    const m = lab({ marker: "magnesium", value: 0.5, unit: "mmol/L", referenceLow: 0.7, referenceHigh: 1.0 });
    expect(statusOf(m, mg)).toBe("low");
  });

  it("an unknown unit stays unknown even with a user range (no bound is guessed)", () => {
    const m = lab({ marker: "vitamin d", value: 100, unit: "??", referenceLow: 75, referenceHigh: 250 });
    expect(statusOf(m, vitD)).toBe("unknown");
  });

  it("assessLabMarkers and labBoost: an in-range nmol/L entry yields no finding and no boost", () => {
    const m = lab({ marker: "Vitamin D", value: 100, unit: "nmol/L", referenceLow: 75, referenceHigh: 250 });
    expect(assessLabMarkers({ labMarkers: [m], stackItems: [item("vitamin-d")] })).toEqual([]);
    expect(labBoost("vitamin-d", [m])).toEqual({ score: 0, biomarkerName: null, rationale: null });
  });
});

describe("lib/biomarkers — assessLabMarkers", () => {
  it("flags a low biomarker against a relevant stack supplement (support)", () => {
    const findings = assessLabMarkers({
      labMarkers: [lab({ marker: "Vitamin D", value: 18, unit: "ng/mL" })],
      stackItems: [item("vitamin-d")],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      supplementId: "vitamin-d",
      status: "low",
      relation: "support",
    });
  });

  it("flags a high biomarker (support, high trigger)", () => {
    const findings = assessLabMarkers({
      labMarkers: [lab({ marker: "LDL", value: 160, unit: "mg/dL" })],
      stackItems: [item("berberine")],
    });
    expect(findings.some((f) => f.supplementId === "berberine" && f.status === "high")).toBe(true);
  });

  it("emits a caution for a high marker the supplement could worsen", () => {
    const findings = assessLabMarkers({
      labMarkers: [lab({ marker: "Calcium", value: 11, unit: "mg/dL" })],
      stackItems: [item("vitamin-d")],
    });
    expect(findings.some((f) => f.relation === "caution")).toBe(true);
  });

  it("returns empty when nothing is out of range or unmatched", () => {
    expect(
      assessLabMarkers({
        labMarkers: [lab({ marker: "Vitamin D", value: 50, unit: "ng/mL" })],
        stackItems: [item("vitamin-d")],
      }),
    ).toEqual([]);
    expect(
      assessLabMarkers({
        labMarkers: [lab({ marker: "Vitamin D", value: 18, unit: "ng/mL" })],
        stackItems: [item("creatine")],
      }),
    ).toEqual([]);
  });

  it("is deterministic", () => {
    const input = {
      labMarkers: [lab({ marker: "Vitamin D", value: 18, unit: "ng/mL" })],
      stackItems: [item("vitamin-d")],
    };
    expect(assessLabMarkers(input)).toEqual(assessLabMarkers(input));
  });
});

describe("lib/biomarkers — labBoost", () => {
  it("returns a positive signal for a deficient marker supporting a supplement", () => {
    const sig = labBoost("vitamin-d", [lab({ marker: "Vitamin D", value: 18, unit: "ng/mL" })]);
    expect(sig.score).toBeGreaterThan(0);
    expect(sig.biomarkerName).toBe("25-OH Vitamin D");
    expect(sig.rationale).toBeTruthy();
  });

  it("returns a negative signal for a caution (demote)", () => {
    const sig = labBoost("vitamin-d", [lab({ marker: "Calcium", value: 11, unit: "mg/dL" })]);
    expect(sig.score).toBeLessThan(0);
  });

  it("returns zero when no labs are relevant", () => {
    expect(labBoost("creatine", [lab({ marker: "Vitamin D", value: 18, unit: "ng/mL" })]).score).toBe(0);
  });
});

describe("lib/biomarkers — to-flags", () => {
  it("maps support→info and caution→warning under lab-relevance", () => {
    const support = toLabFlags(
      assessLabMarkers({
        labMarkers: [lab({ marker: "Vitamin D", value: 18, unit: "ng/mL" })],
        stackItems: [item("vitamin-d")],
      }),
      { supplementToItemId: { "vitamin-d": "item-vitamin-d" } },
    );
    expect(support[0]).toMatchObject({
      severity: "info",
      category: "lab-relevance",
      stackItemId: "item-vitamin-d",
    });

    const caution = toLabFlags(
      assessLabMarkers({
        labMarkers: [lab({ marker: "Calcium", value: 11, unit: "mg/dL" })],
        stackItems: [item("vitamin-d")],
      }),
    );
    expect(caution[0].severity).toBe("warning");
  });
});

describe("lib/biomarkers — library lookup", () => {
  it("returns biomarker rules for a supplement", () => {
    const rows = biomarkersForSupplement("vitamin-d");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.rule.supplementId === "vitamin-d")).toBe(true);
  });
});

describe("lib/biomarkers — dataset integrity", () => {
  const supplementIds = new Set(SEED_SUPPLEMENTS.map((s) => s.id));
  const biomarkerIds = new Set(SEED_BIOMARKERS.map((b) => b.id));

  it("passes Zod validation (registry + relevance)", () => {
    expect(() => validateBiomarkers(SEED_BIOMARKERS)).not.toThrow();
    expect(() => validateBiomarkerRelevance(SEED_BIOMARKER_RELEVANCE)).not.toThrow();
  });

  it("references only real biomarkers and seed supplements", () => {
    for (const rule of SEED_BIOMARKER_RELEVANCE) {
      expect(biomarkerIds.has(rule.biomarkerId)).toBe(true);
      expect(supplementIds.has(rule.supplementId)).toBe(true);
    }
  });

  it("has unique ids and minimum coverage", () => {
    expect(new Set(SEED_BIOMARKERS.map((b) => b.id)).size).toBe(SEED_BIOMARKERS.length);
    expect(new Set(SEED_BIOMARKER_RELEVANCE.map((r) => r.id)).size).toBe(SEED_BIOMARKER_RELEVANCE.length);
    expect(SEED_BIOMARKERS.length).toBeGreaterThanOrEqual(12);
    expect(SEED_BIOMARKER_RELEVANCE.length).toBeGreaterThanOrEqual(12);
  });

  it("produces no banned/diagnostic language across curated copy + rendered flags", () => {
    for (const rule of SEED_BIOMARKER_RELEVANCE) {
      expect(containsBannedLanguage(rule.rationale)).toBe(false);
    }
    const allFindings = assessLabMarkers({
      labMarkers: [
        lab({ marker: "Vitamin D", value: 18, unit: "ng/mL" }),
        lab({ marker: "LDL", value: 160, unit: "mg/dL" }),
        lab({ marker: "Calcium", value: 11, unit: "mg/dL" }),
        lab({ marker: "Triglycerides", value: 200, unit: "mg/dL" }),
        lab({ marker: "Cortisol", value: 30, unit: "ug/dL" }),
      ],
      stackItems: SEED_SUPPLEMENTS.map((s) => item(s.id)),
    });
    for (const flag of toLabFlags(allFindings)) {
      expect(containsBannedLanguage(flag.title)).toBe(false);
      expect(containsBannedLanguage(flag.explanation)).toBe(false);
      expect(containsBannedLanguage(flag.recommendation)).toBe(false);
    }
  });
});
