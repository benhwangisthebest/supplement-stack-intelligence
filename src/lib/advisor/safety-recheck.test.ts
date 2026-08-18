// Unit — pre-apply safety re-check: projection + new-flag diff (Plan SC-4).
import { describe, expect, it } from "vitest";
import { evaluateStack } from "@/lib/stack-evaluator";
import { computeTrends } from "@/lib/lab-trends";
import { makeContext } from "./mock-adapter";
import { diffNewFlags, projectItems, recheckForProposal } from "./safety-recheck";
import {
  proposeAddItem,
  proposeEditItem,
  proposeGenerateProtocol,
  proposeRemoveItem,
} from "./actions/proposals";
import type { ActionProposal } from "@/types/advisor-action";
import type { DraftFlag } from "@/types/evaluation";

const ctx = makeContext();
const prop = (d: unknown) => d as ActionProposal;

function flag(partial: Partial<DraftFlag>): DraftFlag {
  return {
    stackItemId: null,
    severity: "warning",
    category: "dose-fit",
    title: "t",
    explanation: "e",
    recommendation: "r",
    evidenceLevel: "n/a",
    ...partial,
  };
}

describe("diffNewFlags", () => {
  it("returns only flags absent from the current evaluation", () => {
    const current = [flag({ title: "A" })];
    const projected = [flag({ title: "A" }), flag({ title: "B", severity: "critical" })];
    const out = diffNewFlags(current, projected);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("B");
  });

  it("returns nothing when projected ⊆ current (e.g. a removal)", () => {
    const current = [flag({ title: "A" }), flag({ title: "B" })];
    expect(diffNewFlags(current, [flag({ title: "A" })])).toEqual([]);
  });
});

describe("projectItems", () => {
  it("add_item appends a synthetic projected item", () => {
    const p = prop(proposeAddItem.handler({ supplementId: "creatine", dose: 5, unit: "g" }, ctx).data);
    const items = projectItems(ctx, p);
    expect(items).toHaveLength(ctx.stackItems.length + 1);
    expect(items.at(-1)?.supplementId).toBe("creatine");
  });

  it("remove_item drops the targeted item", () => {
    const p = prop(proposeRemoveItem.handler({ stackItemId: "si-1" }, ctx).data);
    const items = projectItems(ctx, p);
    expect(items.find((i) => i.id === "si-1")).toBeUndefined();
  });

  it("edit_item changes the targeted item's dose", () => {
    const p = prop(proposeEditItem.handler({ stackItemId: "si-3", dose: 999 }, ctx).data);
    const items = projectItems(ctx, p);
    expect(items.find((i) => i.id === "si-3")?.dose).toBe(999);
  });
});

describe("recheckForProposal", () => {
  it("attach_product introduces no evaluator flags", () => {
    const p: ActionProposal = {
      type: "attach_product",
      stackId: "stack-1",
      payload: { stackItemId: "si-1", productId: "p1" },
      diff: [],
      editable: null,
      rationaleCitations: [],
    };
    expect(recheckForProposal(ctx, p)).toEqual([]);
  });

  it("every flag it reports is genuinely NEW (not already in the current eval)", () => {
    const p = prop(proposeAddItem.handler({ supplementId: "creatine", dose: 5, unit: "g" }, ctx).data);
    const trends = computeTrends(ctx.timelinePoints);
    const current = evaluateStack({
      stack: ctx.stack!,
      items: ctx.stackItems,
      profile: ctx.profile,
      labMarkers: ctx.labMarkers,
      trends,
    });
    const currentKeys = new Set(
      current.flags.map((f) => `${f.severity}|${f.category}|${f.stackItemId ?? "stack"}|${f.title}`),
    );
    for (const nf of recheckForProposal(ctx, p)) {
      expect(currentKeys.has(`${nf.severity}|${nf.category}|${nf.stackItemId ?? "stack"}|${nf.title}`)).toBe(false);
    }
  });

  it("removing an item never introduces a new flag", () => {
    const p = prop(proposeRemoveItem.handler({ stackItemId: "si-1" }, ctx).data);
    expect(recheckForProposal(ctx, p)).toEqual([]);
  });

  it("generate_protocol returns the projected new stack's flags (array)", () => {
    const p = prop(proposeGenerateProtocol.handler({}, ctx).data);
    expect(Array.isArray(recheckForProposal(ctx, p))).toBe(true);
  });

  it("is pure — does not mutate the context", () => {
    const before = JSON.stringify(ctx);
    const p = prop(proposeAddItem.handler({ supplementId: "creatine", dose: 5, unit: "g" }, ctx).data);
    recheckForProposal(ctx, p);
    expect(JSON.stringify(ctx)).toBe(before);
  });
});
