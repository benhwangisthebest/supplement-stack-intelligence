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

function ctx(id = "e8bc163c-82ee-4187-8328-8c7d4ac636db", itemId = "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903") {
  return { params: Promise.resolve({ id, itemId }) };
}
function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };

const ITEM: StackItem = {
  id: "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903",
  stackId: "e8bc163c-82ee-4187-8328-8c7d4ac636db",
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
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    updateItem.mockResolvedValue(ITEM);

    const res = await PUT(req(VALID_INPUT), ctx());

    expect(res.status).toBe(401);
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("404s — and writes nothing — when the parent stack is not the caller's", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue(null);
    updateItem.mockResolvedValue(ITEM);

    const res = await PUT(req(VALID_INPUT), ctx("7f4677b2-c82f-4acd-8f79-1ef550d473e5"));

    expect(res.status).toBe(404);
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body and writes nothing", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
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
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    listItems.mockResolvedValue([ITEM]);

    const res = await PUT(req({ dose: -1, unit: "mg" }), ctx("e8bc163c-82ee-4187-8328-8c7d4ac636db", "6564e498-a5a1-4253-8fab-f0663357eff3"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("returns 200 for an item that IS in the verified stack", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    listItems.mockResolvedValue([ITEM]);
    updateItem.mockResolvedValue(ITEM);

    const res = await PUT(req(VALID_INPUT), ctx("e8bc163c-82ee-4187-8328-8c7d4ac636db", "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903"));

    expect(res.status).toBe(200);
    expect(updateItem).toHaveBeenCalledWith({}, "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903", expect.objectContaining({ dose: 400 }));
  });

  it("404s — writing nothing — for an item that is NOT in the verified stack (U19)", async () => {
    // The behaviour change. Before U19 this returned 200 and updated the
    // foreign item; RLS stopped it only when the item's owner differed.
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    listItems.mockResolvedValue([ITEM]); // the stack contains i1, not the target

    const res = await PUT(req(VALID_INPUT), ctx("e8bc163c-82ee-4187-8328-8c7d4ac636db", "6564e498-a5a1-4253-8fab-f0663357eff3"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(updateItem).not.toHaveBeenCalled();
  });

  it("checks membership against the stack from the PATH, not one from the body", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    listItems.mockResolvedValue([ITEM]);
    updateItem.mockResolvedValue(ITEM);

    await PUT(req({ ...VALID_INPUT, stackId: "s-other" }), ctx("e8bc163c-82ee-4187-8328-8c7d4ac636db", "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903"));

    expect(listItems).toHaveBeenCalledWith({}, "e8bc163c-82ee-4187-8328-8c7d4ac636db");
  });
});

describe("DELETE /api/stacks/:id/items/:itemId", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    deleteItem.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx());

    expect(res.status).toBe(401);
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("404s — and deletes nothing — when the parent stack is not the caller's", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue(null);
    deleteItem.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx("7f4677b2-c82f-4acd-8f79-1ef550d473e5"));

    expect(res.status).toBe(404);
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("returns 200 with the removed item id", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    listItems.mockResolvedValue([ITEM]);
    deleteItem.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903" });
    expect(deleteItem).toHaveBeenCalledWith({}, "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903");
  });

  it("404s — deleting nothing — for an item that is NOT in the verified stack (U19)", async () => {
    // The more dangerous half of the behaviour change: before U19 this deleted
    // the foreign item outright, and a delete has no inverse to offer the user.
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    listItems.mockResolvedValue([ITEM]);
    deleteItem.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx("e8bc163c-82ee-4187-8328-8c7d4ac636db", "6564e498-a5a1-4253-8fab-f0663357eff3"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("reports the same status, code, message AND byte length for a foreign stack and a foreign item (FU-28)", async () => {
    // Both answer 404 with the same code — and, since Phase 2 U12, the same
    // `error.message` and the same body length. Until U12 the message DID
    // differ ("Stack not found." vs "Item not found."), by one byte of
    // Content-Length as well as by text, and this test did not pin it; its
    // title had claimed "identically" until Phase 1 closeout narrowed the title
    // to match the assertion. U12 widened the assertion to match the original
    // claim instead. Byte length is asserted separately from message equality
    // on purpose: it is the property an on-the-wire observer sees, and a future
    // refactor that kept the message but added a per-branch `details` field
    // would pass a message-only pin.
    getUser.mockResolvedValue(USER);
    listItems.mockResolvedValue([ITEM]);

    getStack.mockResolvedValue(null);
    const foreignStack = await DELETE(new Request("http://localhost"), ctx("7f4677b2-c82f-4acd-8f79-1ef550d473e5", "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903"));

    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    const foreignItem = await DELETE(new Request("http://localhost"), ctx("e8bc163c-82ee-4187-8328-8c7d4ac636db", "6dea0405-cf9d-4091-8935-ae0b932f89c6"));

    const stackText = await foreignStack.text();
    const itemText = await foreignItem.text();
    const stackBody = JSON.parse(stackText);
    const itemBody = JSON.parse(itemText);

    expect(foreignStack.status).toBe(foreignItem.status);
    expect(stackBody.error.code).toBe(itemBody.error.code);
    expect(stackBody.error.message).toBe(itemBody.error.message);
    expect(Buffer.byteLength(stackText, "utf8")).toBe(Buffer.byteLength(itemText, "utf8"));
  });

  it("answers the same message on PUT as on DELETE for both branches (FU-28)", async () => {
    // The pair exists twice — once per handler. A fix applied to DELETE alone
    // would leave PUT as the oracle it was.
    getUser.mockResolvedValue(USER);
    listItems.mockResolvedValue([ITEM]);
    const body = () =>
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ supplementId: "magnesium", dose: 200, unit: "mg" }),
        headers: { "content-type": "application/json" },
      }) as unknown as NextRequest;

    getStack.mockResolvedValue(null);
    const putStack = (await (await PUT(body(), ctx("7f4677b2-c82f-4acd-8f79-1ef550d473e5", "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903"))).json()).error.message;
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    const putItem = (await (await PUT(body(), ctx("e8bc163c-82ee-4187-8328-8c7d4ac636db", "6dea0405-cf9d-4091-8935-ae0b932f89c6"))).json()).error.message;
    getStack.mockResolvedValue(null);
    const delStack = (await (await DELETE(new Request("http://localhost"), ctx("7f4677b2-c82f-4acd-8f79-1ef550d473e5", "4cd9b767-2d7f-4ee8-8b51-fb1e049f6903"))).json()).error.message;
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    const delItem = (await (await DELETE(new Request("http://localhost"), ctx("e8bc163c-82ee-4187-8328-8c7d4ac636db", "6dea0405-cf9d-4091-8935-ae0b932f89c6"))).json()).error.message;

    // All four call sites — two branches × two handlers — in one assertion, so
    // the title claims no more than this test alone establishes.
    expect(new Set([putStack, putItem, delStack, delItem]).size).toBe(1);
  });
});

describe("U30 — a malformed path id is a 400, not a 500 (N-51)", () => {
  // The id never reaches Postgres: `uuidParam` decides from the string, before
  // any I/O. That ordering is the reason a syntactic 400 is not an existence
  // oracle — nothing was looked up to produce it. A WELL-FORMED id that is
  // foreign or absent still answers 404, byte-identical (U29's property).

  it("PUT — malformed `id` answers 400 VALIDATION_ERROR", async () => {
    const res = await PUT(req(VALID_INPUT), ctx("not-a-uuid"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("PUT — malformed `itemId` answers 400 VALIDATION_ERROR", async () => {
    const res = await PUT(req(VALID_INPUT), ctx(undefined, "not-a-uuid"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("DELETE — malformed `id` answers 400 VALIDATION_ERROR", async () => {
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), ctx("not-a-uuid"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("DELETE — malformed `itemId` answers 400 VALIDATION_ERROR", async () => {
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), ctx(undefined, "not-a-uuid"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
