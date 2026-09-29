// Ownership pins for `stack-item-repo` (Phase 2 U9).
//
// `stack_items` has NO `user_id` column: ownership is derived through the parent
// stack, and the 0001 policy expresses exactly that with an `exists (select 1
// from stacks s where s.id = stack_items.stack_id and s.user_id = auth.uid())`.
// So there is no owner column for these functions to filter on, and this is one
// of the three tables GATE C1's exemption list is sized for.
//
// That is a reason, not an excuse, so what IS pinned here is the substitute:
// every function is scoped to the parent it inherits ownership from, and none
// of them reaches across it. A read by `itemId` alone is safe only because RLS
// resolves the parent — and that is worth writing down, because it is the whole
// argument for why the exemption is sound.
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { querySpy, type SpyCall } from "./__testing__/query-spy";
import * as repo from "./stack-item-repo";
import {
  addItem,
  deleteItem,
  deleteItemAtVersion,
  listItems,
  restoreItem,
  setItemProduct,
  STACK_LAB_ATTEMPTS,
  toVersionedItem,
  updateItem,
  updateItemAtVersion,
} from "./stack-item-repo";

const itemRow = {
  id: "i1",
  stack_id: "st1",
  supplement_id: "magnesium",
  custom_name: null,
  dose: 300,
  unit: "mg",
  timing: "bedtime",
  frequency: "daily",
  reason: null,
  notes: null,
  product_id: null,
  version: 4,
  created_at: "2026-08-01T00:00:00Z",
};

const input = {
  supplementId: "magnesium",
  customName: null,
  dose: 300,
  unit: "mg",
  timing: "bedtime",
  frequency: "daily",
  reason: null,
  notes: null,
};

type Client = SupabaseClient;

describe("stack-item-repo — scoped to the parent stack it inherits ownership from", () => {
  it("listItems filters by stack_id", async () => {
    const spy = querySpy({ data: [itemRow] });
    await listItems(spy.client, "st1");
    expect(spy.tables).toEqual(["stack_items"]);
    expect(spy.filters()).toContainEqual(["stack_id", "st1"]);
  });

  it("addItem writes stack_id, the only ownership this row carries", async () => {
    const spy = querySpy({ data: itemRow });
    await addItem(spy.client, "st1", input as never);
    expect(spy.payloads.some((r) => r.stack_id === "st1")).toBe(true);
  });

  it("addItem does not invent a user_id column the table does not have", async () => {
    // Anti-drift in the other direction: if a migration ever adds `user_id` to
    // this table, the exemption stops being valid and this pin is where the
    // question gets asked.
    const spy = querySpy({ data: itemRow });
    await addItem(spy.client, "st1", input as never);
    expect(spy.payloads.some((r) => "user_id" in r)).toBe(false);
  });

  it.each([
    ["deleteItem", (c: Client) => deleteItem(c, "i1")],
    ["updateItemAtVersion", (c: Client) => updateItemAtVersion(c, "i1", input as never, 4)],
    ["setItemProduct", (c: Client) => setItemProduct(c, "i1", "prod1", 4)],
    ["deleteItemAtVersion", (c: Client) => deleteItemAtVersion(c, "i1", 4)],
  ])("%s addresses one row by id", async (_name, run) => {
    const spy = querySpy({ data: [itemRow] });
    await run(spy.client);
    expect(spy.filters()).toContainEqual(["id", "i1"]);
  });
});

describe("toVersionedItem — the row fixture maps, version included (U10 (c))", () => {
  it("maps every column, and carries the version the shared mapper drops", () => {
    expect(toVersionedItem({ ...itemRow, product_id: "prod1" })).toEqual({
      id: "i1",
      stackId: "st1",
      supplementId: "magnesium",
      customName: null,
      dose: 300,
      unit: "mg",
      timing: "bedtime",
      frequency: "daily",
      reason: null,
      notes: null,
      productId: "prod1",
      version: 4,
    });
  });
});

// Phase 4 U10 (c), FU-78. A PostgREST filter travels in the URL query string,
// which the API gateway logs (§2.3 rule 15). So a write to a stack item may
// filter on its id and its version, and nothing else: never a field value. The
// write set is DERIVED from the module's exports, so a new export must be
// classified here before it can exist.
describe("every write filters on id and version only (U10 (c), FU-78)", () => {
  const SENTINEL = {
    supplementId: "SENTINEL-SUPPLEMENT",
    customName: "SENTINEL-CUSTOM",
    dose: 1234.5678,
    unit: "SENTINEL-UNIT",
    timing: "morning",
    frequency: "weekly",
    reason: "SENTINEL-REASON",
    notes: "SENTINEL-NOTES",
  };
  const WRITES: Record<string, (c: Client) => Promise<unknown>> = {
    addItem: (c) => addItem(c, "st1", SENTINEL as never),
    updateItem: (c) => updateItem(c, "i1", SENTINEL as never),
    deleteItem: (c) => deleteItem(c, "i1"),
    updateItemAtVersion: (c) => updateItemAtVersion(c, "i1", SENTINEL as never, 4),
    setItemProduct: (c) => setItemProduct(c, "i1", "SENTINEL-PRODUCT", 4),
    deleteItemAtVersion: (c) => deleteItemAtVersion(c, "i1", 4),
    restoreItem: (c) => restoreItem(c, "st1", { itemId: "i1", version: 4, productId: "SENTINEL-PRODUCT" }, SENTINEL as never),
  };
  const NOT_WRITES = ["listItems", "toVersionedItem", "STACK_LAB_ATTEMPTS"];
  const FILTERS = new Set(["eq", "neq", "is", "in", "gt", "gte", "lt", "lte", "match", "not", "or", "contains"]);

  it("every export is classified, so a new writer cannot skip the check", () => {
    expect(Object.keys(repo).sort()).toEqual([...Object.keys(WRITES), ...NOT_WRITES].sort());
  });

  it.each(Object.entries(WRITES))("%s filters on nothing but id and version", async (_name, run) => {
    const spy = querySpy({ data: [itemRow] });
    await run(spy.client).catch(() => undefined); // a scripted miss may throw; the filters are what count
    const filters = spy.calls.filter((c: SpyCall) => FILTERS.has(c.method));
    for (const call of filters) expect(["id", "version"]).toContain(call.args[0]);
    // Nothing but a write's own body may carry a value.
    const outsideBody = JSON.stringify(spy.calls.filter((c) => !["insert", "update"].includes(c.method)));
    expect(outsideBody).not.toMatch(/SENTINEL|1234\.5678/);
  });
});

// Phase 4 U10 (c). The advisor writes an existing item only while it holds the
// version the advisor read, and moves it on by one. Rows returned = rows written;
// none means the item changed or went since that read.
describe("the advisor's writes are compare-and-set on (id, version) (U10 (c))", () => {
  it("updateItemAtVersion writes the four edit columns and version + 1, WHERE id and version", async () => {
    const spy = querySpy({ data: [{ ...itemRow, version: 5 }] });
    const written = await updateItemAtVersion(spy.client, "i1", { ...input, notes: "x" } as never, 4);
    expect(spy.payloads).toEqual([{ dose: 300, unit: "mg", timing: "bedtime", frequency: "daily", version: 5 }]);
    expect(spy.filters()).toEqual([["id", "i1"], ["version", 4]]);
    expect(written).toMatchObject({ id: "i1", version: 5 });
  });

  it("setItemProduct writes only the product and version + 1, WHERE id and version", async () => {
    const spy = querySpy({ data: [{ ...itemRow, product_id: "prod1", version: 5 }] });
    const written = await setItemProduct(spy.client, "i1", "prod1", 4);
    expect(spy.payloads).toEqual([{ product_id: "prod1", version: 5 }]);
    expect(spy.filters()).toEqual([["id", "i1"], ["version", 4]]);
    expect(written).toMatchObject({ productId: "prod1", version: 5 });
  });

  it.each([
    ["updateItemAtVersion", (c: Client) => updateItemAtVersion(c, "i1", input as never, 4)],
    ["setItemProduct", (c: Client) => setItemProduct(c, "i1", null, 4)],
  ])("%s returns null when no row matched", async (_n, run) => {
    expect(await run(querySpy({ data: [] }).client)).toBeNull();
  });

  it("deleteItemAtVersion deletes WHERE id and version, and says whether it did", async () => {
    const hit = querySpy({ data: [{ id: "i1" }] });
    expect(await deleteItemAtVersion(hit.client, "i1", 4)).toBe(true);
    expect(hit.filters()).toEqual([["id", "i1"], ["version", 4]]);
    expect(await deleteItemAtVersion(querySpy({ data: [] }).client, "i1", 4)).toBe(false);
  });

  it("restoreItem re-inserts under the same id, version and product (N-104)", async () => {
    const spy = querySpy({ data: [{ id: "i1" }] });
    expect(await restoreItem(spy.client, "st1", { itemId: "i1", version: 4, productId: "prod1" }, input as never)).toBe(true);
    expect(spy.payloads).toEqual([
      expect.objectContaining({ id: "i1", stack_id: "st1", version: 4, product_id: "prod1", dose: 300 }),
    ]);
  });

  it("restoreItem answers false when the id is taken, and throws any other error", async () => {
    const taken = querySpy({ error: { code: "23505" } });
    expect(await restoreItem(taken.client, "st1", { itemId: "i1", version: 4, productId: null }, input as never)).toBe(false);
    const other = querySpy({ error: { code: "23503" } });
    await expect(
      restoreItem(other.client, "st1", { itemId: "i1", version: 4, productId: null }, input as never),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("addItem never sets a version: a new row starts at the column default, 0", async () => {
    const spy = querySpy({ data: itemRow });
    await addItem(spy.client, "st1", input as never);
    expect(spy.payloads.every((r) => !("version" in r))).toBe(true);
  });
});

/**
 * A client whose Nth awaited request resolves to `results[N]`, for the Stack Lab
 * retry, whose read and write need different answers. Records every call.
 */
function scripted(results: { data?: unknown; error?: unknown }[]) {
  const calls: SpyCall[] = [];
  const next = async () => {
    const r = results.shift() ?? { data: null };
    return { data: r.data ?? null, error: r.error ?? null };
  };
  const builder = () => {
    const self: Record<string, unknown> = {
      then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => next().then(ok, ko),
      single: () => next(),
    };
    for (const m of ["select", "eq", "update", "insert", "delete"]) {
      self[m] = (...args: unknown[]) => (calls.push({ method: m, args }), self);
    }
    return self;
  };
  return { client: { from: () => builder() } as unknown as Client, calls };
}

// Phase 4 U10 (c), AC-6. Stack Lab's edit is last-writer-wins, as it always
// was, but it now moves the version, so an advisor inverse built before it
// misses instead of overwriting it.
describe("updateItem — Stack Lab's edit moves the version (U10 (c), AC-6)", () => {
  const updates = (calls: SpyCall[]) => calls.filter((c) => c.method === "update").map((c) => c.args[0]);

  it("reads the version, then writes version + 1 WHERE the item still holds it", async () => {
    const s = scripted([{ data: { version: 4 } }, { data: [{ ...itemRow, version: 5 }] }]);
    await expect(updateItem(s.client, "i1", input as never)).resolves.toMatchObject({ version: 5 });
    expect(updates(s.calls)).toEqual([expect.objectContaining({ dose: 300, notes: null, version: 5 })]);
    expect(s.calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["id", "i1"],
      ["id", "i1"],
      ["version", 4],
    ]);
  });

  it("re-reads and writes again when another write took the version first", async () => {
    const s = scripted([
      { data: { version: 4 } },
      { data: [] },
      { data: { version: 6 } },
      { data: [{ ...itemRow, version: 7 }] },
    ]);
    await expect(updateItem(s.client, "i1", input as never)).resolves.toMatchObject({ version: 7 });
    expect(updates(s.calls).map((u) => (u as { version: number }).version)).toEqual([5, 7]);
  });

  it(`gives up after ${STACK_LAB_ATTEMPTS} misses rather than looping`, async () => {
    const misses = Array.from({ length: STACK_LAB_ATTEMPTS }, () => [{ data: { version: 4 } }, { data: [] }]).flat();
    await expect(updateItem(scripted(misses).client, "i1", input as never)).rejects.toThrow();
  });

  it("throws the read's error when the item is gone", async () => {
    const s = scripted([{ error: { code: "PGRST116" } }]);
    await expect(updateItem(s.client, "i1", input as never)).rejects.toMatchObject({ code: "PGRST116" });
    expect(updates(s.calls)).toEqual([]);
  });
});
