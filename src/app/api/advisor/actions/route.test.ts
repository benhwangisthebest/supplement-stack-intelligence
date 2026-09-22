// Application — DIFFERENTIAL RESPONSE PINS for POST /api/advisor/actions.
//
// GATE C1 (plan §6.4). These were captured and shown green BEFORE any line of
// the confirm-and-apply path moved into `src/services/advisor-actions.ts`, and
// they must stay green, UNCHANGED, after the extraction. That is the whole
// mechanism: U11 is declared behaviour-preserving, and this file is the only
// thing that can tell the difference between a refactor and a rewrite.
//
// The plan's §6.2 row for U11 names the risk precisely: "U11 lands, looks green,
// and has quietly turned one 409 into a 400". Every distinct (status, code)
// outcome this handler can produce is therefore pinned below, not just the
// happy path — a 409 that silently became a 404 is invisible to any test that
// only asserts "not 2xx".
//
// If ANY assertion here has to be edited to make the refactor pass, the
// refactor changed behaviour and the gate has failed. Do not edit the pins.
//
// Outcome inventory — 8 error outcomes + success:
//   401 UNAUTHORIZED          no session
//   400 VALIDATION_ERROR      body fails confirmSchema (ZodError)
//   400 BAD_REQUEST           body unparseable, non-Zod
//   404 NOT_FOUND             stack not owned / unknown supplement
//   409 STALE_PROPOSAL        active stack changed, item gone, product unranked
//   409 SAFETY_BLOCK          a NEW critical flag on the projected stack
//   500 ACTION_ERROR + rolledBack:true   executeBatch threw and was rolled back
//   500 ACTION_ERROR                     anything else thrown in the outer try
//   201 success               applied, with the v7 back-compat fields
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotConfiguredError } from "@/lib/api/errors";
import type { NextRequest } from "next/server";
import type { AdvisorContext } from "@/types/advisor";
import type { Stack, StackItem } from "@/types";

const getUser = vi.fn();
const createClient = vi.fn();
const loadAdvisorContext = vi.fn();
const cumulativeRecheck = vi.fn();
const executeBatch = vi.fn();
const getStack = vi.fn();
const recordBatch = vi.fn();
const revertAll = vi.fn();
const conversationBelongsToUser = vi.fn();
const getSupplementById = vi.fn();
const matchProducts = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: (...a: unknown[]) => createClient(...a) }));
vi.mock("@/lib/advisor/context-loader", () => ({
  loadAdvisorContext: (...a: unknown[]) => loadAdvisorContext(...a),
}));
vi.mock("@/lib/advisor/safety-recheck", () => ({
  cumulativeRecheck: (...a: unknown[]) => cumulativeRecheck(...a),
}));
// [U34] `rollbackOutcomeOf` is kept REAL — it is pure, and re-implementing it
// in a mock factory would mean this file asserts against its own copy of the
// contract rather than the shipped one. The two functions that touch the
// database are mocked.
vi.mock("@/lib/advisor/actions/execute", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/advisor/actions/execute")>()),
  executeBatch: (...a: unknown[]) => executeBatch(...a),
  revertAll: (...a: unknown[]) => revertAll(...a),
}));
vi.mock("@/lib/advisor/repo", () => ({
  conversationBelongsToUser: (...a: unknown[]) => conversationBelongsToUser(...a),
}));
vi.mock("@/lib/db/stack-repo", () => ({ getStack: (...a: unknown[]) => getStack(...a) }));
vi.mock("@/lib/db/advisor-action-repo", () => ({
  recordBatch: (...a: unknown[]) => recordBatch(...a),
}));
vi.mock("@/lib/evidence", () => ({
  getSupplementById: (...a: unknown[]) => getSupplementById(...a),
}));
vi.mock("@/lib/product-matcher", () => ({
  matchProducts: (...a: unknown[]) => matchProducts(...a),
}));

import { POST } from "./route";

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}
/** A body whose `.json()` rejects — the non-Zod parse failure path. */
function brokenReq(): NextRequest {
  return {
    json: async () => {
      throw new SyntaxError("Unexpected end of JSON input");
    },
  } as unknown as NextRequest;
}

const USER = { id: "u1" };

const STACK: Stack = {
  id: "s1",
  userId: "u1",
  name: "Sleep",
  intent: "sleep",
  mode: "current",
  description: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

const ITEM: StackItem = {
  id: "i1",
  stackId: "s1",
  supplementId: "magnesium",
  customName: null,
  dose: 200,
  unit: "mg",
  timing: "bedtime",
  frequency: "daily",
  reason: null,
  notes: null,
};

const CTX: AdvisorContext = {
  userId: "u1",
  profile: null,
  stack: STACK,
  stackItems: [ITEM],
  labMarkers: [],
  timelinePoints: [],
};

const ADD_PAYLOAD = { supplementId: "creatine", dose: 5, unit: "g" };
const body = (payload: unknown, type = "add_item", stackId = "s1") => ({
  actions: [{ proposal: { type, stackId, payload } }],
});

/** Everything succeeding. Installed by every test, including the 401 (§6.3.1). */
function arrangeSuccess() {
  loadAdvisorContext.mockResolvedValue(CTX);
  getStack.mockResolvedValue(STACK);
  getSupplementById.mockReturnValue({ id: "creatine", name: "Creatine" });
  matchProducts.mockReturnValue({
    groups: [{ stackItemId: "i1", matches: [{ product: { id: "p1" } }] }],
  });
  cumulativeRecheck.mockReturnValue([]);
  executeBatch.mockResolvedValue([
    {
      proposal: { type: "add_item", payload: ADD_PAYLOAD },
      exec: {
        inverse: { op: "delete_item", stackId: "s1", itemId: "i-new" },
        resultingItemId: "i-new",
        createdStackId: null,
      },
    },
  ]);
  recordBatch.mockResolvedValue([{ id: "a1" }]);
  // [U34] The audit-failure path reverts through this; default to a clean
  // revert of the one action `executeBatch` above reports as applied.
  revertAll.mockResolvedValue({ reverted: 1, unreverted: 0 });
}

beforeEach(() => {
  createClient.mockResolvedValue({});

  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  arrangeSuccess();
  // [U29] Owned by default, so every pre-existing test keeps its meaning.
  // Set HERE and not inside a test: `vi.clearAllMocks()` clears calls but not
  // implementations, so a default established inside one test leaks forward
  // and the suite becomes order-dependent — N-67's mechanism, in the file
  // whose sibling raised it.
  conversationBelongsToUser.mockResolvedValue(true);
});

describe("PIN 401 — unauthenticated", () => {
  it("returns 401 UNAUTHORIZED and touches nothing downstream", async () => {
    getUser.mockResolvedValue(null);

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.data).toBeNull();
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(loadAdvisorContext).not.toHaveBeenCalled();
    expect(executeBatch).not.toHaveBeenCalled();
  });
});

describe("PIN 400 — body validation", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("returns 400 VALIDATION_ERROR with fieldErrors for a schema-invalid body", async () => {
    const res = await POST(req({ actions: [] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toBe("Invalid input.");
    expect(json.error.details).toHaveProperty("fieldErrors");
    expect(executeBatch).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for an unknown action type", async () => {
    const res = await POST(req(body(ADD_PAYLOAD, "delete_everything")));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 BAD_REQUEST — not VALIDATION_ERROR — when the body is unparseable", async () => {
    // A non-Zod throw from request.json(). The two 400s carry DIFFERENT codes
    // and this pin is what stops the refactor collapsing them into one.
    const res = await POST(brokenReq());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("BAD_REQUEST");
    expect(json.error.message).toBe("Invalid request body.");
  });
});

describe("PIN 404 — not found", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("returns 404 NOT_FOUND when the stack is not the caller's", async () => {
    getStack.mockResolvedValue(null);

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toBe("Stack not found.");
    expect(executeBatch).not.toHaveBeenCalled();
  });

  it("returns 404 NOT_FOUND naming an unknown supplement", async () => {
    getSupplementById.mockReturnValue(undefined);

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toBe('Supplement "creatine" not found.');
  });
});

describe("PIN 409 — STALE_PROPOSAL", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("409s when the active stack changed under the proposal", async () => {
    loadAdvisorContext.mockResolvedValue({ ...CTX, stack: { ...STACK, id: "s-other" } });

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe("STALE_PROPOSAL");
    expect(json.error.message).toBe(
      "The active stack changed; please ask the advisor again.",
    );
  });

  it("409s when the targeted item is no longer in the stack", async () => {
    loadAdvisorContext.mockResolvedValue({ ...CTX, stackItems: [] });

    const res = await POST(req(body({ stackItemId: "i1" }, "remove_item")));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe("STALE_PROPOSAL");
    expect(json.error.message).toBe(
      "That item is no longer in the stack; please ask the advisor again.",
    );
  });

  it("409s when the product is no longer a ranked match", async () => {
    matchProducts.mockReturnValue({ groups: [{ stackItemId: "i1", matches: [] }] });

    const res = await POST(
      req(body({ stackItemId: "i1", productId: "p1" }, "attach_product")),
    );
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe("STALE_PROPOSAL");
    expect(json.error.message).toBe(
      "That product is no longer a ranked match for the item; please ask the advisor again.",
    );
  });
});

describe("PIN 409 — SAFETY_BLOCK", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("hard-blocks the batch on a NEW critical flag, carrying the flag in details", async () => {
    const flag = { severity: "critical", title: "Potential interaction with warfarin" };
    cumulativeRecheck.mockReturnValue([flag]);

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe("SAFETY_BLOCK");
    expect(json.error.message).toBe("Potential interaction with warfarin");
    expect(json.error.details).toEqual({ flag });
    // The authoritative gate must run BEFORE any write (SC-4).
    expect(executeBatch).not.toHaveBeenCalled();
  });

  it("does not block on a non-critical flag", async () => {
    cumulativeRecheck.mockReturnValue([{ severity: "warning", title: "Mild" }]);

    const res = await POST(req(body(ADD_PAYLOAD)));

    expect(res.status).toBe(201);
    expect(executeBatch).toHaveBeenCalled();
  });
});

describe("PIN 500 — ACTION_ERROR", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("returns 500 with rolledBack:true and no internal text when the batch fails", async () => {
    // [2026-09-21, U34] THE FIXTURE CHANGED HERE AND THE ASSERTIONS DID NOT,
    // and in a file headed "do not edit the pins" that distinction has to be
    // argued rather than asserted.
    //
    // `executeBatch` now ALWAYS attaches `{ reverted, unreverted }` to the
    // error it rethrows — that is N-74's fix, and it is why `rolledBack` is
    // finally a computed fact rather than a claim. A mock that rejects with a
    // BARE error therefore models a collaborator that can no longer exist, and
    // the service correctly answers "no rollback was attempted" (details
    // absent) for it. Left as it was, this pin would be asserting the old
    // shape against an impossible input.
    //
    // Every assertion below is unchanged, including `toEqual({ rolledBack:
    // true })`. What moved is the arrangement, to the contract the real
    // collaborator now has: one action applied, one inverse replayed cleanly.
    executeBatch.mockRejectedValue(
      Object.assign(new Error("duplicate key value violates unique constraint"), {
        reverted: 1,
        unreverted: 0,
      }),
    );

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("ACTION_ERROR");
    expect(json.error.message).toBe("An unexpected internal error occurred.");
    expect(json.error.details).toEqual({ rolledBack: true });
    expect(typeof json.error.correlationId).toBe("string");
    // CLAUDE.md §2.3 rule 13 — the driver text must not cross the boundary.
    expect(JSON.stringify(json)).not.toContain("duplicate key");
  });

  it("returns 500 WITHOUT rolledBack when something else in the flow throws", async () => {
    // rolledBack is a computed fact the client acts on. Only the batch path may
    // set it — a context-load failure rolled nothing back, because nothing was
    // applied. Pinning the ABSENCE is the point.
    loadAdvisorContext.mockRejectedValue(new Error("connection refused"));

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("ACTION_ERROR");
    expect(json.error.message).toBe("An unexpected internal error occurred.");
    expect(json.error.details).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain("connection refused");
  });

  // -------------------------------------------------------------------------
  // [U34, N-71 / N-74] M1 — THE PRE-FIX RED. Both assertions below fail against
  // the code as it stands, and were run and shown red before any source edit.
  // -------------------------------------------------------------------------

  it("rolls back and says so when the AUDIT write fails after a committed batch", async () => {
    // N-71. `executeBatch` has committed; `recordBatch` throws. Today that
    // lands in the OUTER catch, which returns ACTION_ERROR with no details —
    // byte-identical to a batch that rolled back cleanly. The stack change is
    // live and no audit row exists, so the product's own undo path cannot
    // reach it: for remove_item and edit_item the prior dose/unit/timing/notes
    // live ONLY in the unpersisted inverse, and they are gone.
    recordBatch.mockRejectedValue(new Error("insert failed"));

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("ACTION_ERROR");
    expect(json.error.details).toEqual({ rolledBack: true });
    expect(typeof json.error.correlationId).toBe("string");
    expect(JSON.stringify(json)).not.toContain("insert failed");

    // REACHABILITY (§5.3), and it was missing until M2 found it missing. The
    // three assertions above are satisfied by a handler that answers
    // "rolled back" and rolls nothing back — which is the exact defect this
    // unit exists to end, reproduced in its own test. So assert the WORK, not
    // only the WORDS: the revert ran, over the batch that was applied.
    expect(revertAll).toHaveBeenCalledTimes(1);
    expect(revertAll.mock.calls[0][1]).toBe("u1");
    expect(revertAll.mock.calls[0][2]).toHaveLength(1);
  });

  it("answers PARTIALLY_APPLIED when the AUDIT write fails and the revert does too", async () => {
    // The likeliest shape of this failure, and the reason the response has a
    // third state rather than a boolean: `recordBatch` fails by losing the
    // database, and the compensating replay needs the same database.
    recordBatch.mockRejectedValue(new Error("insert failed"));
    revertAll.mockResolvedValue({ reverted: 0, unreverted: 1 });

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("PARTIALLY_APPLIED");
    expect(json.error.details).toEqual({ rolledBack: false, reverted: 0, unreverted: 1 });
    expect(typeof json.error.correlationId).toBe("string");
    expect(JSON.stringify(json)).not.toContain("insert failed");
  });

  it("answers PARTIALLY_APPLIED when a compensating inverse did not succeed", async () => {
    // N-74. Today `rolledBack: true` is ASSERTED, not computed: `executeBatch`
    // swallows each rollback failure and rethrows the original error, so this
    // response claims an undo that did not happen. The rejection below carries
    // the counts the fixed `executeBatch` will attach; today's route ignores
    // them and answers ACTION_ERROR + rolledBack:true regardless, which is
    // exactly what makes this red.
    executeBatch.mockRejectedValue(
      Object.assign(new Error("write failed"), { reverted: 1, unreverted: 1 }),
    );

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("PARTIALLY_APPLIED");
    expect(json.error.details).toMatchObject({ rolledBack: false, reverted: 1, unreverted: 1 });
    expect(JSON.stringify(json)).not.toContain("write failed");
  });

  it("maps a ZodError raised during re-validation to 400, not 500", async () => {
    // revalidate() re-parses the payload with the strict per-type schema. That
    // throw is caught by the OUTER catch and must still surface as a 400.
    const res = await POST(req(body({ supplementId: "creatine", dose: -1, unit: "g" })));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PIN 201 — applied", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("returns 201 with the batch envelope and the v7 back-compat fields", async () => {
    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.error).toBeNull();
    expect(json.data.applied).toBe(true);
    expect(typeof json.data.batchId).toBe("string");
    expect(json.data.results).toEqual([
      { actionId: "a1", resultingItemId: "i-new", createdStackId: null },
    ]);
    expect(json.data.newSafetyFlags).toEqual([]);
    // v7 single-action client shape, mirrored from results[0].
    expect(json.data.actionId).toBe("a1");
    expect(json.data.resultingItemId).toBe("i-new");
    expect(json.data.createdStackId).toBeNull();
  });

  it("accepts the legacy single-proposal body shape", async () => {
    const res = await POST(
      req({ proposal: { type: "add_item", stackId: "s1", payload: ADD_PAYLOAD } }),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.applied).toBe(true);
    expect(executeBatch).toHaveBeenCalledWith(
      {},
      "u1",
      [expect.objectContaining({ proposal: expect.objectContaining({ type: "add_item" }) })],
      [null],
    );
  });

  it("audits under one batch id and passes the inverse to the repository", async () => {
    await POST(req(body(ADD_PAYLOAD)));

    const [, userId, batchId, newActions] = recordBatch.mock.calls[0];
    expect(userId).toBe("u1");
    expect(typeof batchId).toBe("string");
    expect(newActions).toEqual([
      expect.objectContaining({
        actionType: "add_item",
        inverse: { op: "delete_item", stackId: "s1", itemId: "i-new" },
      }),
    ]);
  });

  it("rejects the WHOLE batch when any one action is stale (all-or-nothing)", async () => {
    loadAdvisorContext.mockResolvedValue({ ...CTX, stackItems: [] });

    const res = await POST(
      req({
        actions: [
          { proposal: { type: "add_item", stackId: "s1", payload: ADD_PAYLOAD } },
          { proposal: { type: "remove_item", stackId: "s1", payload: { stackItemId: "gone" } } },
        ],
      }),
    );

    expect(res.status).toBe(409);
    expect(executeBatch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// U4 EXTENSION (2026-08-04)
//
// Everything above is U11's Gate C1 pin set: it maps every distinct (status,
// code) outcome and MUST NOT be weakened or rewritten. U4's remit is route
// coverage, and the pins deliberately never asserted REACHABILITY — that the
// caller-supplied inputs actually arrive where they are used. A refactor could
// drop `edits` or `conversationId` on the floor and every pin above would stay
// green, because neither changes a status code.
//
// CLAUDE.md §5.3: an orchestration function wiring inputs to repos needs a test
// proving every field it passes reaches an observable output.
// ---------------------------------------------------------------------------
describe("U4 — confirm-card inputs reach their destination", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("threads the confirm card's edits through to executeBatch", async () => {
    await POST(
      req({
        actions: [
          {
            proposal: { type: "add_item", stackId: "s1", payload: ADD_PAYLOAD },
            edits: { dose: 10, unit: "g" },
          },
        ],
      }),
    );

    expect(executeBatch).toHaveBeenCalledWith(
      {},
      "u1",
      [expect.objectContaining({ edits: { dose: 10, unit: "g" } })],
      [null],
    );
  });

  it("rejects an edits object carrying fields outside the editable subset", async () => {
    // editableFieldsSchema is `.strict()` (SC-5): the card may change dose,
    // unit, timing and frequency — nothing else. A supplementId smuggled in
    // here would change WHAT is added, not just how much.
    const res = await POST(
      req({
        actions: [
          {
            proposal: { type: "add_item", stackId: "s1", payload: ADD_PAYLOAD },
            edits: { dose: 10, supplementId: "something-else" },
          },
        ],
      }),
    );

    expect(res.status).toBe(400);
    expect(executeBatch).not.toHaveBeenCalled();
  });

  it("threads conversationId through to the audit record", async () => {
    await POST(
      req({
        conversationId: "c-42",
        actions: [{ proposal: { type: "add_item", stackId: "s1", payload: ADD_PAYLOAD } }],
      }),
    );

    const [, , , newActions] = recordBatch.mock.calls[0];
    expect(newActions[0].conversationId).toBe("c-42");
  });

  it("records a null conversationId when the confirm arrives without one", async () => {
    await POST(req(body(ADD_PAYLOAD)));

    const [, , , newActions] = recordBatch.mock.calls[0];
    expect(newActions[0].conversationId).toBeNull();
  });
  it("refuses a conversationId that is not the caller's, before any write (U29, N-49)", async () => {
    // N-49: the id arrives from the request body and was written into the
    // caller's own `advisor_actions` rows unchecked. The FK guarantees the
    // conversation EXISTS; it says nothing about whose it is (N-69).
    conversationBelongsToUser.mockResolvedValue(false);

    const res = await POST(
      req({
        conversationId: "c-someone-else",
        actions: [{ proposal: { type: "add_item", stackId: "s1", payload: ADD_PAYLOAD } }],
      }),
    );

    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toBe("Conversation not found.");
    expect(executeBatch).not.toHaveBeenCalled();
    expect(recordBatch).not.toHaveBeenCalled();
  });

  it("answers a NONEXISTENT conversation identically at THIS site too (U29)", async () => {
    // Site 1 has this test; site 2 did not, and the asymmetry is the finding:
    // structurally there is one branch and one literal here, so the two cases
    // cannot diverge today — but "cannot diverge today" is what a guard is
    // for. An M5-style mutation applied only to this site would otherwise go
    // uncaught. (ecc:code-reviewer, U29, advisory.)
    conversationBelongsToUser.mockResolvedValue(false);
    const foreign = await POST(
      req({
        conversationId: "11111111-1111-4111-8111-111111111111",
        actions: [{ proposal: { type: "add_item", stackId: "s1", payload: ADD_PAYLOAD } }],
      }),
    );
    const foreignBody = await foreign.text();

    conversationBelongsToUser.mockResolvedValue(false);
    const missing = await POST(
      req({
        conversationId: "22222222-2222-4222-8222-222222222222",
        actions: [{ proposal: { type: "add_item", stackId: "s1", payload: ADD_PAYLOAD } }],
      }),
    );
    const missingBody = await missing.text();

    expect(foreign.status).toBe(missing.status);
    expect(foreignBody).toBe(missingBody);
  });

  it("treats an EMPTY conversationId as an id to check, not as absence (U29)", async () => {
    // `confirmSchema.conversationId` is `z.string().nullish()` — no `.uuid()`,
    // unlike the advisor route's schema — so `""` is a schema-valid body.
    // A falsy-guard would skip the check for it, which is neither "no
    // conversation" nor a value the check can evaluate; the write would then
    // reach Postgres and fail the uuid cast AFTER `executeBatch` had already
    // committed a stack change. The condition tests for null/undefined
    // explicitly instead. (ecc:code-reviewer, U29, advisory.)
    conversationBelongsToUser.mockResolvedValue(false);

    const res = await POST(
      req({
        conversationId: "",
        actions: [{ proposal: { type: "add_item", stackId: "s1", payload: ADD_PAYLOAD } }],
      }),
    );

    expect(res.status).toBe(404);
    expect(executeBatch).not.toHaveBeenCalled();
  });

  it("does not check ownership when the confirm carries no conversationId (U29)", async () => {
    await POST(req(body(ADD_PAYLOAD)));

    expect(conversationBelongsToUser).not.toHaveBeenCalled();
    expect(recordBatch).toHaveBeenCalled();
  });
});

// ------------------------------------------------------------------ N-76 ----
// The second unwrapped route's pre-delegation window. Raised at (d1b) by the
// binding assertion refusing to pass it, and by `ecc:security-reviewer`'s (A)
// re-enumeration asking for it to carry its own number rather than a comment.
//
// TAKEN ON AN EXPLICIT RULING, not absorbed: (d1b)'s original scope was
// `advisor/route.ts` alone, and widening it without one is what §8 rule 1
// forbids. The owner widened it.
//
// `POST` here is not wrapped in `handle()` either. `confirmAndApply` reports its
// own failures, so the WORK was covered — what was not was the window before it:
// a throw from `getUser()` or `createClient()` escaped and became an
// uncorrelated framework 500. The window is one call; that call is the same
// `createClient()` whose throw path P2-R4 just fixed in the sibling route.
describe("N-76 — a throw before confirmAndApply is a correlated response", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("a throw from createClient answers 500 with a correlation id", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    createClient.mockRejectedValue(new Error("supabase client construction failed"));

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = (await res.json()) as { error?: { code?: string; message?: string; correlationId?: string } };

    expect(res.status, "the window before delegation must answer, not escape the handler").toBe(500);
    expect(json.error?.correlationId).toEqual(expect.any(String));
    expect(json.error?.message, "the client never sees the driver text").not.toMatch(/failed|supabase/i);
    expect(spy, "the record is what makes the id worth quoting").toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).toContain(String(json.error?.correlationId));
    spy.mockRestore();
  });

  it("a NotConfiguredError from this window stays a 503, not a 500", async () => {
    // The same taxonomy rule the sibling route carries: every handle()-wrapped
    // route answers 503 for unset Supabase env, and a DECLARED OPERATIONAL STATE
    // mints no id and writes no record (U1, T5).
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    createClient.mockRejectedValue(new NotConfiguredError("Supabase is not configured.", "missing-key"));

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = (await res.json()) as { error?: { code?: string; correlationId?: string } };

    expect(res.status).toBe(503);
    expect(json.error?.code).toBe("NOT_CONFIGURED");
    expect(json.error?.correlationId).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ------------------------------------------- N-76, widened by owner ruling ----
// [2026-09-22] The same first-statement gap as the sibling route. `getUser()`
// runs before any `try` here too, so the window N-76 closed began one statement
// too late. Found by `ecc:security-reviewer`'s final (A) re-enumeration.
describe("N-76 widened — the first statement is inside the window too", () => {
  beforeEach(() => getUser.mockResolvedValue(USER));

  it("a throw from getUser answers 500 with a correlated record", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    getUser.mockRejectedValueOnce(new Error("auth-js re-threw a non-AuthError"));

    const res = await POST(req(body(ADD_PAYLOAD)));

    expect(res.status, "a throw from the first statement must not escape the handler").toBe(500);
    const json = (await res.json()) as { error?: { message?: string; correlationId?: string } };
    expect(json.error?.correlationId).toEqual(expect.any(String));
    expect(json.error?.message, "the client never sees the auth driver text").not.toMatch(/auth-js|AuthError/i);
    expect(spy, "the record is what makes the id worth quoting").toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).toContain(String(json.error?.correlationId));
    expect(executeBatch, "nothing downstream may run").not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("a NotConfiguredError from getUser stays a 503, not a 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    getUser.mockRejectedValueOnce(new NotConfiguredError("Supabase is not configured.", "missing-key"));

    const res = await POST(req(body(ADD_PAYLOAD)));
    const json = (await res.json()) as { error?: { code?: string; correlationId?: string } };

    expect(res.status).toBe(503);
    expect(json.error?.code).toBe("NOT_CONFIGURED");
    expect(json.error?.correlationId).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("an unauthenticated caller still gets 401 before anything is parsed", async () => {
    // Guarding `getUser()` must not be done by moving it after the body parse:
    // an anonymous caller would learn whether their body validated. The 401 is
    // §2.3 rule 11; what precedes it is this assertion.
    getUser.mockResolvedValueOnce(null);

    const res = await POST(req({ actions: [] }));
    const json = (await res.json()) as { error?: { code?: string } };

    expect(res.status).toBe(401);
    expect(json.error?.code).toBe("UNAUTHORIZED");
  });
});
