// Application — route-handler tests for /api/lab-markers/:id (Phase 1 U3).
//
// Unlike the stack-item routes, ownership here is not a separate lookup: both
// repo calls take `user.id` alongside the marker id, so scoping is part of the
// query itself. The tests pin that the caller's own id is what gets passed —
// which is the whole of the ownership check on this route.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { LabMarker } from "@/types/profile";

const getUser = vi.fn();
const updateLabMarker = vi.fn();
const deleteLabMarker = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/lab-marker-repo", () => ({
  updateLabMarker: (...a: unknown[]) => updateLabMarker(...a),
  deleteLabMarker: (...a: unknown[]) => deleteLabMarker(...a),
}));

import { DELETE, PATCH } from "./route";

function ctx(id = "ca0df2c9-5aa1-44c1-80ff-2ff3c8f967fd") {
  return { params: Promise.resolve({ id }) };
}
function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };

const MARKER: LabMarker = {
  id: "ca0df2c9-5aa1-44c1-80ff-2ff3c8f967fd",
  userId: "u1",
  marker: "Ferritin",
  value: 45,
  unit: "ng/mL",
  referenceLow: 30,
  referenceHigh: 400,
  date: null,
  notes: null,
};

const VALID_INPUT = { marker: "Ferritin", value: 45, unit: "ng/mL" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PATCH /api/lab-markers/:id", () => {
  it("returns 401 and writes nothing", async () => {
    getUser.mockResolvedValue(null);
    updateLabMarker.mockResolvedValue(MARKER);

    const res = await PATCH(req(VALID_INPUT), ctx());

    expect(res.status).toBe(401);
    expect(updateLabMarker).not.toHaveBeenCalled();
  });

  it("returns 400 and writes nothing for an invalid body", async () => {
    getUser.mockResolvedValue(USER);
    updateLabMarker.mockResolvedValue(MARKER);

    const res = await PATCH(req({ marker: "", value: "not-a-number", unit: "" }), ctx());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(updateLabMarker).not.toHaveBeenCalled();
  });

  it("returns 200 and scopes the update to the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    updateLabMarker.mockResolvedValue(MARKER);

    const res = await PATCH(req(VALID_INPUT), ctx("6bd1e100-393f-4251-8bad-ef4a4a7a99af"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(MARKER);
    expect(updateLabMarker).toHaveBeenCalledWith(
      {},
      "u1",
      "6bd1e100-393f-4251-8bad-ef4a4a7a99af",
      expect.objectContaining({ marker: "Ferritin" }),
    );
  });
});

describe("DELETE /api/lab-markers/:id", () => {
  it("returns 401 and deletes nothing", async () => {
    getUser.mockResolvedValue(null);
    deleteLabMarker.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx());

    expect(res.status).toBe(401);
    expect(deleteLabMarker).not.toHaveBeenCalled();
  });

  it("returns 200 and scopes the delete to the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    deleteLabMarker.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "ca0df2c9-5aa1-44c1-80ff-2ff3c8f967fd" });
    expect(deleteLabMarker).toHaveBeenCalledWith({}, "u1", "ca0df2c9-5aa1-44c1-80ff-2ff3c8f967fd");
  });
});

describe("U30 — a malformed path id is a 400, not a 500 (N-51)", () => {
  // The id never reaches Postgres: `uuidParam` decides from the string, before
  // any I/O. That ordering is the reason a syntactic 400 is not an existence
  // oracle — nothing was looked up to produce it. A WELL-FORMED id that is
  // foreign or absent still answers 404, byte-identical (U29's property).

  it("PATCH — malformed `id` answers 400 VALIDATION_ERROR", async () => {
    const res = await PATCH(req(VALID_INPUT), ctx("not-a-uuid"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("DELETE — malformed `id` answers 400 VALIDATION_ERROR", async () => {
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), ctx("not-a-uuid"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
