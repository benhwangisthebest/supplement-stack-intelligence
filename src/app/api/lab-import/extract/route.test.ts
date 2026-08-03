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

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
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

  it("imports no repository or Supabase client at all", () => {
    // A structural assertion, not a behavioural one: no arrangement of mocks
    // can prove a write never happens on paths this file does not exercise,
    // but the absence of any persistence import proves it for every path.
    const source = readFileSync(
      new URL("./route.ts", import.meta.url).pathname,
      "utf8",
    );

    expect(source).not.toMatch(/@\/lib\/db\//);
    expect(source).not.toMatch(/@\/lib\/supabase/);
  });
});
