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

function ctx(id = "s1") {
  return { params: Promise.resolve({ id }) };
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
    getStack.mockResolvedValue({ id: "s1" });
    addItem.mockResolvedValue(ITEM);

    const res = await POST(req(VALID_INPUT), ctx());

    expect(res.status).toBe(401);
    expect(addItem).not.toHaveBeenCalled();
  });

  it("404s — and writes nothing — for a stack the caller does not own", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue(null);
    addItem.mockResolvedValue(ITEM);

    const res = await POST(req(VALID_INPUT), ctx("s-not-mine"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(addItem).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive dose and writes nothing", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    addItem.mockResolvedValue(ITEM);

    const res = await POST(req({ supplementId: "magnesium", dose: 0, unit: "mg" }), ctx());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(addItem).not.toHaveBeenCalled();
  });

  it("returns 201 and writes to the stack id from the PATH", async () => {
    getUser.mockResolvedValue(USER);
    getStack.mockResolvedValue({ id: "s1" });
    addItem.mockResolvedValue(ITEM);

    // The body carries a different stackId; it must be ignored.
    const res = await POST(req({ ...VALID_INPUT, stackId: "s-someone-else" }), ctx("s1"));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toEqual(ITEM);
    expect(addItem).toHaveBeenCalledWith({}, "s1", expect.objectContaining({ dose: 200 }));
  });
});
