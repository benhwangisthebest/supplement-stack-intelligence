// Application — route-handler tests for GET /api/advisor/conversations (Phase 1 U4).
//
// Read-only, no body. Conversation titles are derived from the user's own first
// message, so a listing leak exposes what someone asked the advisor — which is
// health context by another name (CLAUDE.md §2.3 rule 15).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdvisorConversation } from "@/types/advisor";

const getUser = vi.fn();
const listConversations = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/advisor/repo", () => ({
  listConversations: (...a: unknown[]) => listConversations(...a),
}));

import { GET } from "./route";

const USER = { id: "u1" };

const CONVERSATION: AdvisorConversation = {
  id: "c1",
  userId: "u1",
  title: "Magnesium and sleep",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/advisor/conversations", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    // §6.3.1: the repo succeeds, so a bypass returns another user's
    // conversation titles with a 200 rather than erroring.
    listConversations.mockResolvedValue([CONVERSATION]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(listConversations).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("Magnesium and sleep");
  });

  it("returns 200 with the caller's conversations", async () => {
    getUser.mockResolvedValue(USER);
    listConversations.mockResolvedValue([CONVERSATION]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual([CONVERSATION]);
  });

  it("scopes the listing to the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    listConversations.mockResolvedValue([]);

    await GET();

    expect(listConversations).toHaveBeenCalledWith({}, "u1");
  });

  it("does not disclose repository error text", async () => {
    getUser.mockResolvedValue(USER);
    listConversations.mockRejectedValue(new Error('relation "advisor_conversations" missing'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe("An unexpected internal error occurred.");
    expect(JSON.stringify(body)).not.toContain("advisor_conversations");
  });
});
