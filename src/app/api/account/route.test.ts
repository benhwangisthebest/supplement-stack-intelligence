// Application — route-handler tests for DELETE /api/account (Phase 2 U17).
//
// The most consequential route in the repository: everything it does is
// irreversible and it is backed by a SECURITY DEFINER function. The assertions
// below are ordered by what they protect.
//
// GATE D2 lives here — "a test proves DELETE without a confirmation token
// writes nothing". Note the shape: it is NOT enough to assert a 400. A route
// that deleted the data and then returned 400 would satisfy a status check. The
// assertion is ZERO CALLS to the repository.
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const deleteAllForCaller = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/db/delete-repo", () => ({
  deleteAllForCaller: (...a: unknown[]) => deleteAllForCaller(...a),
}));

import { DELETE } from "./route";
import { CONFIRMATION_PHRASE } from "@/lib/api/deletion-confirmation";

const USER = { id: "u1" };

const COUNTS = {
  user_profiles: 1,
  stacks: 2,
  stack_items: 9,
  evaluation_flags: 4,
  lab_panels: 1,
  lab_markers: 7,
  advisor_conversations: 3,
  advisor_messages: 41,
  advisor_actions: 5,
  advisor_usage: 12,
  checkins: 88,
  side_effect_reports: 6,
};
const TOTAL = Object.values(COUNTS).reduce((a, b) => a + b, 0);

const req = (body: unknown) =>
  new Request("http://localhost/api/account", {
    method: "DELETE",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

let spies: Array<ReturnType<typeof vi.spyOn>>;

beforeEach(() => {
  vi.clearAllMocks();
  spies = (["log", "error", "warn", "info", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
});
afterEach(() => vi.restoreAllMocks());

const logged = () =>
  spies
    .flatMap((s) => s.mock.calls)
    .flat()
    .map((a) => {
      try {
        return typeof a === "string" ? a : JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join("\n");

describe("DELETE /api/account — GATE D2: nothing is deleted without the exact confirmation", () => {
  // Each case asserts the repository was NEVER CALLED. A 400 returned after the
  // deletion already happened would pass a status-only test.
  const rejected: Array<[string, unknown]> = [
    ["an empty body", {}],
    ["a missing confirm field", { reason: "done with it" }],
    ["the wrong phrase", { confirm: "DELETE EVERYTHING" }],
    ["the right phrase in the wrong case", { confirm: "delete my data" }],
    ["a partial phrase", { confirm: "DELETE MY" }],
    ["the phrase with trailing whitespace", { confirm: "DELETE MY DATA " }],
    ["a non-string confirm", { confirm: true }],
    ["malformed JSON", "{not json"],
  ];

  for (const [label, body] of rejected) {
    it(`refuses ${label} — 400, and deletes NOTHING`, async () => {
      getUser.mockResolvedValue(USER);
      const res = await DELETE(req(body));
      expect(res.status).toBe(400);
      expect(
        deleteAllForCaller,
        "GATE D2 VIOLATION: the deletion repository was called on a request that failed\n" +
          "confirmation. The status code is not the property — not deleting is.",
      ).not.toHaveBeenCalled();
    });
  }

  it("accepts ONLY the exact literal", async () => {
    getUser.mockResolvedValue(USER);
    deleteAllForCaller.mockResolvedValue({ deleted: COUNTS, totalRows: TOTAL });
    const res = await DELETE(req({ confirm: CONFIRMATION_PHRASE }));
    expect(res.status).toBe(200);
    expect(deleteAllForCaller).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/account — auth", () => {
  it("returns 401 when unauthenticated, and deletes nothing", async () => {
    getUser.mockResolvedValue(null);
    const res = await DELETE(req({ confirm: CONFIRMATION_PHRASE }));
    expect(res.status).toBe(401);
    expect(deleteAllForCaller).not.toHaveBeenCalled();
  });

  it("passes NO user id to the repository", async () => {
    // The scoping property is enforced in SQL: `delete_all_user_data()` takes no
    // arguments and derives its owner from auth.uid(). If a user id ever appears
    // in this call, someone has started scoping deletion from the application —
    // and the function would have to accept it, which is the catastrophic shape.
    getUser.mockResolvedValue(USER);
    deleteAllForCaller.mockResolvedValue({ deleted: COUNTS, totalRows: TOTAL });
    await DELETE(req({ confirm: CONFIRMATION_PHRASE }));
    const args = deleteAllForCaller.mock.calls[0];
    expect(args).toHaveLength(1);
    expect(JSON.stringify(args)).not.toContain("u1");
  });
});

describe("DELETE /api/account — what it reports", () => {
  it("reports per-table counts bound to what the repository returned", async () => {
    // §5.4 copy↔computation: the numbers in the response must come from the
    // deletion, not be re-derived or assumed.
    getUser.mockResolvedValue(USER);
    deleteAllForCaller.mockResolvedValue({ deleted: COUNTS, totalRows: TOTAL });
    const body = await (await DELETE(req({ confirm: CONFIRMATION_PHRASE }))).json();
    expect(body.data.deleted).toEqual(COUNTS);
    expect(body.data.totalRowsDeleted).toBe(TOTAL);
    expect(body.data.deleted.advisor_usage).toBe(12);
  });

  it("states what SURVIVES the deletion", async () => {
    // A user told "your data is deleted" must not have to discover that their
    // account still exists. U16's notIncluded precedent, applied to the write half.
    getUser.mockResolvedValue(USER);
    deleteAllForCaller.mockResolvedValue({ deleted: COUNTS, totalRows: TOTAL });
    const body = await (await DELETE(req({ confirm: CONFIRMATION_PHRASE }))).json();
    const retained = JSON.stringify(body.data.retained);
    expect(body.data.retained.length).toBeGreaterThan(0);
    expect(retained).toMatch(/auth\.users/);
    expect(retained).toMatch(/api_rate_limits/);
    for (const item of body.data.retained) {
      expect(item.what).toBeTruthy();
      expect(item.where).toBeTruthy();
      expect(item.why).toBeTruthy();
    }
  });

  it("FAILS HONESTLY when the RPC fails — 500, and no counts at all", async () => {
    // The deployment-order hazard made testable. 0010 is migration-first: if the
    // code ships without the migration, the RPC does not exist. That must be a
    // clean failure, never a partial success — "deleted: {}" with a 200 would
    // tell a user their data was removed when nothing was.
    getUser.mockResolvedValue(USER);
    deleteAllForCaller.mockRejectedValue(new Error("function public.delete_all_user_data() does not exist"));

    const res = await DELETE(req({ confirm: CONFIRMATION_PHRASE }));
    expect(res.status).toBe(500);
    const body = await res.json();
    // The envelope's failure contract is `data: null` — asserted as null rather
    // than falsy, so an empty object slipping through would still be caught.
    expect(body.data).toBeNull();
    expect(JSON.stringify(body)).not.toMatch(/deleted|totalRowsDeleted/);
    // It should still carry a correlation id: failing honestly means being
    // diagnosable, not silent.
    expect(body.error.correlationId).toBeTruthy();
  });
});

describe("DELETE /api/account — §2.3 rule 15", () => {
  it("writes no deletion detail to any logger", async () => {
    // Counts are health-data-adjacent: they reveal how many lab panels, side
    // effects and advisor exchanges a person had.
    //
    // WHAT THIS HALF SEES: the route. It mocks the repository, so a logging call
    // inside `delete-repo` is invisible here — U16's M5 established that the
    // hard way. delete-repo.test.ts covers the other half.
    getUser.mockResolvedValue(USER);
    deleteAllForCaller.mockResolvedValue({ deleted: COUNTS, totalRows: TOTAL });
    await DELETE(req({ confirm: CONFIRMATION_PHRASE }));

    const out = logged();
    expect(out, `a deletion count reached a logger:\n${out}`).not.toContain("88");
    expect(out).not.toContain("side_effect_reports");
    expect(out).toBe("");
  });
});
