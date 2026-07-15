// Domain — side-effect-engine (v11) unit + honesty + no-signal regression.
// Design Ref: §8.3 — the load-bearing proofs live here.
import { describe, expect, it } from "vitest";
import { containsBannedLanguage } from "@/lib/safety";
import { evaluateStack } from "@/lib/stack-evaluator";
import { sideEffectWatch } from "@/lib/advisor/tools";
import type { AdvisorContext } from "@/types/advisor";
import type { CanonicalSideEffect, DatedSideEffectReport } from "@/types/side-effect";
import type { DailyCheckin } from "@/types/checkin";
import type { Stack, StackItem } from "@/types";
import { correlateReports, curatedWatchList, MIN_REPORTS, MIN_TAKEN_DAYS } from "./index";
import { toSideEffectFlags } from "./to-flags";
import { normalizeSideEffect, sideEffectLabel } from "./vocab";

// ---- fixtures ----
function makeStack(overrides: Partial<Stack> = {}): Stack {
  return {
    id: "s1",
    userId: "u1",
    name: "Test Stack",
    intent: "sleep",
    mode: "current",
    description: null,
    createdAt: "2026-07-14T00:00:00Z",
    updatedAt: "2026-07-14T00:00:00Z",
    ...overrides,
  };
}

let seq = 0;
function makeItem(overrides: Partial<StackItem> = {}): StackItem {
  seq += 1;
  return {
    id: `i${seq}`,
    stackId: "s1",
    supplementId: "magnesium",
    customName: null,
    dose: 300,
    unit: "mg",
    timing: "bedtime",
    frequency: "daily",
    reason: null,
    notes: null,
    ...overrides,
  };
}

/** Sequential dates 2026-07-01, -02, … (index 0-based). */
function day(i: number): string {
  return new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);
}

/** Reports of `effectLabel` on the given day indices. */
function reportsOn(effectLabel: CanonicalSideEffect, dayIdxs: number[]): DatedSideEffectReport[] {
  return dayIdxs.map((i) => ({ effectLabel, date: day(i) }));
}

/** Check-ins logging `supplementId` as TAKEN on the given day indices. */
function takenOn(supplementId: string, dayIdxs: number[]): DailyCheckin[] {
  return dayIdxs.map((i) => ({
    id: `c${i}`,
    userId: "u1",
    date: day(i),
    ratings: {},
    taken: [supplementId],
    scheduled: [supplementId],
    note: null,
    sideEffect: null,
    createdAt: `${day(i)}T00:00:00Z`,
    updatedAt: `${day(i)}T00:00:00Z`,
  }));
}

const TEN_DAYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// ---- vocab ----
describe("normalizeSideEffect", () => {
  it("passes through canonical labels", () => {
    expect(normalizeSideEffect("nausea")).toBe("nausea");
    expect(normalizeSideEffect("  GI-Upset ")).toBe("gi-upset");
  });
  it("resolves aliases (case/space-insensitive)", () => {
    expect(normalizeSideEffect("loose stools")).toBe("diarrhea");
    expect(normalizeSideEffect("Can't sleep")).toBe("insomnia");
    expect(normalizeSideEffect("fish burps")).toBe("heartburn");
    expect(normalizeSideEffect("jittery")).toBe("jitteriness");
  });
  it("returns null for unrecognized text and never throws", () => {
    expect(normalizeSideEffect("teleportation")).toBeNull();
    expect(normalizeSideEffect("")).toBeNull();
  });
});

// ---- curatedWatchList ----
describe("curatedWatchList", () => {
  it("returns curated effects for stacked supplements, deduped", () => {
    const items = [makeItem({ supplementId: "magnesium" }), makeItem({ supplementId: "magnesium" })];
    const findings = curatedWatchList(items);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.kind === "curated-watch")).toBe(true);
    // deduped per (supplement, effect)
    const keys = findings.map((f) => `${f.supplementId}:${f.label}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("ignores supplements without a curated profile and custom items", () => {
    const items = [makeItem({ supplementId: "unknown-supp" }), makeItem({ supplementId: null })];
    expect(curatedWatchList(items)).toHaveLength(0);
  });
});

// ---- correlateReports (true co-occurrence + min-sample gates) ----
describe("correlateReports", () => {
  const items = [makeItem({ supplementId: "magnesium" })];

  it("emits a reported-match whose reportedDays is the TRUE co-occurrence count", () => {
    // taken on days 0-9; diarrhea reported on days 0,1,2 (all taken days)
    const findings = correlateReports({
      reports: reportsOn("diarrhea", [0, 1, 2]),
      checkins: takenOn("magnesium", TEN_DAYS),
      items,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      supplementId: "magnesium",
      label: "diarrhea",
      kind: "reported-match",
      reportedDays: 3, // |reportDates ∩ takenDates|
      takenDays: 10,
    });
  });

  // ---- G1 REGRESSION: the bug Act-1 fixed ----
  it("emits NOTHING when the effect was reported only on days the supplement was NOT taken", () => {
    // taken on days 0-9; diarrhea reported on days 20,21,22 — zero overlap.
    const findings = correlateReports({
      reports: reportsOn("diarrhea", [20, 21, 22]),
      checkins: takenOn("magnesium", TEN_DAYS),
      items,
    });
    expect(findings).toHaveLength(0);
  });

  it("emits NOTHING without adherence data — a co-occurrence cannot be claimed", () => {
    const findings = correlateReports({
      reports: reportsOn("diarrhea", [0, 1, 2, 3, 4]),
      checkins: [],
      items,
    });
    expect(findings).toHaveLength(0);
  });

  it("counts only the overlapping days, not every reported day", () => {
    // taken days 0-9; reported on 2 taken days (8,9) + 3 untaken days (20,21,22)
    const findings = correlateReports({
      reports: reportsOn("diarrhea", [8, 9, 20, 21, 22]),
      checkins: takenOn("magnesium", TEN_DAYS),
      items,
      minReports: 2,
    });
    expect(findings[0].reportedDays).toBe(2); // NOT 5
  });

  it("suppresses below MIN_REPORTS co-occurrence days", () => {
    const findings = correlateReports({
      reports: reportsOn("diarrhea", [0, 1].slice(0, MIN_REPORTS - 1)),
      checkins: takenOn("magnesium", TEN_DAYS),
      items,
    });
    expect(findings).toHaveLength(0);
  });

  it("suppresses below MIN_TAKEN_DAYS adherence sample", () => {
    const thin = TEN_DAYS.slice(0, MIN_TAKEN_DAYS - 1);
    const findings = correlateReports({
      reports: reportsOn("diarrhea", thin),
      checkins: takenOn("magnesium", thin),
      items,
    });
    expect(findings).toHaveLength(0);
  });

  it("does not match an effect that is not curated for any stacked supplement", () => {
    const findings = correlateReports({
      reports: reportsOn("insomnia", TEN_DAYS), // not a magnesium curated effect
      checkins: takenOn("magnesium", TEN_DAYS),
      items,
    });
    expect(findings).toHaveLength(0);
  });
});

// ---- to-flags: severity mapping ----
describe("toSideEffectFlags", () => {
  it("maps reported-match → warning, curated-watch → info, and NEVER critical", () => {
    const items = [makeItem({ supplementId: "caffeine" })];
    const watch = toSideEffectFlags(curatedWatchList(items));
    const matched = toSideEffectFlags(
      correlateReports({
        reports: reportsOn("jitteriness", TEN_DAYS),
        checkins: takenOn("caffeine", TEN_DAYS),
        items,
      }),
    );
    expect(watch.every((f) => f.severity === "info")).toBe(true);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.every((f) => f.severity === "warning")).toBe(true);
    for (const f of [...watch, ...matched]) {
      expect(f.severity).not.toBe("critical");
      expect(f.category).toBe("side-effect-caution");
    }
  });

  it("targets the offending stack item row", () => {
    const item = makeItem({ id: "row-9", supplementId: "zinc" });
    const flags = toSideEffectFlags(
      correlateReports({
        reports: reportsOn("nausea", TEN_DAYS),
        checkins: takenOn("zinc", TEN_DAYS),
        items: [item],
      }),
      { supplementToItemId: { zinc: "row-9" } },
    );
    expect(flags[0].stackItemId).toBe("row-9");
  });
});

// ---- COPY↔COMPUTATION BINDING (Act-1 / G1) ----
// The honesty sweep checks banned PHRASES; it cannot tell whether a fluent,
// hedged sentence is TRUE. These tests bind the rendered numbers to the engine's
// computed facts, so a future overclaim fails the suite instead of shipping.
describe("copy matches what the engine computed", () => {
  it("cites the co-occurrence count and the taken-day denominator verbatim", () => {
    const items = [makeItem({ supplementId: "magnesium" })];
    const findings = correlateReports({
      reports: reportsOn("diarrhea", [0, 1, 2, 20, 21]), // 3 overlap, 2 not
      checkins: takenOn("magnesium", TEN_DAYS), // 10 taken days
      items,
    });
    const [flag] = toSideEffectFlags(findings);
    // The engine computed 3 of 10 — the copy must say exactly that.
    expect(flag.explanation).toContain("3 of the 10 days");
    // …and must NOT cite the raw report count (5), which would overclaim.
    expect(flag.explanation).not.toContain("5 of");
    expect(flag.explanation).not.toContain("on 5 days");
  });

  it("never asserts a co-occurrence when none was computed (no flag at all)", () => {
    const items = [makeItem({ supplementId: "magnesium" })];
    const flags = toSideEffectFlags(
      correlateReports({
        reports: reportsOn("diarrhea", [20, 21, 22, 23, 24]),
        checkins: takenOn("magnesium", TEN_DAYS),
        items,
      }),
    );
    expect(flags).toHaveLength(0);
  });

  it("curated-watch copy claims nothing about the user's own logs", () => {
    const flags = toSideEffectFlags(curatedWatchList([makeItem({ supplementId: "berberine" })]));
    for (const f of flags) {
      const blob = `${f.title} ${f.explanation} ${f.recommendation}`.toLowerCase();
      expect(blob).not.toContain("you logged");
      expect(blob).not.toContain("you reported");
    }
  });
});

// ---- HONESTY SWEEP (Plan SC7) ----
describe("honesty sweep — no causal/diagnostic language", () => {
  it("all generated side-effect copy is correlational, never causal", () => {
    const items = [
      makeItem({ supplementId: "magnesium" }),
      makeItem({ supplementId: "caffeine" }),
      makeItem({ supplementId: "melatonin" }),
      makeItem({ supplementId: "berberine" }),
      makeItem({ supplementId: "zinc" }),
    ];
    const reports = [
      ...reportsOn("diarrhea", TEN_DAYS),
      ...reportsOn("jitteriness", TEN_DAYS),
      ...reportsOn("vivid-dreams", TEN_DAYS),
      ...reportsOn("nausea", TEN_DAYS),
    ];
    const checkins: DailyCheckin[] = TEN_DAYS.map((i) => ({
      id: `c${i}`,
      userId: "u1",
      date: day(i),
      ratings: {},
      taken: ["magnesium", "caffeine", "melatonin", "berberine", "zinc"],
      scheduled: ["magnesium", "caffeine", "melatonin", "berberine", "zinc"],
      note: null,
      sideEffect: null,
      createdAt: `${day(i)}T00:00:00Z`,
      updatedAt: `${day(i)}T00:00:00Z`,
    }));
    const flags = [
      ...toSideEffectFlags(curatedWatchList(items)),
      ...toSideEffectFlags(correlateReports({ reports, checkins, items })),
    ];
    expect(flags.length).toBeGreaterThan(0);
    for (const f of flags) {
      const blob = `${f.title} ${f.explanation} ${f.recommendation}`;
      expect(containsBannedLanguage(blob)).toBe(false);
      // explicit causal tokens must never appear
      expect(blob.toLowerCase()).not.toContain("caused by");
      expect(blob.toLowerCase()).not.toContain("side effect of");
      expect(blob.toLowerCase()).not.toContain("because you took");
    }
  });
});

// ---- NO-SIGNAL REGRESSION (Plan SC7) ----
describe("no-signal regression — side-effect reports never perturb other rules", () => {
  const stack = makeStack({ intent: "sleep" });
  const items = [
    makeItem({ supplementId: "magnesium", dose: 300, unit: "mg" }),
    makeItem({ supplementId: "caffeine", dose: 200, unit: "mg" }),
    makeItem({ supplementId: "melatonin", dose: 3, unit: "mg" }),
  ];

  const nonSideEffect = (flags: { category: string }[]) =>
    flags.filter((f) => f.category !== "side-effect-caution");

  const maximalReports = [
    ...reportsOn("diarrhea", TEN_DAYS),
    ...reportsOn("jitteriness", TEN_DAYS),
    ...reportsOn("vivid-dreams", TEN_DAYS),
  ];
  const maximalCheckins: DailyCheckin[] = TEN_DAYS.map((i) => ({
    id: `c${i}`,
    userId: "u1",
    date: day(i),
    ratings: {},
    taken: ["magnesium", "caffeine", "melatonin"],
    scheduled: ["magnesium", "caffeine", "melatonin"],
    note: null,
    sideEffect: null,
    createdAt: `${day(i)}T00:00:00Z`,
    updatedAt: `${day(i)}T00:00:00Z`,
  }));

  it("evaluateStack output is byte-identical (excluding side-effect flags) with vs without reports", () => {
    const baseline = evaluateStack({ stack, items });
    const withReports = evaluateStack({
      stack,
      items,
      sideEffectReports: maximalReports,
      checkins: maximalCheckins,
    });
    expect(nonSideEffect(withReports.flags)).toEqual(nonSideEffect(baseline.flags));
  });

  it("passing no reports vs [] yields identical output (default-safe)", () => {
    const a = evaluateStack({ stack, items });
    const b = evaluateStack({ stack, items, sideEffectReports: [], checkins: [] });
    expect(b.flags).toEqual(a.flags);
    expect(b.summary).toEqual(a.summary);
  });

  it("reports WITHOUT adherence produce no side-effect flags (G1 guard at the rule level)", () => {
    const result = evaluateStack({ stack, items, sideEffectReports: maximalReports });
    expect(result.flags.filter((f) => f.category === "side-effect-caution")).toHaveLength(0);
  });

  it("a maximal side-effect signal never emits a critical flag", () => {
    const result = evaluateStack({
      stack,
      items,
      sideEffectReports: maximalReports,
      checkins: maximalCheckins,
    });
    const se = result.flags.filter((f) => f.category === "side-effect-caution");
    expect(se.length).toBeGreaterThan(0);
    expect(se.every((f) => f.severity !== "critical")).toBe(true);
  });
});

// ---- advisor tool (read-only, grounded) ----
function makeCtx(stackItems: StackItem[]): AdvisorContext {
  return {
    userId: "u1",
    profile: null,
    stack: null,
    stackItems,
    labMarkers: [],
    timelinePoints: [],
  };
}

describe("advisor sideEffectWatch tool", () => {
  it("refuses (ok=false) when the stack is empty — grounding absent", () => {
    const res = sideEffectWatch.handler({}, makeCtx([]));
    expect(res.ok).toBe(false);
    expect(res.emptyReason).toBeTruthy();
    expect(res.citations).toHaveLength(0);
  });

  it("returns curated findings + citations for a stacked supplement", () => {
    const res = sideEffectWatch.handler({}, makeCtx([makeItem({ supplementId: "berberine" })]));
    expect(res.ok).toBe(true);
    expect((res.data ?? []).length).toBeGreaterThan(0);
    expect(res.citations.length).toBeGreaterThan(0);
    for (const c of res.citations) {
      expect(c.kind).toBe("side-effect");
      expect(containsBannedLanguage(c.label)).toBe(false);
      expect(c.label.toLowerCase()).not.toContain("side effect of");
    }
  });

  it("refuses when no stacked supplement has a curated profile", () => {
    const res = sideEffectWatch.handler({}, makeCtx([makeItem({ supplementId: "unknown-x" })]));
    expect(res.ok).toBe(false);
  });
});

// ---- display labels ----
describe("sideEffectLabel", () => {
  it("humanizes canonical labels", () => {
    expect(sideEffectLabel("gi-upset")).toBe("GI upset");
    expect(sideEffectLabel("insomnia")).toBe("trouble sleeping");
  });
});
