// Application — route-handler tests for /api/stacks (Phase 1 U3).
//
// Zod-validated mutation route: GET lists the caller's stacks, POST creates one
// from a `stackInputSchema` body. The schema is left REAL (not mocked) — the
// point of the 400 test is that the route actually runs validation, and a
// mocked schema would prove only that a mock was called.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { Stack } from "@/types/stack";

const getUser = vi.fn();
const listStacks = vi.fn();
const createStack = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/stack-repo", () => ({
  listStacks: (...a: unknown[]) => listStacks(...a),
  createStack: (...a: unknown[]) => createStack(...a),
}));

import { GET, POST } from "./route";

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

const VALID_INPUT = { name: "Sleep stack", intent: "sleep" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/stacks", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    listStacks.mockResolvedValue([STACK]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(listStacks).not.toHaveBeenCalled();
  });

  it("returns 200 with the caller's own stacks", async () => {
    getUser.mockResolvedValue(USER);
    listStacks.mockResolvedValue([STACK]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([STACK]);
    expect(listStacks).toHaveBeenCalledWith({}, "u1");
  });
});

describe("POST /api/stacks", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    createStack.mockResolvedValue(STACK);

    const res = await POST(req(VALID_INPUT));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(createStack).not.toHaveBeenCalled();
  });

  it("returns 400 and writes nothing for an invalid body", async () => {
    getUser.mockResolvedValue(USER);
    createStack.mockResolvedValue(STACK);

    const res = await POST(req({ name: "", intent: "not-an-intent" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toHaveProperty("fieldErrors");
    expect(createStack).not.toHaveBeenCalled();
  });

  it("returns 201 and creates under the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    createStack.mockResolvedValue(STACK);

    const res = await POST(req(VALID_INPUT));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toEqual(STACK);
    // Parsed input, not the raw body: defaults are applied server-side.
    expect(createStack).toHaveBeenCalledWith(
      {},
      "u1",
      expect.objectContaining({ name: "Sleep stack", intent: "sleep", mode: "current" }),
    );
  });
});
