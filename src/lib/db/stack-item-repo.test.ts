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
import { querySpy } from "./__testing__/query-spy";
import {
  addItem,
  deleteItem,
  getItemProductId,
  listItems,
  setItemProduct,
  updateItem,
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
    ["updateItem", () => updateItem],
    ["deleteItem", () => deleteItem],
    ["getItemProductId", () => getItemProductId],
  ])("%s addresses one row by id", async (_name, get) => {
    const spy = querySpy({ data: itemRow });
    await (get() as (c: unknown, id: string, i?: unknown) => Promise<unknown>)(
      spy.client,
      "i1",
      input,
    );
    expect(spy.filters()).toContainEqual(["id", "i1"]);
  });

  it("setItemProduct addresses one row by id and writes only the product", async () => {
    const spy = querySpy({ data: itemRow });
    await setItemProduct(spy.client, "i1", "prod1");
    expect(spy.filters()).toContainEqual(["id", "i1"]);
    expect(spy.payloads.some((r) => r.product_id === "prod1")).toBe(true);
    expect(spy.payloads.some((r) => "stack_id" in r)).toBe(false);
  });
});
