// Infrastructure — row-fixture tests for every mapper (Phase 1 U7).
//
// WHY THIS EXISTS. `src/lib/db` held 12 modules and 0 tests. `mappers.ts` is
// the single place snake_case rows become camelCase domain objects, and every
// mapping in it is a hand-written field pair — `created_at` → `createdAt`,
// `checkin_date` → `date`, `report_date` → `date`. Nothing in the type system
// notices when two same-typed fields are swapped: `toStack` mapping
// `created_at` into `updatedAt` compiles, passes every engine test, and shows
// the wrong date in the UI forever.
//
// So the tests below are not "does it return an object". Each mapper gets a row
// whose values are DISTINCT PER FIELD, and the assertion is a whole-object
// `toEqual`. A swapped pair then fails, because no two fields share a value.
//
// CLAUDE.md §5.6: new `src/lib/db` mapper functions ship with a row-fixture
// test. This file retrofits the nine that predate the rule.
import { describe, expect, it } from "vitest";
import { OUTCOME_CATEGORIES } from "@/types/primitives";
import { generateProtocolPayloadSchema } from "@/lib/advisor/actions/schema";
import type {
  CheckinRow,
  EvaluationFlagRow,
  LabMarkerRow,
  LabPanelRow,
  SideEffectReportRow,
  StackItemRow,
  StackRow,
  UserProfileRow,
} from "./types";
import {
  MapperDomainError,
  toCheckin,
  toEvaluationFlag,
  toLabMarker,
  toLabPanel,
  toSideEffectReport,
  toStack,
  toStackItem,
  toTimelinePoint,
  toUserProfile,
} from "./mappers";

// Distinct timestamps throughout: if a mapper crosses created/updated, the
// whole-object comparison names it.
const CREATED = "2026-01-01T00:00:00Z";
const UPDATED = "2026-06-30T12:34:56Z";

describe("toCheckin", () => {
  const row: CheckinRow = {
    id: "chk-1",
    user_id: "usr-1",
    checkin_date: "2026-03-04",
    ratings: { sleep: 4, focus: 2 },
    taken: ["magnesium", "glycine"],
    scheduled: ["magnesium", "glycine", "zinc"],
    note: "slept well",
    side_effect: "none",
    created_at: CREATED,
    updated_at: UPDATED,
  };

  it("maps every field, with checkin_date landing on `date`", () => {
    expect(toCheckin(row)).toEqual({
      id: "chk-1",
      userId: "usr-1",
      date: "2026-03-04",
      ratings: { sleep: 4, focus: 2 },
      taken: ["magnesium", "glycine"],
      scheduled: ["magnesium", "glycine", "zinc"],
      note: "slept well",
      sideEffect: "none",
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });

  it("defaults null ratings/taken/scheduled to empty rather than passing null through", () => {
    // Postgres can return null for a jsonb/array column that was never written.
    // The domain type says these are always present, so the mapper is what
    // makes that true — a `null.length` downstream is the failure it prevents.
    const sparse = {
      ...row,
      ratings: null,
      taken: null,
      scheduled: null,
    } as unknown as CheckinRow;
    const mapped = toCheckin(sparse);

    expect(mapped.ratings).toEqual({});
    expect(mapped.taken).toEqual([]);
    expect(mapped.scheduled).toEqual([]);
  });

  it("preserves nullable note and sideEffect as null", () => {
    expect(toCheckin({ ...row, note: null, side_effect: null })).toMatchObject({
      note: null,
      sideEffect: null,
    });
  });
});

describe("toSideEffectReport", () => {
  const row: SideEffectReportRow = {
    id: "ser-1",
    user_id: "usr-2",
    report_date: "2026-04-05",
    effect_label: "nausea",
    severity: 2,
    note: "mild, mornings",
    created_at: CREATED,
  };

  it("maps every field, with report_date landing on `date`", () => {
    expect(toSideEffectReport(row)).toEqual({
      id: "ser-1",
      userId: "usr-2",
      date: "2026-04-05",
      effectLabel: "nausea",
      severity: 2,
      note: "mild, mornings",
      createdAt: CREATED,
    });
  });

  it("converts null severity and note to undefined, matching the optional domain fields", () => {
    // The domain marks both optional, not nullable. Leaving null would put a
    // `severity: null` on an object whose type says `1 | 2 | 3 | undefined`.
    const mapped = toSideEffectReport({ ...row, severity: null, note: null });

    expect(mapped.severity).toBeUndefined();
    expect(mapped.note).toBeUndefined();
    expect("severity" in mapped).toBe(true);
  });
});

describe("toUserProfile", () => {
  const row: UserProfileRow = {
    id: "prf-1",
    user_id: "usr-3",
    goals: ["sleep", "focus"],
    diet: "omnivore",
    risk_tolerance: "moderate",
    allergies: ["shellfish"],
    medications: ["warfarin"],
    avoided_ingredients: ["titanium dioxide"],
    form_preferences: ["capsule"],
    caffeine_sensitivity: true,
    experience_level: "intermediate",
    notes: "prefers evening dosing",
    created_at: CREATED,
    updated_at: UPDATED,
  };

  it("maps every field, keeping the three string-array columns distinct", () => {
    // allergies / medications / avoided_ingredients are all string[]. Nothing
    // but distinct values catches them being crossed.
    expect(toUserProfile(row)).toEqual({
      id: "prf-1",
      userId: "usr-3",
      goals: ["sleep", "focus"],
      diet: "omnivore",
      riskTolerance: "moderate",
      allergies: ["shellfish"],
      medications: ["warfarin"],
      avoidedIngredients: ["titanium dioxide"],
      formPreferences: ["capsule"],
      caffeineSensitivity: true,
      experienceLevel: "intermediate",
      notes: "prefers evening dosing",
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });

  it("passes nullable columns through as null", () => {
    expect(
      toUserProfile({
        ...row,
        diet: null,
        risk_tolerance: null,
        caffeine_sensitivity: null,
        experience_level: null,
        notes: null,
      }),
    ).toMatchObject({
      diet: null,
      riskTolerance: null,
      caffeineSensitivity: null,
      experienceLevel: null,
      notes: null,
    });
  });

  it("distinguishes caffeineSensitivity false from null", () => {
    // A boolean-or-null column is the classic place a `?? null` coercion turns
    // an explicit "no" into "unknown".
    expect(toUserProfile({ ...row, caffeine_sensitivity: false }).caffeineSensitivity).toBe(false);
  });
});

describe("toLabMarker", () => {
  const row: LabMarkerRow = {
    id: "lm-1",
    user_id: "usr-4",
    marker: "Ferritin",
    value: 45,
    unit: "ng/mL",
    reference_low: 30,
    reference_high: 400,
    date: "2026-05-06",
    notes: "fasted",
    panel_id: "pnl-1",
    biomarker_id: "ferritin",
    canonical_value: 45,
    canonical_unit: "ng/mL",
  };

  it("maps the domain fields and does NOT leak the canonical/panel columns", () => {
    // biomarker_id, canonical_* and panel_id are timeline-only. A domain
    // LabMarker that carried them would let a consumer read a canonical value
    // the domain type never promised.
    expect(toLabMarker(row)).toEqual({
      id: "lm-1",
      userId: "usr-4",
      marker: "Ferritin",
      value: 45,
      unit: "ng/mL",
      referenceLow: 30,
      referenceHigh: 400,
      date: "2026-05-06",
      notes: "fasted",
    });
  });

  it("keeps a distinct low and high reference range the right way round", () => {
    const mapped = toLabMarker({ ...row, reference_low: 11, reference_high: 99 });

    expect(mapped.referenceLow).toBe(11);
    expect(mapped.referenceHigh).toBe(99);
  });

  it("passes a legacy row with no reference range or date through as null", () => {
    expect(
      toLabMarker({ ...row, reference_low: null, reference_high: null, date: null, notes: null }),
    ).toMatchObject({ referenceLow: null, referenceHigh: null, date: null, notes: null });
  });
});

describe("toLabPanel", () => {
  const row: LabPanelRow = {
    id: "pnl-1",
    user_id: "usr-5",
    source: "csv",
    collected_at: "2026-02-03",
    created_at: CREATED,
  };

  it("maps every field, keeping collected_at and created_at apart", () => {
    // The pair this mapper is most likely to cross: both are timestamps, and
    // only one is the timeline axis.
    expect(toLabPanel(row)).toEqual({
      id: "pnl-1",
      userId: "usr-5",
      source: "csv",
      collectedAt: "2026-02-03",
      createdAt: CREATED,
    });
  });
});

describe("toTimelinePoint", () => {
  const row: LabMarkerRow = {
    id: "lm-2",
    user_id: "usr-6",
    marker: "Vitamin D 25-OH",
    value: 22,
    unit: "ng/mL",
    reference_low: 30,
    reference_high: 100,
    date: "2026-01-15",
    notes: null,
    panel_id: "pnl-2",
    biomarker_id: "vitamin-d-25oh",
    canonical_value: 55,
    canonical_unit: "nmol/L",
  };

  it("prefers the panel's collected_at over the row's legacy date", () => {
    // Design §3.3's coalesce rule. Both are valid dates here, so only a
    // distinct pair can tell which one won.
    expect(toTimelinePoint(row, "2026-07-20")).toEqual({
      biomarkerId: "vitamin-d-25oh",
      canonicalValue: 55,
      canonicalUnit: "nmol/L",
      collectedAt: "2026-07-20",
    });
  });

  it("falls back to the row's own date for a legacy unpanelled row", () => {
    expect(toTimelinePoint(row, null)?.collectedAt).toBe("2026-01-15");
  });

  it("uses the CANONICAL value and unit, never the raw ones", () => {
    // 22 ng/mL is the raw reading; 55 nmol/L is what the trend engine must see.
    // Mapping `value`/`unit` here would silently mix units across panels.
    const point = toTimelinePoint(row, null);

    expect(point?.canonicalValue).toBe(55);
    expect(point?.canonicalUnit).toBe("nmol/L");
  });

  it.each([
    ["an unrecognised marker (no biomarker_id)", { biomarker_id: null }],
    ["an unconvertible unit (no canonical_value)", { canonical_value: null }],
    ["no canonical unit", { canonical_unit: null }],
  ])("returns null for %s", (_label, patch) => {
    expect(toTimelinePoint({ ...row, ...patch }, null)).toBeNull();
  });

  it("returns null when neither a panel date nor a row date exists", () => {
    expect(toTimelinePoint({ ...row, date: null }, null)).toBeNull();
  });
});

describe("toStack", () => {
  const row: StackRow = {
    id: "stk-1",
    user_id: "usr-7",
    name: "Evening stack",
    intent: "sleep",
    mode: "current",
    description: "wind-down",
    created_at: CREATED,
    updated_at: UPDATED,
  };

  it("maps every field, keeping created_at and updated_at apart", () => {
    expect(toStack(row)).toEqual({
      id: "stk-1",
      userId: "usr-7",
      name: "Evening stack",
      intent: "sleep",
      mode: "current",
      description: "wind-down",
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });

  it("passes a null description through", () => {
    expect(toStack({ ...row, description: null }).description).toBeNull();
  });
});

describe("toStackItem", () => {
  const row: StackItemRow = {
    id: "itm-1",
    stack_id: "stk-2",
    supplement_id: "magnesium",
    custom_name: null,
    dose: 300,
    unit: "mg",
    timing: "bedtime",
    frequency: "daily",
    reason: "sleep onset",
    notes: "with food",
    product_id: "prd-1",
    version: 0,
  };

  it("maps every field including the v8 product column", () => {
    expect(toStackItem(row)).toEqual({
      id: "itm-1",
      stackId: "stk-2",
      supplementId: "magnesium",
      customName: null,
      dose: 300,
      unit: "mg",
      timing: "bedtime",
      frequency: "daily",
      reason: "sleep onset",
      notes: "with food",
      productId: "prd-1",
    });
  });

  it("normalises a missing product_id column to null, not undefined", () => {
    // `product_id` is optional on the row (migration 0004 is additive), so a
    // pre-0004 row simply lacks the key. The domain field is `string | null`.
    const legacy = { ...row };
    delete legacy.product_id;

    expect(toStackItem(legacy).productId).toBeNull();
  });

  it("keeps a custom-name item distinct from a catalogue item", () => {
    expect(
      toStackItem({ ...row, supplement_id: null, custom_name: "Homemade electrolyte" }),
    ).toMatchObject({ supplementId: null, customName: "Homemade electrolyte" });
  });
});

describe("toEvaluationFlag", () => {
  const row: EvaluationFlagRow = {
    id: "flg-1",
    stack_id: "stk-3",
    stack_item_id: "itm-2",
    severity: "warning",
    category: "dose-fit",
    title: "Dose above the commonly studied range",
    explanation: "The stacked dose exceeds what most trials used.",
    recommendation: "Consider discussing the dose with a clinician.",
    evidence_level: "B",
    created_at: CREATED,
  };

  it("maps every field, keeping the three prose columns distinct", () => {
    // title / explanation / recommendation are all free text and all rendered
    // in different places. Crossing two of them is invisible to the compiler.
    expect(toEvaluationFlag(row)).toEqual({
      id: "flg-1",
      stackId: "stk-3",
      stackItemId: "itm-2",
      severity: "warning",
      category: "dose-fit",
      title: "Dose above the commonly studied range",
      explanation: "The stacked dose exceeds what most trials used.",
      recommendation: "Consider discussing the dose with a clinician.",
      evidenceLevel: "B",
      createdAt: CREATED,
    });
  });

  it("passes a stack-level flag through with a null stackItemId", () => {
    expect(toEvaluationFlag({ ...row, stack_item_id: null }).stackItemId).toBeNull();
  });

  it('carries the "n/a" evidence level rather than coercing it', () => {
    // "n/a" is a legal domain value meaning "no graded evidence applies" — not
    // a missing value to be nulled.
    expect(toEvaluationFlag({ ...row, evidence_level: "n/a" }).evidenceLevel).toBe("n/a");
  });
});

// FU-29 (a), Phase 4 U16. Every column below is plain `text`/`text[]` with no
// CHECK, so the database stores any string. Each case plants one value outside
// the column's src/types union into an otherwise valid row; the mapper must
// throw rather than hand it to an engine. One case per former cast site.
describe("FU-29: an out-of-domain row value fails at the mapper", () => {
  const OUT = "not-in-domain";
  const profile: UserProfileRow = {
    id: "prf-9",
    user_id: "usr-9",
    goals: ["sleep"],
    diet: null,
    risk_tolerance: "low",
    allergies: [],
    medications: [],
    avoided_ingredients: [],
    form_preferences: ["powder"],
    caffeine_sensitivity: null,
    experience_level: "beginner",
    notes: null,
    created_at: CREATED,
    updated_at: UPDATED,
  };
  const stack: StackRow = {
    id: "stk-9",
    user_id: "usr-9",
    name: "n",
    intent: "experimental",
    mode: "planned",
    description: null,
    created_at: CREATED,
    updated_at: UPDATED,
  };
  const item: StackItemRow = {
    id: "itm-9",
    stack_id: "stk-9",
    supplement_id: "zinc",
    custom_name: null,
    dose: 15,
    unit: "mg",
    timing: "morning",
    frequency: "weekly",
    reason: null,
    notes: null,
    product_id: null,
    version: 0,
  };
  const flag: EvaluationFlagRow = {
    id: "flg-9",
    stack_id: "stk-9",
    stack_item_id: null,
    severity: "info",
    category: "food-pairing",
    title: "t",
    explanation: "e",
    recommendation: "r",
    evidence_level: "D",
    created_at: CREATED,
  };
  const report: SideEffectReportRow = {
    id: "ser-9",
    user_id: "usr-9",
    report_date: "2026-04-05",
    effect_label: "metallic-taste",
    severity: null,
    note: null,
    created_at: CREATED,
  };
  const panel: LabPanelRow = {
    id: "pnl-9",
    user_id: "usr-9",
    source: "manual",
    collected_at: "2026-02-03",
    created_at: CREATED,
  };

  // [table, column, map the row with that one column planted]
  const CASES: [string, string, () => unknown][] = [
    ["side_effect_reports", "effect_label", () => toSideEffectReport({ ...report, effect_label: OUT })],
    ["user_profiles", "goals", () => toUserProfile({ ...profile, goals: ["sleep", OUT] })],
    ["user_profiles", "risk_tolerance", () => toUserProfile({ ...profile, risk_tolerance: OUT })],
    ["user_profiles", "form_preferences", () => toUserProfile({ ...profile, form_preferences: [OUT] })],
    ["user_profiles", "experience_level", () => toUserProfile({ ...profile, experience_level: OUT })],
    ["lab_panels", "source", () => toLabPanel({ ...panel, source: OUT })],
    ["stacks", "intent", () => toStack({ ...stack, intent: OUT })],
    ["stacks", "mode", () => toStack({ ...stack, mode: OUT })],
    ["stack_items", "timing", () => toStackItem({ ...item, timing: OUT })],
    ["stack_items", "frequency", () => toStackItem({ ...item, frequency: OUT })],
    ["evaluation_flags", "severity", () => toEvaluationFlag({ ...flag, severity: OUT })],
    ["evaluation_flags", "category", () => toEvaluationFlag({ ...flag, category: OUT })],
    ["evaluation_flags", "evidence_level", () => toEvaluationFlag({ ...flag, evidence_level: OUT })],
  ];

  it("covers all 13 former cast sites, each once", () => {
    expect(CASES).toHaveLength(13);
    expect(new Set(CASES.map(([t, c]) => `${t}.${c}`)).size).toBe(13);
  });

  it.each(CASES)("rejects a planted %s.%s value with a MapperDomainError", (table, column, map) => {
    let caught: unknown;
    try {
      map();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MapperDomainError);
    expect(caught).toMatchObject({ table, column });
  });

  it("names the table and column but never the value (§2.3 rule 15)", () => {
    expect(() => toUserProfile({ ...profile, goals: ["warfarin-interaction"] })).toThrow(
      "user_profiles.goals holds a value outside its domain",
    );
    try {
      toUserProfile({ ...profile, goals: ["warfarin-interaction"] });
    } catch (e) {
      expect(String((e as Error).message)).not.toContain("warfarin");
    }
  });

  it("rejects an Object.prototype key, which `in` would have admitted", () => {
    expect(() => toStack({ ...stack, intent: "toString" })).toThrow(MapperDomainError);
    expect(() => toStack({ ...stack, mode: "constructor" })).toThrow(MapperDomainError);
  });

  it("accepts every in-domain value the planted rows start from, and null where the column allows it", () => {
    expect(toUserProfile(profile)).toMatchObject({ goals: ["sleep"], formPreferences: ["powder"] });
    expect(toStack(stack)).toMatchObject({ intent: "experimental", mode: "planned" });
    expect(toStackItem({ ...item, timing: null, frequency: null })).toMatchObject({
      timing: null,
      frequency: null,
    });
    expect(toEvaluationFlag(flag)).toMatchObject({ category: "food-pairing", evidenceLevel: "D" });
    expect(toSideEffectReport(report).effectLabel).toBe("metallic-taste");
    expect(toLabPanel(panel).source).toBe("manual");
  });
});

// The write side of the same contract (queue Q-8, owner ruling 2026-09-29). The
// advisor's generate_protocol took `intent` as a free string and wrote it to
// `stacks.intent`; once `toStack` validates, such a row makes every stack read
// for its owner throw. The advisor must reject what the mapper would reject,
// and accept everything it accepts.
describe("Q-8: the advisor cannot write a stack intent the mapper rejects", () => {
  const payload = (intent: string) => ({ stackName: "n", intent, items: [{}] });
  const stackWith = (intent: string): StackRow => ({
    id: "stk-q4",
    user_id: "usr-q4",
    name: "n",
    intent,
    mode: "current",
    description: null,
    created_at: CREATED,
    updated_at: UPDATED,
  });

  it("rejects an out-of-domain intent before any write", () => {
    expect(generateProtocolPayloadSchema.safeParse(payload("cognition")).success).toBe(false);
    expect(() => toStack(stackWith("cognition"))).toThrow(MapperDomainError);
  });

  it("accepts every intent the mapper accepts", () => {
    for (const intent of [...OUTCOME_CATEGORIES, "experimental"]) {
      expect(generateProtocolPayloadSchema.safeParse(payload(intent)).success).toBe(true);
      expect(toStack(stackWith(intent)).intent).toBe(intent);
    }
  });
});
