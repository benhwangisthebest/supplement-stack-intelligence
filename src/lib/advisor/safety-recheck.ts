// Domain layer — PURE. Pre-apply safety re-check (Plan SC-4, Design §2.2/§7).
// Projects the user's stack AS IF the proposal were applied, re-runs the existing
// evaluator (which already composes interactions + biomarkers + dose/redundancy
// rules), and returns ONLY the flags the change would NEWLY introduce. No I/O.
import { evaluateStack } from "@/lib/stack-evaluator";
import { computeTrends } from "@/lib/lab-trends";
import type {
  ActionProposal,
  AddItemPayload,
  EditableProposalFields,
  EditItemPayload,
  GenerateProtocolPayload,
  RemoveItemPayload,
} from "@/types/advisor-action";
import type { AdvisorContext } from "@/types/advisor";
import type { DraftFlag } from "@/types/evaluation";
import type {
  ItemFrequency,
  ItemTiming,
  Stack,
  StackItem,
} from "@/types";

/** Stable identity for de-duping a flag across the current/projected evaluations. */
function flagIdentity(f: DraftFlag): string {
  return `${f.severity}|${f.category}|${f.stackItemId ?? "stack"}|${f.title}`;
}

/** Flags present in `projected` but absent from `current`. */
export function diffNewFlags(current: DraftFlag[], projected: DraftFlag[]): DraftFlag[] {
  const seen = new Set(current.map(flagIdentity));
  return projected.filter((f) => !seen.has(flagIdentity(f)));
}

function syntheticItem(stackId: string, pl: AddItemPayload, edits?: EditableProposalFields): StackItem {
  return {
    id: "proposed-new",
    stackId,
    supplementId: pl.supplementId,
    customName: null,
    dose: edits?.dose ?? pl.dose,
    unit: edits?.unit ?? pl.unit,
    timing: (edits?.timing ?? pl.timing ?? null) as ItemTiming | null,
    frequency: (edits?.frequency ?? pl.frequency ?? null) as ItemFrequency | null,
    reason: pl.reason,
    notes: null,
  };
}

/** The user's stackItems AS IF the proposal (and any card edits) were applied. */
export function projectItems(
  ctx: AdvisorContext,
  proposal: ActionProposal,
  edits?: EditableProposalFields,
): StackItem[] {
  const items = ctx.stackItems;
  switch (proposal.type) {
    case "add_item":
      return [...items, syntheticItem(proposal.stackId, proposal.payload as AddItemPayload, edits)];
    case "remove_item": {
      const pl = proposal.payload as RemoveItemPayload;
      return items.filter((i) => i.id !== pl.stackItemId);
    }
    case "edit_item": {
      const pl = proposal.payload as EditItemPayload;
      return items.map((i) =>
        i.id === pl.stackItemId
          ? {
              ...i,
              dose: edits?.dose ?? pl.dose ?? i.dose,
              unit: edits?.unit ?? pl.unit ?? i.unit,
              timing: (edits?.timing ?? pl.timing ?? i.timing) as ItemTiming | null,
              frequency: (edits?.frequency ?? pl.frequency ?? i.frequency) as ItemFrequency | null,
            }
          : i,
      );
    }
    default:
      return items;
  }
}

function protocolItems(stackId: string, pl: GenerateProtocolPayload): StackItem[] {
  return pl.items.map((it, idx) => ({
    id: `proposed-${idx}`,
    stackId,
    supplementId: it.supplementId,
    customName: it.customName,
    dose: it.dose,
    unit: it.unit,
    timing: it.timing,
    frequency: it.frequency,
    reason: it.reason,
    notes: it.notes,
  }));
}

function stackFor(ctx: AdvisorContext, id: string, name: string): Stack {
  return (
    ctx.stack ?? {
      id,
      userId: ctx.userId,
      name,
      intent: "foundational",
      mode: "current",
      description: null,
      createdAt: "",
      updatedAt: "",
    }
  );
}

/**
 * Re-evaluate the projected stack and return the flags the proposal would NEWLY
 * introduce. `attach_product` changes no supplement/dose surface, so it never
 * introduces evaluator flags (allergen safety is already enforced by the product
 * matcher's hard filter at propose-time).
 */
export function recheckForProposal(
  ctx: AdvisorContext,
  proposal: ActionProposal,
  edits?: EditableProposalFields,
): DraftFlag[] {
  if (proposal.type === "attach_product") return [];

  const trends = computeTrends(ctx.timelinePoints);

  if (proposal.type === "generate_protocol") {
    // A brand-new stack: every flag it raises is "new" relative to no stack.
    const pl = proposal.payload as GenerateProtocolPayload;
    const newStack = stackFor(ctx, "proposed-stack", pl.stackName);
    const projected = evaluateStack({
      stack: { ...newStack, id: "proposed-stack" },
      items: protocolItems("proposed-stack", pl),
      profile: ctx.profile,
      labMarkers: ctx.labMarkers,
      trends,
    });
    return projected.flags;
  }

  if (!ctx.stack) return [];
  const evalArgs = {
    stack: ctx.stack,
    profile: ctx.profile,
    labMarkers: ctx.labMarkers,
    trends,
  };
  const current = evaluateStack({ ...evalArgs, items: ctx.stackItems });
  const projected = evaluateStack({ ...evalArgs, items: projectItems(ctx, proposal, edits) });
  return diffNewFlags(current.flags, projected.flags);
}

/** De-dupe flags by their stable identity. */
function dedupeFlags(flags: DraftFlag[]): DraftFlag[] {
  const seen = new Set<string>();
  return flags.filter((f) => {
    const id = flagIdentity(f);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * v8 advisor-experience — cumulative pre-apply re-check for a BATCH of proposals
 * (Design §3.2). Folds add/remove/edit projections onto a running item set so the
 * COMBINED projected stack is evaluated against the current one — catching a flag
 * that only the *combination* introduces (which independent per-proposal rechecks
 * would miss). Proposals projectItems doesn't model into the active stack
 * (generate_protocol / attach_product) contribute their independent recheck,
 * unioned in. Returns the de-duped cumulative NEW flag set. PURE — no I/O.
 */
export function cumulativeRecheck(
  ctx: AdvisorContext,
  actions: { proposal: ActionProposal; edits?: EditableProposalFields }[],
): DraftFlag[] {
  if (actions.length === 0) return [];

  // No active stack (e.g. a lone generate_protocol) → union per-proposal rechecks.
  if (!ctx.stack) {
    return dedupeFlags(
      actions.flatMap((a) => recheckForProposal(ctx, a.proposal, a.edits)),
    );
  }

  const trends = computeTrends(ctx.timelinePoints);
  const evalArgs = {
    stack: ctx.stack,
    profile: ctx.profile,
    labMarkers: ctx.labMarkers,
    trends,
  };
  const current = evaluateStack({ ...evalArgs, items: ctx.stackItems });

  let items = ctx.stackItems;
  const extra: DraftFlag[] = [];
  for (const { proposal, edits } of actions) {
    if (
      proposal.type === "add_item" ||
      proposal.type === "remove_item" ||
      proposal.type === "edit_item"
    ) {
      items = projectItems({ ...ctx, stackItems: items }, proposal, edits);
    } else {
      // generate_protocol / attach_product don't compose into the active item set
      // the same way → take their independent contribution.
      extra.push(...recheckForProposal(ctx, proposal, edits));
    }
  }
  const projected = evaluateStack({ ...evalArgs, items });
  return dedupeFlags([...diffNewFlags(current.flags, projected.flags), ...extra]);
}
