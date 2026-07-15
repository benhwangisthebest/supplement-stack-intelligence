import { describe, expect, it } from "vitest";
import { assessLabMarkers } from "@/lib/biomarkers";
import { getEffectsForSupplement, getSupplementBySlug } from "@/lib/evidence";
import { findInteractions } from "@/lib/interactions";
import { evaluateStack } from "@/lib/stack-evaluator";
import { computeTrends } from "@/lib/lab-trends";
import {
  ADVISOR_TOOLS,
  biomarkerFindings,
  checkInteractions,
  evaluateStackTool,
  getSupplement,
  labTrends,
  searchLibrary,
  toolByName,
} from "./tools";
import { makeContext } from "./mock-adapter";

const ctx = makeContext();

describe("advisor tool registry", () => {
  it("exposes exactly the 7 callable tools", () => {
    expect(ADVISOR_TOOLS.map((t) => t.name).sort()).toEqual(
      [
        "biomarkerFindings",
        "checkInteractions",
        "evaluateStack",
        "getSupplement",
        "labTrends",
        "searchLibrary",
        "sideEffectWatch",
      ].sort(),
    );
  });

  it("does NOT expose profile/stack/labs as tools (pre-loaded into context)", () => {
    const names = ADVISOR_TOOLS.map((t) => t.name);
    expect(names).not.toContain("getProfile");
    expect(names).not.toContain("getStack");
  });

  it("toolByName resolves and returns undefined for unknown", () => {
    expect(toolByName("searchLibrary")?.name).toBe("searchLibrary");
    expect(toolByName("nope")).toBeUndefined();
  });
});

describe("searchLibrary", () => {
  it("returns grounded hits with effect-grade citations", () => {
    const r = searchLibrary.handler({ query: "creatine" }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data!.length).toBeGreaterThan(0);
    expect(r.citations.every((c) => c.kind === "effect-grade")).toBe(true);
  });

  it("reports empty (ok:false) for a non-matching query", () => {
    const r = searchLibrary.handler({ query: "zzzznotreal" }, ctx);
    expect(r.ok).toBe(false);
    expect(r.citations).toEqual([]);
    expect(r.emptyReason).toContain("zzzznotreal");
  });
});

describe("getSupplement", () => {
  it("purity: effect count equals the engine's own output", () => {
    const supp = getSupplementBySlug("creatine")!;
    const r = getSupplement.handler({ slug: "creatine" }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data!.effects.length).toBe(getEffectsForSupplement(supp.id).length);
  });

  it("empty for an unknown slug", () => {
    expect(getSupplement.handler({ slug: "ghost" }, ctx).ok).toBe(false);
  });
});

describe("evaluateStack", () => {
  it("purity: matches evaluateStack() called directly", () => {
    const r = evaluateStackTool.handler({}, ctx);
    const direct = evaluateStack({
      stack: ctx.stack!,
      items: ctx.stackItems,
      profile: ctx.profile,
      labMarkers: ctx.labMarkers,
    });
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(direct);
  });

  it("empty when there is no stack", () => {
    const r = evaluateStackTool.handler({}, makeContext({ stack: null, stackItems: [] }));
    expect(r.ok).toBe(false);
  });
});

describe("checkInteractions", () => {
  it("finds the fish-oil ↔ anticoagulant (warfarin) interaction", () => {
    const r = checkInteractions.handler({}, ctx);
    const direct = findInteractions({
      medications: ctx.profile!.medications,
      stackItems: ctx.stackItems,
    });
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(direct);
    expect(r.data!.some((f) => f.supplementId === "fish-oil")).toBe(true);
    expect(r.citations[0].kind).toBe("interaction-rule");
  });

  it("empty (never 'safe') when no medications are listed", () => {
    const r = checkInteractions.handler(
      {},
      makeContext({ profile: { ...ctx.profile!, medications: [] } }),
    );
    expect(r.ok).toBe(false);
    expect(r.emptyReason).toMatch(/no medications/i);
  });
});

describe("biomarkerFindings", () => {
  it("finds the low vitamin-D → vitamin-d support relevance", () => {
    const r = biomarkerFindings.handler({}, ctx);
    const direct = assessLabMarkers({
      labMarkers: ctx.labMarkers,
      stackItems: ctx.stackItems,
    });
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(direct);
    expect(r.citations[0].kind).toBe("biomarker-rule");
  });

  it("empty when there are no labs", () => {
    expect(biomarkerFindings.handler({}, makeContext({ labMarkers: [] })).ok).toBe(false);
  });
});

describe("labTrends", () => {
  it("computes a rising vitamin-D trend matching the engine", () => {
    const r = labTrends.handler({}, ctx);
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(computeTrends(ctx.timelinePoints));
    expect(r.citations[0].kind).toBe("lab-trend");
  });

  it("empty when no timeline points exist", () => {
    expect(labTrends.handler({}, makeContext({ timelinePoints: [] })).ok).toBe(false);
  });

  it("empty when every marker has only one point (insufficient)", () => {
    const single = makeContext({
      timelinePoints: [
        {
          biomarkerId: "vitamin-d-25oh",
          canonicalValue: 20,
          canonicalUnit: "ng/mL",
          collectedAt: "2026-03-01",
        },
      ],
    });
    expect(labTrends.handler({}, single).ok).toBe(false);
  });
});
