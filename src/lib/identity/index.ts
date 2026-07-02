// Domain — identity-cards (v9). PURE barrel. Assembles the user IdentityCard and
// re-exports the per-stack / per-supplement derivations. Design Ref: §2.1, §5.1.
// Plan SC1/SC2: deterministic + explainable (the card carries the evidence trail
// that earned it). No I/O — the loader (M2) supplies the IdentityContext.
import { getBestEffectForOutcome, getSupplementById } from "@/lib/evidence";
import { DISCLAIMERS } from "@/lib/safety";
import {
  ARCHETYPES,
  ARCHETYPE_NAMES,
  EMERGING_DESCRIPTION,
  EMERGING_TAGLINE,
} from "./archetypes";
import { classify } from "./classify";
import { deriveConfidence } from "./confidence";
import { computeTraitVector, describeTraits } from "./traits";
import type {
  ArchetypeId,
  IdentityCard,
  IdentityContext,
  IdentitySignal,
} from "@/types/identity";

/** Max evidence-trail lines on the card (Design §5.1). */
const MAX_TRAIL = 4;
/** Grade → sort rank so the trail leads with the strongest evidence. */
const GRADE_RANK: Record<"A" | "B" | "C" | "D", number> = { A: 4, B: 3, C: 2, D: 1 };

function tagline(id: ArchetypeId): string {
  if (id === "emerging") return EMERGING_TAGLINE;
  return ARCHETYPES.find((a) => a.id === id)?.tagline ?? "";
}

function description(id: ArchetypeId): string {
  if (id === "emerging") return EMERGING_DESCRIPTION;
  return ARCHETYPES.find((a) => a.id === id)?.description ?? "";
}

/**
 * The "why this archetype" trail: the strongest-evidence items in the user's
 * stacks, each deep-linkable into the Library via its effect id (citationHref,
 * M3). Non-linkable/custom items are simply omitted — never a fabricated line.
 */
function buildTrail(ctx: IdentityContext): IdentitySignal[] {
  const scored: { rank: number; signal: IdentitySignal }[] = [];

  for (const stack of ctx.stacks) {
    if (stack.intent === "experimental") continue;
    for (const supplementId of stack.itemSupplementIds) {
      if (!supplementId) continue;
      const best = getBestEffectForOutcome(supplementId, stack.intent);
      if (!best) continue;
      const supp = getSupplementById(supplementId);
      if (!supp) continue;
      const label = `${supp.name} — grade ${best.grade} for ${stack.intent}`;
      scored.push({
        rank: GRADE_RANK[best.grade],
        signal: {
          label,
          detail: best.summary,
          citation: {
            kind: "effect-grade",
            refId: best.id,
            label,
            detail: best.relevantPopulation,
          },
        },
      });
    }
  }

  // Strongest first; de-dupe by effect id (an item can appear in multiple stacks).
  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.rank - a.rank)
    .filter(({ signal }) => {
      const id = signal.citation?.refId ?? signal.label;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX_TRAIL)
    .map(({ signal }) => signal);
}

/**
 * Derive the user's identity card from a pre-loaded context. TOTAL + deterministic.
 * Emerging state carries no confident trail — only the sharpen checklist.
 */
export function deriveUserIdentity(ctx: IdentityContext): IdentityCard {
  const vector = computeTraitVector(ctx);
  const { level, sharpen } = deriveConfidence(ctx, vector.dataDepth);
  const { archetype, matchScore } = classify(vector, level);
  const traits = describeTraits(ctx, vector);
  const emerging = archetype === "emerging";

  return {
    archetype,
    name: ARCHETYPE_NAMES[archetype],
    tagline: tagline(archetype),
    matchScore,
    traits,
    confidence: level,
    sharpen,
    trail: emerging ? [] : buildTrail(ctx),
    disclaimer: DISCLAIMERS.general,
  };
}

export { deriveStackArchetype } from "./stack-archetypes";
export { deriveSupplementArchetype } from "./supplement-archetypes";
export { description as archetypeDescription };
