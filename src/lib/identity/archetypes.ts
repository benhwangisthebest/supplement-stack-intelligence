// Domain — identity-cards (v9). PURE. The user archetype taxonomy as DATA.
// Design Ref: §2.0 (Option C — taxonomy is declarative data, not branching logic),
// §3.3. Adding an archetype = adding a record here; the classifier is untouched.
// Plan SC: taglines/descriptions are non-diagnostic (verified by honesty.test.ts).
import type { ArchetypeDef, ArchetypeId, TraitVector } from "@/types/identity";

/**
 * Each archetype is a labelled point in trait-space over the four *style* axes
 * (evidenceRigor, riskAppetite, breadth, foundationalFocus). `dataDepth` is held
 * neutral here and weighted 0 by the classifier — it drives CONFIDENCE, not
 * identity (Design §3.3), so a thin-data user is never pushed toward a
 * "low-dataDepth" archetype.
 */
const NEUTRAL_DEPTH = 0.5;

function target(
  evidenceRigor: number,
  riskAppetite: number,
  breadth: number,
  foundationalFocus: number,
): TraitVector {
  return {
    evidenceRigor,
    riskAppetite,
    breadth,
    foundationalFocus,
    dataDepth: NEUTRAL_DEPTH,
  };
}

/**
 * The classifiable archetypes (Design §3.3). `emerging` is intentionally absent:
 * it is not a target the classifier matches against — it is selected by the
 * anti-over-claim guard (classify.ts) when data is too thin or no match is close
 * enough. Every entry here is the unique nearest neighbour of its own target
 * (targets are distinct), which the integrity test asserts (Plan SC10).
 */
export const ARCHETYPES: readonly ArchetypeDef[] = [
  {
    id: "longevity-architect",
    name: "Longevity Architect",
    tagline: "You build for the long game — foundational, well-evidenced, low-drama.",
    description:
      "A deliberate builder: your stacks lean on foundational, well-supported items aimed at durability rather than novelty.",
    target: target(0.8, 0.3, 0.55, 0.8),
  },
  {
    id: "evidence-minimalist",
    name: "Evidence Minimalist",
    tagline: "Few items, all earning their place — you keep only what the evidence backs.",
    description:
      "A editor's eye: a lean stack of high-grade items, little speculation, minimal surface area.",
    target: target(0.9, 0.15, 0.25, 0.5),
  },
  {
    id: "experimental-biohacker",
    name: "Experimental Biohacker",
    tagline: "You explore the edges — broad, curious, comfortable with emerging evidence.",
    description:
      "A wide-ranging experimenter: you span many goals and welcome mechanism-based or preliminary items, tracking what works for you.",
    target: target(0.45, 0.85, 0.75, 0.25),
  },
  {
    id: "foundational-purist",
    name: "Foundational Purist",
    tagline: "Basics done right — you prioritize the foundations before anything fancy.",
    description:
      "A foundation-first approach: your stacks concentrate on core, broadly-relevant items rather than targeted or experimental additions.",
    target: target(0.65, 0.2, 0.25, 0.95),
  },
  {
    id: "performance-optimizer",
    name: "Performance Optimizer",
    tagline: "Dialed in for output — evidence-led choices pointed at training and recovery.",
    description:
      "A goal-directed optimizer: well-supported items chosen with a clear performance intent, balancing rigor with a willingness to tune.",
    target: target(0.75, 0.5, 0.5, 0.35),
  },
  {
    id: "broad-explorer",
    name: "Broad Explorer",
    tagline: "Many fronts at once — you cover a wide range of goals across your stacks.",
    description:
      "A generalist: your stacks span many outcome areas, sampling broadly rather than concentrating on one.",
    target: target(0.5, 0.5, 0.9, 0.45),
  },
];

/** Human-readable name for any archetype id, including the `emerging` fallback. */
export const ARCHETYPE_NAMES: Record<ArchetypeId, string> = {
  "longevity-architect": "Longevity Architect",
  "evidence-minimalist": "Evidence Minimalist",
  "experimental-biohacker": "Experimental Biohacker",
  "foundational-purist": "Foundational Purist",
  "performance-optimizer": "Performance Optimizer",
  "broad-explorer": "Broad Explorer",
  emerging: "Emerging",
};

export const EMERGING_TAGLINE =
  "Your card is still forming — add a bit more context to reveal your archetype.";
export const EMERGING_DESCRIPTION =
  "There isn't enough signal yet to place you. Fill in your profile and build out a stack to sharpen your card.";
