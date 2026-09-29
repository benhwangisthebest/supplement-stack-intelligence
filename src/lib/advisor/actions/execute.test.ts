// Application/Infrastructure — tests for the advisor's ONLY write path (Phase 1 U10).
//
// WHY THIS EXISTS: `execute.ts` is the sole place advisor-actions mutate data.
// Everything it does is either (a) a repo call, or (b) the construction of the
// INVERSE intent that one-click undo will later replay. Neither is observable
// from the pure `apply.ts` unit tests, because both depend on runtime snapshots
// — the id a repo assigned, the version a write left.
//
// That is the specific failure class this file guards. An inverse built from
// post-write state is not a reversal; it is a no-op that looks like one, and it
// would only surface when a user pressed undo and nothing happened.
//
// `./apply` is deliberately NOT mocked. It is pure, it is the contract under
// test ("the inverse we persist"), and mocking it would reduce these tests to
// asserting that a mock was called. The interleavings against a real table
// model live in `version-cas.test.ts` (U10 (c)).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionProposal, WriteIntent } from "@/types/advisor-action";
import type { StackItem } from "@/types";

const addItem = vi.fn();
const listItems = vi.fn();
const deleteItemAtVersion = vi.fn();
const updateItemAtVersion = vi.fn();
const setItemProduct = vi.fn();
const restoreItem = vi.fn();
const createStack = vi.fn();
const deleteStack = vi.fn();

vi.mock("@/lib/db/stack-item-repo", () => ({
  addItem: (...a: unknown[]) => addItem(...a),
  listItems: (...a: unknown[]) => listItems(...a),
  deleteItemAtVersion: (...a: unknown[]) => deleteItemAtVersion(...a),
  updateItemAtVersion: (...a: unknown[]) => updateItemAtVersion(...a),
  setItemProduct: (...a: unknown[]) => setItemProduct(...a),
  restoreItem: (...a: unknown[]) => restoreItem(...a),
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

import {
  executeBatch,
  executeProposal,
  isStaleWrite,
  rollbackOutcomeOf,
  undoPass,
} from "./execute";

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
  productId: "p-old",
  version: 3,
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
  let created = 0;
  addItem.mockImplementation(async () => ({ ...PRIOR, id: `i-new-${++created}`, version: 0 }));
  listItems.mockResolvedValue([]);
  deleteItemAtVersion.mockResolvedValue(true);
  updateItemAtVersion.mockResolvedValue({ ...PRIOR, dose: 400, version: 4 });
  setItemProduct.mockResolvedValue({ ...PRIOR, productId: "p-new", version: 4 });
  restoreItem.mockResolvedValue(true);
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

  it("builds the inverse from the id and version the repo assigned, not the proposal", async () => {
    const res = await executeProposal(DB, USER, ADD, null);

    // "i-new-1" and its version exist only after the write. This is the runtime
    // snapshot that pure apply.ts tests cannot cover.
    expect(res.inverse).toEqual({ op: "delete_item", stackId: "s1", itemId: "i-new-1", expect: { version: 0 } });
    expect(res.resultingItemId).toBe("i-new-1");
    expect(res.createdStackId).toBeNull();
  });

  it("applies confirm-card edits over the proposal payload", async () => {
    await executeProposal(DB, USER, ADD, null, { dose: 10, unit: "g" });

    expect(addItem).toHaveBeenCalledWith(DB, "s1", expect.objectContaining({ dose: 10 }));
  });
});

describe("executeProposal — remove_item", () => {
  it("deletes at the version read and inverts to a restore of its id, version, product and state", async () => {
    const res = await executeProposal(DB, USER, REMOVE, PRIOR);

    expect(deleteItemAtVersion).toHaveBeenCalledWith(DB, "i1", 3);
    expect(res.inverse).toEqual({
      op: "add_item",
      stackId: "s1",
      input: expect.objectContaining({ supplementId: "magnesium", dose: 200, timing: "bedtime", reason: "sleep" }),
      restore: { itemId: "i1", version: 3, productId: "p-old" },
    });
    expect(res.resultingItemId).toBeNull();
  });

  it("refuses to write at all without the prior item", async () => {
    await expect(executeProposal(DB, USER, REMOVE, null)).rejects.toThrow(
      "remove_item requires priorItem",
    );
    expect(deleteItemAtVersion).not.toHaveBeenCalled();
  });

  it("a remove at a version that has moved on deletes nothing and records no inverse", async () => {
    deleteItemAtVersion.mockResolvedValue(false);

    await expect(executeProposal(DB, USER, REMOVE, PRIOR)).rejects.toSatisfy(isStaleWrite);
  });
});

describe("executeProposal — edit_item", () => {
  it("updates at the version read and inverts to the PRE-edit values, expecting the version it wrote", async () => {
    const res = await executeProposal(DB, USER, EDIT, PRIOR);

    expect(updateItemAtVersion).toHaveBeenCalledWith(DB, "i1", expect.objectContaining({ dose: 400 }), 3);
    // The inverse must carry 200 — the dose before the write, not after.
    expect(res.inverse).toEqual({
      op: "update_item",
      stackId: "s1",
      itemId: "i1",
      input: expect.objectContaining({ dose: 200 }),
      expect: { version: 4, restores: 3 },
    });
    expect(res.resultingItemId).toBe("i1");
    expect(res.after).toMatchObject({ dose: 400, version: 4 });
  });

  it("refuses to write at all without the prior item", async () => {
    await expect(executeProposal(DB, USER, EDIT, null)).rejects.toThrow(
      "edit_item requires priorItem",
    );
    expect(updateItemAtVersion).not.toHaveBeenCalled();
  });

  it("an edit not applied is a stale write, and only that is (FU-77)", async () => {
    updateItemAtVersion.mockResolvedValue(null);
    const stale = await executeProposal(DB, USER, EDIT, PRIOR).catch((e: unknown) => e);
    expect(isStaleWrite(stale)).toBe(true);
    expect(isStaleWrite(new Error("write failed"))).toBe(false);
    expect(isStaleWrite(null)).toBe(false);
  });

  it("refuses an item read without a version rather than writing unconditionally", async () => {
    await expect(executeProposal(DB, USER, EDIT, { ...PRIOR, version: undefined })).rejects.toThrow(
      "stack item carries no version",
    );
    expect(updateItemAtVersion).not.toHaveBeenCalled();
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

  it("inverts to deleting the stack that was created, expecting the items it created", async () => {
    const res = await executeProposal(DB, USER, PROTOCOL, null);

    expect(res.inverse).toEqual({
      op: "delete_stack",
      stackId: "s-new",
      expectItems: [
        { itemId: "i-new-1", version: 0 },
        { itemId: "i-new-2", version: 0 },
      ],
    });
    expect(res.createdStackId).toBe("s-new");
  });
});

describe("executeProposal — attach_product", () => {
  it("writes at the version read and inverts to the product the item held then", async () => {
    const res = await executeProposal(DB, USER, ATTACH, PRIOR);

    expect(setItemProduct).toHaveBeenCalledWith(DB, "i1", "p-new", 3);
    expect(res.inverse).toEqual({
      op: "set_item_product",
      stackId: "s1",
      itemId: "i1",
      productId: "p-old",
      expect: { version: 4, restores: 3 },
    });
  });

  it("inverts to null when the item had no product", async () => {
    const res = await executeProposal(DB, USER, ATTACH, { ...PRIOR, productId: null });

    expect(res.inverse).toMatchObject({ productId: null });
  });

  it("refuses to write at all without the prior item", async () => {
    await expect(executeProposal(DB, USER, ATTACH, null)).rejects.toThrow("attach_product requires priorItem");
    expect(setItemProduct).not.toHaveBeenCalled();
  });
});

// Phase 4 U10, FU-1 / (c). Two confirms built from the same read both expect the
// version they read. The model below honours that expectation as the WHERE
// clause does in Postgres: the first moves the version, so the second misses.
describe("executeProposal — two confirms from one read: the second is not applied (U10, FU-1, N-102)", () => {
  function versioned() {
    const state = { version: 3, product: "p-old" as string | null, dose: 200 };
    setItemProduct.mockImplementation(async (_db: unknown, _id: string, pid: string | null, at: number) => {
      if (at !== state.version) return null;
      state.product = pid;
      return { ...PRIOR, productId: pid, version: ++state.version };
    });
    updateItemAtVersion.mockImplementation(async (_db: unknown, _id: string, input: { dose: number }, at: number) => {
      if (at !== state.version) return null;
      state.dose = input.dose;
      return { ...PRIOR, dose: input.dose, version: ++state.version };
    });
    return state;
  }

  it("two attaches: the first's inverse restores what was current; the second records none", async () => {
    const state = versioned();
    const P2 = proposal({ type: "attach_product", payload: { stackItemId: "i1", productId: "p2" } });

    const [first, second] = await Promise.allSettled([
      executeProposal(DB, USER, ATTACH, PRIOR),
      executeProposal(DB, USER, P2, PRIOR),
    ]);

    expect(first).toMatchObject({ status: "fulfilled", value: { inverse: { productId: "p-old" } } });
    expect(second.status).toBe("rejected");
    expect(state.product).toBe("p-new");
  });

  it("two edits: the first's inverse restores what was current; the second records none", async () => {
    const state = versioned();
    const EDIT_500 = proposal({ type: "edit_item", payload: { stackItemId: "i1", dose: 500 } });

    const [first, second] = await Promise.allSettled([
      executeProposal(DB, USER, EDIT, PRIOR),
      executeProposal(DB, USER, EDIT_500, PRIOR),
    ]);

    expect(first).toMatchObject({ status: "fulfilled", value: { inverse: { input: { dose: 200 } } } });
    expect(second.status).toBe("rejected");
    expect(state.dose).toBe(400);
  });
});

// Phase 4 U10 (c), N-105. Undo and rollback replay an inverse only while its
// item holds the version the forward write left. A row recorded before (c)
// carries no version and fails closed.
describe("undoPass — writes only over what the action wrote (U10 (c), N-105)", () => {
  it("replays an edit's inverse at the version the edit left", async () => {
    const undo = undoPass(DB, USER);
    const inverse: WriteIntent = {
      op: "update_item", stackId: "s1", itemId: "i1", input: {} as never, expect: { version: 4, restores: 3 },
    };

    expect(await undo(inverse)).toBe(true);
    expect(updateItemAtVersion).toHaveBeenCalledWith(DB, "i1", {}, 4);
  });

  it("answers false, writing nothing more, when the item has moved on", async () => {
    updateItemAtVersion.mockResolvedValue(null);
    setItemProduct.mockResolvedValue(null);
    deleteItemAtVersion.mockResolvedValue(false);
    const undo = undoPass(DB, USER);

    expect(await undo({ op: "update_item", stackId: "s1", itemId: "i1", input: {} as never, expect: { version: 4 } })).toBe(false);
    expect(await undo({ op: "set_item_product", stackId: "s1", itemId: "i1", productId: null, expect: { version: 4 } })).toBe(false);
    expect(await undo({ op: "delete_item", stackId: "s1", itemId: "i1", expect: { version: 0 } })).toBe(false);
  });

  it.each<[string, WriteIntent]>([
    ["update_item", { op: "update_item", stackId: "s1", itemId: "i1", input: {} as never }],
    ["set_item_product", { op: "set_item_product", stackId: "s1", itemId: "i1", productId: "p-old" }],
    ["delete_item", { op: "delete_item", stackId: "s1", itemId: "i1" }],
    ["delete_stack", { op: "delete_stack", stackId: "s-new" }],
    ["create_stack_with_items", { op: "create_stack_with_items", stack: {} as never, items: [] }],
  ])("fails closed on a %s inverse that carries no version", async (_op, inverse) => {
    expect(await undoPass(DB, USER)(inverse)).toBe(false);
    for (const write of [updateItemAtVersion, setItemProduct, deleteItemAtVersion, deleteStack, addItem]) {
      expect(write).not.toHaveBeenCalled();
    }
  });

  it("restores a removed item under its id, version and product (N-104)", async () => {
    const restore = { itemId: "i1", version: 3, productId: "p-old" };

    expect(await undoPass(DB, USER)({ op: "add_item", stackId: "s1", input: {} as never, restore })).toBe(true);
    expect(restoreItem).toHaveBeenCalledWith(DB, "s1", restore, {});
    expect(addItem).not.toHaveBeenCalled();
  });

  it("re-adds from a pre-(c) remove row as an insert, which overwrites nothing", async () => {
    expect(await undoPass(DB, USER)({ op: "add_item", stackId: "s1", input: {} as never })).toBe(true);
    expect(addItem).toHaveBeenCalledWith(DB, "s1", {});
  });

  it("chains: an inverse expecting the version an earlier one restored expects what that one wrote (N-107)", async () => {
    updateItemAtVersion
      .mockResolvedValueOnce({ ...PRIOR, version: 6 })
      .mockResolvedValueOnce({ ...PRIOR, version: 7 });
    const undo = undoPass(DB, USER);

    // edit 3 → 4, edit 4 → 5; undone newest first.
    await undo({ op: "update_item", stackId: "s1", itemId: "i1", input: {} as never, expect: { version: 5, restores: 4 } });
    await undo({ op: "update_item", stackId: "s1", itemId: "i1", input: {} as never, expect: { version: 4, restores: 3 } });

    expect(updateItemAtVersion).toHaveBeenNthCalledWith(1, DB, "i1", {}, 5);
    expect(updateItemAtVersion).toHaveBeenNthCalledWith(2, DB, "i1", {}, 6);
  });

  describe("a protocol's stack", () => {
    const INVERSE: WriteIntent = {
      op: "delete_stack",
      stackId: "s-new",
      expectItems: [{ itemId: "a", version: 0 }, { itemId: "b", version: 0 }],
    };
    const item = (id: string, version: number) => ({ ...PRIOR, id, stackId: "s-new", version });

    it("is deleted when it holds exactly the items created, unchanged", async () => {
      listItems.mockResolvedValueOnce([item("a", 0), item("b", 0)]).mockResolvedValueOnce([]);

      expect(await undoPass(DB, USER)(INVERSE)).toBe(true);
      expect(deleteItemAtVersion).toHaveBeenCalledWith(DB, "a", 0);
      expect(deleteItemAtVersion).toHaveBeenCalledWith(DB, "b", 0);
      expect(deleteStack).toHaveBeenCalledWith(DB, USER, "s-new");
    });

    it.each([
      ["an item was edited", [item("a", 1), item("b", 0)]],
      ["an item was added", [item("a", 0), item("b", 0), item("c", 0)]],
      ["an item was removed", [item("a", 0)]],
    ])("deletes nothing when %s", async (_why, items) => {
      listItems.mockResolvedValueOnce(items);

      expect(await undoPass(DB, USER)(INVERSE)).toBe(false);
      expect(deleteItemAtVersion).not.toHaveBeenCalled();
      expect(deleteStack).not.toHaveBeenCalled();
    });

    it("keeps the stack when an item arrived after its own were deleted", async () => {
      listItems.mockResolvedValueOnce([item("a", 0), item("b", 0)]).mockResolvedValueOnce([item("c", 0)]);

      expect(await undoPass(DB, USER)(INVERSE)).toBe(false);
      expect(deleteStack).not.toHaveBeenCalled();
    });
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
    expect(res[0].exec.inverse).toMatchObject({ op: "delete_item", itemId: "i-new-1" });
  });

  it("pairs priorItems[i] with actions[i]", async () => {
    await executeBatch(DB, USER, [{ proposal: ADD }, { proposal: EDIT }], [null, PRIOR]);

    expect(updateItemAtVersion).toHaveBeenCalledWith(DB, "i1", expect.anything(), 3);
  });

  it("a second action on one item starts from the item as the first left it (N-107)", async () => {
    await executeBatch(DB, USER, [{ proposal: EDIT }, { proposal: REMOVE }], [PRIOR, PRIOR]);

    expect(deleteItemAtVersion).toHaveBeenCalledWith(DB, "i1", 4);
  });

  it("a rollback of an action whose item moved on is counted unreverted and logged", async () => {
    updateItemAtVersion.mockResolvedValueOnce({ ...PRIOR, dose: 400, version: 4 }).mockResolvedValueOnce(null);
    addItem.mockRejectedValue(new Error("write failed"));

    const err = await executeBatch(DB, USER, [{ proposal: EDIT }, { proposal: ADD }], [PRIOR, null]).catch(
      (e: unknown) => e,
    );

    expect(rollbackOutcomeOf(err)).toEqual({ reverted: 0, unreverted: 1 });
    expect(reportInternalError).toHaveBeenCalledWith(expect.objectContaining({ name: "StaleWriteError" }), "ROLLBACK_FAILED");
  });
});

describe("rollbackOutcomeOf — the third answer is 'no rollback was attempted' (U34)", () => {
  // `null` is not a default and not an absence of information: it is the
  // statement that nothing was rolled back, which the service turns into
  // `details: undefined` — the shape the outer catch has returned since U11.
  // Reporting it as a CLEAN rollback would be the same lie this unit is
  // removing, arriving through the fallback instead of the happy path.
  //
  // These also cover the service's defensive `outcome === null` branch, which
  // no route test reaches any more: since U34, `executeBatch` always attaches
  // counts, so a bare error from it models a collaborator that cannot exist.
  // The branch stays because it is a contract violation guard; it is tested
  // here, at the pure function, rather than through a fixture that pretends.
  it.each([
    ["a bare Error", new Error("write failed")],
    ["a string", "write failed"],
    ["null", null],
    ["undefined", undefined],
    ["an object with no counts", { message: "x" }],
    ["counts of the wrong type", { reverted: "1", unreverted: "0" }],
    ["only one count", { reverted: 1 }],
  ])("returns null for %s", (_label, value) => {
    expect(rollbackOutcomeOf(value)).toBeNull();
  });

  it("reads both counts when the error carries them", () => {
    expect(rollbackOutcomeOf(Object.assign(new Error("x"), { reverted: 2, unreverted: 1 }))).toEqual({
      reverted: 2,
      unreverted: 1,
    });
  });

  it("reads a zero count, which is a number and not an absence", () => {
    expect(rollbackOutcomeOf(Object.assign(new Error("x"), { reverted: 0, unreverted: 0 }))).toEqual({
      reverted: 0,
      unreverted: 0,
    });
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
    deleteItemAtVersion.mockImplementation(async (_db: unknown, id: string) => {
      order.push(`delete:${id}`);
      return true;
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

    expect(deleteItemAtVersion).not.toHaveBeenCalled();
  });

  it("re-throws the ORIGINAL failure even when a rollback step also fails", async () => {
    failAddOnCall(2);
    deleteItemAtVersion.mockRejectedValue(new Error("rollback exploded"));

    // Best-effort rollback must never mask the real cause.
    await expect(
      executeBatch(DB, USER, [{ proposal: ADD }, { proposal: ADD }], [null, null]),
    ).rejects.toThrow("write failed");
  });

  it("says HOW MUCH it reverted, so the caller does not have to assume (U34, N-74)", async () => {
    // [U34] M1's third half, red before any source edit.
    //
    // The test above pins that the original cause survives — correct, and it
    // is the whole of what U20 delivered for T-06. What NOTHING pinned is that
    // the caller is left unable to distinguish a clean rollback from a failed
    // one, because the rethrown error says nothing either way. The route then
    // answers `rolledBack: true` unconditionally: a claim about an undo that
    // did not happen.
    //
    // T-06 asked for the failure to be LOGGED and U20 logged it. The log is
    // still there — `reportInternalError(rollbackErr, "ROLLBACK_FAILED")` —
    // and it sits beside a response that contradicts it.
    failAddOnCall(2);
    deleteItemAtVersion.mockRejectedValue(new Error("rollback exploded"));

    const err = await executeBatch(
      DB,
      USER,
      [{ proposal: ADD }, { proposal: ADD }],
      [null, null],
    ).then(
      () => null,
      (e: unknown) => e as { reverted?: number; unreverted?: number },
    );

    // One inverse was attempted and it failed: nothing reverted, one did not.
    expect(err).toMatchObject({ reverted: 0, unreverted: 1 });
  });

  it("the ROLLBACK_FAILED log carries ids and counts, never a field value (U34)", async () => {
    // [U34] THE OWNER'S LOG TEST. §2.3 rule 15 governs the log absolutely:
    // health data does not go in it, whoever owns the row.
    //
    // The response half of the owner's proposal — returning the unreverted
    // inverse PAYLOADS to the authenticated owner — was ruled against on the
    // architect's objection (nothing reads `error.details`, so it would be
    // disclosure with no beneficiary; see FU-34). This half is built anyway,
    // and ids-only in the response makes it MORE important, not less.
    //
    // The leak vector is a throw site interpolating item values into a
    // message, a stack or a `cause` — which `logInternalError` reads
    // field-by-field and writes out. So the assertion is over EVERY argument
    // handed to the log boundary, flattened, searched for sentinels planted in
    // exactly the fields `itemToInput` copies.
    const SENTINELS = {
      customName: "SENTINEL-CUSTOM-NAME",
      unit: "SENTINEL-UNIT",
      reason: "SENTINEL-REASON-TEXT",
      notes: "SENTINEL-NOTES-TEXT",
      dose: 1234.5678,
    };
    const sentinelItem: StackItem = {
      ...PRIOR,
      customName: SENTINELS.customName,
      unit: SENTINELS.unit,
      reason: SENTINELS.reason,
      notes: SENTINELS.notes,
      dose: SENTINELS.dose,
    };

    // A remove_item that succeeds, then a failure, so the inverse carrying the
    // full prior state is the one that must be replayed — and fails.
    deleteItemAtVersion.mockResolvedValue(true);
    restoreItem.mockRejectedValue(new Error("rollback exploded"));

    const err = await executeBatch(
      DB,
      USER,
      [{ proposal: REMOVE }, { proposal: REMOVE }],
      [sentinelItem, null],
    ).then(
      () => null,
      (e: unknown) => e as { reverted: number; unreverted: number },
    );

    // Positive first, so the assertion below cannot pass vacuously by the log
    // having stopped: one record per failed inverse, under its own code.
    expect(reportInternalError).toHaveBeenCalledTimes(1);
    expect(reportInternalError.mock.calls[0][1]).toBe("ROLLBACK_FAILED");
    expect(err).toMatchObject({ reverted: 0, unreverted: 1 });

    // Everything the log boundary was handed, flattened — including `cause`
    // and any non-enumerable text reachable through String().
    const handed = reportInternalError.mock.calls
      .flat()
      .map((a) => {
        try {
          return `${String(a)} ${JSON.stringify(a)} ${a instanceof Error ? String(a.stack) : ""}`;
        } catch {
          return String(a);
        }
      })
      .join("\n");

    for (const [field, value] of Object.entries(SENTINELS)) {
      expect(handed, `the ${field} value reached the log`).not.toContain(String(value));
    }
  });

  it("does not stringify a non-Error throw into a message (U34, security review)", async () => {
    // A rejection whose `toString` carries data is the one way the counts
    // wrapper could have leaked: `new Error(String(err))` would lift that text
    // into a `message` the logger writes in full. `logInternalError` refuses
    // to copy a non-Error value; this pins that the wrapper does not undo it
    // one call earlier.
    const hostile = {
      toString: () => "SENTINEL-HOSTILE-TOSTRING",
      notes: "SENTINEL-NOTES-VIA-THROW",
    };
    addItem.mockImplementation(async () => {
      throw hostile;
    });

    const err = await executeBatch(DB, USER, [{ proposal: ADD }], [null]).then(
      () => null,
      (e: unknown) => e as Error & { reverted: number; unreverted: number },
    );

    // The counts still arrive — the safety fix does not cost the diagnosis.
    expect(err).toMatchObject({ reverted: 0, unreverted: 0 });
    expect(err?.message).toBe("Batch apply failed.");
    expect(err?.message).not.toContain("SENTINEL");
    // And the original went to the log through the path that knows how to
    // handle a value of unknown shape.
    expect(reportInternalError).toHaveBeenCalledWith(hostile, "BATCH_NON_ERROR_THROW");
  });

  it("reports a FULLY successful rollback as fully reverted (U34)", async () => {
    // The other side of the same claim — the two states must not collapse in
    // either direction, which is M5.
    failAddOnCall(2);
    deleteItemAtVersion.mockResolvedValue(true);

    const err = await executeBatch(
      DB,
      USER,
      [{ proposal: ADD }, { proposal: ADD }],
      [null, null],
    ).then(
      () => null,
      (e: unknown) => e as { reverted?: number; unreverted?: number },
    );

    expect(err).toMatchObject({ reverted: 1, unreverted: 0 });
  });

  it("attempts every inverse even if an earlier rollback step throws", async () => {
    const attempted: string[] = [];
    deleteItemAtVersion.mockImplementation(async (_db: unknown, id: string) => {
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
    deleteItemAtVersion.mockRejectedValue(boom);
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
    deleteItemAtVersion.mockResolvedValue(true);

    await expect(
      executeBatch(DB, USER, [{ proposal: ADD }, { proposal: ADD }], [null, null]),
    ).rejects.toThrow("write failed");

    expect(deleteItemAtVersion).toHaveBeenCalledTimes(1); // the rollback really ran
    expect(reportInternalError).not.toHaveBeenCalled();
  });
});

