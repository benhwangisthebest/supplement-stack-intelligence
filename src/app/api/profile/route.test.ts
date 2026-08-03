// Application — route-handler tests for /api/profile (Phase 1 U3).
//
// The profile holds medications, allergies, and conditions — the most
// sensitive data this application stores (CLAUDE.md §2.3 rule 15). The 401
// tests below mock the repository to SUCCEED precisely so that a missing auth
// check shows up as a 200 carrying that data, not as an incidental crash.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { UserProfile } from "@/types/profile";

const getUser = vi.fn();
const getProfile = vi.fn();
const upsertProfile = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/profile-repo", () => ({
  getProfile: (...a: unknown[]) => getProfile(...a),
  upsertProfile: (...a: unknown[]) => upsertProfile(...a),
}));

import { GET, PUT } from "./route";

function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };

const PROFILE: UserProfile = {
  id: "p1",
  userId: "u1",
  goals: ["sleep"],
  diet: null,
  riskTolerance: "moderate",
  allergies: ["shellfish"],
  medications: ["warfarin"],
  avoidedIngredients: [],
  formPreferences: [],
  caffeineSensitivity: null,
  experienceLevel: null,
  notes: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/profile", () => {
  it("returns 401 without reading any health data", async () => {
    getUser.mockResolvedValue(null);
    getProfile.mockResolvedValue(PROFILE);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(getProfile).not.toHaveBeenCalled();
    // Belt and braces: the medication list must not appear anywhere.
    expect(JSON.stringify(body)).not.toContain("warfarin");
  });

  it("returns 200 with the caller's own profile", async () => {
    getUser.mockResolvedValue(USER);
    getProfile.mockResolvedValue(PROFILE);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(PROFILE);
    expect(getProfile).toHaveBeenCalledWith({}, "u1");
  });
});

describe("PUT /api/profile", () => {
  it("returns 401 and writes nothing", async () => {
    getUser.mockResolvedValue(null);
    upsertProfile.mockResolvedValue(PROFILE);

    const res = await PUT(req({ goals: ["sleep"] }));

    expect(res.status).toBe(401);
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  it("returns 400 and writes nothing for an invalid body", async () => {
    getUser.mockResolvedValue(USER);
    upsertProfile.mockResolvedValue(PROFILE);

    const res = await PUT(req({ goals: ["not-a-goal"], riskTolerance: "extreme" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  it("returns 200 and upserts under the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    upsertProfile.mockResolvedValue(PROFILE);

    const res = await PUT(req({ goals: ["sleep"], medications: ["warfarin"] }));

    expect(res.status).toBe(200);
    expect(upsertProfile).toHaveBeenCalledWith(
      {},
      "u1",
      expect.objectContaining({ goals: ["sleep"], medications: ["warfarin"] }),
    );
  });
});
