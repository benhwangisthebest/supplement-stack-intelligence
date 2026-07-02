// Domain — identity-cards (v9). PURE types for the derived "supplement-thinking"
// identity layer. Design Ref: §3.1 — no DB, no migration; the card is DERIVED on
// the fly from existing profile/stack/evidence signals, never stored.
// Plan SC: identity describes supplement-THINKING style, never health status.
import type { OutcomeCategory } from "./index";
import type { Citation } from "./advisor"; // reuse v6 provenance for deep-linking

// ---- Trait axes (Design §3.1, §3.2) -----------------------------------------

/** The five identity trait axes, each normalized to [0,1]. */
export type TraitAxis =
  | "evidenceRigor" // how well-supported the user's chosen items are
  | "riskAppetite" // tilt toward experimental / low-evidence / high risk-tolerance
  | "breadth" // spread across distinct outcome domains
  | "foundationalFocus" // tilt toward foundational vs targeted/experimental
  | "dataDepth"; // how much context the user has invested (also drives confidence)

export const TRAIT_AXES: readonly TraitAxis[] = [
  "evidenceRigor",
  "riskAppetite",
  "breadth",
  "foundationalFocus",
  "dataDepth",
] as const;

/** A point in trait-space — every axis present, each ∈ [0,1]. */
export type TraitVector = Record<TraitAxis, number>;

/** A single rendered trait axis handed to the UI (Design §5.1). */
export interface IdentityTrait {
  axis: TraitAxis;
  label: string; // "Evidence Rigor"
  value: number; // [0,1]
  derivation: string; // non-diagnostic, human-readable
}

// ---- User archetypes (Design §3.3) ------------------------------------------

export type ArchetypeId =
  | "longevity-architect"
  | "evidence-minimalist"
  | "experimental-biohacker"
  | "foundational-purist"
  | "performance-optimizer"
  | "broad-explorer"
  | "emerging"; // explicit low-confidence fallback — classifier is TOTAL

/** A declarative archetype definition: a labelled point in trait-space. */
export interface ArchetypeDef {
  id: ArchetypeId;
  name: string; // "Longevity Architect"
  tagline: string; // one premium line, non-diagnostic
  description: string;
  /** The trait-vector this archetype represents (classifier matches against it). */
  target: TraitVector;
  /** Optional per-axis distance weights (default 1 for every axis). */
  weights?: Partial<Record<TraitAxis, number>>;
}

// ---- Confidence (Design §3.3, anti-over-claim guard) ------------------------

export type ConfidenceLevel = "emerging" | "developing" | "established";

// ---- Evidence trail + card (Design §5.1) ------------------------------------

/** One line of the "why this archetype" trail. */
export interface IdentitySignal {
  label: string; // "Creatine — grade A for training"
  detail: string;
  citation?: Citation; // → citationHref() deep-link; absent = inert line
}

/** The rendered user identity card. */
export interface IdentityCard {
  archetype: ArchetypeId;
  name: string;
  tagline: string;
  matchScore: number; // [0,1] closeness to the winning archetype
  traits: IdentityTrait[]; // the five axes
  confidence: ConfidenceLevel;
  sharpen: string[]; // "Add lab markers to sharpen your card"
  trail: IdentitySignal[]; // why this archetype (deep-linked)
  disclaimer: string; // from lib/safety
}

// ---- Per-stack archetype (Design §3.1) --------------------------------------

export interface StackArchetype {
  stackId: string;
  stackName: string;
  intent: OutcomeCategory | "experimental";
  archetype: ArchetypeId;
  name: string;
  note: string; // "This Sleep stack reads as Foundational Purist"
}

// ---- Supplement archetype (Library, Design §3.1) ----------------------------

export type SupplementArchetypeId =
  | "foundational-staple"
  | "targeted-specialist"
  | "experimental-edge"
  | "broad-spectrum";

export interface SupplementArchetype {
  supplementId: string;
  archetype: SupplementArchetypeId;
  name: string;
  rationale: string; // "Broad, high-grade evidence across 4 outcomes"
}

// ---- Context assembled by the Infra loader (module-2), consumed by the engine.
// Kept here so the pure engine depends only on a plain data shape (no I/O).
export interface IdentityStack {
  stackId: string;
  name: string;
  intent: OutcomeCategory | "experimental";
  /** supplementId of each item, or null for a free-text custom item. */
  itemSupplementIds: (string | null)[];
}

export interface IdentityContext {
  /** Present when the user has a profile row. */
  profile: {
    goals: OutcomeCategory[];
    riskTolerance: "low" | "moderate" | "high" | null;
    experienceLevel: "beginner" | "intermediate" | "advanced" | null;
    filledFieldCount: number; // 0..PROFILE_FIELD_COUNT (computed by loader)
  } | null;
  stacks: IdentityStack[];
  hasLabs: boolean;
  /** daily-checkin v10: [0,1] check-in consistency; contributes to dataDepth.
   *  Optional/backward-compatible — absent ⇒ treated as 0 (no effect on v9 output). */
  checkinConsistency?: number;
}
