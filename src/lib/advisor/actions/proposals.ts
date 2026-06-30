// Domain layer — PURE. The 5 advisor PROPOSAL tools (v7 suggest-then-confirm).
// Design Ref: §3.2 — a proposal tool VALIDATES against AdvisorContext + the pure
// engines and returns an ActionProposal as ToolResult.data. It performs NO write
// and holds NO DB handle (Plan SC-2). Ungrounded input → ok:false → the model
// learns it cannot make that change (Plan SC-3).
import {
  getEffectsForSupplement,
  getSupplementById,
  getSupplementBySlug,
} from "@/lib/evidence";
import { generateProtocol } from "@/lib/protocol-builder";
import { matchProducts } from "@/lib/product-matcher";
import { computeTrends } from "@/lib/lab-trends";
import {
  addItemPayloadSchema,
  editItemPayloadSchema,
  removeItemPayloadSchema,
} from "./schema";
import type {
  ActionProposal,
  ProposalDiffLine,
} from "@/types/advisor-action";
import type {
  AdvisorContext,
  AdvisorTool,
  Citation,
  ToolResult,
} from "@/types/advisor";
import type { StackItem } from "@/types";
import type { StackItemInput } from "@/lib/validation/schemas";

// ---- local result helpers (ActionProposal travels in ToolResult.data) --------
function proposal(p: ActionProposal, citations: Citation[]): ToolResult<ActionProposal> {
  return { ok: true, data: p, citations };
}
function empty(emptyReason: string): ToolResult<ActionProposal> {
  return { ok: false, data: null, emptyReason, citations: [] };
}

// ---- grounding helpers -------------------------------------------------------
function supplementLabel(item: StackItem): string {
  if (item.supplementId) {
    return getSupplementById(item.supplementId)?.name ?? item.supplementId;
  }
  return item.customName ?? "item";
}

/** Up to `limit` effect-grade citations for a supplement (provenance for "why"). */
function effectCitations(supplementId: string | null, limit = 3): Citation[] {
  if (!supplementId) return [];
  const supp = getSupplementById(supplementId);
  if (!supp) return [];
  return getEffectsForSupplement(supplementId)
    .slice(0, limit)
    .map((e) => ({
      kind: "effect-grade" as const,
      refId: e.id,
      label: `${supp.name} → ${e.name}, Grade ${e.grade}`,
      detail: e.relevantPopulation,
    }));
}

function doseLabel(dose: number, unit: string, timing: string | null): string {
  return `${dose} ${unit}${timing ? ` · ${timing}` : ""}`;
}

const PROPOSE_ADD = "propose_add_item";
const PROPOSE_REMOVE = "propose_remove_item";
const PROPOSE_EDIT = "propose_edit_item";
const PROPOSE_PROTOCOL = "propose_generate_protocol";
const PROPOSE_ATTACH = "propose_attach_product";

// 1) propose_add_item ----------------------------------------------------------
export const proposeAddItem: AdvisorTool<Record<string, unknown>, ActionProposal> = {
  name: PROPOSE_ADD,
  description:
    "PROPOSE adding ONE supplement to the user's active stack. The user must confirm before anything is saved. Provide the supplement id or slug (must exist in the Library), a dose, and a unit. Only propose a supplement the Library actually contains.",
  inputSchema: {
    type: "object",
    properties: {
      supplementId: { type: "string", description: "Library supplement id or slug." },
      dose: { type: "number", description: "Dose amount (> 0)." },
      unit: { type: "string", description: "Dose unit, e.g. 'mg', 'g', 'IU'." },
      timing: { type: "string", description: "Optional: morning/midday/evening/pre-workout/with-meal/bedtime." },
      frequency: { type: "string", description: "Optional: daily/workout-days/as-needed/weekly." },
      reason: { type: "string", description: "Optional short reason for taking it." },
    },
    required: ["supplementId", "dose", "unit"],
  },
  handler: (input, ctx) => {
    if (!ctx.stack) return empty("The user has no active stack to add an item to.");
    const ref = String(input.supplementId ?? "");
    const supp = getSupplementById(ref) ?? getSupplementBySlug(ref);
    if (!supp) return empty(`No Library supplement matches "${ref}" — cannot propose adding it.`);

    const parsed = addItemPayloadSchema.safeParse({ ...input, supplementId: supp.id });
    if (!parsed.success) {
      return empty(`Cannot propose this add: ${parsed.error.issues[0]?.message ?? "invalid input"}.`);
    }
    const p = parsed.data;
    const diff: ProposalDiffLine[] = [
      { label: `Add ${supp.name}`, after: doseLabel(p.dose, p.unit, p.timing) },
    ];
    return proposal(
      {
        type: "add_item",
        stackId: ctx.stack.id,
        payload: { supplementId: supp.id, dose: p.dose, unit: p.unit, timing: p.timing, frequency: p.frequency, reason: p.reason },
        diff,
        editable: { dose: p.dose, unit: p.unit, timing: p.timing, frequency: p.frequency },
        rationaleCitations: effectCitations(supp.id),
      },
      effectCitations(supp.id),
    );
  },
};

// 2) propose_remove_item -------------------------------------------------------
export const proposeRemoveItem: AdvisorTool<Record<string, unknown>, ActionProposal> = {
  name: PROPOSE_REMOVE,
  description:
    "PROPOSE removing ONE item from the user's active stack (e.g. a redundant supplement). The user must confirm. Provide the stackItemId of an item that is actually in their stack.",
  inputSchema: {
    type: "object",
    properties: { stackItemId: { type: "string", description: "Id of an item currently in the stack." } },
    required: ["stackItemId"],
  },
  handler: (input, ctx) => {
    if (!ctx.stack) return empty("The user has no active stack.");
    const parsed = removeItemPayloadSchema.safeParse(input);
    if (!parsed.success) return empty("A stackItemId is required to propose a removal.");
    const item = ctx.stackItems.find((i) => i.id === parsed.data.stackItemId);
    if (!item) return empty(`No stack item "${parsed.data.stackItemId}" is in the user's stack.`);

    const citations = effectCitations(item.supplementId);
    const diff: ProposalDiffLine[] = [
      { label: `Remove ${supplementLabel(item)}`, before: doseLabel(item.dose, item.unit, item.timing) },
    ];
    return proposal(
      {
        type: "remove_item",
        stackId: ctx.stack.id,
        payload: { stackItemId: item.id },
        diff,
        editable: null,
        rationaleCitations: citations,
      },
      citations,
    );
  },
};

// 3) propose_edit_item ---------------------------------------------------------
export const proposeEditItem: AdvisorTool<Record<string, unknown>, ActionProposal> = {
  name: PROPOSE_EDIT,
  description:
    "PROPOSE changing the dose/timing/frequency/unit of ONE item already in the user's stack. The user must confirm. Provide the stackItemId and at least one field to change.",
  inputSchema: {
    type: "object",
    properties: {
      stackItemId: { type: "string" },
      dose: { type: "number" },
      unit: { type: "string" },
      timing: { type: "string" },
      frequency: { type: "string" },
    },
    required: ["stackItemId"],
  },
  handler: (input, ctx) => {
    if (!ctx.stack) return empty("The user has no active stack.");
    const parsed = editItemPayloadSchema.safeParse(input);
    if (!parsed.success) {
      return empty(`Cannot propose this edit: ${parsed.error.issues[0]?.message ?? "invalid input"}.`);
    }
    const item = ctx.stackItems.find((i) => i.id === parsed.data.stackItemId);
    if (!item) return empty(`No stack item "${parsed.data.stackItemId}" is in the user's stack.`);

    const e = parsed.data;
    const diff: ProposalDiffLine[] = [];
    if (e.dose !== undefined || e.unit !== undefined) {
      diff.push({
        label: `Adjust dose of ${supplementLabel(item)}`,
        before: `${item.dose} ${item.unit}`,
        after: `${e.dose ?? item.dose} ${e.unit ?? item.unit}`,
      });
    }
    if (e.timing !== undefined) {
      diff.push({ label: `Change timing of ${supplementLabel(item)}`, before: item.timing ?? "any", after: e.timing ?? "any" });
    }
    if (e.frequency !== undefined) {
      diff.push({ label: `Change frequency of ${supplementLabel(item)}`, before: item.frequency ?? "—", after: e.frequency ?? "—" });
    }
    const citations = effectCitations(item.supplementId);
    return proposal(
      {
        type: "edit_item",
        stackId: ctx.stack.id,
        payload: { stackItemId: item.id, dose: e.dose, unit: e.unit, timing: e.timing, frequency: e.frequency },
        diff,
        editable: { dose: e.dose ?? item.dose, unit: e.unit ?? item.unit, timing: e.timing ?? item.timing, frequency: e.frequency ?? item.frequency },
        rationaleCitations: citations,
      },
      citations,
    );
  },
};

// 4) propose_generate_protocol -------------------------------------------------
const PROTOCOL_ITEM_CAP = 8;

export const proposeGenerateProtocol: AdvisorTool<Record<string, unknown>, ActionProposal> = {
  name: PROPOSE_PROTOCOL,
  description:
    "PROPOSE generating a suggested protocol from the user's profile and saving it as a NEW stack. The user must confirm. Use when the user asks for a suggested protocol or 'build me a stack'. Requires profile goals.",
  inputSchema: { type: "object", properties: {} },
  handler: (_input, ctx) => {
    const goals = ctx.profile?.goals ?? [];
    if (!ctx.profile || goals.length === 0) {
      return empty("The user's profile has no goals, so no protocol can be generated.");
    }
    const trends = computeTrends(ctx.timelinePoints);
    const result = generateProtocol({
      profile: ctx.profile,
      labMarkers: ctx.labMarkers,
      trends,
      stackItems: ctx.stackItems,
    });
    const suggestions = result.groups
      .flatMap((g) => g.suggestions)
      .filter((s) => !s.alreadyInStack)
      .slice(0, PROTOCOL_ITEM_CAP);
    if (suggestions.length === 0) {
      return empty("The protocol builder produced no new suggestions for this profile.");
    }

    const items: StackItemInput[] = suggestions.map((s) => ({
      supplementId: s.supplementId,
      customName: null,
      dose: s.dose.min, // conservative start within the studied range
      unit: s.dose.unit,
      timing: s.timing,
      frequency: "daily",
      reason: s.rationale,
      notes: null,
    }));
    const diff: ProposalDiffLine[] = suggestions.map((s) => ({
      label: `Add ${s.supplementName}`,
      after: `${s.dose.min}–${s.dose.max} ${s.dose.unit} · Grade ${s.grade} · ${s.tier}`,
    }));
    const citations: Citation[] = suggestions.map((s) => ({
      kind: "effect-grade" as const,
      refId: s.effectId,
      label: `${s.supplementName} → ${s.outcomeCategory}, Grade ${s.grade}`,
      detail: s.tier,
    }));
    const stackName = `Suggested protocol (${goals.join(", ")})`;
    return proposal(
      {
        type: "generate_protocol",
        stackId: ctx.stack?.id ?? "", // new stack created on apply; current id is informational
        payload: { stackName, intent: goals[0], items },
        diff,
        editable: null,
        rationaleCitations: citations,
      },
      citations,
    );
  },
};

// 5) propose_attach_product ----------------------------------------------------
export const proposeAttachProduct: AdvisorTool<Record<string, unknown>, ActionProposal> = {
  name: PROPOSE_ATTACH,
  description:
    "PROPOSE attaching a specific matched product to ONE stack item. The user must confirm. Provide the stackItemId and a productId that the product matcher actually ranked for that item.",
  inputSchema: {
    type: "object",
    properties: { stackItemId: { type: "string" }, productId: { type: "string" } },
    required: ["stackItemId", "productId"],
  },
  handler: (input, ctx) => {
    if (!ctx.stack) return empty("The user has no active stack.");
    const stackItemId = String(input.stackItemId ?? "");
    const productId = String(input.productId ?? "");
    const item = ctx.stackItems.find((i) => i.id === stackItemId);
    if (!item) return empty(`No stack item "${stackItemId}" is in the user's stack.`);

    const match = matchProducts({ stackItems: ctx.stackItems, profile: ctx.profile });
    const group = match.groups.find((g) => g.stackItemId === stackItemId);
    const product = group?.matches.find((m) => m.product.id === productId)?.product;
    if (!product) {
      return empty(
        `Product "${productId}" is not among the matcher's ranked, allergen-safe products for that item.`,
      );
    }
    const citations = effectCitations(item.supplementId);
    const diff: ProposalDiffLine[] = [
      { label: `Attach product to ${supplementLabel(item)}`, after: `${product.brand} — ${product.name}` },
    ];
    return proposal(
      {
        type: "attach_product",
        stackId: ctx.stack.id,
        payload: { stackItemId: item.id, productId: product.id },
        diff,
        editable: null,
        rationaleCitations: citations,
      },
      citations,
    );
  },
};

/** The model's WRITE-PROPOSAL surface (Design §3.2). Concatenated with the v6
 *  read tools by the agent loop. These NEVER write — they return proposals. */
export const ADVISOR_ACTION_TOOLS: AdvisorTool[] = [
  proposeAddItem as unknown as AdvisorTool,
  proposeRemoveItem as unknown as AdvisorTool,
  proposeEditItem as unknown as AdvisorTool,
  proposeGenerateProtocol as unknown as AdvisorTool,
  proposeAttachProduct as unknown as AdvisorTool,
];

/** Names the agent loop treats as proposal-halt tools (Design §2.2). */
export const PROPOSAL_TOOL_NAMES: ReadonlySet<string> = new Set(
  ADVISOR_ACTION_TOOLS.map((t) => t.name),
);

/** Lookup an action tool by name. */
export function actionToolByName(name: string): AdvisorTool | undefined {
  return ADVISOR_ACTION_TOOLS.find((t) => t.name === name);
}

// re-export name constants for tests / module-2.
export const ACTION_TOOL_NAMES = {
  add: PROPOSE_ADD,
  remove: PROPOSE_REMOVE,
  edit: PROPOSE_EDIT,
  protocol: PROPOSE_PROTOCOL,
  attach: PROPOSE_ATTACH,
} as const;
