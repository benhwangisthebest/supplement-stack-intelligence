import { describe, expect, it } from "vitest";
import type { LabMarkerTimelinePoint } from "@/types/lab";
import { computeTrends } from "./index";

function pt(
  biomarkerId: string,
  canonicalValue: number,
  collectedAt: string,
  canonicalUnit = "ng/mL",
): LabMarkerTimelinePoint {
  return { biomarkerId, canonicalValue, canonicalUnit, collectedAt };
}

describe("computeTrends", () => {
  it("computes a rising trend across two dated points", () => {
    const out = computeTrends([
      pt("vitamin-d-25oh", 28, "2025-12-01"),
      pt("vitamin-d-25oh", 41, "2026-06-01"),
    ]);
    expect(out).toHaveLength(1);
    const s = out[0];
    expect(s.direction).toBe("rising");
    expect(s.delta).toBe(13);
    expect(s.pctChange).toBeCloseTo((13 / 28) * 100, 5);
    expect(s.points).toBe(2);
    expect(s.windowDays).toBe(182);
    expect(s.latest.collectedAt).toBe("2026-06-01");
    expect(s.previous?.collectedAt).toBe("2025-12-01");
  });

  it("computes a falling trend", () => {
    const out = computeTrends([
      pt("ldl-cholesterol", 160, "2025-06-01", "mg/dL"),
      pt("ldl-cholesterol", 120, "2026-06-01", "mg/dL"),
    ]);
    expect(out[0].direction).toBe("falling");
    expect(out[0].delta).toBe(-40);
  });

  it("classifies small (<5%) movement as stable", () => {
    const out = computeTrends([
      pt("ferritin", 100, "2025-06-01"),
      pt("ferritin", 103, "2026-06-01"),
    ]);
    expect(out[0].direction).toBe("stable");
  });

  it("returns 'insufficient' for a single-point marker", () => {
    const out = computeTrends([pt("zinc-serum", 55, "2026-06-01", "ug/dL")]);
    expect(out[0].direction).toBe("insufficient");
    expect(out[0].previous).toBeNull();
    expect(out[0].delta).toBeNull();
    expect(out[0].pctChange).toBeNull();
    expect(out[0].points).toBe(1);
  });

  it("compares the two MOST RECENT points when more than two exist", () => {
    const out = computeTrends([
      pt("vitamin-d-25oh", 20, "2025-01-01"),
      pt("vitamin-d-25oh", 30, "2025-06-01"),
      pt("vitamin-d-25oh", 45, "2026-01-01"),
    ]);
    expect(out[0].delta).toBe(15); // 45 − 30, ignoring the oldest
    expect(out[0].points).toBe(3);
  });

  it("guards pctChange against a zero baseline", () => {
    const out = computeTrends([
      pt("ldl-cholesterol", 0, "2025-06-01", "mg/dL"),
      pt("ldl-cholesterol", 50, "2026-06-01", "mg/dL"),
    ]);
    expect(out[0].pctChange).toBeNull();
    expect(out[0].direction).toBe("rising");
  });

  it("resolves the display name from the registry", () => {
    const out = computeTrends([
      pt("vitamin-d-25oh", 28, "2025-12-01"),
      pt("vitamin-d-25oh", 41, "2026-06-01"),
    ]);
    expect(out[0].biomarkerName).toBe("25-OH Vitamin D");
  });

  it("groups multiple markers and sorts movement-first then by name", () => {
    const out = computeTrends([
      pt("ferritin", 100, "2025-06-01"),
      pt("ferritin", 102, "2026-06-01"), // stable
      pt("vitamin-d-25oh", 20, "2025-06-01"),
      pt("vitamin-d-25oh", 45, "2026-06-01"), // rising
      pt("zinc-serum", 55, "2026-06-01", "ug/dL"), // insufficient
    ]);
    expect(out.map((s) => s.direction)).toEqual([
      "rising",
      "stable",
      "insufficient",
    ]);
  });

  it("is deterministic — identical input yields deep-equal output", () => {
    const points = [
      pt("vitamin-d-25oh", 28, "2025-12-01"),
      pt("vitamin-d-25oh", 41, "2026-06-01"),
    ];
    expect(computeTrends(points)).toEqual(computeTrends(points));
  });

  it("returns [] for no points", () => {
    expect(computeTrends([])).toEqual([]);
  });
});
