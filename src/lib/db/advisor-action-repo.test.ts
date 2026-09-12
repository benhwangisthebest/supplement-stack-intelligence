// Ownership pins for `advisor-action-repo` (Phase 2 U9; owner-bound by U26).
//
// THIS MODULE WAS THE INTERESTING ONE, and the history is kept because it is
// the reason the guard is phrased the way it is: `advisor_actions` HAS a
// `user_id` column, and until U26 three of its functions did not take a
// `userId` at all. `getAction(supabase, id)` and `markUndone(supabase, id)`
// addressed a row purely by primary key and relied on RLS for ownership.
//
// U9 did not change that — its file list was tests, and adding an owner
// parameter is a signature change with callers (§9.4). What it did was make the
// asymmetry VISIBLE and pinned, because the rule GATE C1 states — "every module
// taking a `userId` applies it" — is silent about a function that takes no
// `userId` in the first place. A rule phrased over functions that already accept
// an owner cannot see the function that dropped it, which means the cheapest way
// to satisfy the rule is to delete the parameter it protects. U10 re-quantified
// the guard over TABLES for exactly that reason, and held the three in
// `UNSCOPED_FUNCTIONS` as a ratchet.
//
// [2026-09-11] U26 bound the owner in all three. The pins below now assert the
// filter, in the same form as every other repo in this directory. RLS still
// isolates tenants at the database (§2.3 rule 12); this is the repository-layer
// half, so a bug in `src/` cannot rely on RLS to save it.
import { describe, expect, it } from "vitest";
import { ownerBinding, querySpy } from "./__testing__/query-spy";
import {
  getAction,
  getActionsByBatch,
  markUndone,
  recordAction,
  recordBatch, listActionsByUser } from "./advisor-action-repo";

const actionRow = {
  id: "a1",
  user_id: "u1",
  conversation_id: null,
  action_type: "add_stack_item",
  status: "applied",
  payload: {},
  inverse: { kind: "delete", table: "stack_items", id: "i1" },
  batch_id: null,
  created_at: "2026-08-01T00:00:00Z",
};

const newAction = {
  conversationId: null,
  actionType: "add_stack_item" as const,
  payload: {},
  inverse: { kind: "delete", table: "stack_items", id: "i1" },
};

describe("advisor-action-repo — the functions that take an owner bind it", () => {
  it("recordAction writes user_id into the row", async () => {
    const spy = querySpy({ data: actionRow });
    await recordAction(spy.client, "u1", newAction as never);
    expect(spy.tables).toEqual(["advisor_actions"]);
    expect(ownerBinding(spy, "u1")).toBe("payload");
  });

  it("recordBatch writes user_id on EVERY row in the batch", async () => {
    // A batch is undone as a unit. One row missing its owner would be a row the
    // owner's undo cannot reach.
    const spy = querySpy({ data: [actionRow, actionRow] });
    await recordBatch(spy.client, "u1", "b1", [newAction, newAction] as never);
    expect(spy.payloads).toHaveLength(2);
    expect(spy.payloads.filter((r) => r.user_id !== "u1")).toEqual([]);
    expect(spy.payloads.filter((r) => r.batch_id !== "b1")).toEqual([]);
  });
});

describe("advisor-action-repo — the three U26 bound (they used to take NO owner)", () => {
  // Until U26 these asserted the ABSENCE of an owner filter, "pinned as they
  // are". They now assert its presence. Mutation M3 (revert the clause on
  // `markUndone`) and M4 (pass a second user's id) are recorded in the plan.
  it("getAction addresses the row by id AND owner", async () => {
    const spy = querySpy({ data: actionRow });
    await getAction(spy.client, "u1", "a1");
    expect(spy.tables).toEqual(["advisor_actions"]);
    expect(spy.filters()).toContainEqual(["id", "a1"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
    expect(ownerBinding(spy, "u1")).toBe("filter");
  });

  it("markUndone updates the row by id AND owner — the write, so the higher-stakes pin", async () => {
    const spy = querySpy({ data: actionRow });
    await markUndone(spy.client, "u1", "a1");
    expect(spy.calls.some((c) => c.method === "update")).toBe(true);
    expect(spy.filters()).toContainEqual(["id", "a1"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
    expect(ownerBinding(spy, "u1")).toBe("filter");
  });

  it("getActionsByBatch is scoped by batch id AND owner — a batch id is obscurity, not scoping", async () => {
    const spy = querySpy({ data: [actionRow] });
    await getActionsByBatch(spy.client, "u1", "b1");
    expect(spy.filters()).toContainEqual(["batch_id", "b1"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("the owner filter carries the id that was passed, not a constant", async () => {
    // Guards against the transposition hazard the plan names: three adjacent
    // `string` parameters. A pin that only checks `user_id` is *present* would
    // stay green if the call site swapped `userId` and `id`.
    const spy = querySpy({ data: actionRow });
    await getAction(spy.client, "u2", "a1");
    expect(spy.filters()).toContainEqual(["user_id", "u2"]);
    expect(spy.filters()).not.toContainEqual(["user_id", "a1"]);
  });
});

describe("advisor-action-repo — the export reader (U16)", () => {
  it("listActionsByUser filters by user_id", async () => {
    // `getActionsByBatch` and `getAction` cannot answer "everything of mine",
    // which is what an export needs. `advisor_actions` HAS a user_id column, so
    // REPO_SCOPING requires the filter rather than leaving it to RLS.
    const spy = querySpy({ data: [] });
    await listActionsByUser(spy.client, "u1");
    expect(spy.tables).toEqual(["advisor_actions"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });
});
