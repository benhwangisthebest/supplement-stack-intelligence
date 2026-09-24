import { describe, expect, it } from "vitest";
import { assessLabMarkers } from "@/lib/biomarkers";
import {
  getAllSupplements,
  getEffectsForSupplement,
  getPaperById,
  getSupplementBySlug,
} from "@/lib/evidence";
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
  sideEffectWatch,
  toolByName,
} from "./tools";
import { COVERAGE } from "@/lib/safety";
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

  // Phase 3 U6 closeout: every cited paper is verified, so no paper citation, for
  // any supplement, carries an illustrative note, and each one names a paper with an
  // identifier.
  it("no paper citation is labelled illustrative, and each cites a paper with a doi/pmid", () => {
    const all = getAllSupplements().flatMap((s) =>
      getSupplement.handler({ slug: s.slug }, ctx).citations.filter((c) => c.kind === "paper"),
    );
    expect(all.length).toBeGreaterThan(0);
    for (const c of all) {
      expect(c.detail).toBeUndefined();
      const paper = getPaperById(c.refId);
      expect(Boolean(paper?.doi || paper?.pmid)).toBe(true);
    }
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

// Phase 3 U7 (S8) — coverage honesty. An empty watch list must not read as "no
// side-effects": the dataset is curated and partial, the same hedge
// checkInteractions already carries. A custom item (no supplementId) can never
// match a curated profile, so this case does not depend on which seed rows exist.
describe("sideEffectWatch", () => {
  it("empty (never 'none can occur') when no curated profile matches", () => {
    const custom = { ...ctx.stackItems[0], supplementId: null, customName: "Made-up blend" };
    const r = sideEffectWatch.handler({}, makeContext({ stackItems: [custom] }));
    expect(r.ok).toBe(false);
    expect(r.emptyReason).toMatch(/dataset is limited/i);
    expect(r.emptyReason).toMatch(/does not mean/i);
  });
});

// Phase 3 U7 (b2) — an effect citing no paper (nac-antioxidant, protein-powder-
// recovery after U4) must reach the model as an absence of verified evidence,
// never as evidence of no effect. Wording only: the summary field carries the
// D2 sentence; the tool's shape and citations are unchanged.
describe("uncited effects carry the D2 sentence", () => {
  const d2 = COVERAGE.gradeDUncited.text;

  it("getSupplement: the uncited effect's text includes it; a cited one's does not", () => {
    const r = getSupplement.handler({ slug: "nac" }, ctx);
    const nac = r.data!.effects.find((e) => e.effectId === "nac-antioxidant")!;
    expect(getEffectsForSupplement("nac").find((e) => e.id === "nac-antioxidant")!.paperIds).toEqual([]);
    expect(nac.summary).toContain(d2);

    const creatine = getSupplement.handler({ slug: "creatine" }, ctx);
    for (const e of creatine.data!.effects) expect(e.summary).not.toContain(d2);
  });

  it("searchLibrary: the same effect's text includes it", () => {
    const r = searchLibrary.handler({ query: "protein" }, ctx);
    const e = r.data!.flatMap((h) => h.effects).find((x) => x.effectId === "protein-powder-recovery")!;
    expect(e.summary).toContain(d2);
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
