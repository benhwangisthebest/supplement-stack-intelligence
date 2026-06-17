import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADVISOR_DAILY_TOKEN_BUDGET,
  deriveTitle,
  getRemainingBudget,
  recordUsage,
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

describe("recordUsage", () => {
  it("accumulates onto an existing row", async () => {
    const { client, upserts } = fakeSupabase({ input_tokens: 100, output_tokens: 50 });
    await recordUsage(client, "u1", { inputTokens: 10, outputTokens: 5 });
    expect(upserts[0]).toMatchObject({
      user_id: "u1",
      input_tokens: 110,
      output_tokens: 55,
    });
  });

  it("starts from zero when no row exists", async () => {
    const { client, upserts } = fakeSupabase(null);
    await recordUsage(client, "u1", { inputTokens: 8, outputTokens: 4 });
    expect(upserts[0]).toMatchObject({ input_tokens: 8, output_tokens: 4 });
  });
});
