// Application — route-handler tests for /api/stacks/:id/items/:itemId (Phase 1 U3).
//
// FINDING pinned here rather than fixed (out of U3's scope): both handlers
// verify ownership of the STACK (`getStack(supabase, user.id, id)`) and then
// act on `itemId` WITHOUT checking that the item belongs to that stack. The
// route layer alone would therefore let a caller pass any item id under a
// stack they own.
//
// Cross-user exploitation is blocked one layer down: migration 0001's
// `own_stack_items` policy derives ownership from the parent stack via
// `auth.uid()`, so a write to another user's item fails the RLS check. What
// remains reachable is same-user cross-stack editing, which is harmless today.
//
// The tests below pin the CURRENT behaviour — the stack-level check happening
// and the item id being passed through verbatim — so that if the route ever
// stops relying on RLS, the change is visible rather than silent.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { StackItem } from "@/types/stack";

const getUser = vi.fn();
const getStack = vi.fn();
const updateItem = vi.fn();
const deleteItem = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/stack-repo", () => ({ getStack: (...a: unknown[]) => getStack(...a) }));
vi.mock("@/lib/db/stack-item-repo", () => ({
  updateItem: (...a: unknown[]) => updateItem(...a),
  deleteItem: (...a: unknown[]) => deleteItem(...a),
}));

import { DELETE, PUT } from "./route";

function ctx(id = "s1", itemId = "i1") {
  return { params: Promise.resolve({ id, itemId }) };
}
function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };

const ITEM: StackItem = {
  id: "i1",
  stackId: "s1",
  supplementId: "magnesium",
  customName: null,
  dose: 400,
  unit: "mg",
  timing: null,
  frequency: null,
  reason: null,
  notes: null,
};

const VALID_INPUT = { supplementId: "magnesium", dose: 400, unit: "mg" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PUT /api/stacks/:id/items/:itemId", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    getStack.mockResolvedValue({ id: "s1" });
    updateItem.mockResolvedValue(ITEM);

    const res = await PUT(req(VALID_INPUT), ctx());

    expect(res.status).toBe(401);
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("404s — and writes nothing — when the parent stack is not the caller's", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue(null);
    updateItem.mockResolvedValue(ITEM);

    const res = await PUT(req(VALID_INPUT), ctx("s-not-mine"));

    expect(res.status).toBe(404);
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body and writes nothing", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    updateItem.mockResolvedValue(ITEM);

    const res = await PUT(req({ dose: -1, unit: "mg" }), ctx());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("returns 200 and passes the item id straight through (see file header)", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    updateItem.mockResolvedValue(ITEM);

    const res = await PUT(req(VALID_INPUT), ctx("s1", "i-from-another-stack"));

    expect(res.status).toBe(200);
    // Documented, not endorsed: the item id is NOT re-checked against the stack.
    expect(updateItem).toHaveBeenCalledWith(
      {},
      "i-from-another-stack",
      expect.objectContaining({ dose: 400 }),
    );
  });
});

describe("DELETE /api/stacks/:id/items/:itemId", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    getStack.mockResolvedValue({ id: "s1" });
    deleteItem.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx());

    expect(res.status).toBe(401);
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("404s — and deletes nothing — when the parent stack is not the caller's", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue(null);
    deleteItem.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx("s-not-mine"));

    expect(res.status).toBe(404);
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("returns 200 with the removed item id", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    deleteItem.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "i1" });
    expect(deleteItem).toHaveBeenCalledWith({}, "i1");
  });
});
