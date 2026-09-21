// Application — route-handler tests for POST /api/stacks/:id/evaluate (Phase 1 U2).
//
// Classified into U2 rather than U3 by the plan's own criterion: it is a POST,
// but it reads NO request body and runs no Zod schema. The route param is its
// only input.
//
// This is the core-loop endpoint. Ownership is enforced inside
// `runEvaluation`, which returns null for a stack the caller does not own —
// so the 404 case below is the ownership boundary, not just a missing row.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const runEvaluation = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/services/evaluation", () => ({
  runEvaluation: (...a: unknown[]) => runEvaluation(...a),
}));

import { POST } from "./route";

const USER = { id: "u1" };
const REPORT = { flags: [], summary: {} };

function ctx(id = "e8bc163c-82ee-4187-8328-8c7d4ac636db") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/stacks/:id/evaluate", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    // §6.3.1: evaluation succeeds if reached, so a bypass yields 200 + a full
    // evaluation of someone else's stack rather than an error.
    runEvaluation.mockResolvedValue(REPORT);

    const res = await POST(new Request("http://localhost", { method: "POST" }), ctx());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(runEvaluation).not.toHaveBeenCalled();
  });

  it("returns 200 with the evaluation report", async () => {
    getUser.mockResolvedValue(USER);
    runEvaluation.mockResolvedValue(REPORT);

    const res = await POST(new Request("http://localhost", { method: "POST" }), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(REPORT);
  });

  it("evaluates under the caller's own id and the requested stack id", async () => {
    getUser.mockResolvedValue(USER);
    runEvaluation.mockResolvedValue(REPORT);

    await POST(new Request("http://localhost", { method: "POST" }), ctx("b222d77b-50db-4d42-8499-3c5e00415170"));

    expect(runEvaluation).toHaveBeenCalledWith({}, "u1", "b222d77b-50db-4d42-8499-3c5e00415170");
  });

  it("404s when the stack is absent or not the caller's", async () => {
    getUser.mockResolvedValue(USER);
    runEvaluation.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost", { method: "POST" }), ctx());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("U30 — a malformed path id is a 400, not a 500 (N-51)", () => {
  // The id never reaches Postgres: `uuidParam` decides from the string, before
  // any I/O. That ordering is the reason a syntactic 400 is not an existence
  // oracle — nothing was looked up to produce it. A WELL-FORMED id that is
  // foreign or absent still answers 404, byte-identical (U29's property).

  it("POST — malformed `id` answers 400 VALIDATION_ERROR", async () => {
    const res = await POST(new Request("http://localhost", { method: "POST" }), ctx("not-a-uuid"));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
