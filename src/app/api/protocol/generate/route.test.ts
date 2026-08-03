// Application — route-handler tests for POST /api/protocol/generate (Phase 1 U3).
//
// This is the widest fan-in route in the application: five repository reads
// feed one pure generator. Four of the five are scoped to `user.id` and the
// fifth to the VERIFIED stack id — the test below asserts all five, because a
// single unscoped read here would mix another user's health context into a
// generated protocol.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getUser = vi.fn();
const getStack = vi.fn();
const listItems = vi.fn();
const getProfile = vi.fn();
const listLabMarkers = vi.fn();
const listTimelinePoints = vi.fn();
const listCheckins = vi.fn();
const generateProtocol = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/stack-repo", () => ({ getStack: (...a: unknown[]) => getStack(...a) }));
vi.mock("@/lib/db/stack-item-repo", () => ({ listItems: (...a: unknown[]) => listItems(...a) }));
vi.mock("@/lib/db/profile-repo", () => ({ getProfile: (...a: unknown[]) => getProfile(...a) }));
vi.mock("@/lib/db/lab-marker-repo", () => ({
  listLabMarkers: (...a: unknown[]) => listLabMarkers(...a),
}));
vi.mock("@/lib/db/lab-panel-repo", () => ({
  listTimelinePoints: (...a: unknown[]) => listTimelinePoints(...a),
}));
vi.mock("@/lib/db/checkin-repo", () => ({
  listCheckins: (...a: unknown[]) => listCheckins(...a),
}));
vi.mock("@/lib/protocol-builder", () => ({
  generateProtocol: (...a: unknown[]) => generateProtocol(...a),
}));

import { POST } from "./route";

function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };
const STACK_ID = "11111111-2222-4333-8444-555555555555";
const RESULT = { groups: [] };

function arrangeSuccess() {
  getStack.mockResolvedValue({ id: STACK_ID });
  listItems.mockResolvedValue([]);
  getProfile.mockResolvedValue({ goals: [] });
  listLabMarkers.mockResolvedValue([]);
  listTimelinePoints.mockResolvedValue([]);
  listCheckins.mockResolvedValue([]);
  generateProtocol.mockReturnValue(RESULT);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/protocol/generate", () => {
  it("returns 401 without generating anything", async () => {
    getUser.mockResolvedValue(null);
    arrangeSuccess();

    const res = await POST(req({ stackId: STACK_ID }));

    expect(res.status).toBe(401);
    expect(generateProtocol).not.toHaveBeenCalled();
    expect(getProfile).not.toHaveBeenCalled();
  });

  it("returns 400 when stackId is not a uuid", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await POST(req({ stackId: "42" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(getStack).not.toHaveBeenCalled();
  });

  it("404s before reading any health context, for an unowned stack", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();
    getStack.mockResolvedValue(null);

    const res = await POST(req({ stackId: STACK_ID }));

    expect(res.status).toBe(404);
    expect(listLabMarkers).not.toHaveBeenCalled();
    expect(listCheckins).not.toHaveBeenCalled();
    expect(generateProtocol).not.toHaveBeenCalled();
  });

  it("returns 200 and scopes every one of the five reads to the caller", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await POST(req({ stackId: STACK_ID }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(RESULT);
    expect(getProfile).toHaveBeenCalledWith({}, "u1");
    expect(listLabMarkers).toHaveBeenCalledWith({}, "u1");
    expect(listTimelinePoints).toHaveBeenCalledWith({}, "u1");
    expect(listCheckins).toHaveBeenCalledWith({}, "u1");
    // Items come from the ownership-verified stack id, not from the caller.
    expect(listItems).toHaveBeenCalledWith({}, STACK_ID);
  });
});
