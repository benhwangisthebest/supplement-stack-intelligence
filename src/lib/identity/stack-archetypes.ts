// Domain — identity-cards (v9). PURE. Classifies a SINGLE stack (by its intent +
// composition) using the same trait engine scoped to that stack. Design Ref:
// §3.1, §5.4. Plan SC4. Reuses computeTraitVector + classify — one code path.
import { classify } from "./classify";
import { computeTraitVector } from "./traits";
import { ARCHETYPE_NAMES } from "./archetypes";
import type { IdentityContext, IdentityStack, StackArchetype } from "@/types/identity";

function intentLabel(intent: IdentityStack["intent"]): string {
  return intent.charAt(0).toUpperCase() + intent.slice(1);
}

/**
 * Derive the archetype a single stack "reads as". A scoped one-stack context
 * feeds the shared trait engine; confidence is emerging only for an empty stack
 * (a stack with items always has enough signal to read).
 */
export function deriveStackArchetype(
  stack: IdentityStack,
  ctx: IdentityContext,
): StackArchetype {
  const scoped: IdentityContext = {
    profile: ctx.profile,
    stacks: [stack],
    hasLabs: ctx.hasLabs,
  };
  const vector = computeTraitVector(scoped);
  const confidence = stack.itemSupplementIds.length === 0 ? "emerging" : "established";
  const { archetype } = classify(vector, confidence);
  const name = ARCHETYPE_NAMES[archetype];

  const note =
    archetype === "emerging"
      ? `This ${intentLabel(stack.intent)} stack needs a few items before it can be read.`
      : `This ${intentLabel(stack.intent)} stack reads as ${name}.`;

  return {
    stackId: stack.stackId,
    stackName: stack.name,
    intent: stack.intent,
    archetype,
    name,
    note,
  };
}
