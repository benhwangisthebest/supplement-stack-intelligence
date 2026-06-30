// Unit — the pure provenance deep-link resolver (Design §5.3, Plan SC8).
import { describe, expect, it } from "vitest";
import { citationHref } from "./citation-href";
import type { Citation } from "@/types/advisor";

const cite = (kind: Citation["kind"], refId: string): Citation => ({
  kind,
  refId,
  label: `${kind}:${refId}`,
});

describe("citationHref", () => {
  it("deep-links an effect-grade citation to its supplement page + effect anchor", () => {
    // magnesium-sleep is a seeded effect on the 'magnesium' supplement.
    expect(citationHref(cite("effect-grade", "magnesium-sleep"))).toBe(
      "/library/magnesium#effect-magnesium-sleep",
    );
  });

  it("deep-links a paper citation to the supplement whose effect cites it", () => {
    // p-magnesium-sleep is referenced by magnesium-sleep's paperIds.
    expect(citationHref(cite("paper", "p-magnesium-sleep"))).toBe(
      "/library/magnesium#paper-p-magnesium-sleep",
    );
  });

  it("returns null for an unknown effect id (no dead link)", () => {
    expect(citationHref(cite("effect-grade", "does-not-exist"))).toBeNull();
  });

  it("returns null for an unknown paper id", () => {
    expect(citationHref(cite("paper", "p-nope"))).toBeNull();
  });

  it.each(["interaction-rule", "biomarker-rule", "lab-trend", "stack-eval"] as const)(
    "renders %s as an inert tag (null href)",
    (kind) => {
      expect(citationHref(cite(kind, "any-id"))).toBeNull();
    },
  );
});
