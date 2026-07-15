// Domain (data) — side-effect-engine (v11). Curated commonly-reported effects.
// Design Ref: §8.5 — seed-as-code, curated sample data, NOT medical advice.
// Labels align with the sideEffects prose already in seed-supplements.ts, mapped
// to the canonical vocabulary. `paperIds` are intentionally empty for now
// (curated-dataset backed) — the UI shows citation chips only when present.
import type { SideEffectProfile } from "@/types/side-effect";

export const SEED_SIDE_EFFECTS: SideEffectProfile[] = [
  {
    supplementId: "magnesium",
    entries: [
      { label: "diarrhea", frequencyTier: "common", paperIds: [], watchNote: "Loose stools are commonly reported at higher doses, especially with citrate or oxide forms." },
      { label: "gi-upset", frequencyTier: "infrequent", paperIds: [], watchNote: "Mild GI upset is sometimes reported." },
    ],
  },
  {
    supplementId: "creatine",
    entries: [
      { label: "water-retention", frequencyTier: "common", paperIds: [], watchNote: "Mild water retention is commonly reported, particularly during loading." },
      { label: "gi-upset", frequencyTier: "infrequent", paperIds: [], watchNote: "GI upset is sometimes reported with large single doses." },
    ],
  },
  {
    supplementId: "fish-oil",
    entries: [
      { label: "heartburn", frequencyTier: "common", paperIds: [], watchNote: "Reflux or 'fish burps' are commonly reported." },
      { label: "nausea", frequencyTier: "infrequent", paperIds: [], watchNote: "Mild nausea is sometimes reported, often reduced by taking with food." },
    ],
  },
  {
    supplementId: "l-theanine",
    entries: [
      { label: "drowsiness", frequencyTier: "infrequent", paperIds: [], watchNote: "Mild drowsiness is sometimes reported, more so at higher doses." },
      { label: "headache", frequencyTier: "rare", paperIds: [], watchNote: "Headache is rarely reported." },
    ],
  },
  {
    supplementId: "glycine",
    entries: [
      { label: "drowsiness", frequencyTier: "infrequent", paperIds: [], watchNote: "Drowsiness is sometimes reported near bedtime dosing." },
      { label: "gi-upset", frequencyTier: "rare", paperIds: [], watchNote: "Mild GI upset is rarely reported." },
    ],
  },
  {
    supplementId: "melatonin",
    entries: [
      { label: "drowsiness", frequencyTier: "common", paperIds: [], watchNote: "Next-morning drowsiness is commonly reported, especially at higher doses." },
      { label: "vivid-dreams", frequencyTier: "common", paperIds: [], watchNote: "Vivid dreams are commonly reported." },
      { label: "headache", frequencyTier: "infrequent", paperIds: [], watchNote: "Headache is sometimes reported." },
    ],
  },
  {
    supplementId: "ashwagandha",
    entries: [
      { label: "drowsiness", frequencyTier: "infrequent", paperIds: [], watchNote: "Drowsiness is sometimes reported." },
      { label: "gi-upset", frequencyTier: "infrequent", paperIds: [], watchNote: "GI upset is sometimes reported." },
    ],
  },
  {
    supplementId: "berberine",
    entries: [
      { label: "gi-upset", frequencyTier: "common", paperIds: [], watchNote: "GI upset is commonly reported, often dose-dependent." },
      { label: "diarrhea", frequencyTier: "common", paperIds: [], watchNote: "Diarrhea is commonly reported early on." },
      { label: "constipation", frequencyTier: "infrequent", paperIds: [], watchNote: "Constipation is sometimes reported." },
    ],
  },
  {
    supplementId: "zinc",
    entries: [
      { label: "nausea", frequencyTier: "common", paperIds: [], watchNote: "Nausea is commonly reported when taken on an empty stomach." },
      { label: "metallic-taste", frequencyTier: "infrequent", paperIds: [], watchNote: "A metallic taste is sometimes reported." },
    ],
  },
  {
    supplementId: "caffeine",
    entries: [
      { label: "jitteriness", frequencyTier: "common", paperIds: [], watchNote: "Jitteriness is commonly reported, especially at higher intakes." },
      { label: "insomnia", frequencyTier: "common", paperIds: [], watchNote: "Trouble sleeping is commonly reported with later-day intake." },
      { label: "anxiety", frequencyTier: "infrequent", paperIds: [], watchNote: "Anxiety is sometimes reported in sensitive individuals." },
    ],
  },
  {
    supplementId: "nac",
    entries: [
      { label: "nausea", frequencyTier: "infrequent", paperIds: [], watchNote: "Nausea is sometimes reported." },
      { label: "gi-upset", frequencyTier: "infrequent", paperIds: [], watchNote: "GI upset is sometimes reported." },
    ],
  },
  {
    supplementId: "protein-powder",
    entries: [
      { label: "gi-upset", frequencyTier: "common", paperIds: [], watchNote: "Bloating or GI upset is commonly reported, especially with whey and lactose sensitivity." },
      { label: "diarrhea", frequencyTier: "infrequent", paperIds: [], watchNote: "Diarrhea is sometimes reported with lactose sensitivity." },
    ],
  },
];
