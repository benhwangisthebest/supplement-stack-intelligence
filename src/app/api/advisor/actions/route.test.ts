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
import type { NextRequest } from "next/server";
import type { AdvisorContext } from "@/types/advisor";
import type { Stack, StackItem } from "@/types";

const getUser = vi.fn();
const loadAdvisorContext = vi.fn();
const cumulativeRecheck = vi.fn();
const executeBatch = vi.fn();
const getStack = vi.fn();
const recordBatch = vi.fn();
const getSupplementById = vi.fn();
const matchProducts = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/advisor/context-loader", () => ({
  loadAdvisorContext: (...a: unknown[]) => loadAdvisorContext(...a),
}));
vi.mock("@/lib/advisor/safety-recheck", () => ({
  cumulativeRecheck: (...a: unknown[]) => cumulativeRecheck(...a),
}));
vi.mock("@/lib/advisor/actions/execute", () => ({
  executeBatch: (...a: unknown[]) => executeBatch(...a),
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
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  arrangeSuccess();
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
    executeBatch.mockRejectedValue(new Error("duplicate key value violates unique constraint"));

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
});
