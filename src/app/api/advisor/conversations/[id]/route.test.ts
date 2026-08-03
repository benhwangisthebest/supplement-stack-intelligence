// Application — route-handler tests for GET /api/advisor/conversations/:id (Phase 1 U4).
//
// FINDING pinned, not fixed (outside U4's scope): this handler passes the path
// id to `getMessages` WITHOUT any ownership lookup. The route file says so
// itself — it relies on migration 0003's RLS to scope messages to the owner, so
// a foreign id yields an empty list rather than another user's history.
//
// That is the same shape as the stack-item gap in §6.1.1 of the plan: a route
// with no ownership property of its own, borrowing one from the database. It is
// not a live vulnerability — but anything reading these rows through a path
// where RLS does not apply inherits no protection.
//
// The last test pins the pass-through explicitly so the reliance is visible in
// the test suite, not only in a comment.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdvisorMessage } from "@/types/advisor";

const getUser = vi.fn();
const getMessages = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/advisor/repo", () => ({
  getMessages: (...a: unknown[]) => getMessages(...a),
}));

import { GET } from "./route";

function ctx(id = "c1") {
  return { params: Promise.resolve({ id }) };
}

const USER = { id: "u1" };

const MESSAGE: AdvisorMessage = {
  id: "m1",
  conversationId: "c1",
  role: "assistant",
  content: "Magnesium glycinate has evidence for sleep onset.",
  citations: [],
  createdAt: "2026-08-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/advisor/conversations/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    // §6.3.1: the repo succeeds, so a bypass returns transcript content.
    getMessages.mockResolvedValue([MESSAGE]);

    const res = await GET(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(getMessages).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("Magnesium glycinate");
  });

  it("returns 200 with the conversation's messages", async () => {
    getUser.mockResolvedValue(USER);
    getMessages.mockResolvedValue([MESSAGE]);

    const res = await GET(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual([MESSAGE]);
  });

  it("returns 200 with an empty list rather than an error for a foreign id", async () => {
    // The documented RLS behaviour: no row matches, so the list is empty. A 404
    // here would be an existence oracle for another user's conversation.
    getUser.mockResolvedValue(USER);
    getMessages.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost"), ctx("c-someone-else"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("passes the path id straight through — ownership is RLS's job here", async () => {
    getUser.mockResolvedValue(USER);
    getMessages.mockResolvedValue([]);

    await GET(new Request("http://localhost"), ctx("c-someone-else"));

    // Documented, not endorsed (see file header). Note the caller's id is NOT
    // passed: there is no route-level ownership check to break.
    expect(getMessages).toHaveBeenCalledWith({}, "c-someone-else");
  });

  it("does not disclose repository error text", async () => {
    getUser.mockResolvedValue(USER);
    getMessages.mockRejectedValue(new Error("JWT expired for role service_role"));

    const res = await GET(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe("An unexpected internal error occurred.");
    expect(JSON.stringify(body)).not.toContain("service_role");
  });
});
