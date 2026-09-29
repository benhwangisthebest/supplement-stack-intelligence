// Domain layer — PURE. Maps an ActionProposal to a WriteIntent (forward) and its
// reversal (inverse). NO I/O: the Application layer (module-2) executes each
// WriteIntent via the existing repos — keeping "engines/repos are the only writers"
// intact (Plan SC-2). Runtime snapshots (created ids, prior item state) are passed
// in by the route, so this stays a pure, fully-unit-testable mapping. Design §4.2.
import type {
  ActionProposal,
  AddItemPayload,
  AttachProductPayload,
  EditableProposalFields,
  EditItemPayload,
  GenerateProtocolPayload,
  ItemVersionExpectation,
  RemoveItemPayload,
  WriteIntent,
} from "@/types/advisor-action";
import type { ItemFrequency, ItemTiming, StackItem } from "@/types";
import type { StackInput, StackItemInput } from "@/lib/validation/schemas";

// ---- field coercion (string → typed enum | null) -----------------------------
function asTiming(v: string | null | undefined): ItemTiming | null {
  return (v ?? null) as ItemTiming | null;
}
function asFrequency(v: string | null | undefined): ItemFrequency | null {
  return (v ?? null) as ItemFrequency | null;
}

/** Snapshot an existing StackItem back into a full StackItemInput (for inverse). */
export function itemToInput(item: StackItem): StackItemInput {
  return {
    supplementId: item.supplementId,
    customName: item.customName,
    dose: item.dose,
    unit: item.unit,
    timing: item.timing,
    frequency: item.frequency,
    reason: item.reason,
    notes: item.notes,
  };
}

/** add_item payload (+ optional card edits) → a full StackItemInput. */
function addToInput(pl: AddItemPayload, edits?: EditableProposalFields): StackItemInput {
  return {
    supplementId: pl.supplementId,
    customName: null,
    dose: edits?.dose ?? pl.dose,
    unit: edits?.unit ?? pl.unit,
    timing: asTiming(edits?.timing ?? pl.timing),
    frequency: asFrequency(edits?.frequency ?? pl.frequency),
    reason: pl.reason,
    notes: null,
  };
}

/** edit_item: overlay changed fields (+ card edits) onto the prior item's full input. */
function editToInput(
  prior: StackItem,
  pl: EditItemPayload,
  edits?: EditableProposalFields,
): StackItemInput {
  const base = itemToInput(prior);
  return {
    ...base,
    dose: edits?.dose ?? pl.dose ?? base.dose,
    unit: edits?.unit ?? pl.unit ?? base.unit,
    timing: asTiming(edits?.timing ?? pl.timing ?? base.timing),
    frequency: asFrequency(edits?.frequency ?? pl.frequency ?? base.frequency),
  };
}

export interface ForwardOpts {
  /** User edits from the confirm card (add/edit only). */
  edits?: EditableProposalFields;
  /** The current item state — REQUIRED for edit_item (full-input rebuild). */
  priorItem?: StackItem;
}

/** The forward mutation to apply on confirm. */
export function forwardIntent(p: ActionProposal, opts: ForwardOpts = {}): WriteIntent {
  switch (p.type) {
    case "add_item": {
      const pl = p.payload as AddItemPayload;
      return { op: "add_item", stackId: p.stackId, input: addToInput(pl, opts.edits) };
    }
    case "remove_item": {
      const pl = p.payload as RemoveItemPayload;
      return { op: "delete_item", stackId: p.stackId, itemId: pl.stackItemId };
    }
    case "edit_item": {
      const pl = p.payload as EditItemPayload;
      if (!opts.priorItem) throw new Error("edit_item forwardIntent requires priorItem");
      return {
        op: "update_item",
        stackId: p.stackId,
        itemId: pl.stackItemId,
        input: editToInput(opts.priorItem, pl, opts.edits),
      };
    }
    case "generate_protocol": {
      const pl = p.payload as GenerateProtocolPayload;
      const stack: StackInput = {
        name: pl.stackName,
        intent: pl.intent as StackInput["intent"],
        mode: "current",
        description: null,
      };
      return { op: "create_stack_with_items", stack, items: pl.items };
    }
    case "attach_product": {
      const pl = p.payload as AttachProductPayload;
      return { op: "set_item_product", stackId: p.stackId, itemId: pl.stackItemId, productId: pl.productId };
    }
  }
}

export interface InverseOpts {
  /** add_item → the id the repo assigned (so undo can delete it). */
  createdItemId?: string;
  /** add_item → the version the item was created at, which undo expects. [U10 (c)] */
  createdVersion?: number;
  /** remove_item / edit_item → the item state BEFORE the write (so undo can restore it). */
  priorItem?: StackItem;
  /** edit_item / attach_product → the version the forward write left, which undo expects. [U10 (c)] */
  writtenVersion?: number;
  /** generate_protocol → the new stack id (so undo can delete the whole stack). */
  createdStackId?: string;
  /** generate_protocol → the items it created, which undo requires unchanged. [U10 (c)] */
  createdItems?: { itemId: string; version: number }[];
  /** attach_product → the product id the item had before (null if none). */
  priorProductId?: string | null;
}

/** [U10 (c)] The version an edit's or attach's inverse expects, and the one whose state it restores. */
function expectWritten(opts: InverseOpts): ItemVersionExpectation | undefined {
  if (opts.writtenVersion === undefined) return undefined;
  return { version: opts.writtenVersion, restores: opts.priorItem?.version };
}

/** The reversal to store for one-click undo (SC-7). */
export function inverseIntent(p: ActionProposal, opts: InverseOpts = {}): WriteIntent {
  switch (p.type) {
    case "add_item": {
      if (!opts.createdItemId) throw new Error("add_item inverse requires createdItemId");
      const expect = opts.createdVersion === undefined ? undefined : { version: opts.createdVersion };
      return { op: "delete_item", stackId: p.stackId, itemId: opts.createdItemId, expect };
    }
    case "remove_item": {
      const prior = opts.priorItem;
      if (!prior) throw new Error("remove_item inverse requires priorItem");
      // [U10 (c), N-104] Back under the same id, version and product.
      const restore =
        prior.version === undefined
          ? undefined
          : { itemId: prior.id, version: prior.version, productId: prior.productId ?? null };
      return { op: "add_item", stackId: p.stackId, input: itemToInput(prior), restore };
    }
    case "edit_item": {
      const pl = p.payload as EditItemPayload;
      if (!opts.priorItem) throw new Error("edit_item inverse requires priorItem");
      return {
        op: "update_item",
        stackId: p.stackId,
        itemId: pl.stackItemId,
        input: itemToInput(opts.priorItem),
        expect: expectWritten(opts),
      };
    }
    case "generate_protocol": {
      if (!opts.createdStackId) throw new Error("generate_protocol inverse requires createdStackId");
      return { op: "delete_stack", stackId: opts.createdStackId, expectItems: opts.createdItems };
    }
    case "attach_product": {
      const pl = p.payload as AttachProductPayload;
      return {
        op: "set_item_product",
        stackId: p.stackId,
        itemId: pl.stackItemId,
        productId: opts.priorProductId ?? null,
        expect: expectWritten(opts),
      };
    }
  }
}
