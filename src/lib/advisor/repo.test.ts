import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ownerBinding, querySpy } from "@/lib/db/__testing__/query-spy";
import {
  ADVISOR_DAILY_TOKEN_BUDGET,
  appendMessages,
  conversationBelongsToUser,
  createConversation,
  deriveTitle,
  getMessages,
  getRemainingBudget,
  listConversations,
  reserveAdvisorTokens,
  settleAdvisorUsage,
  listUsageRows,
} from "./repo";

describe("deriveTitle", () => {
  it("collapses whitespace and keeps short messages intact", () => {
    expect(deriveTitle("  is   my  stack ok? ")).toBe("is my stack ok?");
  });
  it("truncates long messages with an ellipsis", () => {
    const long = "a".repeat(80);
    const t = deriveTitle(long);
    expect(t.length).toBe(58); // 57 chars + ellipsis
    expect(t.endsWith("…")).toBe(true);
  });
  it("falls back for empty input", () => {
    expect(deriveTitle("   ")).toBe("New conversation");
  });
});

// A minimal chainable Supabase stub for the budget queries (no DB).
function fakeSupabase(usageRow: {
  input_tokens: number;
  output_tokens: number;
} | null) {
  const upserts: unknown[] = [];
  const builder = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: usageRow, error: null };
    },
    async upsert(payload: unknown) {
      upserts.push(payload);
      return { error: null };
    },
  };
  const client = { from: () => builder } as unknown as SupabaseClient;
  return { client, upserts };
}

describe("getRemainingBudget", () => {
  it("returns the full budget when there is no usage row today", async () => {
    const { client } = fakeSupabase(null);
    expect(await getRemainingBudget(client, "u1", 1000)).toBe(1000);
  });

  it("subtracts today's accumulated tokens", async () => {
    const { client } = fakeSupabase({ input_tokens: 300, output_tokens: 200 });
    expect(await getRemainingBudget(client, "u1", 1000)).toBe(500);
  });

  it("never returns negative", async () => {
    const { client } = fakeSupabase({ input_tokens: 900, output_tokens: 900 });
    expect(await getRemainingBudget(client, "u1", 1000)).toBe(0);
  });

  it("defaults to ADVISOR_DAILY_TOKEN_BUDGET", async () => {
    const { client } = fakeSupabase(null);
    expect(await getRemainingBudget(client, "u1")).toBe(ADVISOR_DAILY_TOKEN_BUDGET);
  });
});

// `recordUsage`'s two tests were deleted with the function itself by Phase 2
// U15 (finding N-13). They were its ONLY callers — which is what established
// that U4's stated reason for keeping it ("the seed path uses it") was false:
// `src/lib/db/seed.ts` has never touched `advisor_usage`.
//
// The behaviour they covered is not lost. Accumulation is now the RPC's job and
// is proven below by the race-2 test, against a stateful ledger rather than an
// upsert spy — a strictly stronger check, because it also covers the
// concurrency the old select-then-upsert got wrong.

// ----------------------------------------------- Phase 2 U4 (finding N-2) ---

/**
 * A STATEFUL ledger fake. The statefulness is the whole point: Phase 1's U10
 * shipped a concurrency test against a constant-returning mock, which stayed
 * green against the very race it was written for (§6.2.2). A mock that always
 * answers "500 remaining" cannot distinguish an atomic reservation from a
 * read-then-write one.
 *
 * It serves BOTH shapes off one piece of state:
 *   - `rpc(...)`  — the atomic path: the decision and the write happen with no
 *                   await between them, which is what `UPDATE … WHERE …` buys.
 *   - `from(...)` — the old read-then-write path, kept so a mutation can restore
 *                   the pre-U4 implementation and be shown to breach the cap.
 *
 * Every operation yields once (`await Promise.resolve()`) at its START, so
 * concurrent callers genuinely interleave rather than running to completion one
 * at a time. Without that yield the old implementation would pass too, and the
 * test would prove nothing.
 */
function statefulLedger() {
  const state = { input: 0, output: 0 };
  const granted: number[] = [];

  const client = {
    async rpc(fn: string, args: Record<string, number>) {
      await Promise.resolve();
      if (fn === "reserve_advisor_tokens") {
        // decision + write, no await between them
        if (state.input + state.output + args.p_amount > args.p_daily_budget) {
          granted.push(0);
          return { data: 0, error: null };
        }
        state.input += args.p_amount;
        granted.push(args.p_amount);
        return { data: args.p_amount, error: null };
      }
      if (fn === "settle_advisor_tokens") {
        state.input = Math.max(0, state.input - args.p_reserved + args.p_input_tokens);
        state.output += args.p_output_tokens;
        return { data: null, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          await Promise.resolve();
          return { data: { input_tokens: state.input, output_tokens: state.output }, error: null };
        },
        async upsert(payload: { input_tokens: number; output_tokens: number }) {
          await Promise.resolve();
          state.input = payload.input_tokens;
          state.output = payload.output_tokens;
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, state, granted, used: () => state.input + state.output };
}

describe("reserveAdvisorTokens — the daily cap holds under concurrency (N-2)", () => {
  it("grants only what the budget admits when 5 turns start at once", async () => {
    // Budget 1000, reservation 400 → exactly 2 can be granted. The other 3 must
    // be refused with 0, and the ledger must end at 800, not 2000.
    const ledger = statefulLedger();

    const results = await Promise.all(
      Array.from({ length: 5 }, () => reserveAdvisorTokens(ledger.client, 400, 1000)),
    );

    expect(results.filter((r) => r === 400)).toHaveLength(2);
    expect(results.filter((r) => r === 0)).toHaveLength(3);
    expect(ledger.used()).toBe(800);
    expect(ledger.used()).toBeLessThanOrEqual(1000);
  });

  it("refuses once the day's budget is already spent", async () => {
    const ledger = statefulLedger();
    await reserveAdvisorTokens(ledger.client, 1000, 1000);
    expect(await reserveAdvisorTokens(ledger.client, 1, 1000)).toBe(0);
  });

  it("passes no user id — the SQL derives it from auth.uid()", async () => {
    // A SECURITY DEFINER function bypasses RLS, so a supplied id would be the
    // only thing deciding whose ledger is charged. Pinned here as well as in
    // SQL_FUNCTION_REGISTRY, because this is the side that would send one.
    const calls: { fn: string; args: Record<string, unknown> }[] = [];
    const spy = {
      async rpc(fn: string, args: Record<string, unknown>) {
        calls.push({ fn, args });
        return { data: 1, error: null };
      },
    } as unknown as SupabaseClient;

    await reserveAdvisorTokens(spy, 1, 2);
    await settleAdvisorUsage(spy, 1, { inputTokens: 1, outputTokens: 1 });

    expect(calls.map((c) => c.fn)).toEqual([
      "reserve_advisor_tokens",
      "settle_advisor_tokens",
    ]);
    for (const c of calls) {
      expect(Object.keys(c.args).join(",")).not.toMatch(/user|uid|owner/i);
    }
  });

  it("treats a non-numeric RPC result as a refusal, not as a grant", async () => {
    // PostgREST returning null (a function that raised, a shape change) must not
    // read as "granted", which `?? 0` on a truthy check would get wrong.
    const nully = { async rpc() { return { data: null, error: null }; } } as unknown as SupabaseClient;
    expect(await reserveAdvisorTokens(nully, 400, 1000)).toBe(0);
  });
});

describe("settleAdvisorUsage — releases the reservation and charges the truth", () => {
  it("replaces the reserved amount with the actual usage", async () => {
    const ledger = statefulLedger();
    const reserved = await reserveAdvisorTokens(ledger.client, 25_000, 100_000);
    expect(ledger.used()).toBe(25_000);

    await settleAdvisorUsage(ledger.client, reserved, { inputTokens: 300, outputTokens: 120 });

    // 25,000 released, 420 charged — not 25,420, and not 0.
    expect(ledger.used()).toBe(420);
  });

  it("accumulates concurrent settles rather than overwriting them (race 2)", async () => {
    // N-2's SECOND race, which is a different defect from the reservation one
    // and needs its own proof. The old `recordUsage` was select-then-upsert: it
    // read the row, added its own usage to what it had read, and wrote the
    // whole row back. Two turns settling at once both read the same starting
    // value, and the later write ERASED the earlier one — usage silently LOST,
    // in the direction that costs money.
    //
    // The RPC accumulates in-statement (`output_tokens = output_tokens + n`), so
    // three concurrent settles must all land.
    const ledger = statefulLedger();
    await Promise.all([
      settleAdvisorUsage(ledger.client, 0, { inputTokens: 0, outputTokens: 100 }),
      settleAdvisorUsage(ledger.client, 0, { inputTokens: 0, outputTokens: 200 }),
      settleAdvisorUsage(ledger.client, 0, { inputTokens: 0, outputTokens: 300 }),
    ]);
    expect(ledger.used()).toBe(600);
  });

  it("never drives the ledger negative when actual exceeds nothing", async () => {
    const ledger = statefulLedger();
    await settleAdvisorUsage(ledger.client, 25_000, { inputTokens: 0, outputTokens: 0 });
    expect(ledger.used()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// U9 — OWNERSHIP PINS (2026-08-10)
//
// The advisor's tables were the last user-owned surface with no test asserting
// that the owner reaches the query. The rationale is in
// `src/lib/db/__testing__/query-spy.ts`; the short version is that RLS is the
// last line rather than the only one, and `SECURITY DEFINER` functions and the
// service-role seed path both run with it switched off.
// ---------------------------------------------------------------------------
describe("advisor repo — ownership pins (U9)", () => {
  it("createConversation writes user_id into the row", async () => {
    const spy = querySpy({ data: { id: "c1", user_id: "u1", title: "t", created_at: "", updated_at: "" } });
    await createConversation(spy.client, "u1", "t");
    expect(spy.tables).toEqual(["advisor_conversations"]);
    expect(ownerBinding(spy, "u1")).toBe("payload");
  });

  it("listConversations filters by user_id", async () => {
    const spy = querySpy({ data: [] });
    await listConversations(spy.client, "u1");
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("conversationBelongsToUser filters by BOTH id and user_id", async () => {
    // The whole function is the ownership check U21 added; an `id`-only filter
    // would make it answer "yes" for every conversation that exists.
    const spy = querySpy({ data: { id: "c1" } });
    expect(await conversationBelongsToUser(spy.client, "u1", "c1")).toBe(true);
    expect(spy.filters()).toContainEqual(["id", "c1"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("conversationBelongsToUser answers false on a miss without throwing", async () => {
    const spy = querySpy({ data: null });
    expect(await conversationBelongsToUser(spy.client, "u1", "c1")).toBe(false);
  });

  it("getMessages is scoped to the conversation, which owns it transitively", async () => {
    // `advisor_messages` has no `user_id`; ownership derives from the parent
    // conversation, which is why it is one of GATE C1's three exemptions.
    const spy = querySpy({ data: [] });
    await getMessages(spy.client, "c1");
    expect(spy.filters()).toContainEqual(["conversation_id", "c1"]);
  });

  it("appendMessages stamps the conversation on every row and touches only that conversation", async () => {
    // Pinned as it is, and worth reading beside `advisor-action-repo.test.ts`:
    // the `advisor_conversations` bump is addressed by `id` alone on a table
    // that HAS a `user_id`. Safe today because the route establishes ownership
    // first (U21's `conversationBelongsToUser`) and RLS backs it — but the check
    // and the act are two statements, and only RLS closes the gap between them.
    const spy = querySpy({ data: null });
    await appendMessages(spy.client, "c1", [
      { role: "user", content: "hi", citations: [] },
    ]);
    expect(spy.tables).toEqual(["advisor_messages", "advisor_conversations"]);
    expect(spy.payloads.every((r) => r.conversation_id === "c1" || "updated_at" in r)).toBe(true);
    expect(spy.filters()).toContainEqual(["id", "c1"]);
  });

  it("appendMessages writes nothing at all for an empty batch", async () => {
    const spy = querySpy({ data: null });
    await appendMessages(spy.client, "c1", []);
    expect(spy.tables).toEqual([]);
  });

  it("getRemainingBudget filters by user_id and today's date", async () => {
    const spy = querySpy({ data: { input_tokens: 100, output_tokens: 50 } });
    await getRemainingBudget(spy.client, "u1", 1000);
    expect(spy.tables).toEqual(["advisor_usage"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });
});

describe("listUsageRows — the export reader (U16)", () => {
  /**
   * A local fake, not the shared `fakeSupabase` above: that one exists for
   * `maybeSingle` and has no `order`, and widening it would change a helper 22
   * other assertions depend on (§9.4).
   */
  function listClient(rows: unknown[]) {
    const builder: Record<string, unknown> = {
      then: (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null }),
    };
    for (const m of ["select", "eq", "order"]) builder[m] = () => builder;
    return { from: () => builder } as unknown as SupabaseClient;
  }

  it("returns every daily row for the user, mapped", async () => {
    // getRemainingBudget reads the same table but returns a COMPUTED number for
    // today. An export needs the rows: the user's data is what was recorded,
    // not a derived figure about one day of it.
    const rows = await listUsageRows(
      listClient([
        { user_id: "u1", usage_date: "2026-08-01", input_tokens: 10, output_tokens: 5 },
        { user_id: "u1", usage_date: "2026-08-02", input_tokens: 20, output_tokens: 7 },
      ]),
      "u1",
    );
    expect(rows).toEqual([
      { usageDate: "2026-08-01", inputTokens: 10, outputTokens: 5 },
      { usageDate: "2026-08-02", inputTokens: 20, outputTokens: 7 },
    ]);
  });
});
