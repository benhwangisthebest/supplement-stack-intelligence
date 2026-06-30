// Unit — the 5 proposal tools: grounding, refusal, and proposal shape (Plan SC-1/2/3).
import { describe, expect, it } from "vitest";
import { makeContext } from "../mock-adapter";
import {
  ACTION_TOOL_NAMES,
  PROPOSAL_TOOL_NAMES,
  actionToolByName,
  proposeAddItem,
  proposeAttachProduct,
  proposeEditItem,
  proposeGenerateProtocol,
  proposeRemoveItem,
} from "./proposals";
import type { ActionProposal } from "@/types/advisor-action";

const asProposal = (data: unknown) => data as ActionProposal;

describe("propose_add_item", () => {
  it("grounds against the Library and returns an add_item proposal", () => {
    const r = proposeAddItem.handler({ supplementId: "magnesium", dose: 300, unit: "mg", timing: "bedtime" }, makeContext());
    expect(r.ok).toBe(true);
    const p = asProposal(r.data);
    expect(p.type).toBe("add_item");
    expect(p.stackId).toBe("stack-1");
    expect(p.editable).toEqual({ dose: 300, unit: "mg", timing: "bedtime", frequency: null });
    expect(p.diff[0].after).toContain("300 mg");
    expect(p.rationaleCitations.length).toBeGreaterThan(0);
  });

  it("accepts a slug as well as an id", () => {
    const r = proposeAddItem.handler({ supplementId: "creatine", dose: 5, unit: "g" }, makeContext());
    expect(r.ok).toBe(true);
  });

  it("refuses an unknown supplement (no fabrication — SC-3)", () => {
    const r = proposeAddItem.handler({ supplementId: "unobtanium", dose: 1, unit: "mg" }, makeContext());
    expect(r.ok).toBe(false);
    expect(r.data).toBeNull();
    expect(r.emptyReason).toMatch(/no library supplement/i);
  });

  it("refuses a non-positive dose", () => {
    const r = proposeAddItem.handler({ supplementId: "magnesium", dose: 0, unit: "mg" }, makeContext());
    expect(r.ok).toBe(false);
  });
});

describe("propose_remove_item", () => {
  it("grounds against the user's actual stack item", () => {
    const r = proposeRemoveItem.handler({ stackItemId: "si-1" }, makeContext());
    expect(r.ok).toBe(true);
    const p = asProposal(r.data);
    expect(p.type).toBe("remove_item");
    expect(p.payload).toEqual({ stackItemId: "si-1" });
    expect(p.editable).toBeNull();
  });

  it("refuses an item not in the stack", () => {
    const r = proposeRemoveItem.handler({ stackItemId: "ghost" }, makeContext());
    expect(r.ok).toBe(false);
    expect(r.emptyReason).toMatch(/no stack item/i);
  });
});

describe("propose_edit_item", () => {
  it("proposes a dose change with before/after diff", () => {
    const r = proposeEditItem.handler({ stackItemId: "si-3", dose: 400 }, makeContext());
    expect(r.ok).toBe(true);
    const p = asProposal(r.data);
    expect(p.type).toBe("edit_item");
    expect(p.diff[0].before).toBe("300 mg");
    expect(p.diff[0].after).toBe("400 mg");
    expect(p.editable?.dose).toBe(400);
  });

  it("refuses when no field changes", () => {
    const r = proposeEditItem.handler({ stackItemId: "si-3" }, makeContext());
    expect(r.ok).toBe(false);
  });

  it("refuses an unknown item", () => {
    const r = proposeEditItem.handler({ stackItemId: "ghost", dose: 1 }, makeContext());
    expect(r.ok).toBe(false);
  });
});

describe("propose_generate_protocol", () => {
  it("builds a protocol proposal from profile goals", () => {
    const r = proposeGenerateProtocol.handler({}, makeContext());
    expect(r.ok).toBe(true);
    const p = asProposal(r.data);
    expect(p.type).toBe("generate_protocol");
    const payload = p.payload as { items: unknown[]; stackName: string };
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.stackName).toContain("longevity");
  });

  it("refuses when the profile has no goals", () => {
    const ctx = makeContext({ profile: { ...makeContext().profile!, goals: [] } });
    const r = proposeGenerateProtocol.handler({}, ctx);
    expect(r.ok).toBe(false);
    expect(r.emptyReason).toMatch(/no goals/i);
  });
});

describe("propose_attach_product", () => {
  it("refuses a product the matcher did not rank for the item", () => {
    const r = proposeAttachProduct.handler({ stackItemId: "si-1", productId: "not-a-product" }, makeContext());
    expect(r.ok).toBe(false);
    expect(r.emptyReason).toMatch(/not among the matcher/i);
  });

  it("refuses an item not in the stack", () => {
    const r = proposeAttachProduct.handler({ stackItemId: "ghost", productId: "p1" }, makeContext());
    expect(r.ok).toBe(false);
  });
});

describe("registry", () => {
  it("exposes exactly the 5 proposal tools as halt tools", () => {
    expect(PROPOSAL_TOOL_NAMES.size).toBe(5);
    for (const name of Object.values(ACTION_TOOL_NAMES)) {
      expect(PROPOSAL_TOOL_NAMES.has(name)).toBe(true);
      expect(actionToolByName(name)).toBeDefined();
    }
  });

  it("none of the proposal tools mutate the context (purity)", () => {
    const ctx = makeContext();
    const before = JSON.stringify(ctx);
    proposeAddItem.handler({ supplementId: "magnesium", dose: 300, unit: "mg" }, ctx);
    proposeRemoveItem.handler({ stackItemId: "si-1" }, ctx);
    proposeGenerateProtocol.handler({}, ctx);
    expect(JSON.stringify(ctx)).toBe(before);
  });
});
