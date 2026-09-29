// Phase 4 U10 (c) — every advisor write to a stack item is a compare-and-set on
// (id, version), and so is every undo and rollback of one.
//
// Nothing below is mocked except the log boundary. The real repos run against an
// in-memory table (`__testing__/fake-stack-db.ts`) that applies a filtered write
// the way Postgres does, so each interleaving here reaches the row: a stale undo
// overwrites the user's edit, or it does not. That is what makes these red at
// HEAD for the reason the finding names, rather than for a renamed mock.
//
// N-105: undo and rollback of edit, add and protocol expected nothing.
// N-107: a second action on one item in a batch expected the pre-batch read.
// N-104: undo of a remove dropped the product and the id.
// FU-78: the compare-and-set sent the item's values as URL filters.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionProposal } from "@/types/advisor-action";
import type { StackItem, StackItemInput } from "@/types";

vi.mock("@/lib/api/respond", () => ({ reportInternalError: vi.fn(() => "cid-test") }));

import { listItems, updateItem, deleteItem, addItem } from "@/lib/db/stack-item-repo";
import { itemToInput } from "./apply";
import { executeBatch, rollbackOutcomeOf, undoPass, type BatchItemResult } from "./execute";
import { fakeStackDb } from "./__testing__/fake-stack-db";

const USER = "u1";

function proposal(over: Pick<ActionProposal, "type" | "payload"> & Partial<ActionProposal>): ActionProposal {
  return { stackId: "s1", diff: [], editable: null, rationaleCitations: [], ...over };
}
const EDIT_DOSE = proposal({ type: "edit_item", payload: { stackItemId: "i1", dose: 400 } });
const EDIT_TIMING = proposal({ type: "edit_item", payload: { stackItemId: "i1", timing: "morning" } });
const REMOVE = proposal({ type: "remove_item", payload: { stackItemId: "i1" } });
const ATTACH = proposal({ type: "attach_product", payload: { stackItemId: "i1", productId: "p-new" } });
const STALE_EDIT_I2 = proposal({ type: "edit_item", payload: { stackItemId: "i2", dose: 30 } });
const ADD = proposal({
  type: "add_item",
  payload: { supplementId: "creatine", dose: 5, unit: "g", timing: "morning", frequency: "daily", reason: null },
});
const PROTOCOL = proposal({
  type: "generate_protocol",
  payload: {
    stackName: "Generated",
    intent: "sleep",
    items: [
      { supplementId: "glycine", customName: null, dose: 3, unit: "g", timing: null, frequency: null, reason: null, notes: null },
      { supplementId: "theanine", customName: null, dose: 200, unit: "mg", timing: null, frequency: null, reason: null, notes: null },
    ],
  },
});

let db: ReturnType<typeof fakeStackDb>;
let client: SupabaseClient;

beforeEach(() => {
  db = fakeStackDb();
  client = db.client as unknown as SupabaseClient;
  db.seedStack({ id: "s1", user_id: USER, name: "Mine", intent: "sleep" });
  db.seedItem({
    id: "i1", stack_id: "s1", supplement_id: "magnesium", dose: 200, unit: "mg", timing: "bedtime",
    frequency: "daily", reason: "sleep", notes: "private note", product_id: "p-old",
  });
  db.seedItem({ id: "i2", stack_id: "s1", supplement_id: "zinc", dose: 15, unit: "mg" });
});

/** What the advisor route reads before a confirm: the item from the owned stack. */
async function read(id: string, stackId = "s1"): Promise<StackItem> {
  const item = (await listItems(client, stackId)).find((i) => i.id === id);
  if (!item) throw new Error(`no ${id}`);
  return item;
}

/** A Stack Lab edit (PUT /api/stacks/:id/items/:itemId), from a fresh read. */
async function labEdit(id: string, patch: Partial<StackItemInput>, stackId = "s1") {
  await updateItem(client, id, { ...itemToInput(await read(id, stackId)), ...patch });
}

/** Grouped undo of a whole batch, newest first, as the undo route runs it. */
async function undoBatch(results: BatchItemResult[]): Promise<boolean[]> {
  const undo = undoPass(client, USER);
  const out: boolean[] = [];
  for (let i = results.length - 1; i >= 0; i--) out.unshift(await undo(results[i].exec.inverse));
  return out;
}

/** A batch whose last action is an edit of i2 built from a read that went stale. */
async function staleI2(): Promise<StackItem> {
  const snapshot = await read("i2");
  await labEdit("i2", { dose: 20 });
  return snapshot;
}

describe("N-105 — undo writes only over what the action wrote", () => {
  it("undo of an edit after a Stack Lab edit is not written", async () => {
    const [res] = await executeBatch(client, USER, [{ proposal: EDIT_DOSE }], [await read("i1")]);
    await labEdit("i1", { dose: 350 });

    expect(await undoBatch([res])).toEqual([false]);
    expect(db.item("i1")).toMatchObject({ dose: 350 });
  });

  it("undo of an edit nobody touched restores the prior values", async () => {
    const [res] = await executeBatch(client, USER, [{ proposal: EDIT_DOSE }], [await read("i1")]);

    expect(await undoBatch([res])).toEqual([true]);
    expect(db.item("i1")).toMatchObject({ dose: 200, notes: "private note" });
  });

  it("undo of an add after the user edited the new item is not written", async () => {
    const [res] = await executeBatch(client, USER, [{ proposal: ADD }], [null]);
    const added = res.exec.resultingItemId as string;
    await labEdit(added, { dose: 10 });

    expect(await undoBatch([res])).toEqual([false]);
    expect(db.item(added)).toMatchObject({ dose: 10 });
  });

  it("undo of a protocol after the user edited one of its items deletes nothing", async () => {
    const [res] = await executeBatch(client, USER, [{ proposal: PROTOCOL }], [null]);
    const stackId = res.exec.createdStackId as string;
    const [first] = await listItems(client, stackId);
    await labEdit(first.id, { dose: 9 }, stackId);

    expect(await undoBatch([res])).toEqual([false]);
    expect(db.stack(stackId)).toBeDefined();
    expect(await listItems(client, stackId)).toHaveLength(2);
  });

  it("undo of a protocol after the user added an item to it deletes nothing", async () => {
    const [res] = await executeBatch(client, USER, [{ proposal: PROTOCOL }], [null]);
    const stackId = res.exec.createdStackId as string;
    await addItem(client, stackId, { ...itemToInput(await read("i2")), supplementId: "zinc" });

    expect(await undoBatch([res])).toEqual([false]);
    expect(await listItems(client, stackId)).toHaveLength(3);
  });

  it("undo of a protocol keeps its stack when an item arrives after the check (N-108 re-check)", async () => {
    const [res] = await executeBatch(client, USER, [{ proposal: PROTOCOL }], [null]);
    const stackId = res.exec.createdStackId as string;
    // Lands after undo's first read, before its first delete.
    db.beforeWrite(1, async () => {
      await addItem(client, stackId, { ...itemToInput(await read("i2")), supplementId: "zinc" });
    });

    expect(await undoBatch([res])).toEqual([false]);
    expect(db.stack(stackId)).toBeDefined();
    expect(db.items().some((r) => r.stack_id === stackId && r.supplement_id === "zinc")).toBe(true);
  });

  it("undo of a protocol nobody touched deletes its stack", async () => {
    const [res] = await executeBatch(client, USER, [{ proposal: PROTOCOL }], [null]);

    expect(await undoBatch([res])).toEqual([true]);
    expect(db.stack(res.exec.createdStackId as string)).toBeUndefined();
  });

  it("a rollback of an add the user edited mid-batch leaves it and is counted unreverted", async () => {
    const stale = await staleI2();
    db.beforeWrite(2, async () => {
      const added = db.items().at(-1)?.id as string;
      await labEdit(added, { dose: 99 });
    });

    const err = await executeBatch(client, USER, [{ proposal: ADD }, { proposal: STALE_EDIT_I2 }], [null, stale]).catch(
      (e: unknown) => e,
    );

    expect(rollbackOutcomeOf(err)).toEqual({ reverted: 0, unreverted: 1 });
    expect(db.items().some((r) => r.supplement_id === "creatine" && r.dose === 99)).toBe(true);
  });

  it("a rollback of a protocol the user edited mid-batch keeps its stack and is counted unreverted", async () => {
    const stale = await staleI2();
    // Writes: createStack, two addItem, then the stale edit.
    db.beforeWrite(4, async () => {
      const item = db.items().find((r) => r.supplement_id === "glycine");
      await labEdit(item?.id as string, { dose: 4 }, item?.stack_id as string);
    });

    const err = await executeBatch(client, USER, [{ proposal: PROTOCOL }, { proposal: STALE_EDIT_I2 }], [null, stale]).catch(
      (e: unknown) => e,
    );

    expect(rollbackOutcomeOf(err)).toEqual({ reverted: 0, unreverted: 1 });
    expect(db.items().some((r) => r.supplement_id === "glycine" && r.dose === 4)).toBe(true);
  });
});

describe("N-107 — a batch can act twice on one item", () => {
  it("two edits of one item both apply, the second expecting the version the first wrote", async () => {
    const prior = await read("i1");

    await executeBatch(client, USER, [{ proposal: EDIT_DOSE }, { proposal: EDIT_TIMING }], [prior, prior]);

    expect(db.item("i1")).toMatchObject({ dose: 400, timing: "morning", version: 2 });
  });

  it("grouped undo of two edits of one item restores the original", async () => {
    const prior = await read("i1");
    const res = await executeBatch(client, USER, [{ proposal: EDIT_DOSE }, { proposal: EDIT_TIMING }], [prior, prior]);

    expect(await undoBatch(res)).toEqual([true, true]);
    expect(db.item("i1")).toMatchObject({ dose: 200, timing: "bedtime" });
  });

  it("a rollback of two edits of one item restores the original", async () => {
    const prior = await read("i1");
    const stale = await staleI2();

    const err = await executeBatch(
      client, USER,
      [{ proposal: EDIT_DOSE }, { proposal: EDIT_TIMING }, { proposal: STALE_EDIT_I2 }],
      [prior, prior, stale],
    ).catch((e: unknown) => e);

    expect(rollbackOutcomeOf(err)).toEqual({ reverted: 2, unreverted: 0 });
    expect(db.item("i1")).toMatchObject({ dose: 200, timing: "bedtime" });
  });

  it("an edit then a remove of one item apply, and undo restores the edited-away original", async () => {
    const prior = await read("i1");
    const res = await executeBatch(client, USER, [{ proposal: EDIT_DOSE }, { proposal: REMOVE }], [prior, prior]);
    expect(db.item("i1")).toBeUndefined();

    expect(await undoBatch(res)).toEqual([true, true]);
    expect(db.item("i1")).toMatchObject({ dose: 200, product_id: "p-old", notes: "private note" });
  });
});

describe("N-104 — undo of a remove restores the item with its product", () => {
  it("undo puts the item back under its id, with its product and free text", async () => {
    const res = await executeBatch(client, USER, [{ proposal: REMOVE }], [await read("i1")]);

    expect(await undoBatch(res)).toEqual([true]);
    expect(db.item("i1")).toMatchObject({ stack_id: "s1", dose: 200, product_id: "p-old", reason: "sleep" });
  });

  it("a second undo of the same remove overwrites nothing", async () => {
    const res = await executeBatch(client, USER, [{ proposal: REMOVE }], [await read("i1")]);
    await undoBatch(res);
    await labEdit("i1", { dose: 250 });

    expect(await undoBatch(res)).toEqual([false]);
    expect(db.item("i1")).toMatchObject({ dose: 250 });
  });

  it("a rollback of an attach then a remove of one item reverts both", async () => {
    const prior = await read("i1");
    const stale = await staleI2();

    const err = await executeBatch(
      client, USER,
      [{ proposal: ATTACH }, { proposal: REMOVE }, { proposal: STALE_EDIT_I2 }],
      [prior, prior, stale],
    ).catch((e: unknown) => e);

    expect(rollbackOutcomeOf(err)).toEqual({ reverted: 2, unreverted: 0 });
    expect(db.item("i1")).toMatchObject({ product_id: "p-old", dose: 200 });
  });
});

describe("AC-6 — Stack Lab's writes move the version the advisor expects", () => {
  it("a Stack Lab edit that loses a race re-reads and still lands, moving the version past both", async () => {
    const advisorRead = await read("i1");
    // An advisor edit lands between Stack Lab's version read and its write.
    db.beforeWrite(1, async () => {
      await executeBatch(client, USER, [{ proposal: EDIT_DOSE }], [advisorRead]);
    });

    await labEdit("i1", { notes: "edited in Stack Lab" });

    // Stack Lab writes the whole row it read, so its dose wins too: last writer, as before.
    expect(db.item("i1")).toMatchObject({ notes: "edited in Stack Lab", dose: 200, version: 2 });
  });

  it("an advisor undo after a Stack Lab delete re-creates nothing", async () => {
    const [res] = await executeBatch(client, USER, [{ proposal: EDIT_DOSE }], [await read("i1")]);
    await deleteItem(client, "i1");

    expect(await undoBatch([res])).toEqual([false]);
    expect(db.item("i1")).toBeUndefined();
  });

  it("a Stack Lab add starts at version 0, which an add's undo expects", async () => {
    const created = await addItem(client, "s1", itemToInput(await read("i2")));

    expect(db.item(created.id)).toMatchObject({ version: 0 });
  });
});

describe("FU-78 — no request filters on a field value", () => {
  it("every stack_items request across forward, rollback and undo filters on ids and versions only", async () => {
    // Every advisor path, once each.
    const prior = await read("i1");
    const res = await executeBatch(
      client, USER,
      [{ proposal: ATTACH }, { proposal: EDIT_DOSE }, { proposal: ADD }, { proposal: PROTOCOL }],
      [prior, prior, null, null],
    );
    await undoBatch(res);
    const stale = await staleI2();
    await executeBatch(client, USER, [{ proposal: EDIT_DOSE }, { proposal: STALE_EDIT_I2 }], [await read("i1"), stale]).catch(
      () => undefined,
    );
    // The remove last: at HEAD its undo re-adds under a new id, and no later step may depend on i1.
    const removed = await executeBatch(client, USER, [{ proposal: REMOVE }], [await read("i1")]);
    await undoBatch(removed);

    const itemCalls = db.calls.filter((c) => c.table === "stack_items");
    const columns = new Set(itemCalls.flatMap((c) => c.filters.map(([col]) => col)));
    expect([...columns].sort()).toEqual(["id", "stack_id", "version"]);
    // And the log is not empty, so the line above cannot pass vacuously.
    expect(itemCalls.filter((c) => c.op === "update").length).toBeGreaterThan(3);
    expect(itemCalls.filter((c) => c.op === "delete").length).toBeGreaterThan(2);
  });
});
