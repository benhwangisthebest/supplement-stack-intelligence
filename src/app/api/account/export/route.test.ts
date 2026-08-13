// Application — route-handler tests for GET /api/account/export (Phase 2 U16).
//
// This route returns the caller's COMPLETE health record: medications,
// conditions, lab results, side effects, and every advisor exchange. Two
// properties matter more than the happy path, and both are asserted
// behaviourally rather than by inspection:
//
//   1. AUTH. A missing check serves one user's entire medical history to any
//      caller. This is the highest-consequence 401 in the repository.
//   2. NO LOGGING (§2.3 rule 15). The payload must not reach any logger. The
//      test spies on EVERY console method and asserts no sentinel value from
//      the fixture appears in any call.
//
//      WHAT THIS HALF CAN SEE, corrected after mutation M5 caught the header
//      overclaiming: this file MOCKS `@/lib/db/export-repo`, so it proves the
//      ROUTE does not log the payload it received — and it stays green if the
//      repository logs the rows it read, because the real repository never
//      runs here. M5 put `console.error` inside `exportUserData` and this file
//      did not notice. The other half lives in `src/lib/db/export-repo.test.ts`,
//      which exercises the real repository against a stub client. Neither
//      implies the other; both are required.
//
// NO 400 TEST, and that is not an omission: `GET()` is a zero-arg handler, so
// no caller-supplied value exists for it to reject. The exemption is enforced,
// with its written reason, by `src/architecture/route-contract.test.ts`.
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const exportUserData = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/export-repo", () => ({
  exportUserData: (...a: unknown[]) => exportUserData(...a),
}));

import { GET } from "./route";

const USER = { id: "u1" };

/**
 * Distinctive strings that could only come from the export payload. Real-shaped
 * health data, because that is what a logger would leak — a generic "x" would
 * pass a test that a medication name failed.
 */
const SENTINELS = {
  medication: "SENTINEL-WARFARIN-5MG",
  condition: "SENTINEL-HYPOTHYROIDISM",
  marker: "SENTINEL-TSH-8.4-MIU-L",
  message: "SENTINEL-ADVISOR-TRANSCRIPT",
};

const PAYLOAD = {
  exportedAt: "2026-08-13T00:00:00Z",
  userId: "u1",
  notIncluded: [{ what: "Your account identity", where: "auth.users", why: "not ours to speak for" }],
  tables: {
    user_profiles: [{ medications: [SENTINELS.medication], conditions: [SENTINELS.condition] }],
    lab_markers: [{ name: SENTINELS.marker }],
    advisor_messages: [{ content: SENTINELS.message }],
  },
};

let consoleSpies: Array<ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
  vi.clearAllMocks();
  // Every method, not just `error`. A leak via console.log or console.debug is
  // the same leak.
  consoleSpies = (["log", "error", "warn", "info", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Everything passed to any console method this test, flattened to text. */
function everythingLogged(): string {
  return consoleSpies
    .flatMap((spy) => spy.mock.calls)
    .flat()
    .map((arg) => {
      try {
        return typeof arg === "string" ? arg : JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join("\n");
}

describe("GET /api/account/export", () => {
  it("returns 401 when unauthenticated, and reads nothing", async () => {
    getUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    // Not merely "did not return data" — it must not have gone to the database
    // at all. An export that queries first and rejects later has already read
    // the record it was refusing to serve.
    expect(exportUserData).not.toHaveBeenCalled();
  });

  it("returns the export for the authenticated caller", async () => {
    getUser.mockResolvedValue(USER);
    exportUserData.mockResolvedValue(PAYLOAD);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.userId).toBe("u1");
    expect(body.data.tables.user_profiles[0].medications).toContain(SENTINELS.medication);
  });

  it("scopes the export to the caller's own id", async () => {
    // The only id that may reach the repository is the authenticated user's.
    getUser.mockResolvedValue(USER);
    exportUserData.mockResolvedValue(PAYLOAD);
    await GET();
    expect(exportUserData).toHaveBeenCalledWith(expect.anything(), "u1");
  });

  it("states what the export does NOT contain", async () => {
    // Scope honesty in the artifact, not in documentation the reader must go
    // and find. §8.3's reasoning applied to an omission rather than a stub.
    getUser.mockResolvedValue(USER);
    exportUserData.mockResolvedValue(PAYLOAD);
    const body = await (await GET()).json();
    expect(Array.isArray(body.data.notIncluded)).toBe(true);
    expect(body.data.notIncluded.length).toBeGreaterThan(0);
    for (const omission of body.data.notIncluded) {
      expect(omission.what).toBeTruthy();
      expect(omission.where).toBeTruthy();
      expect(omission.why).toBeTruthy();
    }
  });

  it("NEVER writes health data to any logger (§2.3 rule 15)", async () => {
    getUser.mockResolvedValue(USER);
    exportUserData.mockResolvedValue(PAYLOAD);
    const res = await GET();
    expect(res.status).toBe(200);

    const logged = everythingLogged();
    for (const [field, value] of Object.entries(SENTINELS)) {
      expect(
        logged,
        `§2.3 rule 15 VIOLATION: the ${field} value from the export payload reached a logger.\n` +
          "This payload is the caller's complete health record. Nothing on this path may log it —\n" +
          "not the route, not the repository, not a helper beneath either. What was logged:\n" +
          logged,
      ).not.toContain(value);
    }
  });

  it("logs no health data even when the export throws", async () => {
    // The error path is the one that logs BY DESIGN: `internalError` records
    // err.message, err.stack and err.cause. So the question is not whether it
    // logs, but whether what it logs can contain the record.
    //
    // NOTE, and it is a finding rather than a claim of safety: this asserts the
    // error MESSAGE THIS TEST THROWS carries no payload. It does not and cannot
    // prove that a driver-level error never embeds row data in its message —
    // `respond.ts` would log that verbatim. Registered as a structural finding
    // with the error contract as its owner; NOT fixed here, because respond.ts
    // is a shared trust boundary across all 24 routes.
    getUser.mockResolvedValue(USER);
    exportUserData.mockRejectedValue(new Error("database unavailable"));

    const res = await GET();
    expect(res.status).toBe(500);

    const logged = everythingLogged();
    expect(logged, "the error path must still log something — a correlation id").not.toBe("");
    for (const value of Object.values(SENTINELS)) {
      expect(logged).not.toContain(value);
    }
  });
});
