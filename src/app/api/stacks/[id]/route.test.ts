// Application — route-handler tests for /api/stacks/:id (Phase 1 U3).
//
// Three handlers on one file: GET (detail), PUT (update), DELETE. Every one of
// them enforces ownership by scoping the lookup to `user.id`, so a stack the
// caller does not own is reported as 404 rather than 403 — see the sibling
// compare/route.test.ts for why that is the right answer.
//
// PUT's ordering matters and is pinned below: ownership is checked BEFORE the
// body is parsed, so a malformed body against someone else's stack still 404s
// and never reaches validation.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { Stack } from "@/types/stack";

const getUser = vi.fn();
const getStack = vi.fn();
const updateStack = vi.fn();
const deleteStack = vi.fn();
const getStackDetail = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/stack-repo", () => ({
  getStack: (...a: unknown[]) => getStack(...a),
  updateStack: (...a: unknown[]) => updateStack(...a),
  deleteStack: (...a: unknown[]) => deleteStack(...a),
}));
vi.mock("@/services/evaluation", () => ({
  getStackDetail: (...a: unknown[]) => getStackDetail(...a),
}));

import { DELETE, GET, PUT } from "./route";

function ctx(id = "s1") {
  return { params: Promise.resolve({ id }) };
}
function req(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };

const STACK: Stack = {
  id: "s1",
  userId: "u1",
  name: "Sleep stack",
  intent: "sleep",
  mode: "current",
  description: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

const VALID_INPUT = { name: "Renamed", intent: "sleep" };

/** Full happy path — installed by every 401 test per §6.3.1. */
function arrangeSuccess() {
  getStack.mockResolvedValue(STACK);
  getStackDetail.mockResolvedValue({ stack: STACK, items: [], flags: [] });
  updateStack.mockResolvedValue(STACK);
  deleteStack.mockResolvedValue(undefined);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/stacks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    arrangeSuccess();

    const res = await GET(new Request("http://localhost"), ctx());

    expect(res.status).toBe(401);
    expect(getStackDetail).not.toHaveBeenCalled();
  });

  it("returns 200 with the detail for an owned stack", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await GET(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.stack).toEqual(STACK);
    expect(getStackDetail).toHaveBeenCalledWith({}, "u1", "s1");
  });

  it("404s for a stack the caller does not own", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();
    getStackDetail.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), ctx("s-not-mine"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/stacks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    arrangeSuccess();

    const res = await PUT(req(VALID_INPUT), ctx());

    expect(res.status).toBe(401);
    expect(updateStack).not.toHaveBeenCalled();
  });

  it("returns 400 and writes nothing for an invalid body", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await PUT(req({ name: "" }), ctx());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(updateStack).not.toHaveBeenCalled();
  });

  it("checks ownership BEFORE parsing the body", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();
    getStack.mockResolvedValue(null);

    // A body that would fail validation, against a stack the caller does not
    // own. A 400 here would confirm the stack exists to an outsider.
    const res = await PUT(req({ name: "" }), ctx("s-not-mine"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(updateStack).not.toHaveBeenCalled();
  });

  it("returns 200 and updates under the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await PUT(req(VALID_INPUT), ctx());

    expect(res.status).toBe(200);
    expect(updateStack).toHaveBeenCalledWith(
      {},
      "u1",
      "s1",
      expect.objectContaining({ name: "Renamed" }),
    );
  });
});

describe("DELETE /api/stacks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    arrangeSuccess();

    const res = await DELETE(new Request("http://localhost"), ctx());

    expect(res.status).toBe(401);
    expect(deleteStack).not.toHaveBeenCalled();
  });

  it("404s — and deletes nothing — for a stack the caller does not own", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();
    getStack.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost"), ctx("s-not-mine"));

    expect(res.status).toBe(404);
    expect(deleteStack).not.toHaveBeenCalled();
  });

  it("returns 200 and deletes under the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await DELETE(new Request("http://localhost"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "s1" });
    expect(deleteStack).toHaveBeenCalledWith({}, "u1", "s1");
  });
});
