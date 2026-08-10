// Application — route-handler tests for POST /api/lab-import/extract (Phase 1 U3).
//
// SAFETY-CRITICAL property, asserted structurally at the bottom of this file:
// this handler must NEVER write to the database. The confirm gate lives
// between it and /commit, so a write here would bypass user confirmation of
// transcribed lab values entirely.
//
// The route has two entry paths (JSON paste, multipart file) and four distinct
// 4xx/5xx outcomes. The paste path is covered here; the file path's own error
// mapping (422 unreadable, 502 extraction failure) belongs with the adapter.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getUser = vi.fn();
const parsePaste = vi.fn();

const enforceRateLimit = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/api/rate-limit-guard", () => ({
  enforceRateLimit: (...a: unknown[]) => enforceRateLimit(...a),
}));
vi.mock("@/lib/lab-import/csv", () => ({ parseCsv: vi.fn(() => []) }));
vi.mock("@/lib/lab-import/paste", () => ({ parsePaste: (...a: unknown[]) => parsePaste(...a) }));
vi.mock("@/lib/lab-import/pdf-adapter", () => ({
  extractFromPdf: vi.fn(async () => []),
  ExtractionError: class ExtractionError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

import { POST } from "./route";
import { AI_SERVICE_NOT_CONFIGURED, NotConfiguredError } from "@/lib/api/errors";

/** JSON-path request: the handler reads content-type, then `.json()`. */
function jsonReq(body: unknown): NextRequest {
  return {
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
  } as unknown as NextRequest;
}

const USER = { id: "u1" };
const COLUMN_MAP = { marker: 0, value: 1, unit: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  enforceRateLimit.mockResolvedValue(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/lab-import/extract", () => {
  it("returns 401 without parsing anything", async () => {
    getUser.mockResolvedValue(null);
    parsePaste.mockReturnValue([{ rawLabel: "Vitamin D", value: 22, unit: "ng/mL" }]);

    const res = await POST(jsonReq({ kind: "paste", text: "a,b,c", columnMap: COLUMN_MAP }));

    expect(res.status).toBe(401);
    expect(parsePaste).not.toHaveBeenCalled();
  });

  it("returns 400 when the JSON body is not a paste envelope", async () => {
    getUser.mockResolvedValue(USER);

    const res = await POST(jsonReq({ kind: "csv", text: 123 }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(parsePaste).not.toHaveBeenCalled();
  });

  it("returns 400 when the column map is invalid", async () => {
    getUser.mockResolvedValue(USER);

    const res = await POST(
      jsonReq({ kind: "paste", text: "a,b,c", columnMap: { marker: -1, value: 1, unit: 2 } }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(parsePaste).not.toHaveBeenCalled();
  });

  it("returns 200 with candidates for a valid paste", async () => {
    getUser.mockResolvedValue(USER);
    const candidates = [{ rawLabel: "Vitamin D", value: 22, unit: "ng/mL" }];
    parsePaste.mockReturnValue(candidates);

    const res = await POST(jsonReq({ kind: "paste", text: "raw", columnMap: COLUMN_MAP }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.source).toBe("paste");
    expect(body.data.candidates).toEqual(candidates);
    expect(body.data.unreadable).toBe(false);
  });

  it("answers 429 and parses nothing when the rate limit refuses (U5)", async () => {
    // Gate B1 clause (iv), the second paid route. Closes the limiter half of
    // finding N-1: before U5 this endpoint called a paid external API with
    // NEITHER of §4 rule 9's two controls.
    getUser.mockResolvedValue(USER);
    enforceRateLimit.mockResolvedValue(
      new Response(JSON.stringify({ data: null, error: { code: "RATE_LIMITED" } }), {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    );

    const res = await POST(jsonReq({ kind: "paste", text: "x", columnMap: COLUMN_MAP }));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    // Nothing was parsed and, by extension, nothing was transcribed: a refused
    // request must cost neither CPU nor an Anthropic call.
    expect(parsePaste).not.toHaveBeenCalled();
  });

  it("checks the limit AFTER auth, so an anonymous caller never touches the counter", async () => {
    // Ordering matters in the other direction here: counting an unauthenticated
    // request would let anyone fill a bucket, and `bucketKey` would have no user
    // id to key it on anyway.
    getUser.mockResolvedValue(null);

    const res = await POST(jsonReq({ kind: "paste", text: "x", columnMap: COLUMN_MAP }));

    expect(res.status).toBe(401);
    expect(enforceRateLimit).not.toHaveBeenCalled();
  });

  it("answers 503, not 502, when the AI service is not configured (U6 / N-9)", async () => {
    // DECLARED BYTE CHANGE. Before U6 this was 502 EXTRACTION_FAILED with
    // "Extraction failed — try CSV or paste." — advice that cannot work, since
    // paste routes through the same absent key. A missing server key is an
    // operational state, so it now answers 503 NOT_CONFIGURED through the
    // shared boundary, with copy that names no environment variable.
    getUser.mockResolvedValue(USER);
    parsePaste.mockImplementation(() => {
      throw new NotConfiguredError(AI_SERVICE_NOT_CONFIGURED);
    });

    const res = await POST(jsonReq({ kind: "paste", text: "x", columnMap: COLUMN_MAP }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error.code).toBe("NOT_CONFIGURED");
    expect(body.error.message).toBe(AI_SERVICE_NOT_CONFIGURED);
    expect(body.error.message).not.toMatch(/OMNIROUTE|ANTHROPIC|API_KEY|BASE_URL/i);
    expect(body.error.message).not.toMatch(/try CSV or paste/);
  });

  it("imports no repository or Supabase client at all", () => {
    // A structural assertion, not a behavioural one: no arrangement of mocks
    // can prove a write never happens on paths this file does not exercise,
    // but the absence of any persistence import proves it for every path.
    //
    // [Phase 2 U5] SCOPE CHANGE, recorded rather than absorbed. This route now
    // calls `enforceRateLimit`, which DOES write — one `api_rate_limits` counter
    // row, through a Supabase client it creates internally. So the honest claim
    // is no longer "this request path performs no write at all"; it is "this
    // FILE reaches no repository and no lab-data table", which is the property
    // the confirm gate actually depends on.
    //
    // The guard was written to take no client precisely so this pin would keep
    // holding. Weakening the assertion to admit a `@/lib/supabase` import would
    // have been the easy fix and would have traded a safety property for a
    // convenience; the counter write is deliberately kept one module away.
    const source = readFileSync(
      new URL("./route.ts", import.meta.url).pathname,
      "utf8",
    );

    expect(source).not.toMatch(/@\/lib\/db\//);
    expect(source).not.toMatch(/@\/lib\/supabase/);
  });
});
