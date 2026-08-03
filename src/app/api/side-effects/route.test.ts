// Application — route-handler tests for GET /api/side-effects (Phase 1 U2).
//
// Read-only; the only input is a `days` query parameter. Writes go through
// POST /api/checkins, so this file covers the read boundary only.
//
// The `days` handling is worth pinning: `Number(...) || 90` means any
// unparseable value silently becomes 90 rather than erroring. That is a
// deliberate read-path default, and pinning it stops a later "tidy-up" from
// turning a malformed query string into a 500.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { SideEffectReport } from "@/types/side-effect";

const getUser = vi.fn();
const listSideEffectReports = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/side-effect-repo", () => ({
  listSideEffectReports: (...a: unknown[]) => listSideEffectReports(...a),
}));

import { GET } from "./route";

/** The handler reads only `.url`. */
function req(url: string): NextRequest {
  return { url } as unknown as NextRequest;
}

const USER = { id: "u1" };

const REPORT: SideEffectReport = {
  id: "r1",
  userId: "u1",
  date: "2026-08-01",
  effectLabel: "nausea",
  severity: 2,
  createdAt: "2026-08-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/side-effects", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    // §6.3.1: the repo succeeds, so a bypass would serve another user's
    // health reports with a 200 — the failure this test exists to catch.
    listSideEffectReports.mockResolvedValue([REPORT]);

    const res = await GET(req("http://localhost/api/side-effects"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(listSideEffectReports).not.toHaveBeenCalled();
  });

  it("returns 200 with the caller's reports", async () => {
    getUser.mockResolvedValue(USER);
    listSideEffectReports.mockResolvedValue([REPORT]);

    const res = await GET(req("http://localhost/api/side-effects"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.reports).toEqual([REPORT]);
  });

  it("passes the caller's own id, never one supplied in the query string", async () => {
    getUser.mockResolvedValue(USER);
    listSideEffectReports.mockResolvedValue([]);

    await GET(req("http://localhost/api/side-effects?days=30&userId=someone-else"));

    expect(listSideEffectReports).toHaveBeenCalledWith({}, "u1", 30);
  });

  it("defaults to 90 days when `days` is absent or unparseable", async () => {
    getUser.mockResolvedValue(USER);
    listSideEffectReports.mockResolvedValue([]);

    await GET(req("http://localhost/api/side-effects"));
    expect(listSideEffectReports).toHaveBeenLastCalledWith({}, "u1", 90);

    await GET(req("http://localhost/api/side-effects?days=abc"));
    expect(listSideEffectReports).toHaveBeenLastCalledWith({}, "u1", 90);
  });
});
