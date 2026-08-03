// Application — route-handler tests for POST /api/advisor/actions/:id/undo (Phase 1 U4).
//
// The reversal half of the advisor's write path. Two properties carry real
// weight and neither is visible from the pure engines:
//
//   1. REVERSE apply order. A batch is unwound newest-first so dependent writes
//      unwind correctly — the same invariant `executeBatch` holds on the
//      forward path (U10), asserted here on the undo path.
//   2. Double-undo is refused with 409 ALREADY_UNDONE rather than replaying the
//      inverse a second time. Replaying a `delete_item` inverse twice is
//      harmless; replaying an `add_item` inverse twice silently duplicates a
//      supplement in the user's stack.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { AdvisorActionRecord } from "@/types/advisor-action";

const getUser = vi.fn();
const getAction = vi.fn();
const getActionsByBatch = vi.fn();
const markUndone = vi.fn();
const executeIntent = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/advisor-action-repo", () => ({
  getAction: (...a: unknown[]) => getAction(...a),
  getActionsByBatch: (...a: unknown[]) => getActionsByBatch(...a),
  markUndone: (...a: unknown[]) => markUndone(...a),
}));
vi.mock("@/lib/advisor/actions/execute", () => ({
  executeIntent: (...a: unknown[]) => executeIntent(...a),
}));

import { POST } from "./route";

function ctx(id = "a1") {
  return { params: Promise.resolve({ id }) };
}
const req = () => ({}) as unknown as NextRequest;

const USER = { id: "u1" };

function action(over: Partial<AdvisorActionRecord> = {}): AdvisorActionRecord {
  return {
    id: "a1",
    userId: "u1",
    conversationId: null,
    actionType: "add_item",
    status: "applied",
    payload: {},
    inverse: { op: "delete_item", stackId: "s1", itemId: "i1" },
    createdAt: "2026-08-01T00:00:00Z",
    batchId: null,
    undoneAt: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getAction.mockResolvedValue(action());
  getActionsByBatch.mockResolvedValue([]);
  executeIntent.mockResolvedValue(undefined);
  markUndone.mockResolvedValue(undefined);
});

describe("POST /api/advisor/actions/:id/undo", () => {
  it("returns 401 and replays nothing", async () => {
    getUser.mockResolvedValue(null);
    // §6.3.1: everything downstream would succeed, so a bypass reverses
    // another user's write with a 200 rather than erroring.

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(getAction).not.toHaveBeenCalled();
    expect(executeIntent).not.toHaveBeenCalled();
  });

  it("404s — replaying nothing — for an unknown action", async () => {
    getUser.mockResolvedValue(USER);
    getAction.mockResolvedValue(null);

    const res = await POST(req(), ctx("a-missing"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(executeIntent).not.toHaveBeenCalled();
  });

  it("409s ALREADY_UNDONE on a double undo, without replaying the inverse", async () => {
    getUser.mockResolvedValue(USER);
    getAction.mockResolvedValue(action({ status: "undone" }));

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("ALREADY_UNDONE");
    expect(executeIntent).not.toHaveBeenCalled();
    expect(markUndone).not.toHaveBeenCalled();
  });

  it("undoes a single action under the caller's own id", async () => {
    getUser.mockResolvedValue(USER);

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "a1", undone: true, batchId: null, count: 1 });
    expect(executeIntent).toHaveBeenCalledWith({}, "u1", {
      op: "delete_item",
      stackId: "s1",
      itemId: "i1",
    });
    expect(markUndone).toHaveBeenCalledWith({}, "a1");
    expect(getActionsByBatch).not.toHaveBeenCalled();
  });

  it("undoes a whole batch in REVERSE apply order", async () => {
    getUser.mockResolvedValue(USER);
    getAction.mockResolvedValue(action({ batchId: "b1" }));
    getActionsByBatch.mockResolvedValue([
      action({ id: "a1", inverse: { op: "delete_item", stackId: "s1", itemId: "first" } }),
      action({ id: "a2", inverse: { op: "delete_item", stackId: "s1", itemId: "second" } }),
    ]);

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "a1", undone: true, batchId: "b1", count: 2 });
    // Newest first — the same invariant executeBatch holds on the forward path.
    expect(executeIntent.mock.calls.map((c) => c[2].itemId)).toEqual(["second", "first"]);
    expect(markUndone.mock.calls.map((c) => c[1])).toEqual(["a2", "a1"]);
  });

  it("skips siblings already undone", async () => {
    getUser.mockResolvedValue(USER);
    getAction.mockResolvedValue(action({ batchId: "b1" }));
    getActionsByBatch.mockResolvedValue([
      action({ id: "a1", inverse: { op: "delete_item", stackId: "s1", itemId: "live" } }),
      action({ id: "a2", status: "undone" }),
    ]);

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(body.data.count).toBe(1);
    expect(executeIntent).toHaveBeenCalledTimes(1);
    expect(executeIntent.mock.calls[0][2].itemId).toBe("live");
  });

  it("returns the generic 500 envelope when a replay throws", async () => {
    getUser.mockResolvedValue(USER);
    executeIntent.mockRejectedValue(new Error("deadlock detected on relation stack_items"));

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("UNDO_ERROR");
    expect(body.error.message).toBe("An unexpected internal error occurred.");
    expect(typeof body.error.correlationId).toBe("string");
    expect(JSON.stringify(body)).not.toContain("deadlock");
  });
});
