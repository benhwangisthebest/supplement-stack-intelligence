// Fixture tests for the data export (Phase 2 U16).
//
// ===========================================================================
// WHY THIS FILE EXISTS SEPARATELY FROM route.test.ts — a mutation found it
// ===========================================================================
// `route.test.ts` mocks `@/lib/db/export-repo`, so a logging statement added
// INSIDE the repository never executes there. Mutation M5 put `console.error`
// in `exportUserData` and the route test stayed green, which falsified the
// claim its own header made — that the console spy "covers the whole call path
// beneath it". It covers the route.
//
// So the coverage is split, and each half says what it can see:
//   * route.test.ts  — the ROUTE does not log the payload it received.
//   * this file      — the REPOSITORY does not log the rows it read.
// Neither implies the other, and M5 is the evidence.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { exportUserData } from "./export-repo";

/** Real-shaped health values — a generic "x" would pass a test a drug name fails. */
const SENTINELS = [
  "SENTINEL-WARFARIN-5MG",
  "SENTINEL-HYPOTHYROIDISM",
  "SENTINEL-TSH-8.4-MIU-L",
];

interface Call {
  table: string;
  method: string;
  args: unknown[];
}

/**
 * A Supabase stand-in that records every call and returns sentinel-bearing rows
 * for the health tables. Chainable and awaitable, matching the query shapes the
 * repositories actually use.
 */
function stubClient(calls: Call[], extra: Record<string, unknown[]> = {}) {
  const rowsFor = (table: string): unknown[] => {
    if (Object.hasOwn(extra, table)) return extra[table];
    switch (table) {
      case "stacks":
        return [{ id: "s1", user_id: "u1", name: "morning" }];
      case "advisor_conversations":
        return [{ id: "c1", user_id: "u1" }];
      case "lab_markers":
        return [{ id: "m1", user_id: "u1", name: SENTINELS[2], value: 8.4 }];
      case "checkins":
        return [{ id: "k1", user_id: "u1", checkin_date: "2020-01-01", note: SENTINELS[1] }];
      default:
        return [];
    }
  };

  const builder = (table: string) => {
    const chain: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown) => resolve({ data: rowsFor(table), error: null }),
      maybeSingle: async () => ({
        data: table === "user_profiles" ? { user_id: "u1", medications: [SENTINELS[0]] } : null,
        error: null,
      }),
      single: async () => ({ data: null, error: null }),
    };
    for (const m of ["select", "eq", "in", "gte", "lte", "order", "limit", "range"]) {
      chain[m] = (...args: unknown[]) => {
        calls.push({ table, method: m, args });
        return chain;
      };
    }
    return chain;
  };

  return {
    from: (table: string) => {
      calls.push({ table, method: "from", args: [] });
      return builder(table);
    },
  } as unknown as SupabaseClient;
}

let spies: Array<ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
  spies = (["log", "error", "warn", "info", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
});
afterEach(() => vi.restoreAllMocks());

function everythingLogged(): string {
  return spies
    .flatMap((s) => s.mock.calls)
    .flat()
    .map((a) => {
      try {
        return typeof a === "string" ? a : JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join("\n");
}

describe("exportUserData — §2.3 rule 15: the repository logs no health data", () => {
  it("reads a full record and writes nothing to any logger", async () => {
    const calls: Call[] = [];
    const result = await exportUserData(stubClient(calls), "u1");

    // The rows really did come back, so a green result is not "nothing happened".
    expect(JSON.stringify(result.tables)).toContain(SENTINELS[0]);

    const logged = everythingLogged();
    for (const value of SENTINELS) {
      expect(
        logged,
        "§2.3 rule 15 VIOLATION: a health value the repository READ reached a logger.\n" +
          "This is the half route.test.ts cannot see — it mocks this module. What was logged:\n" +
          logged,
      ).not.toContain(value);
    }
    expect(logged, "the repository should log nothing at all on the success path").toBe("");
  });
});

describe("exportUserData — completeness", () => {
  it("scopes every user-owned read to the caller's id", async () => {
    const calls: Call[] = [];
    await exportUserData(stubClient(calls), "u1");
    const ownerFiltered = new Set(
      calls.filter((c) => c.method === "eq" && c.args[0] === "user_id").map((c) => c.table),
    );
    // The nine directly-owned tables must each be filtered by user_id; the other
    // three carry no user_id column and are reached through their parent.
    for (const table of [
      "user_profiles",
      "stacks",
      "lab_panels",
      "lab_markers",
      "advisor_conversations",
      "advisor_actions",
      "advisor_usage",
      "checkins",
      "side_effect_reports",
    ]) {
      expect(ownerFiltered.has(table), `${table} was read without a user_id filter`).toBe(true);
    }
  });

  it("applies NO date window to checkins or side-effect reports", async () => {
    // THE TRUNCATION TRAP. `listCheckins` and `listSideEffectReports` default to
    // 90 days. An export built on those would omit everything older and look
    // complete — the failure mode is silence, not an error. The stub returns a
    // 2020 check-in above; a windowed read would filter it in production.
    const calls: Call[] = [];
    const result = await exportUserData(stubClient(calls), "u1");

    const windowed = calls.filter(
      (c) =>
        ["checkins", "side_effect_reports"].includes(c.table) &&
        ["gte", "lte", "limit", "range"].includes(c.method),
    );
    expect(
      windowed.map((c) => `${c.table}.${c.method}(${String(c.args[0])})`),
      "exportUserData bounded a read. Use listAllCheckins / listAllSideEffectReports —\n" +
        "the windowed readers default to 90 days, and a truncated export is indistinguishable\n" +
        "from a complete one.",
    ).toEqual([]);

    // And the old row actually survives into the payload.
    expect(JSON.stringify(result.tables.checkins)).toContain("2020-01-01");
  });

  it("reads the transitively-owned tables through their parents", async () => {
    // stack_items and evaluation_flags hang off `stacks`; advisor_messages off
    // `advisor_conversations`. If the parent lists come back empty these are
    // never queried — which is correct behaviour, and also why the stub returns
    // one parent row each.
    const calls: Call[] = [];
    await exportUserData(stubClient(calls), "u1");
    const tables = new Set(calls.map((c) => c.table));
    expect(tables.has("stack_items")).toBe(true);
    expect(tables.has("evaluation_flags")).toBe(true);
    expect(tables.has("advisor_messages")).toBe(true);
  });

  it("states its omissions", async () => {
    const result = await exportUserData(stubClient([]), "u1");
    expect(result.notIncluded.length).toBeGreaterThan(0);
    expect(JSON.stringify(result.notIncluded)).toMatch(/auth\.users/);
    expect(JSON.stringify(result.notIncluded)).toMatch(/api_rate_limits/);
  });
});

// Phase 4 U9 — D-16 (b), owner ruling 2026-09-28. A citation's `label` is what the
// user was shown when the message was written; the export keeps it byte-identical
// and adds, beside it, the label the Library gives that id today — resolved by
// `currentCitationLabel`, the resolver the source chips use. Red proofs (HEAD, and the
// resolver call removed on a scratch copy): docs/01-plan/features/p4-u9-export-labels.plan.md.
describe("exportUserData — stored citations carry today's label beside the stored one (U9)", () => {
  const STORED = [
    // Pre-U6 paper title, with the illustrative note the chip drops.
    {
      kind: "paper",
      refId: "p-creatine-strength",
      label: "Effects of creatine supplementation on strength and lean mass",
      detail: "Illustrative evidence summary",
    },
    // Pre-U6 effect name, exactly as tools.ts wrote it before the rename (8d1d971).
    { kind: "effect-grade", refId: "fish-oil-cardiovascular", label: "Fish Oil (Omega-3) → Cardiovascular support, Grade A" },
    // The Library holds it, but it carries no DOI or PMID (FU-57).
    { kind: "paper", refId: "p-nac-antioxidant", label: "Stored NAC title" },
    { kind: "effect-grade", refId: "retired-effect", label: "Gone → Away, Grade C" },
    { kind: "interaction-rule", refId: "rule-x", label: "A ↔ B (moderate)" },
  ];
  const MESSAGE_ROW = {
    id: "msg1",
    conversation_id: "c1",
    role: "assistant",
    content: "Made-up answer.",
    citations: STORED,
    created_at: "2026-09-01T00:00:00Z",
  };

  async function exportedCitations(): Promise<Record<string, unknown>[]> {
    const result = await exportUserData(stubClient([], { advisor_messages: [MESSAGE_ROW] }), "u1");
    const [message] = result.tables.advisor_messages as { citations: Record<string, unknown>[] }[];
    return message.citations;
  }

  it("gives the pre-correction paper and effect labels today's label, keeping the stored one (AC-2)", async () => {
    const out = await exportedCitations();
    const byId = new Map(out.map((c) => [c.refId, c]));
    const expected: Record<string, string> = {
      "p-creatine-strength":
        "Effects of Creatine Supplementation and Resistance Training on Muscle Strength Gains in Adults <50 Years of Age: A Systematic Review and Meta-Analysis.",
      "fish-oil-cardiovascular": "Fish Oil (Omega-3) → Triglyceride lowering, Grade A",
    };
    // Keyed by refId, so a failure names every id whose label is wrong, not just the first.
    const got = Object.fromEntries(Object.keys(expected).map((id) => [id, byId.get(id)?.currentLabel]));
    expect(got, "currentLabel by refId").toEqual(expected);
    for (const refId of Object.keys(expected)) {
      expect(byId.get(refId)?.labelResolution, `${refId}: labelResolution`).toBe("resolved");
      expect(byId.get(refId)?.label, `${refId}: stored label`).toBe(STORED.find((s) => s.refId === refId)!.label);
    }
  });

  it("keeps every stored field byte-identical and adds exactly currentLabel and labelResolution (AC-1)", async () => {
    const out = await exportedCitations();
    expect(out).toHaveLength(STORED.length);
    out.forEach((c, i) => {
      const { currentLabel, labelResolution, ...rest } = c;
      expect(rest, String(STORED[i].refId)).toEqual(STORED[i]);
      expect(Object.keys(c), String(STORED[i].refId)).toEqual([...Object.keys(STORED[i]), "currentLabel", "labelResolution"]);
      expect(currentLabel === null || typeof currentLabel === "string").toBe(true);
      expect(["resolved", "not-in-library", "not-resolved"]).toContain(labelResolution);
    });
  });

  it("an id the Library does not hold exports currentLabel null; no throw, no guess (AC-4)", async () => {
    const byId = new Map((await exportedCitations()).map((c) => [c.refId, c]));
    expect(byId.get("retired-effect")).toMatchObject({ currentLabel: null, labelResolution: "not-in-library" });
    expect(byId.get("rule-x")).toMatchObject({ currentLabel: null, labelResolution: "not-resolved" });
    // Present without a verified title: resolved, and today's label is the stored one.
    expect(byId.get("p-nac-antioxidant")).toMatchObject({
      currentLabel: "Stored NAC title",
      labelResolution: "resolved",
    });
  });

  it("leaves the rest of the message untouched", async () => {
    const result = await exportUserData(stubClient([], { advisor_messages: [MESSAGE_ROW] }), "u1");
    const [message] = result.tables.advisor_messages as Record<string, unknown>[];
    expect(message).toMatchObject({
      id: "msg1",
      conversationId: "c1",
      role: "assistant",
      content: "Made-up answer.",
      createdAt: "2026-09-01T00:00:00Z",
    });
  });

  it("exports a malformed stored element exactly as stored instead of throwing", async () => {
    const row = { ...MESSAGE_ROW, citations: ["not-an-object", null, ["an", "array"]] };
    const result = await exportUserData(stubClient([], { advisor_messages: [row] }), "u1");
    const [message] = result.tables.advisor_messages as { citations: unknown[] }[];
    expect(message.citations).toEqual(["not-an-object", null, ["an", "array"]]);
  });
});
