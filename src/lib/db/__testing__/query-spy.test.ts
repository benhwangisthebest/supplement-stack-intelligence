// Self-tests for the ownership spy (Phase 2 U9, anti-rot).
//
// The pins in `src/lib/db/*.test.ts` are only as trustworthy as this helper. A
// spy that silently stopped recording `eq` calls, or one whose `ownerBinding`
// answered "filter" unconditionally, would turn every ownership assertion in
// the directory green while proving nothing. So the helper's own behaviour is
// pinned here — including, and especially, its ability to report ABSENCE.
import { describe, expect, it } from "vitest";
import { ownerBinding, querySpy } from "./query-spy";

describe("querySpy records what the repos actually do", () => {
  it("records the table, the chain, and the eq pairs in order", async () => {
    const spy = querySpy({ data: [] });
    await spy.client.from("stacks").select("*").eq("user_id", "u1").eq("id", "s1");
    expect(spy.tables).toEqual(["stacks"]);
    expect(spy.filters()).toEqual([
      ["user_id", "u1"],
      ["id", "s1"],
    ]);
  });

  it("REPORTS ABSENCE — a filter that was never applied is not in the list", () => {
    // The load-bearing self-test. If this could not fail, none of the ownership
    // assertions in this directory could either.
    const spy = querySpy();
    expect(spy.filters()).toEqual([]);
    expect(spy.filtered("user_id", "u1")).toBe(false);
  });

  it("distinguishes a matching value from a merely matching column", async () => {
    const spy = querySpy();
    await spy.client.from("stacks").select("*").eq("user_id", "SOMEONE-ELSE");
    expect(spy.filtered("user_id", "u1")).toBe(false);
  });

  it("flattens array payloads so a batch insert is checked row by row", async () => {
    const spy = querySpy();
    await spy.client.from("t").insert([{ user_id: "u1" }, { user_id: "u2" }]);
    expect(spy.payloads).toEqual([{ user_id: "u1" }, { user_id: "u2" }]);
  });

  it("records rpc calls with their name and arguments, and no table", async () => {
    const spy = querySpy({ data: 1 });
    await spy.client.rpc("consume_rate_limit", { p_limit: 5 });
    expect(spy.tables).toEqual([]);
    expect(spy.calls).toEqual([
      { method: "rpc", args: ["consume_rate_limit", { p_limit: 5 }] },
    ]);
  });

  it("resolves the configured error so repos can be shown to throw", async () => {
    const spy = querySpy({ error: { message: "boom" } });
    const res = await spy.client.from("t").select("*");
    expect(res.error).toEqual({ message: "boom" });
  });
});

describe("ownerBinding names HOW the owner reached the query", () => {
  it("returns 'filter' for a filtered read", async () => {
    const spy = querySpy();
    await spy.client.from("t").select("*").eq("user_id", "u1");
    expect(ownerBinding(spy, "u1")).toBe("filter");
  });

  it("returns 'payload' for a write that stamps the column", async () => {
    const spy = querySpy();
    await spy.client.from("t").insert({ user_id: "u1" });
    expect(ownerBinding(spy, "u1")).toBe("payload");
  });

  it("returns NULL when the owner reached neither — the defect it exists to name", async () => {
    const spy = querySpy();
    await spy.client.from("t").select("*").eq("id", "x");
    expect(ownerBinding(spy, "u1")).toBeNull();
  });

  it("returns null when a DIFFERENT user's id was bound", async () => {
    // "Some user id was used" is not the property; "this user's" is.
    const spy = querySpy();
    await spy.client.from("t").insert({ user_id: "attacker" });
    expect(ownerBinding(spy, "u1")).toBeNull();
  });
});
