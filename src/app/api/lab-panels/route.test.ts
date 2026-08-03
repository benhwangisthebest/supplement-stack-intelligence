// Application — route-handler tests for GET /api/lab-panels (Phase 1 U2).
//
// Read-only, no request body. Lab panels are health data (CLAUDE.md §2.3 rule
// 15), so the auth boundary here is not a formality: a missing check would
// serve one user's panels to any caller.
//
// Structural note for later units: this route places its auth check INSIDE
// `handle(...)`, unlike /api/checkins which checks before entering. Both are
// correct — `handle` passes a returned NextResponse straight through — but it
// changes what a deleted guard produces (a caught 500 rather than an uncaught
// one). See plan §6.2.1.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LabPanel } from "@/types/lab";

const getUser = vi.fn();
const listPanels = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/lab-panel-repo", () => ({
  listPanels: (...a: unknown[]) => listPanels(...a),
}));

import { GET } from "./route";

const USER = { id: "u1" };

// Annotated — the U1 lesson. An unannotated literal here would let invented
// fields compile and only fail at runtime.
const PANEL: LabPanel = {
  id: "p1",
  userId: "u1",
  source: "manual",
  collectedAt: "2026-08-01",
  createdAt: "2026-08-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/lab-panels", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    // §6.3.1: the repo succeeds, so a bypass leaks panels rather than crashing.
    listPanels.mockResolvedValue([PANEL]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(listPanels).not.toHaveBeenCalled();
  });

  it("returns 200 with the caller's panels", async () => {
    getUser.mockResolvedValue(USER);
    listPanels.mockResolvedValue([PANEL]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual([PANEL]);
  });

  it("scopes the query to the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    listPanels.mockResolvedValue([]);

    await GET();

    expect(listPanels).toHaveBeenCalledWith({}, "u1");
  });

  it("does not disclose repository error text", async () => {
    getUser.mockResolvedValue(USER);
    listPanels.mockRejectedValue(new Error('relation "lab_panels" does not exist'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe("An unexpected internal error occurred.");
    expect(JSON.stringify(body)).not.toContain("lab_panels");
  });
});
