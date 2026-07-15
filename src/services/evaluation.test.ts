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

vi.mock("@/lib/db/stack-repo", () => ({ getStack: vi.fn(async () => stack) }));
vi.mock("@/lib/db/stack-item-repo", () => ({ listItems: vi.fn(async () => items) }));
vi.mock("@/lib/db/profile-repo", () => ({ getProfile: vi.fn(async () => null) }));
vi.mock("@/lib/db/lab-marker-repo", () => ({ listLabMarkers: vi.fn(async () => []) }));
vi.mock("@/lib/db/lab-panel-repo", () => ({ listTimelinePoints: vi.fn(async () => []) }));
vi.mock("@/lib/db/side-effect-repo", () => ({
  listSideEffectReports: (...a: unknown[]) => listSideEffectReports(...a),
}));
vi.mock("@/lib/db/checkin-repo", () => ({
  listCheckins: (...a: unknown[]) => listCheckins(...a),
}));
vi.mock("@/lib/db/evaluation-flag-repo", () => ({
  listFlags: vi.fn(async () => []),
  replaceFlags: vi.fn(async (_s: unknown, stackId: string, drafts: DraftFlag[]) => {
    capturedDrafts = drafts; // echo back what the engine produced
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
