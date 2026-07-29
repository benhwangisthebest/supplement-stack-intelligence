// Domain layer — advisor-actions entities (v7). PURE types, no I/O.
// Design Ref: §3.1 — suggest-then-confirm: the LLM PROPOSES, the engines/repos WRITE.
// Plan SC-2: nothing here touches a DB; a proposal is data until the user confirms.
import type { Citation } from "./advisor";
import type { DraftFlag } from "./evaluation";
import type { StackItemInput, StackInput } from "./stack";

/** The user-selected v7 action surface (Plan §3.1). */
export type AdvisorActionType =
  | "add_item"
  | "remove_item"
  | "edit_item"
  | "generate_protocol"
  | "attach_product";

export type AdvisorActionStatus = "applied" | "undone";

/** One human-readable diff line on the confirm card (Design §5.4). */
export interface ProposalDiffLine {
  label: string; // "Add Magnesium glycinate · 300 mg · bedtime"
  before?: string; // present for edit/remove
  after?: string; // present for add/edit
}

/** Fields the confirm card may change before applying; re-validated server-side (SC-5/6). */
export interface EditableProposalFields {
  dose?: number;
  unit?: string;
  timing?: string | null;
  frequency?: string | null;
}

/**
 * A structured, validated proposal the advisor produced. Carries only IDs/values
 * traced to AdvisorContext or prior tool results — never free-form model data.
 * Design §3.1. The `payload` is one of the type-specific shapes below.
 */
export interface ActionProposal {
  type: AdvisorActionType;
  stackId: string; // the user's active stack (from ctx)
  payload: ProposalPayload;
  diff: ProposalDiffLine[];
  editable: EditableProposalFields | null; // null when nothing is user-editable
  rationaleCitations: Citation[]; // why the advisor proposed this (reuses v6 Citation)
}

// ---- type-specific payloads (validated by actions/schema.ts) -----------------

export interface AddItemPayload {
  supplementId: string;
  dose: number;
  unit: string;
  timing: string | null;
  frequency: string | null;
  reason: string | null;
}
export interface RemoveItemPayload {
  stackItemId: string;
}
export interface EditItemPayload {
  stackItemId: string;
  dose?: number;
  unit?: string;
  timing?: string | null;
  frequency?: string | null;
}
export interface GenerateProtocolPayload {
  stackName: string;
  intent: string;
  /** Resolved at propose-time by the pure protocol-builder (Design §3.2). */
  items: StackItemInput[];
}
export interface AttachProductPayload {
  stackItemId: string;
  productId: string;
}

export type ProposalPayload =
  | AddItemPayload
  | RemoveItemPayload
  | EditItemPayload
  | GenerateProtocolPayload
  | AttachProductPayload;

/**
 * The result the agent loop returns when it HALTS on a proposal (Design §2.2).
 * Distinct from AdvisorTurnResult so the v6 read path is untouched; the route
 * discriminates on `status === "proposed"`.
 */
export interface AdvisorProposalResult {
  status: "proposed";
  proposal: ActionProposal;
  /** Flags the projected stack WOULD introduce — surfaced before apply (SC-4). */
  newSafetyFlags: DraftFlag[];
  citations: Citation[];
  usage: { inputTokens: number; outputTokens: number };
  toolsUsed: string[];
}

// ---- write intents (the ONLY description of a mutation; executed in module-2) --
// apply.ts produces these PURELY; the Application layer maps each to an existing
// repo call. Domain never imports Supabase. Design §9.4.

export type WriteIntent =
  | { op: "add_item"; stackId: string; input: StackItemInput }
  | { op: "update_item"; stackId: string; itemId: string; input: StackItemInput }
  | { op: "delete_item"; stackId: string; itemId: string }
  | { op: "create_stack_with_items"; stack: StackInput; items: StackItemInput[] }
  | { op: "delete_stack"; stackId: string }
  // NOTE (module-2 dependency): stack_items currently has NO product column.
  // module-2 must add a nullable `product_id` (additive migration) + a
  // `setItemProduct` repo fn. The Domain intent is defined now for completeness.
  | { op: "set_item_product"; stackId: string; itemId: string; productId: string | null };

/** Persisted audit record (one per applied action) with its inverse for undo. */
export interface AdvisorActionRecord {
  id: string;
  userId: string;
  conversationId: string | null;
  actionType: AdvisorActionType;
  status: AdvisorActionStatus;
  payload: Record<string, unknown>; // what was applied (post re-validation)
  inverse: WriteIntent; // how to reverse it
  createdAt: string;
  /** v8 advisor-experience: rows applied together in one confirm share a batch_id
   *  → grouped atomic undo (Design §3.3). NULL for legacy/single-action rows. */
  batchId: string | null;
  undoneAt: string | null;
}

/**
 * v8 advisor-experience — the confirm-apply request body for a (possibly batched)
 * set of proposals. The client submits ONLY the user-selected subset (selective
 * confirm, Design §5.1). Canonical values are never trusted; only each action's
 * `edits` (dose/timing) merge, then re-parse server-side (Design §4.2).
 */
export interface BatchActionRequest {
  conversationId: string | null;
  actions: { proposal: ActionProposal; edits?: EditableProposalFields }[];
}
