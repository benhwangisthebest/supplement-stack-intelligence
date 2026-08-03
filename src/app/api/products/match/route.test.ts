// Application — route-handler tests for POST /api/products/match (Phase 1 U3).
//
// CLAUDE.md §2.4 rule 17 requires ranking to be provably independent of
// affiliate data, enforced structurally. That guarantee lives in
// `lib/product-matcher`, which has its own tests; what this file pins is the
// ROUTE contract — auth, validation, stack ownership, and that the matcher is
// handed the caller's own profile and the verified stack's items.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getUser = vi.fn();
const getStack = vi.fn();
const listItems = vi.fn();
const getProfile = vi.fn();
const matchProducts = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/stack-repo", () => ({ getStack: (...a: unknown[]) => getStack(...a) }));
vi.mock("@/lib/db/stack-item-repo", () => ({ listItems: (...a: unknown[]) => listItems(...a) }));
vi.mock("@/lib/db/profile-repo", () => ({ getProfile: (...a: unknown[]) => getProfile(...a) }));
vi.mock("@/lib/product-matcher", () => ({
  matchProducts: (...a: unknown[]) => matchProducts(...a),
}));

import { POST } from "./route";

function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };
const STACK_ID = "11111111-2222-4333-8444-555555555555";
const RESULT = { matches: [] };

function arrangeSuccess() {
  getStack.mockResolvedValue({ id: STACK_ID });
  listItems.mockResolvedValue([]);
  getProfile.mockResolvedValue({ allergies: [] });
  matchProducts.mockReturnValue(RESULT);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/products/match", () => {
  it("returns 401 without matching anything", async () => {
    getUser.mockResolvedValue(null);
    arrangeSuccess();

    const res = await POST(req({ stackId: STACK_ID }));

    expect(res.status).toBe(401);
    expect(matchProducts).not.toHaveBeenCalled();
  });

  it("returns 400 when stackId is not a uuid", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await POST(req({ stackId: "not-a-uuid" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(getStack).not.toHaveBeenCalled();
  });

  it("404s — reading no items or profile — for a stack the caller does not own", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();
    getStack.mockResolvedValue(null);

    const res = await POST(req({ stackId: STACK_ID }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(listItems).not.toHaveBeenCalled();
    expect(getProfile).not.toHaveBeenCalled();
  });

  it("returns 200 and matches against the caller's own profile", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await POST(req({ stackId: STACK_ID }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(RESULT);
    expect(getStack).toHaveBeenCalledWith({}, "u1", STACK_ID);
    expect(getProfile).toHaveBeenCalledWith({}, "u1");
    expect(matchProducts).toHaveBeenCalledWith({ stackItems: [], profile: { allergies: [] } });
  });
});
