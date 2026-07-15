// Domain — side-effect-engine (v11). PURE types + controlled vocabulary.
// Design Ref: §3.1. The vocabulary is the JOIN KEY between user-reported and
// curated effects — a reported label only correlates once it resolves to a
// canonical label present in a stacked supplement's curated profile.

/**
 * Controlled vocabulary of canonical side-effect labels. Kept in the Domain
 * (types) layer so both the engine and the API validation share one source.
 */
export const SIDE_EFFECT_VOCAB = [
  "nausea",
  "gi-upset",
  "diarrhea",
  "constipation",
  "headache",
  "drowsiness",
  "insomnia",
  "jitteriness",
  "anxiety",
  "dizziness",
  "dry-mouth",
  "flushing",
  "water-retention",
  "vivid-dreams",
  "heartburn",
  "fatigue",
  "rash",
  "metallic-taste",
] as const;

export type CanonicalSideEffect = (typeof SIDE_EFFECT_VOCAB)[number];

export type FrequencyTier = "common" | "infrequent" | "rare";

/** Curated: what a supplement is commonly REPORTED (never "caused") to be associated with. */
export interface SideEffectProfileEntry {
  label: CanonicalSideEffect;
  frequencyTier: FrequencyTier;
  paperIds: string[]; // citations (may be empty — curated-dataset backed)
  watchNote: string; // curated, non-causal
}

export interface SideEffectProfile {
  supplementId: string;
  entries: SideEffectProfileEntry[];
}

/** One structured user report of one canonical effect (one row = one day, by DB uniqueness). */
export interface ReportedSideEffect {
  effectLabel: CanonicalSideEffect;
  severity?: 1 | 2 | 3; // optional, display-only ordinal
  note?: string; // free text — DISPLAY-ONLY, never parsed into logic
}

/** Persisted row (Supabase). */
export interface SideEffectReport extends ReportedSideEffect {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

/**
 * The minimal DATED report the engine needs to intersect with v10 adherence.
 * A persisted `SideEffectReport` satisfies it. Dates are load-bearing: a
 * co-occurrence claim is only truthful if report dates are matched against the
 * days the supplement was actually logged as taken (Act-1 / gap G1).
 */
export interface DatedSideEffectReport {
  effectLabel: CanonicalSideEffect;
  date: string; // YYYY-MM-DD
}

/**
 * Correlational engine output — an OBSERVATION, never a causal claim.
 * `curated-watch`  — supplement is in the stack + has this curated effect (no user data).
 * `reported-match` — user reported this effect on >= MIN_REPORTS days AND it is a
 *                    curated effect of a stacked supplement.
 */
export interface SideEffectFinding {
  supplementId: string;
  label: CanonicalSideEffect;
  frequencyTier: FrequencyTier;
  kind: "curated-watch" | "reported-match";
  /** reported-match only — days the effect was reported AND the supplement was
   *  logged as taken (a true co-occurrence, never an inferred one). */
  reportedDays?: number;
  /** reported-match only — total days the supplement was logged as taken (the
   *  denominator the copy is allowed to cite). */
  takenDays?: number;
  paperIds: string[];
}
