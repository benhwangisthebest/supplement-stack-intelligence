import { describe, expect, it } from "vitest";
import {
  compareGrades,
  getAllSupplements,
  getBestEffectForOutcome,
  getEffectsByOutcome,
  getEffectsForSupplement,
  getPapersForEffect,
  getRelatedSupplements,
  getSupplementById,
  getSupplementBySlug,
  isStrongerGrade,
  searchSupplements,
} from "./index";

describe("lib/evidence lookups", () => {
  it("exposes the full seeded supplement set (>=15)", () => {
    expect(getAllSupplements().length).toBeGreaterThanOrEqual(15);
  });

  it("finds a supplement by id and slug", () => {
    expect(getSupplementById("creatine")?.name).toContain("Creatine");
    expect(getSupplementBySlug("magnesium")?.id).toBe("magnesium");
    expect(getSupplementById("does-not-exist")).toBeUndefined();
  });

  it("returns effects for a supplement", () => {
    const effects = getEffectsForSupplement("creatine");
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.every((e) => e.supplementId === "creatine")).toBe(true);
  });

  it("returns effects by outcome category", () => {
    const sleep = getEffectsByOutcome("sleep");
    expect(sleep.some((e) => e.supplementId === "melatonin")).toBe(true);
  });

  it("picks the highest-grade effect for an outcome", () => {
    // creatine: training=A (strength), so best-for-training must be grade A
    const best = getBestEffectForOutcome("creatine", "training");
    expect(best?.grade).toBe("A");
  });

  it("resolves linked papers for an effect", () => {
    const best = getBestEffectForOutcome("melatonin", "sleep");
    expect(best).toBeDefined();
    const papers = getPapersForEffect(best!);
    expect(papers.length).toBeGreaterThan(0);
    expect(papers[0]?.studyType).toBeDefined();
  });

  it("resolves related supplements", () => {
    const related = getRelatedSupplements("magnesium");
    expect(related.map((s) => s.id)).toContain("glycine");
  });

  it("searches by name and alias, case-insensitively", () => {
    expect(searchSupplements("MAGNES").map((s) => s.id)).toContain("magnesium");
    expect(searchSupplements("omega-3").map((s) => s.id)).toContain("fish-oil");
    expect(searchSupplements("").length).toBe(getAllSupplements().length);
    expect(searchSupplements("zzzznope")).toHaveLength(0);
  });

  it("ranks grades correctly", () => {
    expect(isStrongerGrade("A", "C")).toBe(true);
    expect(isStrongerGrade("D", "B")).toBe(false);
    expect(compareGrades("A", "B")).toBeLessThan(0); // A sorts before B
  });
});
