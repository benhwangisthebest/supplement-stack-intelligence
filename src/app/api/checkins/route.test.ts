// Application — route-handler tests for /api/checkins (Phase 1 U1).
//
// WHY THIS EXISTS: this is the FIRST route test in the repository. 23 route
// files shipped with zero tests while 524 unit tests stayed green, because
// every one of them exercised engines directly and no test ever called a
// handler. A route is the auth trust boundary (CLAUDE.md §2.3 rule 11); an
// engine test cannot tell you whether an unauthenticated caller is rejected.
//
// U1's job is to prove the pattern works, not to cover the surface:
//
//   1. A route handler is IMPORTABLE and ASSERTABLE under vitest's
//      `environment: "node"` (vitest.config.ts:12). `NextResponse` is a Web
//      Response subclass, so the assertion style is `res.status` plus
//      `await res.json()` — no Next runtime, no live server, no fetch.
//   2. Inline `vi.mock` per file is sufficient; no shared harness module.
//      Plan §6.3 settled this: a shared module cannot live in `src/testing/`
//      without a new EXEMPT_LAYERS entry (boundaries rule 6), and cannot be
//      named `*.test.ts` (vitest would collect it and fail with no suite).
//      ~15 duplicated lines per file is cheaper than a new governed layer.
//
// THE 401 ORDERING RULE, which every later route test must copy: the
// unauthenticated case mocks `getUser -> null` and asserts 401 BEFORE any
// happy-path mock is installed. A test that always mocks an authenticated
// user makes a MISSING auth check look tested — the failure mode these tests
// exist to prevent.
//
// Mutation-proven (plan §6.2, U1–U4): deleting `if (!user) return
// unauthorized();` from GET turns the 401 case red.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { DailyCheckin } from "@/types/checkin";

const getUser = vi.fn();
const listCheckins = vi.fn();
const upsertCheckin = vi.fn();
const replaceReportsForDate = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/checkin-repo", () => ({
  listCheckins: (...a: unknown[]) => listCheckins(...a),
  upsertCheckin: (...a: unknown[]) => upsertCheckin(...a),
}));
vi.mock("@/lib/db/side-effect-repo", () => ({
  replaceReportsForDate: (...a: unknown[]) => replaceReportsForDate(...a),
}));

import { GET, POST } from "./route";

/** A NextRequest stand-in: the handlers read only `.url` and `.json()`. */
function req(url: string, body?: unknown): NextRequest {
  return { url, json: async () => body } as unknown as NextRequest;
}

const USER = { id: "u1" };

// Annotated, deliberately: an unannotated object literal here would let a
// fabricated fixture compile. It did, on the first draft of this file — the
// invented fields passed `tsc` and the handler 500'd at runtime instead.
const CHECKIN: DailyCheckin = {
  id: "c1",
  userId: "u1",
  date: "2026-08-03",
  ratings: { sleep: 4 },
  taken: ["magnesium"],
  scheduled: ["magnesium"],
  note: null,
  sideEffect: null,
  createdAt: "2026-08-03T00:00:00Z",
  updatedAt: "2026-08-03T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/checkins", () => {
  // The repo mock is configured to SUCCEED here on purpose. If it were left
  // unset, removing the auth check would fail this test with a 500 (the
  // handler crashing on `user.id`), which is a red for the wrong reason —
  // mutation testing caught exactly that on the first draft. Configured this
  // way, the auth check is the only thing standing between an anonymous
  // caller and real data, so a bypass fails with `expected 200 to be 401`:
  // unambiguous evidence of a LEAK, not a crash.
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    listCheckins.mockResolvedValue([CHECKIN]);

    const res = await GET(req("http://localhost/api/checkins"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
        details: undefined,
        correlationId: undefined,
      },
    });
    expect(listCheckins).not.toHaveBeenCalled();
  });

  it("returns 200 with checkins and consistency for an authenticated user", async () => {
    getUser.mockResolvedValue(USER);
    listCheckins.mockResolvedValue([CHECKIN]);

    const res = await GET(req("http://localhost/api/checkins"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.checkins).toEqual([CHECKIN]);
    expect(body.data).toHaveProperty("consistency");
  });

  it("passes the caller's own id to the repository, never a client-supplied one", async () => {
    getUser.mockResolvedValue(USER);
    listCheckins.mockResolvedValue([]);

    await GET(req("http://localhost/api/checkins?days=30&userId=someone-else"));

    expect(listCheckins).toHaveBeenCalledWith({}, "u1", 30);
  });
});

describe("POST /api/checkins", () => {
  // Same construction as GET: the write path is mocked to succeed, so a
  // bypass would return 200 with a persisted row rather than erroring.
  it("returns 401 when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    upsertCheckin.mockResolvedValue(CHECKIN);
    replaceReportsForDate.mockResolvedValue([]);

    const res = await POST(
      req("http://localhost/api/checkins", {
        date: "2026-08-03",
        ratings: {},
        taken: [],
        scheduled: [],
        sideEffects: [],
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(upsertCheckin).not.toHaveBeenCalled();
  });

  it("returns 400 with the validation envelope for an invalid body", async () => {
    getUser.mockResolvedValue(USER);

    const res = await POST(req("http://localhost/api/checkins", { date: "not-a-date" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Invalid input.");
    expect(body.error.details).toHaveProperty("fieldErrors");
    expect(upsertCheckin).not.toHaveBeenCalled();
  });

  it("returns 200 with the persisted check-in and its side effects", async () => {
    getUser.mockResolvedValue(USER);
    upsertCheckin.mockResolvedValue(CHECKIN);
    replaceReportsForDate.mockResolvedValue([]);

    const res = await POST(
      req("http://localhost/api/checkins", {
        date: "2026-08-03",
        ratings: { sleep: 4 },
        taken: ["magnesium"],
        scheduled: ["magnesium"],
        sideEffects: [],
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.checkin).toEqual(CHECKIN);
    expect(body.data.sideEffects).toEqual([]);
  });
});
