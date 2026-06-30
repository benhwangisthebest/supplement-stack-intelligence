// Unit — pure forward/inverse WriteIntent mapping (Plan SC-2/7).
import { describe, expect, it } from "vitest";
import { makeContext } from "../mock-adapter";
import { forwardIntent, inverseIntent, itemToInput } from "./apply";
import {
  proposeAddItem,
  proposeAttachProduct,
  proposeEditItem,
  proposeGenerateProtocol,
  proposeRemoveItem,
} from "./proposals";
import type { ActionProposal } from "@/types/advisor-action";

const ctx = makeContext();
const prop = (d: unknown) => d as ActionProposal;
const itemSi3 = ctx.stackItems.find((i) => i.id === "si-3")!;

describe("forwardIntent", () => {
  it("add_item → add_item op with merged card edits", () => {
    const p = prop(proposeAddItem.handler({ supplementId: "magnesium", dose: 300, unit: "mg" }, ctx).data);
    const intent = forwardIntent(p, { edits: { dose: 400 } });
    expect(intent).toMatchObject({ op: "add_item", stackId: "stack-1" });
    if (intent.op === "add_item") {
      expect(intent.input.dose).toBe(400); // edit overrode the proposed dose
      expect(intent.input.supplementId).toBe("magnesium");
    }
  });

  it("remove_item → delete_item op", () => {
    const p = prop(proposeRemoveItem.handler({ stackItemId: "si-1" }, ctx).data);
    expect(forwardIntent(p)).toEqual({ op: "delete_item", stackId: "stack-1", itemId: "si-1" });
  });

  it("edit_item → update_item op built from the prior item + change", () => {
    const p = prop(proposeEditItem.handler({ stackItemId: "si-3", dose: 400 }, ctx).data);
    const intent = forwardIntent(p, { priorItem: itemSi3 });
    expect(intent.op).toBe("update_item");
    if (intent.op === "update_item") {
      expect(intent.input.dose).toBe(400);
      expect(intent.input.unit).toBe("mg"); // unchanged field preserved
      expect(intent.input.supplementId).toBe("magnesium");
    }
  });

  it("edit_item without priorItem throws (route must supply it)", () => {
    const p = prop(proposeEditItem.handler({ stackItemId: "si-3", dose: 400 }, ctx).data);
    expect(() => forwardIntent(p)).toThrow(/priorItem/);
  });

  it("generate_protocol → create_stack_with_items op", () => {
    const p = prop(proposeGenerateProtocol.handler({}, ctx).data);
    const intent = forwardIntent(p);
    expect(intent.op).toBe("create_stack_with_items");
    if (intent.op === "create_stack_with_items") {
      expect(intent.items.length).toBeGreaterThan(0);
      expect(intent.stack.mode).toBe("current");
    }
  });
});

describe("inverseIntent (undo)", () => {
  it("add_item inverse deletes the created item", () => {
    const p = prop(proposeAddItem.handler({ supplementId: "magnesium", dose: 300, unit: "mg" }, ctx).data);
    expect(inverseIntent(p, { createdItemId: "new-id" })).toEqual({
      op: "delete_item",
      stackId: "stack-1",
      itemId: "new-id",
    });
  });

  it("remove_item inverse re-adds the prior item snapshot", () => {
    const p = prop(proposeRemoveItem.handler({ stackItemId: "si-3" }, ctx).data);
    const intent = inverseIntent(p, { priorItem: itemSi3 });
    expect(intent.op).toBe("add_item");
    if (intent.op === "add_item") expect(intent.input).toEqual(itemToInput(itemSi3));
  });

  it("edit_item inverse restores the prior item values", () => {
    const p = prop(proposeEditItem.handler({ stackItemId: "si-3", dose: 999 }, ctx).data);
    const intent = inverseIntent(p, { priorItem: itemSi3 });
    expect(intent.op).toBe("update_item");
    if (intent.op === "update_item") expect(intent.input.dose).toBe(300);
  });

  it("generate_protocol inverse deletes the created stack", () => {
    const p = prop(proposeGenerateProtocol.handler({}, ctx).data);
    expect(inverseIntent(p, { createdStackId: "new-stack" })).toEqual({
      op: "delete_stack",
      stackId: "new-stack",
    });
  });

  it("attach_product inverse restores the prior product id", () => {
    const p: ActionProposal = {
      type: "attach_product",
      stackId: "stack-1",
      payload: { stackItemId: "si-1", productId: "prod-2" },
      diff: [],
      editable: null,
      rationaleCitations: [],
    };
    expect(inverseIntent(p, { priorProductId: null })).toEqual({
      op: "set_item_product",
      stackId: "stack-1",
      itemId: "si-1",
      productId: null,
    });
  });

  it("inverses that need a runtime snapshot throw when it's missing", () => {
    const p = prop(proposeAddItem.handler({ supplementId: "magnesium", dose: 300, unit: "mg" }, ctx).data);
    expect(() => inverseIntent(p)).toThrow(/createdItemId/);
  });
});
