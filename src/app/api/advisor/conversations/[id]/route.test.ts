// Application — route-handler tests for GET /api/advisor/conversations/:id
// (Phase 1 U4, ownership added by U21).
//
// HISTORY — U4 pinned a FINDING here rather than fixing it, because the fix was
// outside U4's scope. The header then read: "this handler passes the path id to
// `getMessages` WITHOUT any ownership lookup … it relies on migration 0003's RLS
// to scope messages to the owner, so a foreign id yields an empty list rather
// than another user's history", the same shape as the stack-item gap in §6.1.1.
//
// U21 fixed it. The route now checks ownership itself, and the two tests that
// pinned the old behaviour are rewritten below rather than deleted — the change
// they record is a DELIBERATE behaviour change (empty 200 → 404), and a silently
// replaced pin would leave no evidence that it was ever considered:
//
//   * "returns 200 with an empty list … for a foreign id"  → now 404
//   * "passes the path id straight through"                → now asserts the
//     ownership call happens BEFORE `getMessages`, and that `getMessages` is not
//     reached at all when the check fails.
//
// U4's original argument for the empty 200 was that "a 404 here would be an
// existence oracle". That reasoning was wrong, and the correction is worth
// keeping: an oracle needs 404 and 403 to differ. Answering 404 to both "no such
// conversation" and "not yours" distinguishes nothing.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdvisorMessage } from "@/types/advisor";

const getUser = vi.fn();
const getMessages = vi.fn();
const conversationBelongsToUser = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/advisor/repo", () => ({
  getMessages: (...a: unknown[]) => getMessages(...a),
  conversationBelongsToUser: (...a: unknown[]) => conversationBelongsToUser(...a),
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
  // Default to OWNED, so every pre-existing pin keeps testing what it tested
  // before U21 rather than silently becoming a 404 test.
  conversationBelongsToUser.mockResolvedValue(true);
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

  it("returns 404 for a conversation the caller does not own", async () => {
    // U21's behaviour change, from an empty 200. §6.3.1's shape: the downstream
    // repo is configured to SUCCEED with real content, so a missing ownership
    // check returns 200 with another user's transcript instead of a quiet empty
    // list — the mutation has something to disclose.
    getUser.mockResolvedValue(USER);
    conversationBelongsToUser.mockResolvedValue(false);
    getMessages.mockResolvedValue([MESSAGE]);

    const res = await GET(new Request("http://localhost"), ctx("c-someone-else"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(getMessages).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("Magnesium glycinate");
  });

  it("checks ownership with the CALLER's id, not the path id alone", async () => {
    // The specific defect U21 fixed: the caller's id never reached the query, so
    // the route had no ownership property of its own. Asserting the argument
    // list pins that it does now — passing `id` twice would still pass a
    // "was it called" assertion.
    getUser.mockResolvedValue(USER);
    getMessages.mockResolvedValue([MESSAGE]);

    await GET(new Request("http://localhost"), ctx("c1"));

    expect(conversationBelongsToUser).toHaveBeenCalledWith({}, "u1", "c1");
  });

  it("does not fail open when the ownership check itself throws", async () => {
    // A thrown check must not fail open. `handle()` maps this to a 500, which is
    // the safe direction — pinned so a future refactor cannot quietly turn a
    // failed check into a granted one.
    getUser.mockResolvedValue(USER);
    conversationBelongsToUser.mockRejectedValue(new Error("connection reset by peer"));
    getMessages.mockResolvedValue([MESSAGE]);

    const res = await GET(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(getMessages).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("connection reset");
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
