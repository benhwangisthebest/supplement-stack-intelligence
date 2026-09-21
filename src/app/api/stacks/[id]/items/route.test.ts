// Application — route-handler tests for POST /api/stacks/:id/items (Phase 1 U3).
//
// Adds an item to an owned stack. Ownership is checked before the body is
// parsed, and `addItem` receives the VERIFIED stack id from the path — not
// anything the body could carry — which is what stops an item being written
// into someone else's stack. Both are pinned below.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { StackItem } from "@/types/stack";

const getUser = vi.fn();
const getStack = vi.fn();
const addItem = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/stack-repo", () => ({ getStack: (...a: unknown[]) => getStack(...a) }));
vi.mock("@/lib/db/stack-item-repo", () => ({ addItem: (...a: unknown[]) => addItem(...a) }));

import { POST } from "./route";

function ctx(id = "e8bc163c-82ee-4187-8328-8c7d4ac636db") {
  return { params: Promise.resolve({ id }) };
}
function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };

const ITEM: StackItem = {
  id: "i1",
  stackId: "e8bc163c-82ee-4187-8328-8c7d4ac636db",
  supplementId: "magnesium",
  customName: null,
  dose: 200,
  unit: "mg",
  timing: "bedtime",
  frequency: "daily",
  reason: null,
  notes: null,
};

const VALID_INPUT = { supplementId: "magnesium", dose: 200, unit: "mg" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/stacks/:id/items", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    addItem.mockResolvedValue(ITEM);

    const res = await POST(req(VALID_INPUT), ctx());

    expect(res.status).toBe(401);
    expect(addItem).not.toHaveBeenCalled();
  });

  it("404s — and writes nothing — for a stack the caller does not own", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue(null);
    addItem.mockResolvedValue(ITEM);

    const res = await POST(req(VALID_INPUT), ctx("7f4677b2-c82f-4acd-8f79-1ef550d473e5"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(addItem).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive dose and writes nothing", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    addItem.mockResolvedValue(ITEM);

    const res = await POST(req({ supplementId: "magnesium", dose: 0, unit: "mg" }), ctx());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(addItem).not.toHaveBeenCalled();
  });

  it("returns 201 and writes to the stack id from the PATH", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "e8bc163c-82ee-4187-8328-8c7d4ac636db" });
    addItem.mockResolvedValue(ITEM);

    // The body carries a different stackId; it must be ignored.
    const res = await POST(req({ ...VALID_INPUT, stackId: "s-someone-else" }), ctx("e8bc163c-82ee-4187-8328-8c7d4ac636db"));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toEqual(ITEM);
    expect(addItem).toHaveBeenCalledWith({}, "e8bc163c-82ee-4187-8328-8c7d4ac636db", expect.objectContaining({ dose: 200 }));
  });
});

describe("U30 — a malformed path id is a 400, not a 500 (N-51)", () => {
  // The id never reaches Postgres: `uuidParam` decides from the string, before
  // any I/O. That ordering is the reason a syntactic 400 is not an existence
  // oracle — nothing was looked up to produce it. A WELL-FORMED id that is
  // foreign or absent still answers 404, byte-identical (U29's property).

  it("POST — malformed `id` answers 400 VALIDATION_ERROR", async () => {
    const res = await POST(req(VALID_INPUT), ctx("not-a-uuid"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
