// Application — route-handler tests for GET /api/stacks/:id/compare (Phase 1 U2).
//
// Read-only, no request body, but it takes a route param — and that param is
// the interesting part. `getStack(supabase, user.id, id)` is scoped to the
// CALLER, so a stack belonging to someone else is indistinguishable from one
// that does not exist: both 404. That is the correct behaviour (a 403 would
// confirm the stack exists), and it is pinned here so it cannot be "improved"
// into an existence oracle.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const getStack = vi.fn();
const listItems = vi.fn();
const getProfile = vi.fn();
const compareFromProfile = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/stack-repo", () => ({ getStack: (...a: unknown[]) => getStack(...a) }));
vi.mock("@/lib/db/stack-item-repo", () => ({ listItems: (...a: unknown[]) => listItems(...a) }));
vi.mock("@/lib/db/profile-repo", () => ({ getProfile: (...a: unknown[]) => getProfile(...a) }));
vi.mock("@/lib/compare", () => ({
  compareFromProfile: (...a: unknown[]) => compareFromProfile(...a),
}));

import { GET } from "./route";

const USER = { id: "u1" };
const RESULT = { covered: [], gaps: [] };

function ctx(id = "s1") {
  return { params: Promise.resolve({ id }) };
}

/** The whole happy path — installed by the 401 test too, per §6.3.1. */
function arrangeSuccess() {
  getStack.mockResolvedValue({ id: "s1" });
  listItems.mockResolvedValue([]);
  getProfile.mockResolvedValue({ goals: [] });
  compareFromProfile.mockReturnValue(RESULT);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/stacks/:id/compare", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    arrangeSuccess();

    const res = await GET(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(getStack).not.toHaveBeenCalled();
    expect(listItems).not.toHaveBeenCalled();
  });

  it("returns 200 with the comparison for an owned stack", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await GET(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(RESULT);
  });

  it("looks the stack up under the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    await GET(new Request("http://localhost"), ctx("s-other"));

    expect(getStack).toHaveBeenCalledWith({}, "u1", "s-other");
  });

  it("404s — and reads nothing further — for a stack the caller does not own", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();
    getStack.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), ctx("s-not-mine"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    // No item or profile read may happen for a stack that failed the ownership
    // check — otherwise the 404 is cosmetic and the data was still fetched.
    expect(listItems).not.toHaveBeenCalled();
    expect(getProfile).not.toHaveBeenCalled();
  });
});
