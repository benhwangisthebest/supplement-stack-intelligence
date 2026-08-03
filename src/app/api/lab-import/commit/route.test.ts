// Application — route-handler tests for POST /api/lab-import/commit (Phase 1 U3).
//
// The confirm gate. `labCommitSchema` requires ≥1 marker, which is what makes
// the gate server-enforced rather than a UI convention — pinned below, because
// relaxing `.min(1)` would let an empty panel through silently.
//
// The schema also carries NO canonical fields: the repo recomputes
// biomarker_id and canonical value/unit. The last test pins that a client
// attempting to supply them does not get them forwarded.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getUser = vi.fn();
const createPanelWithMarkers = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/lab-panel-repo", () => ({
  createPanelWithMarkers: (...a: unknown[]) => createPanelWithMarkers(...a),
}));

import { POST } from "./route";

function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };
const RESULT = { panelId: "p1", markerCount: 1 };

const VALID_BODY = {
  collectedAt: "2026-08-01",
  source: "manual",
  markers: [{ rawLabel: "Vitamin D", value: 22, unit: "ng/mL" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/lab-import/commit", () => {
  it("returns 401 and persists nothing", async () => {
    getUser.mockResolvedValue(null);
    createPanelWithMarkers.mockResolvedValue(RESULT);

    const res = await POST(req(VALID_BODY));

    expect(res.status).toBe(401);
    expect(createPanelWithMarkers).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty marker list — the confirm gate, server-side", async () => {
    getUser.mockResolvedValue(USER);
    createPanelWithMarkers.mockResolvedValue(RESULT);

    const res = await POST(req({ ...VALID_BODY, markers: [] }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(createPanelWithMarkers).not.toHaveBeenCalled();
  });

  it("returns 201 and persists under the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    createPanelWithMarkers.mockResolvedValue(RESULT);

    const res = await POST(req(VALID_BODY));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toEqual(RESULT);
    expect(createPanelWithMarkers).toHaveBeenCalledWith(
      {},
      "u1",
      expect.objectContaining({ collectedAt: "2026-08-01", source: "manual" }),
    );
  });

  it("strips client-supplied canonical fields before they reach the repository", async () => {
    getUser.mockResolvedValue(USER);
    createPanelWithMarkers.mockResolvedValue(RESULT);

    await POST(
      req({
        ...VALID_BODY,
        markers: [
          {
            rawLabel: "Vitamin D",
            value: 22,
            unit: "ng/mL",
            biomarkerId: "forged-id",
            canonicalValue: 9999,
          },
        ],
      }),
    );

    const forwarded = createPanelWithMarkers.mock.calls[0][2];
    expect(forwarded.markers[0]).not.toHaveProperty("biomarkerId");
    expect(forwarded.markers[0]).not.toHaveProperty("canonicalValue");
  });
});
