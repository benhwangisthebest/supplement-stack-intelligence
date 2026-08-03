// Application — route-handler tests for /api/lab-markers (Phase 1 U3).
//
// Lab values are health data. Both handlers scope to `user.id`; the POST body
// carries no user id at all, so there is nothing for a caller to forge.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { LabMarker } from "@/types/profile";

const getUser = vi.fn();
const listLabMarkers = vi.fn();
const createLabMarker = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/lab-marker-repo", () => ({
  listLabMarkers: (...a: unknown[]) => listLabMarkers(...a),
  createLabMarker: (...a: unknown[]) => createLabMarker(...a),
}));

import { GET, POST } from "./route";

function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };

const MARKER: LabMarker = {
  id: "m1",
  userId: "u1",
  marker: "Vitamin D 25-OH",
  value: 22,
  unit: "ng/mL",
  referenceLow: 30,
  referenceHigh: 100,
  date: "2026-07-10",
  notes: null,
};

const VALID_INPUT = { marker: "Vitamin D 25-OH", value: 22, unit: "ng/mL" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/lab-markers", () => {
  it("returns 401 without reading any markers", async () => {
    getUser.mockResolvedValue(null);
    listLabMarkers.mockResolvedValue([MARKER]);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(listLabMarkers).not.toHaveBeenCalled();
  });

  it("returns 200 with the caller's own markers", async () => {
    getUser.mockResolvedValue(USER);
    listLabMarkers.mockResolvedValue([MARKER]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([MARKER]);
    expect(listLabMarkers).toHaveBeenCalledWith({}, "u1");
  });
});

describe("POST /api/lab-markers", () => {
  it("returns 401 and writes nothing", async () => {
    getUser.mockResolvedValue(null);
    createLabMarker.mockResolvedValue(MARKER);

    const res = await POST(req(VALID_INPUT));

    expect(res.status).toBe(401);
    expect(createLabMarker).not.toHaveBeenCalled();
  });

  it("returns 400 when the reference range is inverted", async () => {
    getUser.mockResolvedValue(USER);
    createLabMarker.mockResolvedValue(MARKER);

    // The schema's `.refine` rejects high < low — a cross-field rule that a
    // per-field check would miss.
    const res = await POST(req({ ...VALID_INPUT, referenceLow: 100, referenceHigh: 30 }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(createLabMarker).not.toHaveBeenCalled();
  });

  it("returns 201 and creates under the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    createLabMarker.mockResolvedValue(MARKER);

    const res = await POST(req(VALID_INPUT));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toEqual(MARKER);
    expect(createLabMarker).toHaveBeenCalledWith(
      {},
      "u1",
      expect.objectContaining({ marker: "Vitamin D 25-OH", value: 22 }),
    );
  });
});
