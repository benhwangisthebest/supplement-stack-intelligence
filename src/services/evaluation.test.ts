// Application — reachability guard for runEvaluation (Act-2 / gap G6).
//
// WHY THIS EXISTS: v11 shipped `ruleSideEffect` fully unit-tested while
// `services/evaluation.ts` never passed `sideEffectReports`/`checkins` into
// evaluateStack — so the rule returned [] for every real user and the whole
// Stack Evaluation surface was dead code. 385 unit tests stayed green, because
// every one of them called the engine DIRECTLY. Both context fields are
// optional, so omitting them is silently legal at compile time too.
//
// These tests assert the PRODUCTION CALLER actually reaches the rule. Deleting
// `sideEffectReports`/`checkins` from the evaluateStack(...) call in
// services/evaluation.ts must fail here.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyCheckin } from "@/types/checkin";
import type { SideEffectReport } from "@/types/side-effect";
import type { DraftFlag, Stack, StackItem } from "@/types";

const stack: Stack = {
  id: "s1",
  userId: "u1",
  name: "Test Stack",
  intent: "sleep",
  mode: "current",
  description: null,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
};

const items: StackItem[] = [
  {
    id: "i1",
    stackId: "s1",
    supplementId: "magnesium",
    customName: null,
    dose: 300,
    unit: "mg",
    timing: "bedtime",
    frequency: "daily",
    reason: null,
    notes: null,
  },
];

function day(i: number): string {
  return new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);
}
const TEN_DAYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// magnesium taken on 10 days; diarrhea reported on 3 of those same days
// → a TRUE co-occurrence the engine should surface.
const checkins: DailyCheckin[] = TEN_DAYS.map((i) => ({
  id: `c${i}`,
  userId: "u1",
  date: day(i),
  ratings: {},
  taken: ["magnesium"],
  scheduled: ["magnesium"],
  note: null,
  sideEffect: null,
  createdAt: `${day(i)}T00:00:00Z`,
  updatedAt: `${day(i)}T00:00:00Z`,
}));

const reports: SideEffectReport[] = [0, 1, 2].map((i) => ({
  id: `r${i}`,
  userId: "u1",
  date: day(i),
  effectLabel: "diarrhea",
  createdAt: `${day(i)}T00:00:00Z`,
}));

const listSideEffectReports = vi.fn();
const listCheckins = vi.fn();
let capturedDrafts: DraftFlag[] = [];
/** Set by the persistence-failure test below; see the note on the mock. */
let replaceFlagsRejects = false;

// These five delegate to mock fns declared further down (with the U12 block
// that varies them). The factories run at import time, inside a test, so the
// later `const` declarations are already initialised.
vi.mock("@/lib/db/stack-repo", () => ({ getStack: (...a: unknown[]) => getStackMock(...a) }));
vi.mock("@/lib/db/stack-item-repo", () => ({ listItems: (...a: unknown[]) => listItemsMock(...a) }));
vi.mock("@/lib/db/profile-repo", () => ({ getProfile: (...a: unknown[]) => getProfileMock(...a) }));
vi.mock("@/lib/db/lab-marker-repo", () => ({ listLabMarkers: (...a: unknown[]) => listLabMarkersMock(...a) }));
vi.mock("@/lib/db/lab-panel-repo", () => ({ listTimelinePoints: (...a: unknown[]) => listTimelinePointsMock(...a) }));
vi.mock("@/lib/db/side-effect-repo", () => ({
  listSideEffectReports: (...a: unknown[]) => listSideEffectReports(...a),
}));
vi.mock("@/lib/db/checkin-repo", () => ({
  listCheckins: (...a: unknown[]) => listCheckins(...a),
}));
// THIS MOCK ENCODES `replaceFlags`'s CONTRACT, so it has to track it (Phase 2
// U8). Before U8 the repo deleted the stack's flags and then inserted the new
// ones; a mock that only ever resolves describes that implementation and the
// current one equally well, which is precisely why it could not be left alone
// when the semantics changed. The two halves of the contract now are:
//
//   success  → returns exactly the drafts it was given, with ids assigned
//   failure  → REJECTS, and the previously persisted flags are still there
//
// The second half is what U8 bought and what this file was blind to. The
// "previously persisted flags are still there" part is proven against a real
// in-memory table in `src/lib/db/evaluation-flag-repo.test.ts` — it is a
// property of the repo, not of the service. What belongs HERE is the service's
// side of it: a persistence failure must not be reported as an evaluation.
vi.mock("@/lib/db/evaluation-flag-repo", () => ({
  listFlags: vi.fn(async () => []),
  replaceFlags: vi.fn(async (_s: unknown, stackId: string, drafts: DraftFlag[]) => {
    capturedDrafts = drafts; // echo back what the engine produced
    if (replaceFlagsRejects) {
      throw Object.assign(new Error("insert failed"), { code: "TEST" });
    }
    return drafts.map((d, i) => ({
      ...d,
      id: `f${i}`,
      stackId,
      createdAt: "2026-07-11T00:00:00Z",
    }));
  }),
}));

const supabase = {} as SupabaseClient;

describe("runEvaluation — side-effect rule reachability (G6 guard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedDrafts = [];
    replaceFlagsRejects = false;
    getStackMock.mockResolvedValue(stack);
    listItemsMock.mockResolvedValue(items);
    getProfileMock.mockResolvedValue(null);
    listLabMarkersMock.mockResolvedValue([]);
    listTimelinePointsMock.mockResolvedValue([]);
    listSideEffectReports.mockResolvedValue(reports);
    listCheckins.mockResolvedValue(checkins);
  });

  it("loads side-effect reports AND check-ins for the user", async () => {
    const { runEvaluation } = await import("./evaluation");
    await runEvaluation(supabase, "u1", "s1");
    expect(listSideEffectReports).toHaveBeenCalledWith(supabase, "u1");
    expect(listCheckins).toHaveBeenCalledWith(supabase, "u1");
  });

  it("passes them through to the engine — a side-effect flag reaches the persisted output", async () => {
    const { runEvaluation } = await import("./evaluation");
    const result = await runEvaluation(supabase, "u1", "s1");

    // THE point of this file: the rule is reachable from the production caller.
    const se = capturedDrafts.filter((f) => f.category === "side-effect-caution");
    expect(se).toHaveLength(1);
    expect(se[0].severity).toBe("warning");
    // and the copy cites the engine's computed co-occurrence (3 of 10)
    expect(se[0].explanation).toContain("3 of the 10 days");
    expect(result!.flags.some((f) => f.category === "side-effect-caution")).toBe(true);
  });

  it("stays silent when the user has reports but no adherence history", async () => {
    listCheckins.mockResolvedValue([]);
    const { runEvaluation } = await import("./evaluation");
    await runEvaluation(supabase, "u1", "s1");
    expect(capturedDrafts.filter((f) => f.category === "side-effect-caution")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// U12 — REACHABILITY FOR ALL SEVEN CONTEXT FIELDS (2026-08-04)
//
// The tests above cover 2 of the 7 fields `runEvaluation` passes to
// `evaluateStack` (`sideEffectReports`, `checkins`) — the two whose omission
// caused the original G6 defect. The other five were mocked but never proven
// to REACH an observable output, which is the same gap G6 was, just not yet
// triggered.
//
// THE PATTERN, written down as CLAUDE.md §5.3 asks. Each row is DIFFERENTIAL:
// run `runEvaluation` twice, once with the field carrying data and once with it
// empty, and assert the produced flag set CHANGES. That is what "reaches an
// observable output" means operationally, and it has three advantages over
// asserting a specific flag category:
//
//   * it does not encode any rule's category string, so a rule rename cannot
//     make it silently vacuous;
//   * deleting the field from the `evaluateStack({…})` call makes both runs
//     identical, so the row goes red naming that field — the plan's §6.2
//     mutation for U12;
//   * a field that CANNOT change the output fails loudly rather than being
//     quietly asserted around. Per plan §6.2.2 that is a FINDING — dead
//     context being loaded and passed for nothing — not a test to force.
//
// NOTE on the two required fields. `stack` and `items` are non-optional in
// `EvaluateStackInput`, so omitting them from the call is a COMPILE error and
// `tsc` is already the guard. The other five are optional and default to
// `null`/`[]`, so omitting them is silently legal — which is exactly how G6
// shipped. Both are still exercised below, by varying their value rather than
// removing it (the wrong-value probe of §6.2.2).
// ---------------------------------------------------------------------------
import type { LabMarker, UserProfile } from "@/types";
import type { TrendSignal } from "@/types/lab";

const getStackMock = vi.fn();
const listItemsMock = vi.fn();
const getProfileMock = vi.fn();
const listLabMarkersMock = vi.fn();
const listTimelinePointsMock = vi.fn();

/** A stable identity for a flag set, so two runs can be compared. */
function signature(flags: DraftFlag[]): string {
  return flags
    .map((f) => `${f.category}|${f.severity}|${f.stackItemId ?? "-"}|${f.title}`)
    .sort()
    .join("\n");
}

const PROFILE: UserProfile = {
  id: "p1",
  userId: "u1",
  goals: ["training"],
  diet: null,
  riskTolerance: null,
  allergies: [],
  medications: [],
  avoidedIngredients: [],
  formPreferences: [],
  caffeineSensitivity: null,
  experienceLevel: null,
  notes: null,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
};

const LAB_MARKER: LabMarker = {
  id: "m1",
  userId: "u1",
  marker: "Some Unrecognised Marker",
  value: 42,
  unit: "ng/mL",
  referenceLow: null,
  referenceHigh: null,
  date: "2026-07-01",
  notes: null,
};

const TREND: TrendSignal = {
  biomarkerId: "magnesium-serum",
  biomarkerName: "Magnesium (serum)",
  latest: { value: 2.1, unit: "mg/dL", collectedAt: "2026-07-01" },
  previous: { value: 1.6, unit: "mg/dL", collectedAt: "2026-01-01" },
  delta: 0.5,
  pctChange: 31.25,
  direction: "rising",
  windowDays: 181,
  points: 2,
};

describe("runEvaluation — 7/7 context-field reachability (U12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedDrafts = [];
    replaceFlagsRejects = false;
    // Baseline: every field empty/neutral. Each case below turns exactly one on.
    getStackMock.mockResolvedValue(stack);
    listItemsMock.mockResolvedValue(items);
    getProfileMock.mockResolvedValue(null);
    listLabMarkersMock.mockResolvedValue([]);
    listTimelinePointsMock.mockResolvedValue([]);
    listSideEffectReports.mockResolvedValue([]);
    listCheckins.mockResolvedValue([]);
  });

  /** Run once with the given arrangement and return the engine's flag signature. */
  async function run(arrange: () => void): Promise<string> {
    arrange();
    capturedDrafts = [];
    const { runEvaluation } = await import("./evaluation");
    await runEvaluation(supabase, "u1", "s1");
    return signature(capturedDrafts);
  }

  const cases: { field: string; on: () => void; off: () => void }[] = [
    {
      field: "stack",
      // Required field — varied, not removed (see the note above). Stack intent
      // selects the representative effect, so it changes evidence-fit output.
      on: () => getStackMock.mockResolvedValue({ ...stack, intent: "training" }),
      off: () => getStackMock.mockResolvedValue({ ...stack, intent: "sleep" }),
    },
    {
      field: "items",
      on: () => listItemsMock.mockResolvedValue(items),
      off: () => listItemsMock.mockResolvedValue([]),
    },
    {
      field: "profile",
      on: () => getProfileMock.mockResolvedValue(PROFILE),
      off: () => getProfileMock.mockResolvedValue(null),
    },
    {
      field: "labMarkers",
      on: () => listLabMarkersMock.mockResolvedValue([LAB_MARKER]),
      off: () => listLabMarkersMock.mockResolvedValue([]),
    },
    {
      field: "trends",
      // trends are DERIVED from timeline points by computeTrends, so this row
      // also proves the derivation is wired, not just the field.
      on: () =>
        listTimelinePointsMock.mockResolvedValue([
          { biomarkerId: "magnesium-serum", canonicalValue: 1.6, canonicalUnit: "mg/dL", collectedAt: "2026-01-01" },
          { biomarkerId: "magnesium-serum", canonicalValue: 2.1, canonicalUnit: "mg/dL", collectedAt: "2026-07-01" },
        ]),
      off: () => listTimelinePointsMock.mockResolvedValue([]),
    },
    {
      field: "sideEffectReports",
      on: () => {
        listSideEffectReports.mockResolvedValue(reports);
        listCheckins.mockResolvedValue(checkins);
      },
      off: () => {
        listSideEffectReports.mockResolvedValue([]);
        listCheckins.mockResolvedValue(checkins);
      },
    },
    {
      field: "checkins",
      on: () => {
        listSideEffectReports.mockResolvedValue(reports);
        listCheckins.mockResolvedValue(checkins);
      },
      off: () => {
        listSideEffectReports.mockResolvedValue(reports);
        listCheckins.mockResolvedValue([]);
      },
    },
  ];

  for (const { field, on, off } of cases) {
    it(`context field "${field}" reaches an observable output`, async () => {
      const withData = await run(on);
      const without = await run(off);

      expect(
        withData,
        `context field "${field}" did not reach an observable output.\n` +
          "Changing it produced an IDENTICAL flag set, which means one of:\n" +
          `  * services/evaluation.ts stopped passing "${field}" to evaluateStack\n` +
          "    (the G6 defect, recurring); or\n" +
          `  * no rule consumes "${field}" any more, in which case loading it is\n` +
          "    dead work and this is a FINDING to report, not a test to relax.\n" +
          "Do not weaken this assertion to make it pass.",
      ).not.toBe(without);
    });
  }

  it("covers every field the production caller passes to evaluateStack", async () => {
    // Anti-drift: if someone adds an 8th context field to the call, this fails
    // until a row exists for it. Read from the source, not from memory.
    const source = readFileSync(
      new URL("./evaluation.ts", import.meta.url).pathname,
      "utf8",
    );
    const call = /evaluateStack\(\{([^}]*)\}\)/s.exec(source)?.[1] ?? "";
    const passed = call
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    expect(passed.sort()).toEqual(cases.map((c) => c.field).sort());
  });
});

// ---------------------------------------------------------------------------
// U8 — A FAILED PERSIST IS NOT AN EVALUATION (2026-08-10)
//
// `replaceFlags` is now insert-then-delete, so a failure leaves the user's
// PREVIOUS flags intact rather than destroying them. That guarantee is only
// worth anything if the caller does not paper over the failure: returning a
// summary computed from drafts that were never stored would tell the user their
// evaluation succeeded while the flags they can actually read are the old ones.
// The repo keeps the old data; the service must not lie about which data it is.
// ---------------------------------------------------------------------------
describe("runEvaluation — persistence failure surfaces (U8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedDrafts = [];
    replaceFlagsRejects = false;
    getStackMock.mockResolvedValue(stack);
    listItemsMock.mockResolvedValue(items);
    getProfileMock.mockResolvedValue(null);
    listLabMarkersMock.mockResolvedValue([]);
    listTimelinePointsMock.mockResolvedValue([]);
    listSideEffectReports.mockResolvedValue([]);
    listCheckins.mockResolvedValue([]);
  });

  it("rejects rather than returning a summary of flags that were never stored", async () => {
    replaceFlagsRejects = true;
    const { runEvaluation } = await import("./evaluation");
    await expect(runEvaluation(supabase, "u1", "s1")).rejects.toThrow("insert failed");
  });

  it("still reaches the engine first, so the failure is persistence and not evaluation", async () => {
    // Distinguishes "could not compute" from "could not save" — they need
    // different remedies, and only the second is retryable as-is.
    replaceFlagsRejects = true;
    const { runEvaluation } = await import("./evaluation");
    await expect(runEvaluation(supabase, "u1", "s1")).rejects.toThrow();
    expect(capturedDrafts.length).toBeGreaterThan(0);
  });
});
