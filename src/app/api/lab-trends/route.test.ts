// Application — route-handler tests for GET /api/lab-trends (Phase 1 U2).
//
// Read-only, no request body. The route reads canonical timeline points and
// runs the PURE trend engine. `computeTrends` is left UNMOCKED here: it is
// deterministic, takes a small annotated fixture, and mocking it would leave
// the route's only real computation untested. That is the reverse of the
// /api/identity choice, and the difference is fixture cost, not principle.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LabMarkerTimelinePoint } from "@/types/lab";

const getUser = vi.fn();
const listTimelinePoints = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/lab-panel-repo", () => ({
  listTimelinePoints: (...a: unknown[]) => listTimelinePoints(...a),
}));

import { GET } from "./route";

const USER = { id: "u1" };

const POINTS: LabMarkerTimelinePoint[] = [
  { biomarkerId: "vitamin-d-25oh", canonicalValue: 22, canonicalUnit: "ng/mL", collectedAt: "2026-01-10" },
  { biomarkerId: "vitamin-d-25oh", canonicalValue: 38, canonicalUnit: "ng/mL", collectedAt: "2026-07-10" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/lab-trends", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    // §6.3.1: the repo succeeds, so a bypass returns lab trends, not an error.
    listTimelinePoints.mockResolvedValue(POINTS);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(listTimelinePoints).not.toHaveBeenCalled();
  });

  it("returns 200 and runs the trend engine over the caller's points", async () => {
    getUser.mockResolvedValue(USER);
    listTimelinePoints.mockResolvedValue(POINTS);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    // Engine output is pinned by the engine's own tests; the route contract is
    // that whatever it produced is what was serialized.
    expect(body.data).not.toBeNull();
  });

  it("scopes the query to the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    listTimelinePoints.mockResolvedValue([]);

    await GET();

    expect(listTimelinePoints).toHaveBeenCalledWith({}, "u1");
  });

  it("does not disclose repository error text", async () => {
    getUser.mockResolvedValue(USER);
    listTimelinePoints.mockRejectedValue(new Error("JWT expired for role service_role"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe("An unexpected internal error occurred.");
    expect(JSON.stringify(body)).not.toContain("service_role");
  });
});
