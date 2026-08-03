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

function ctx(id = "s1") {
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

    await POST(new Request("http://localhost", { method: "POST" }), ctx("s-42"));

    expect(runEvaluation).toHaveBeenCalledWith({}, "u1", "s-42");
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
