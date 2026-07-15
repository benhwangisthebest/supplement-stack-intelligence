// Domain layer — PURE. Controlled-vocabulary normalization + display labels.
// Design Ref: §3.1, §4.2 — free-text reports normalize to a canonical label or
// are rejected (a non-canonical label never fabricates a correlation).
import { SIDE_EFFECT_VOCAB, type CanonicalSideEffect } from "@/types/side-effect";

const VOCAB_SET = new Set<string>(SIDE_EFFECT_VOCAB);

/** Free-text aliases → canonical label. Lowercased, single-spaced keys. */
const ALIASES: Record<string, CanonicalSideEffect> = {
  // nausea
  queasy: "nausea",
  queasiness: "nausea",
  "upset stomach": "nausea",
  "feeling sick": "nausea",
  // gi-upset
  "gi upset": "gi-upset",
  "stomach ache": "gi-upset",
  stomachache: "gi-upset",
  "stomach cramps": "gi-upset",
  cramps: "gi-upset",
  indigestion: "gi-upset",
  bloating: "gi-upset",
  gas: "gi-upset",
  // diarrhea
  "loose stools": "diarrhea",
  "loose stool": "diarrhea",
  // constipation
  constipated: "constipation",
  // headache
  headaches: "headache",
  migraine: "headache",
  // drowsiness
  drowsy: "drowsiness",
  sleepy: "drowsiness",
  grogginess: "drowsiness",
  groggy: "drowsiness",
  sedation: "drowsiness",
  // insomnia
  "cant sleep": "insomnia",
  "can't sleep": "insomnia",
  "trouble sleeping": "insomnia",
  sleeplessness: "insomnia",
  // jitteriness
  jittery: "jitteriness",
  jitters: "jitteriness",
  wired: "jitteriness",
  restlessness: "jitteriness",
  // anxiety
  anxious: "anxiety",
  nervousness: "anxiety",
  // dizziness
  dizzy: "dizziness",
  lightheaded: "dizziness",
  "light-headed": "dizziness",
  // dry-mouth
  "dry mouth": "dry-mouth",
  // flushing
  flushed: "flushing",
  "hot flush": "flushing",
  // water-retention
  "water retention": "water-retention",
  puffiness: "water-retention",
  // vivid-dreams
  "vivid dreams": "vivid-dreams",
  "weird dreams": "vivid-dreams",
  nightmares: "vivid-dreams",
  // heartburn
  "acid reflux": "heartburn",
  reflux: "heartburn",
  "fish burps": "heartburn",
  // fatigue
  tiredness: "fatigue",
  tired: "fatigue",
  // rash
  "skin rash": "rash",
  itching: "rash",
  hives: "rash",
  // metallic-taste
  "metallic taste": "metallic-taste",
  "metal taste": "metallic-taste",
};

/** Human-readable display label for a canonical effect. */
const DISPLAY: Record<CanonicalSideEffect, string> = {
  nausea: "nausea",
  "gi-upset": "GI upset",
  diarrhea: "diarrhea",
  constipation: "constipation",
  headache: "headache",
  drowsiness: "drowsiness",
  insomnia: "trouble sleeping",
  jitteriness: "jitteriness",
  anxiety: "anxiety",
  dizziness: "dizziness",
  "dry-mouth": "dry mouth",
  flushing: "flushing",
  "water-retention": "water retention",
  "vivid-dreams": "vivid dreams",
  heartburn: "heartburn",
  fatigue: "fatigue",
  rash: "skin rash",
  "metallic-taste": "a metallic taste",
};

/** Resolve free text to a canonical label, or null if unrecognized. Never throws. */
export function normalizeSideEffect(input: string): CanonicalSideEffect | null {
  const key = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  if (VOCAB_SET.has(key)) return key as CanonicalSideEffect;
  return ALIASES[key] ?? null;
}

/** Display label for a canonical effect (falls back to the raw label). */
export function sideEffectLabel(effect: CanonicalSideEffect): string {
  return DISPLAY[effect] ?? effect;
}
