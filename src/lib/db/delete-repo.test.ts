// Fixture tests for self-service deletion (Phase 2 U17).
//
// THIS FILE EXISTS BECAUSE route.test.ts MOCKS THIS MODULE. U16's mutation M5
// established that the hard way: a console spy in a file that mocks the
// repository cannot see the repository, and a header claiming otherwise was
// false. So the coverage is split and each half states what it sees —
//   route.test.ts — the ROUTE does not log what it received;
//   this file     — the REPOSITORY does not log what it read, and refuses to
//                   report a deletion as complete when it is not.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteAllForCaller } from "./delete-repo";
import { USER_OWNED_TABLES } from "./export-repo";

const FULL_COUNTS = Object.fromEntries(USER_OWNED_TABLES.map((t, i) => [t, i + 1]));

function rpcClient(result: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

let spies: Array<ReturnType<typeof vi.spyOn>>;
beforeEach(() => {
  spies = (["log", "error", "warn", "info", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
});
afterEach(() => vi.restoreAllMocks());

const logged = () =>
  spies
    .flatMap((s) => s.mock.calls)
    .flat()
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join("\n");

describe("deleteAllForCaller — the call it makes", () => {
  it("calls the zero-argument RPC and passes NO user id", async () => {
    // The security property, at the only level TypeScript can express it. The
    // function derives its owner from auth.uid() in the database; an argument
    // here would either be ignored (decorative) or would require the function to
    // accept a user id — the catastrophic shape, pinned in
    // sql-function-registry.test.ts.
    const { client, rpc } = rpcClient({ data: FULL_COUNTS });
    await deleteAllForCaller(client);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("delete_all_user_data");
    expect(
      JSON.stringify(rpc.mock.calls[0].slice(1)),
      "no argument may be passed to delete_all_user_data — see the migration header",
    ).not.toMatch(/[0-9a-f-]{8,}|user/i);
  });

  it("sums the per-table counts", async () => {
    const { client } = rpcClient({ data: FULL_COUNTS });
    const result = await deleteAllForCaller(client);
    expect(result.deleted).toEqual(FULL_COUNTS);
    expect(result.totalRows).toBe(Object.values(FULL_COUNTS).reduce((a, b) => a + b, 0));
  });
});

describe("deleteAllForCaller — it refuses to overstate what happened", () => {
  it("throws when the RPC errors, rather than returning empty counts", async () => {
    // A partial or unknown outcome reported as success is the worst available
    // failure: the user is told their data is gone when it may not be.
    const { client } = rpcClient({ error: { message: "permission denied" } });
    await expect(deleteAllForCaller(client)).rejects.toBeTruthy();
  });

  it("throws when the function reports no count for one of the twelve", async () => {
    // The drift guard. If the database function stops deleting a table — or the
    // application's set grows one the function does not know about — the two
    // halves of the criterion disagree, and the user is the one who finds out.
    const partial = { ...FULL_COUNTS };
    delete (partial as Record<string, number>).advisor_usage;
    const { client } = rpcClient({ data: partial });
    await expect(deleteAllForCaller(client)).rejects.toThrow(/advisor_usage/);
  });

  it("throws when the RPC returns nothing at all", async () => {
    const { client } = rpcClient({ data: null });
    await expect(deleteAllForCaller(client)).rejects.toThrow(/no count for/);
  });

  it("requires a count for every table the export returns", async () => {
    // ONE definition, TWO consumers. Two lists would be two chances to disagree
    // about what "the user's data" means.
    expect(USER_OWNED_TABLES.length).toBe(12);
    for (const table of USER_OWNED_TABLES) {
      const partial = { ...FULL_COUNTS };
      delete (partial as Record<string, number>)[table];
      const { client } = rpcClient({ data: partial });
      await expect(
        deleteAllForCaller(client),
        `a missing count for ${table} was accepted as a complete deletion`,
      ).rejects.toThrow(new RegExp(table));
    }
  });
});

describe("deleteAllForCaller — §2.3 rule 15", () => {
  it("logs nothing, not even the counts", async () => {
    const { client } = rpcClient({ data: FULL_COUNTS });
    await deleteAllForCaller(client);
    expect(
      logged(),
      "the repository logged something during a deletion. Counts reveal how many lab\n" +
        "panels, side effects and advisor exchanges a person had — §2.3 rule 15 applies.",
    ).toBe("");
  });

  it("logs nothing on the failure path either", async () => {
    const { client } = rpcClient({ error: { message: "boom", details: "row user_id=u1" } });
    await expect(deleteAllForCaller(client)).rejects.toBeTruthy();
    expect(logged()).toBe("");
  });
});
