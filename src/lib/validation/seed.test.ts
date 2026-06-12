import { describe, expect, it } from "vitest";
import { SEED_EFFECTS } from "@/data/seed-effects";
import { SEED_PAPERS } from "@/data/seed-papers";
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { validateSeed } from "./seed";

describe("seed data integrity (Design §8.5)", () => {
  it("passes shape + referential integrity validation", () => {
    const result = validateSeed();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("meets minimum dataset sizes", () => {
    expect(SEED_SUPPLEMENTS.length).toBeGreaterThanOrEqual(15);
    expect(SEED_EFFECTS.length).toBeGreaterThanOrEqual(25);
    expect(SEED_PAPERS.length).toBeGreaterThanOrEqual(15);
  });

  it("gives every supplement at least one effect", () => {
    for (const s of SEED_SUPPLEMENTS) {
      const has = SEED_EFFECTS.some((e) => e.supplementId === s.id);
      expect(has, `supplement ${s.id} has no effect`).toBe(true);
    }
  });

  it("detects a broken reference", () => {
    const broken = validateSeed({
      supplements: SEED_SUPPLEMENTS,
      effects: [
        { ...SEED_EFFECTS[0], id: "x-bad", supplementId: "ghost" },
      ],
      papers: SEED_PAPERS,
    });
    expect(broken.ok).toBe(false);
    expect(broken.errors.join(" ")).toContain("ghost");
  });
});
