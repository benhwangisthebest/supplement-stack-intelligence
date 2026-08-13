// Ownership pins for `advisor-action-repo` (Phase 2 U9).
//
// THIS MODULE IS THE INTERESTING ONE, and the reason is worth stating up front:
// `advisor_actions` HAS a `user_id` column, and two of its five functions do not
// take a `userId` at all. `getAction(supabase, id)` and `markUndone(supabase,
// id)` address a row purely by primary key and rely on RLS for ownership.
//
// U9 does not change that — its file list is tests, and adding an owner
// parameter is a signature change with callers (§9.4). What it does is make the
// asymmetry VISIBLE and pinned, because the rule GATE C1 states — "every module
// taking a `userId` applies it" — is silent about a function that takes no
// `userId` in the first place. A rule phrased over functions that already accept
// an owner cannot see the function that dropped it, which means the cheapest way
// to satisfy the rule is to delete the parameter it protects. Registered as a
// finding for U10, whose exemption list has to account for this table.
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

describe("advisor-action-repo — the functions that take NO owner, pinned as they are", () => {
  // These assertions describe the current design rather than endorsing it. If a
  // later unit adds owner scoping, they fail, and that failure is the prompt to
  // re-read the note at the top of this file — which is the point.
  it("getAction addresses the row by id alone, relying on RLS", async () => {
    const spy = querySpy({ data: actionRow });
    await getAction(spy.client, "a1");
    expect(spy.filters()).toContainEqual(["id", "a1"]);
    expect(spy.calls.some((c) => c.method === "eq" && c.args[0] === "user_id")).toBe(false);
  });

  it("markUndone addresses the row by id alone, relying on RLS", async () => {
    const spy = querySpy({ data: actionRow });
    await markUndone(spy.client, "a1");
    expect(spy.calls.some((c) => c.method === "update")).toBe(true);
    expect(spy.filters()).toContainEqual(["id", "a1"]);
    expect(spy.calls.some((c) => c.method === "eq" && c.args[0] === "user_id")).toBe(false);
  });

  it("getActionsByBatch is scoped by batch id, which is generated per user action", async () => {
    const spy = querySpy({ data: [actionRow] });
    await getActionsByBatch(spy.client, "b1");
    expect(spy.filters()).toContainEqual(["batch_id", "b1"]);
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
