// Domain/Application — Zod payload schemas for the 5 advisor proposal tools (v7).
// Design Ref: §3.2 — each proposal payload is Zod-validated; add/edit reuse the
// SAME field rules as stackItemInputSchema so the confirm route can re-parse with
// the existing item schema before any write. Plan SC-3 (grounding), SC-6 (re-validate).
import { z } from "zod";
import type { ActionProposal, EditableProposalFields } from "@/types/advisor-action";

const timing = z
  .enum(["morning", "midday", "evening", "pre-workout", "with-meal", "bedtime"])
  .nullable();
const frequency = z
  .enum(["daily", "workout-days", "as-needed", "weekly"])
  .nullable();

export const addItemPayloadSchema = z.object({
  supplementId: z.string().min(1).max(80),
  dose: z.number().positive(),
  unit: z.string().min(1).max(20),
  timing: timing.default(null),
  frequency: frequency.default(null),
  reason: z.string().max(300).nullable().default(null),
});

export const removeItemPayloadSchema = z.object({
  stackItemId: z.string().min(1),
});

export const editItemPayloadSchema = z
  .object({
    stackItemId: z.string().min(1),
    dose: z.number().positive().optional(),
    unit: z.string().min(1).max(20).optional(),
    timing: timing.optional(),
    frequency: frequency.optional(),
  })
  .refine(
    (p) =>
      p.dose !== undefined ||
      p.unit !== undefined ||
      p.timing !== undefined ||
      p.frequency !== undefined,
    { message: "At least one field must change", path: ["dose"] },
  );

export const generateProtocolPayloadSchema = z.object({
  stackName: z.string().min(1).max(120),
  intent: z.string().min(1),
  items: z.array(z.unknown()).min(1), // each re-parsed via stackItemInputSchema in module-2
});

export const attachProductPayloadSchema = z.object({
  stackItemId: z.string().min(1),
  productId: z.string().min(1),
});

/** Only the user-editable subset the confirm card may submit (SC-5). */
export const editableFieldsSchema = z
  .object({
    dose: z.number().positive().optional(),
    unit: z.string().min(1).max(20).optional(),
    timing: timing.optional(),
    frequency: frequency.optional(),
  })
  .strict();

// ---- confirm request body (moved here from the route by U11) ----------------
// These describe the POST /api/advisor/actions body. They live beside the
// payload schemas they compose rather than in a route file, so the route is
// left with transport concerns only. Behaviour is unchanged by the move: the
// same shapes, in the same order, with the same union.

export const ACTION_TYPES = [
  "add_item",
  "remove_item",
  "edit_item",
  "generate_protocol",
  "attach_product",
] as const;

export const proposalSchema = z.object({
  type: z.enum(ACTION_TYPES),
  stackId: z.string(),
  payload: z.record(z.unknown()),
  diff: z.array(z.unknown()).optional(),
  editable: z.unknown().optional(),
  rationaleCitations: z.array(z.unknown()).optional(),
});

/**
 * v8 advisor-experience: the confirm body is a SELECTED SUBSET of proposals
 * (selective confirm, Design §5.1). A legacy single `{ proposal, edits }` body
 * is coerced into a length-1 batch for back-compat with the v7 client.
 */
export const confirmSchema = z.union([
  z.object({
    conversationId: z.string().nullish(),
    actions: z
      .array(
        z.object({
          proposal: proposalSchema,
          edits: editableFieldsSchema.optional(),
        }),
      )
      .min(1),
  }),
  z.object({
    conversationId: z.string().nullish(),
    proposal: proposalSchema,
    edits: editableFieldsSchema.optional(),
  }),
]);

export type ConfirmBody = z.infer<typeof confirmSchema>;

/** One selected action: a proposal plus the confirm card's optional edits. */
export interface SelectedAction {
  proposal: ActionProposal;
  edits?: EditableProposalFields;
}

/** Normalize either body shape to a list of {proposal, edits}. */
export function toActions(body: ConfirmBody): SelectedAction[] {
  if ("actions" in body) {
    return body.actions.map((a) => ({
      proposal: a.proposal as unknown as ActionProposal,
      edits: a.edits as EditableProposalFields | undefined,
    }));
  }
  return [
    {
      proposal: body.proposal as unknown as ActionProposal,
      edits: body.edits as EditableProposalFields | undefined,
    },
  ];
}

export type AddItemPayloadParsed = z.infer<typeof addItemPayloadSchema>;
export type EditItemPayloadParsed = z.infer<typeof editItemPayloadSchema>;
