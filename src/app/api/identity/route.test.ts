// Application — route-handler tests for GET /api/identity (Phase 1 U2).
//
// Read-only, no request body. The route loads context from the DB and then runs
// two PURE derivations (`src/lib/identity`). Those engines have their own unit
// tests; what is untested until now is the ROUTE — that it rejects anonymous
// callers, and that it derives from the caller's OWN id.
//
// Per plan §6.3.1 the 401 test configures every downstream mock to succeed, so
// the auth check is the only thing between an anonymous caller and identity
// data. The engine mocks return opaque sentinels on purpose: this file asserts
// pass-through and argument wiring, not derivation shape.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const loadIdentityContext = vi.fn();
const deriveUserIdentity = vi.fn();
const deriveStackArchetype = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/identity/context", () => ({
  loadIdentityContext: (...a: unknown[]) => loadIdentityContext(...a),
}));
vi.mock("@/lib/identity", () => ({
  deriveUserIdentity: (...a: unknown[]) => deriveUserIdentity(...a),
  deriveStackArchetype: (...a: unknown[]) => deriveStackArchetype(...a),
}));

import { GET } from "./route";

const USER = { id: "u1" };
const CARD = { archetype: "emerging" };
const CTX = { stacks: [{ id: "s1" }, { id: "s2" }] };

/** Configure the whole happy path. Called by the 401 test too — see §6.3.1. */
function arrangeSuccess() {
  loadIdentityContext.mockResolvedValue(CTX);
  deriveUserIdentity.mockReturnValue(CARD);
  deriveStackArchetype.mockImplementation((stack: { id: string }) => ({ stackId: stack.id }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // The 500 path logs the real exception under a correlation id by design.
  // Silenced so an expected log does not read as test-run noise.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/identity", () => {
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    arrangeSuccess();

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(loadIdentityContext).not.toHaveBeenCalled();
  });

  it("returns 200 with the card and one archetype per stack", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.card).toEqual(CARD);
    expect(body.data.stackArchetypes).toEqual([{ stackId: "s1" }, { stackId: "s2" }]);
  });

  it("loads context for the caller's own id", async () => {
    getUser.mockResolvedValue(USER);
    arrangeSuccess();

    await GET();

    expect(loadIdentityContext).toHaveBeenCalledWith({}, "u1");
  });

  it("returns the generic 500 envelope when the context load throws", async () => {
    getUser.mockResolvedValue(USER);
    loadIdentityContext.mockRejectedValue(new Error("connection string pg://secret@host"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    // CLAUDE.md §2.3 rule 13: the driver text must not cross the boundary.
    expect(body.error.message).toBe("An unexpected internal error occurred.");
    expect(body.error.message).not.toContain("secret");
    expect(typeof body.error.correlationId).toBe("string");
  });
});
