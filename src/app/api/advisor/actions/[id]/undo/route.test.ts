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
//
// [Phase 4 U10 (b), N-101] The executor is REAL here and the repos below it are
// mocked, so these tests see the write that reaches the item rather than the
// inverse handed to a mock. That is what lets the stale-undo case below fail for
// the right reason: a replay that overwrites an intervening change.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { AdvisorActionRecord } from "@/types/advisor-action";

const getUser = vi.fn();
const getAction = vi.fn();
const getActionsByBatch = vi.fn();
const markUndone = vi.fn();
const deleteItem = vi.fn();
const setItemProduct = vi.fn();
const getItemProductId = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
const createClient = vi.fn(async () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/lib/db/advisor-action-repo", () => ({
  getAction: (...a: unknown[]) => getAction(...a),
  getActionsByBatch: (...a: unknown[]) => getActionsByBatch(...a),
  markUndone: (...a: unknown[]) => markUndone(...a),
}));
vi.mock("@/lib/db/stack-item-repo", () => ({
  addItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: (...a: unknown[]) => deleteItem(...a),
  updateItemIfUnchanged: vi.fn(),
  deleteItemIfUnchanged: vi.fn(),
  getItemProductId: (...a: unknown[]) => getItemProductId(...a),
  setItemProduct: (...a: unknown[]) => setItemProduct(...a),
}));
vi.mock("@/lib/db/stack-repo", () => ({ createStack: vi.fn(), deleteStack: vi.fn() }));

import { POST } from "./route";

function ctx(id = "f55ff16f-66f4-4360-866b-95db6f8fec01") {
  return { params: Promise.resolve({ id }) };
}
const req = () => ({}) as unknown as NextRequest;

const USER = { id: "u1" };

function action(over: Partial<AdvisorActionRecord> = {}): AdvisorActionRecord {
  return {
    id: "f55ff16f-66f4-4360-866b-95db6f8fec01",
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
  deleteItem.mockResolvedValue(undefined);
  setItemProduct.mockResolvedValue(true);
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
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("404s — replaying nothing — for an unknown action", async () => {
    getUser.mockResolvedValue(USER);
    getAction.mockResolvedValue(null);

    const res = await POST(req(), ctx("a45c4779-a077-4e4f-8295-f75e12090947"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("409s ALREADY_UNDONE on a double undo, without replaying the inverse", async () => {
    getUser.mockResolvedValue(USER);
    getAction.mockResolvedValue(action({ status: "undone" }));

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("ALREADY_UNDONE");
    expect(deleteItem).not.toHaveBeenCalled();
    expect(markUndone).not.toHaveBeenCalled();
  });

  it("undoes a single action under the caller's own id", async () => {
    getUser.mockResolvedValue(USER);

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "f55ff16f-66f4-4360-866b-95db6f8fec01", undone: true, batchId: null, count: 1 });
    expect(deleteItem).toHaveBeenCalledWith({}, "i1");
    // U26: the owner travels with every repo call, in the second position.
    expect(getAction).toHaveBeenCalledWith({}, "u1", "f55ff16f-66f4-4360-866b-95db6f8fec01");
    expect(markUndone).toHaveBeenCalledWith({}, "u1", "f55ff16f-66f4-4360-866b-95db6f8fec01");
    expect(getActionsByBatch).not.toHaveBeenCalled();
  });

  it("undoes a whole batch in REVERSE apply order", async () => {
    getUser.mockResolvedValue(USER);
    getAction.mockResolvedValue(action({ batchId: "b1" }));
    getActionsByBatch.mockResolvedValue([
      action({ id: "f55ff16f-66f4-4360-866b-95db6f8fec01", inverse: { op: "delete_item", stackId: "s1", itemId: "first" } }),
      action({ id: "2c3a4249-d770-4005-8649-dbd822dcaf79", inverse: { op: "delete_item", stackId: "s1", itemId: "second" } }),
    ]);

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "f55ff16f-66f4-4360-866b-95db6f8fec01", undone: true, batchId: "b1", count: 2 });
    // Newest first — the same invariant executeBatch holds on the forward path.
    expect(deleteItem.mock.calls.map((c) => c[1])).toEqual(["second", "first"]);
    expect(getActionsByBatch).toHaveBeenCalledWith({}, "u1", "b1");
    expect(markUndone.mock.calls.map((c) => c[2])).toEqual(["2c3a4249-d770-4005-8649-dbd822dcaf79", "f55ff16f-66f4-4360-866b-95db6f8fec01"]);
    expect(markUndone.mock.calls.every((c) => c[1] === "u1")).toBe(true);
  });

  it("skips siblings already undone", async () => {
    getUser.mockResolvedValue(USER);
    getAction.mockResolvedValue(action({ batchId: "b1" }));
    getActionsByBatch.mockResolvedValue([
      action({ id: "f55ff16f-66f4-4360-866b-95db6f8fec01", inverse: { op: "delete_item", stackId: "s1", itemId: "live" } }),
      action({ id: "2c3a4249-d770-4005-8649-dbd822dcaf79", status: "undone" }),
    ]);

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(body.data.count).toBe(1);
    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(deleteItem.mock.calls[0][1]).toBe("live");
  });

  it("returns the generic 500 envelope when a replay throws", async () => {
    getUser.mockResolvedValue(USER);
    deleteItem.mockRejectedValue(new Error("deadlock detected on relation stack_items"));

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("UNDO_ERROR");
    expect(body.error.message).toBe("An unexpected internal error occurred.");
    expect(typeof body.error.correlationId).toBe("string");
    expect(JSON.stringify(body)).not.toContain("deadlock");
  });
});

// Phase 4 U10 (b), N-101. An attach's inverse restores the product the item held
// before the confirm. Undo may run long after, so the product the attach wrote
// (the audit row's payload) must still be there, or the replay would erase
// whatever replaced it. A row that is not applied is not marked undone, and the
// response counts it: only numbers cross (D-14 (a)).
describe("undo of an attach is a compare-and-set (U10 (b), N-101)", () => {
  const ATTACH_ID = "2c3a4249-d770-4005-8649-dbd822dcaf79";
  const attach = (over: Partial<AdvisorActionRecord> = {}) =>
    action({
      id: ATTACH_ID,
      actionType: "attach_product",
      payload: { stackItemId: "i1", productId: "p-new" },
      inverse: { op: "set_item_product", stackId: "s1", itemId: "i1", productId: "p-old" },
      ...over,
    });
  function column(initial: string | null) {
    const state = { column: initial };
    getItemProductId.mockImplementation(async () => state.column);
    setItemProduct.mockImplementation(
      async (_db: unknown, _id: string, pid: string | null, expect?: { current: string | null } | string) => {
        if (typeof expect === "object" && expect.current !== state.column) return false;
        state.column = pid;
        return true;
      },
    );
    return state;
  }

  beforeEach(() => getUser.mockResolvedValue(USER));

  it("an undo after an intervening change writes nothing, marks nothing, and counts it", async () => {
    const state = column("p-other"); // the item's product changed after the confirm
    getAction.mockResolvedValue(attach());

    const res = await POST(req(), ctx(ATTACH_ID));
    const body = await res.json();

    expect(state.column).toBe("p-other");
    expect(markUndone).not.toHaveBeenCalled();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("STALE_UNDO");
    expect(body.error.details).toEqual({ reverted: 0, unreverted: 1 });
    // The approved partial-outcome sentence, filled with the two counts.
    expect(body.error.message).toBe(
      "This didn't finish, and some changes couldn't be undone (0 undone, 1 not undone). Please check your stack in Stack Lab before trying again.",
    );
    // Only numbers cross: no item, product or action id.
    for (const id of ["i1", "p-new", "p-old", "p-other", ATTACH_ID]) {
      expect(JSON.stringify(body)).not.toContain(id);
    }
  });

  it("an undo nobody raced restores the prior product, expecting the one the attach wrote", async () => {
    const state = column("p-new");
    getAction.mockResolvedValue(attach());

    const res = await POST(req(), ctx(ATTACH_ID));

    expect(res.status).toBe(200);
    expect(state.column).toBe("p-old");
    expect(setItemProduct).toHaveBeenCalledWith({}, "i1", "p-old", { current: "p-new" });
    expect(markUndone).toHaveBeenCalledWith({}, "u1", ATTACH_ID);
  });

  it("a batch undoes and marks the rows it can, and counts the one it cannot", async () => {
    const state = column("p-other");
    getAction.mockResolvedValue(action({ batchId: "b1" }));
    getActionsByBatch.mockResolvedValue([
      action({ batchId: "b1", inverse: { op: "delete_item", stackId: "s1", itemId: "i-added" } }),
      attach({ batchId: "b1" }),
    ]);

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(state.column).toBe("p-other");
    expect(deleteItem).toHaveBeenCalledWith({}, "i-added");
    expect(markUndone.mock.calls.map((c) => c[2])).toEqual(["f55ff16f-66f4-4360-866b-95db6f8fec01"]);
    expect(res.status).toBe(409);
    expect(body.error.details).toEqual({ reverted: 1, unreverted: 1 });
  });
});

describe("U30 — a malformed path id is a 400, not a 500 (N-51)", () => {
  // The id never reaches Postgres: `uuidParam` decides from the string, before
  // any I/O. That ordering is the reason a syntactic 400 is not an existence
  // oracle — nothing was looked up to produce it. A WELL-FORMED id that is
  // foreign or absent still answers 404, byte-identical (U29's property).

  it("POST — malformed `id` answers 400 VALIDATION_ERROR", async () => {
    const res = await POST(req(), ctx("not-a-uuid"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("the 400 is unchanged by U34's move onto handle() (M9)", async () => {
    // U30 needed `safeParse` + an explicit `validationError` here because this
    // handler had no `handle()`. U34 gave it one and restored the bare
    // `uuidParam.parse(id)`. The point of this assertion is that the CLIENT
    // cannot tell: same status, same code, same envelope, no correlation id
    // (a 400 is the caller's fault and nothing was logged).
    const body = await (await POST(req(), ctx("not-a-uuid"))).json();

    expect(body).toMatchObject({ data: null, error: { code: "VALIDATION_ERROR" } });
    expect(body.error.correlationId).toBeUndefined();
  });
});

describe("U34 — the pre-handler throws are inside the envelope now (N-72)", () => {
  // THE DEFECT THIS CLOSES, and it is not uniformity. `await params` and
  // `await createClient()` used to run OUTSIDE the try, so a throw at either
  // left the handler entirely: Next.js answered with its own 500, in no
  // envelope, with no correlation id, and nothing reached the log. It was the
  // only 500 in this application that could not be traced.

  it("a throw in `await params` is a logged 500 in the standard envelope", async () => {
    getUser.mockResolvedValue(USER);

    const res = await POST(req(), {
      params: Promise.reject(new Error("params resolution exploded")),
    } as unknown as { params: Promise<{ id: string }> });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("UNDO_ERROR");
    expect(body.error.message).toBe("An unexpected internal error occurred.");
    expect(typeof body.error.correlationId).toBe("string");
    // §2.3 rule 13 — the cause goes to the log, never to the client.
    expect(JSON.stringify(body)).not.toContain("exploded");
  });

  it("a throw in `await createClient()` is too", async () => {
    getUser.mockResolvedValue(USER);
    createClient.mockRejectedValueOnce(new Error("pool exhausted"));

    const res = await POST(req(), ctx());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("UNDO_ERROR");
    expect(typeof body.error.correlationId).toBe("string");
    expect(JSON.stringify(body)).not.toContain("pool exhausted");
  });
});
