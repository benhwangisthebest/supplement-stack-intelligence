// Application — route-handler tests for /api/stacks/:id/items/:itemId (Phase 1 U3).
//
// HISTORY, kept because it explains the shape of the tests below.
//
// U3 found that both handlers verified ownership of the STACK
// (`getStack(supabase, user.id, id)`) and then acted on `itemId` WITHOUT
// checking that the item belonged to that stack. It pinned that behaviour
// rather than changing it — a finding recorded, not absorbed — noting that
// migration 0001's `own_stack_items` policy blocked cross-USER writes via
// `auth.uid()`, leaving only same-user cross-STACK editing reachable.
//
// **U19 closed it (2026-08-04).** The route now checks item→stack membership
// itself and answers 404 on mismatch. The old pass-through pin is REPLACED
// below by its inverse: `updateItem`/`deleteItem` must NOT be reached for an
// item that is not in the verified stack.
//
// The policy was re-read directly for U19 rather than trusted via
// RLS_COVERAGE, which checks only that a policy exists (plan FU-6): it is
// `for all` with both `using` and `with check` derived from
// `exists (select 1 from public.stacks s where s.id = stack_items.stack_id and
// s.user_id = auth.uid())`. So RLS remains the second layer; U19 adds the
// first, per CLAUDE.md §4 rule 8.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { StackItem } from "@/types/stack";

const getUser = vi.fn();
const getStack = vi.fn();
const listItems = vi.fn();
const updateItem = vi.fn();
const deleteItem = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/stack-repo", () => ({ getStack: (...a: unknown[]) => getStack(...a) }));
vi.mock("@/lib/db/stack-item-repo", () => ({
  listItems: (...a: unknown[]) => listItems(...a),
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
    listItems.mockResolvedValue([ITEM]);
    updateItem.mockResolvedValue(ITEM);

    const res = await PUT(req({ dose: -1, unit: "mg" }), ctx());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("checks membership BEFORE parsing the body (U19)", async () => {
    // Same ordering property the sibling stacks/[id] PUT pins: an
    // ownership-class check must precede validation, or a 400 confirms to an
    // outsider that the item exists. A malformed body against a foreign item
    // must still be 404, never 400.
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    listItems.mockResolvedValue([ITEM]);

    const res = await PUT(req({ dose: -1, unit: "mg" }), ctx("s1", "i-from-another-stack"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("returns 200 for an item that IS in the verified stack", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    listItems.mockResolvedValue([ITEM]);
    updateItem.mockResolvedValue(ITEM);

    const res = await PUT(req(VALID_INPUT), ctx("s1", "i1"));

    expect(res.status).toBe(200);
    expect(updateItem).toHaveBeenCalledWith({}, "i1", expect.objectContaining({ dose: 400 }));
  });

  it("404s — writing nothing — for an item that is NOT in the verified stack (U19)", async () => {
    // The behaviour change. Before U19 this returned 200 and updated the
    // foreign item; RLS stopped it only when the item's owner differed.
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    listItems.mockResolvedValue([ITEM]); // the stack contains i1, not the target

    const res = await PUT(req(VALID_INPUT), ctx("s1", "i-from-another-stack"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("checks membership against the stack from the PATH, not one from the body", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    listItems.mockResolvedValue([ITEM]);
    updateItem.mockResolvedValue(ITEM);

    await PUT(req({ ...VALID_INPUT, stackId: "s-other" }), ctx("s1", "i1"));

    expect(listItems).toHaveBeenCalledWith({}, "s1");
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
    listItems.mockResolvedValue([ITEM]);
    deleteItem.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "i1" });
    expect(deleteItem).toHaveBeenCalledWith({}, "i1");
  });

  it("404s — deleting nothing — for an item that is NOT in the verified stack (U19)", async () => {
    // The more dangerous half of the behaviour change: before U19 this deleted
    // the foreign item outright, and a delete has no inverse to offer the user.
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    listItems.mockResolvedValue([ITEM]);
    deleteItem.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx("s1", "i-from-another-stack"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("reports the same status and NOT_FOUND code for a foreign stack and a foreign item", async () => {
    // Both answer 404 with the same error code, so neither the status nor the
    // code is an existence oracle. NOTE (FU-28): the human-readable
    // `error.message` DOES still differ — "Stack not found." vs "Item not
    // found." — and this test does not pin it. The title used to claim the two
    // were reported "identically", which was stronger than what is asserted
    // here; corrected at Phase 1 closeout rather than left overstated.
    getUser.mockResolvedValue(USER);
    listItems.mockResolvedValue([ITEM]);

    getStack.mockResolvedValue(null);
    const foreignStack = await DELETE(new Request("http://localhost"), ctx("s-not-mine", "i1"));

    getStack.mockResolvedValue({ id: "s1" });
    const foreignItem = await DELETE(new Request("http://localhost"), ctx("s1", "i-nope"));

    expect(foreignStack.status).toBe(foreignItem.status);
    expect((await foreignStack.json()).error.code).toBe((await foreignItem.json()).error.code);
  });
});
