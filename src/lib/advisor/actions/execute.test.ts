// Application/Infrastructure — tests for the advisor's ONLY write path (Phase 1 U10).
//
// WHY THIS EXISTS: `execute.ts` is the sole place advisor-actions mutate data.
// Everything it does is either (a) a repo call, or (b) the construction of the
// INVERSE intent that one-click undo will later replay. Neither is observable
// from the pure `apply.ts` unit tests, because both depend on runtime snapshots
// — the id a repo assigned, the value a column held BEFORE the write.
//
// That is the specific failure class this file guards. An inverse built from
// post-write state is not a reversal; it is a no-op that looks like one, and it
// would only surface when a user pressed undo and nothing happened.
//
// `./apply` is deliberately NOT mocked. It is pure, it is the contract under
// test ("the inverse we persist"), and mocking it would reduce these tests to
// asserting that a mock was called.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionProposal, WriteIntent } from "@/types/advisor-action";
import type { StackItem } from "@/types";

const addItem = vi.fn();
const deleteItem = vi.fn();
const updateItem = vi.fn();
const getItemProductId = vi.fn();
const setItemProduct = vi.fn();
const createStack = vi.fn();
const deleteStack = vi.fn();

vi.mock("@/lib/db/stack-item-repo", () => ({
  addItem: (...a: unknown[]) => addItem(...a),
  deleteItem: (...a: unknown[]) => deleteItem(...a),
  updateItem: (...a: unknown[]) => updateItem(...a),
  getItemProductId: (...a: unknown[]) => getItemProductId(...a),
  setItemProduct: (...a: unknown[]) => setItemProduct(...a),
}));
vi.mock("@/lib/db/stack-repo", () => ({
  createStack: (...a: unknown[]) => createStack(...a),
  deleteStack: (...a: unknown[]) => deleteStack(...a),
}));

// U20: the rollback catch reports through `reportInternalError`. Mocked rather
// than spying on the console, because what this file needs to assert is the
// CALL and its code — the real function's logging shape is respond.test.ts's
// business, and the real one would emit noise into every run of this suite.
const reportInternalError = vi.fn((..._a: unknown[]) => "cid-test");
vi.mock("@/lib/api/respond", () => ({
  reportInternalError: (...a: unknown[]) => reportInternalError(...a),
}));

import { executeBatch, executeIntent, executeProposal } from "./execute";

/** The module only forwards this value to the repos; it never reads it. */
const DB = {} as unknown as SupabaseClient;
const USER = "u1";

// Annotated fixtures — the U1 lesson. An unannotated literal would let an
// invented field compile and fail only at runtime.
const PRIOR: StackItem = {
  id: "i1",
  stackId: "s1",
  supplementId: "magnesium",
  customName: null,
  dose: 200,
  unit: "mg",
  timing: "bedtime",
  frequency: "daily",
  reason: "sleep",
  notes: null,
};

function proposal(over: Partial<ActionProposal> & Pick<ActionProposal, "type" | "payload">): ActionProposal {
  return {
    stackId: "s1",
    diff: [],
    editable: null,
    rationaleCitations: [],
    ...over,
  };
}

const ADD = proposal({
  type: "add_item",
  payload: {
    supplementId: "creatine",
    dose: 5,
    unit: "g",
    timing: "morning",
    frequency: "daily",
    reason: null,
  },
});

const REMOVE = proposal({ type: "remove_item", payload: { stackItemId: "i1" } });
const EDIT = proposal({ type: "edit_item", payload: { stackItemId: "i1", dose: 400 } });
const ATTACH = proposal({
  type: "attach_product",
  payload: { stackItemId: "i1", productId: "p-new" },
});
const PROTOCOL = proposal({
  type: "generate_protocol",
  payload: {
    stackName: "Generated",
    intent: "sleep",
    items: [
      { supplementId: "magnesium", customName: null, dose: 200, unit: "mg", timing: null, frequency: null, reason: null, notes: null },
      { supplementId: "glycine", customName: null, dose: 3, unit: "g", timing: null, frequency: null, reason: null, notes: null },
    ],
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  addItem.mockResolvedValue({ ...PRIOR, id: "i-new" });
  deleteItem.mockResolvedValue(undefined);
  updateItem.mockResolvedValue(undefined);
  getItemProductId.mockResolvedValue("p-old");
  setItemProduct.mockResolvedValue(undefined);
  createStack.mockResolvedValue({ id: "s-new" });
  deleteStack.mockResolvedValue(undefined);
});

describe("executeProposal — add_item", () => {
  it("writes through addItem with the proposal's stack id", async () => {
    await executeProposal(DB, USER, ADD, null);

    expect(addItem).toHaveBeenCalledWith(
      DB,
      "s1",
      expect.objectContaining({ supplementId: "creatine", dose: 5, unit: "g" }),
    );
  });

  it("builds the inverse from the id the repo assigned, not the proposal", async () => {
    const res = await executeProposal(DB, USER, ADD, null);

    // "i-new" exists only after the write. This is the runtime snapshot that
    // pure apply.ts tests cannot cover.
    expect(res.inverse).toEqual({ op: "delete_item", stackId: "s1", itemId: "i-new" });
    expect(res.resultingItemId).toBe("i-new");
    expect(res.createdStackId).toBeNull();
  });

  it("applies confirm-card edits over the proposal payload", async () => {
    await executeProposal(DB, USER, ADD, null, { dose: 10, unit: "g" });

    expect(addItem).toHaveBeenCalledWith(DB, "s1", expect.objectContaining({ dose: 10 }));
  });
});

describe("executeProposal — remove_item", () => {
  it("deletes the prior item and inverts to a re-add of its full prior state", async () => {
    const res = await executeProposal(DB, USER, REMOVE, PRIOR);

    expect(deleteItem).toHaveBeenCalledWith(DB, "i1");
    expect(res.inverse).toEqual({
      op: "add_item",
      stackId: "s1",
      input: expect.objectContaining({ supplementId: "magnesium", dose: 200, timing: "bedtime" }),
    });
    expect(res.resultingItemId).toBeNull();
  });

  it("refuses to write at all without the prior item", async () => {
    await expect(executeProposal(DB, USER, REMOVE, null)).rejects.toThrow(
      "remove_item requires priorItem",
    );
    expect(deleteItem).not.toHaveBeenCalled();
  });
});

describe("executeProposal — edit_item", () => {
  it("updates the item and inverts to the PRE-edit values", async () => {
    const res = await executeProposal(DB, USER, EDIT, PRIOR);

    expect(updateItem).toHaveBeenCalledWith(DB, "i1", expect.objectContaining({ dose: 400 }));
    // The inverse must carry 200 — the dose before the write, not after.
    expect(res.inverse).toEqual({
      op: "update_item",
      stackId: "s1",
      itemId: "i1",
      input: expect.objectContaining({ dose: 200 }),
    });
    expect(res.resultingItemId).toBe("i1");
  });

  it("refuses to write at all without the prior item", async () => {
    await expect(executeProposal(DB, USER, EDIT, null)).rejects.toThrow(
      "edit_item requires priorItem",
    );
    expect(updateItem).not.toHaveBeenCalled();
  });
});

describe("executeProposal — generate_protocol", () => {
  it("creates the stack under the caller's id, then adds every item to it", async () => {
    await executeProposal(DB, USER, PROTOCOL, null);

    expect(createStack).toHaveBeenCalledWith(DB, "u1", expect.objectContaining({ name: "Generated" }));
    expect(addItem).toHaveBeenCalledTimes(2);
    // Items go to the id the repo returned, not to the proposal's stackId.
    expect(addItem).toHaveBeenNthCalledWith(1, DB, "s-new", expect.objectContaining({ supplementId: "magnesium" }));
    expect(addItem).toHaveBeenNthCalledWith(2, DB, "s-new", expect.objectContaining({ supplementId: "glycine" }));
  });

  it("inverts to deleting the stack that was actually created", async () => {
    const res = await executeProposal(DB, USER, PROTOCOL, null);

    expect(res.inverse).toEqual({ op: "delete_stack", stackId: "s-new" });
    expect(res.createdStackId).toBe("s-new");
  });
});

describe("executeProposal — attach_product", () => {
  it("reads the prior product id BEFORE writing the new one", async () => {
    const order: string[] = [];
    getItemProductId.mockImplementation(async () => {
      order.push("read");
      return "p-old";
    });
    setItemProduct.mockImplementation(async () => {
      order.push("write");
    });

    await executeProposal(DB, USER, ATTACH, null);

    // Ordering IS the correctness property: a read after the write returns
    // "p-new", and the stored inverse would restore the value it just set.
    expect(order).toEqual(["read", "write"]);
  });

  it("inverts to the product the item held before the write", async () => {
    // The mocks are made STATEFUL here on purpose. With a constant-returning
    // read mock, moving the read after the write still yields "p-old" and this
    // assertion stays green — the mutation survives the value check and only
    // the ordering check above catches it. Modelling the column makes the
    // value assertion sensitive too, so the property has two independent
    // guards rather than one.
    let column: string | null = "p-old";
    getItemProductId.mockImplementation(async () => column);
    setItemProduct.mockImplementation(async (_db: unknown, _id: string, pid: string | null) => {
      column = pid;
    });

    const res = await executeProposal(DB, USER, ATTACH, null);

    expect(setItemProduct).toHaveBeenCalledWith(DB, "i1", "p-new");
    expect(res.inverse).toEqual({
      op: "set_item_product",
      stackId: "s1",
      itemId: "i1",
      productId: "p-old",
    });
  });

  it("inverts to null when the item had no product", async () => {
    getItemProductId.mockResolvedValue(null);

    const res = await executeProposal(DB, USER, ATTACH, null);

    expect(res.inverse).toMatchObject({ productId: null });
  });
});

describe("executeBatch — success", () => {
  it("executes sequentially and returns one result per action, in order", async () => {
    const res = await executeBatch(
      DB,
      USER,
      [{ proposal: ADD }, { proposal: REMOVE }],
      [null, PRIOR],
    );

    expect(res).toHaveLength(2);
    expect(res[0].proposal.type).toBe("add_item");
    expect(res[1].proposal.type).toBe("remove_item");
    expect(res[0].exec.inverse).toMatchObject({ op: "delete_item", itemId: "i-new" });
  });

  it("pairs priorItems[i] with actions[i]", async () => {
    await executeBatch(DB, USER, [{ proposal: ADD }, { proposal: EDIT }], [null, PRIOR]);

    expect(updateItem).toHaveBeenCalledWith(DB, "i1", expect.anything());
  });
});

describe("executeBatch — all-or-nothing rollback", () => {
  /** Fails on the Nth addItem call, succeeding before that. */
  function failAddOnCall(n: number) {
    let calls = 0;
    addItem.mockImplementation(async () => {
      calls += 1;
      if (calls === n) throw new Error("write failed");
      return { ...PRIOR, id: `i-new-${calls}` };
    });
  }

  it("replays the applied inverses in REVERSE order", async () => {
    const order: string[] = [];
    deleteItem.mockImplementation(async (_db: unknown, id: string) => {
      order.push(`delete:${id}`);
    });
    // add, add, then a third action that throws.
    failAddOnCall(3);

    await expect(
      executeBatch(DB, USER, [{ proposal: ADD }, { proposal: ADD }, { proposal: ADD }], [null, null, null]),
    ).rejects.toThrow("write failed");

    // Newest first: the second add's item is removed before the first's.
    expect(order).toEqual(["delete:i-new-2", "delete:i-new-1"]);
  });

  it("rolls back nothing when the very first action fails", async () => {
    failAddOnCall(1);

    await expect(
      executeBatch(DB, USER, [{ proposal: ADD }, { proposal: ADD }], [null, null]),
    ).rejects.toThrow("write failed");

    expect(deleteItem).not.toHaveBeenCalled();
  });

  it("re-throws the ORIGINAL failure even when a rollback step also fails", async () => {
    failAddOnCall(2);
    deleteItem.mockRejectedValue(new Error("rollback exploded"));

    // Best-effort rollback must never mask the real cause.
    await expect(
      executeBatch(DB, USER, [{ proposal: ADD }, { proposal: ADD }], [null, null]),
    ).rejects.toThrow("write failed");
  });

  it("attempts every inverse even if an earlier rollback step throws", async () => {
    const attempted: string[] = [];
    deleteItem.mockImplementation(async (_db: unknown, id: string) => {
      attempted.push(id);
      throw new Error("rollback exploded");
    });
    failAddOnCall(3);

    await expect(
      executeBatch(DB, USER, [{ proposal: ADD }, { proposal: ADD }, { proposal: ADD }], [null, null, null]),
    ).rejects.toThrow("write failed");

    expect(attempted).toEqual(["i-new-2", "i-new-1"]);
  });

  // U20 (FU-2). A failed rollback leaves the stack half-applied — the one state
  // executeBatch exists to prevent — and used to vanish without a trace. These
  // two are a pair on purpose: the first proves the report happens, the second
  // proves it is tied to rollback FAILURE rather than fired unconditionally,
  // which an "expect it was called" test alone would not distinguish.
  it("reports every failed rollback step under ROLLBACK_FAILED", async () => {
    const boom = new Error("rollback exploded");
    deleteItem.mockRejectedValue(boom);
    failAddOnCall(3);

    await expect(
      executeBatch(
        DB,
        USER,
        [{ proposal: ADD }, { proposal: ADD }, { proposal: ADD }],
        [null, null, null],
      ),
    ).rejects.toThrow("write failed"); // the original cause, still unmasked

    // Both attempted inverses failed, so both are reported — a single report
    // would hide how much of the stack is still half-applied.
    expect(reportInternalError).toHaveBeenCalledTimes(2);
    expect(reportInternalError).toHaveBeenCalledWith(boom, "ROLLBACK_FAILED");
  });

  it("reports nothing when the rollback itself succeeds", async () => {
    failAddOnCall(2);
    deleteItem.mockResolvedValue(undefined);

    await expect(
      executeBatch(DB, USER, [{ proposal: ADD }, { proposal: ADD }], [null, null]),
    ).rejects.toThrow("write failed");

    expect(deleteItem).toHaveBeenCalledTimes(1); // the rollback really ran
    expect(reportInternalError).not.toHaveBeenCalled();
  });
});

describe("executeIntent — every op reaches its repo", () => {
  const cases: { intent: WriteIntent; assert: () => void }[] = [
    {
      intent: { op: "add_item", stackId: "s1", input: { ...PRIOR, id: undefined } as never },
      assert: () => expect(addItem).toHaveBeenCalledWith(DB, "s1", expect.anything()),
    },
    {
      intent: { op: "update_item", stackId: "s1", itemId: "i1", input: {} as never },
      assert: () => expect(updateItem).toHaveBeenCalledWith(DB, "i1", expect.anything()),
    },
    {
      intent: { op: "delete_item", stackId: "s1", itemId: "i1" },
      assert: () => expect(deleteItem).toHaveBeenCalledWith(DB, "i1"),
    },
    {
      intent: { op: "delete_stack", stackId: "s1" },
      assert: () => expect(deleteStack).toHaveBeenCalledWith(DB, "u1", "s1"),
    },
    {
      intent: { op: "set_item_product", stackId: "s1", itemId: "i1", productId: null },
      assert: () => expect(setItemProduct).toHaveBeenCalledWith(DB, "i1", null),
    },
  ];

  for (const { intent, assert } of cases) {
    it(`executes ${intent.op}`, async () => {
      await executeIntent(DB, USER, intent);
      assert();
    });
  }

  it("executes create_stack_with_items under the caller's id, then its items", async () => {
    await executeIntent(DB, USER, {
      op: "create_stack_with_items",
      stack: { name: "Restored", intent: "sleep", mode: "current", description: null },
      items: [{ supplementId: "zinc", customName: null, dose: 15, unit: "mg", timing: null, frequency: null, reason: null, notes: null }],
    });

    expect(createStack).toHaveBeenCalledWith(DB, "u1", expect.objectContaining({ name: "Restored" }));
    expect(addItem).toHaveBeenCalledWith(DB, "s-new", expect.objectContaining({ supplementId: "zinc" }));
  });
});
