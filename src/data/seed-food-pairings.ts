import type { InteractionRule } from "@/types/interaction";

// Seed-as-code: curated, conservative supplement↔food pairings (v12). NOT medical advice.
// Design Ref: §3.1, §8.5 — food-pairings data model.
// Curation rules (mirror seed-interactions.ts):
//   - only well-documented, absorption-relevant pairings;
//   - every supplementId must exist in SEED_SUPPLEMENTS (integrity-checked in tests);
//   - `direction: "synergy"` = pairs well (boosts/helps); `"avoid"` = reduces benefit / adds load;
//   - absence of a rule never implies "no effect".
// Severity convention (Design §4.4): synergy → "info"; avoid → "caution"/"warning".
export const SEED_FOOD_PAIRINGS: InteractionRule[] = [
  // ---- synergy (pairs well) ----
  {
    id: "vitamin-d--fat-meal",
    kind: "supplement-food",
    supplementId: "vitamin-d",
    direction: "synergy",
    food: "a meal containing fat",
    timing: "take with your largest fat-containing meal",
    severity: "info",
    mechanism:
      "vitamin D is fat-soluble, so dietary fat improves how much is absorbed",
    management:
      "Taking it alongside a meal that contains some fat may improve absorption compared with an empty stomach.",
    evidenceGrade: "B",
  },
  {
    id: "fish-oil--meal",
    kind: "supplement-food",
    supplementId: "fish-oil",
    direction: "synergy",
    food: "a meal containing fat",
    timing: "take with food",
    severity: "info",
    mechanism:
      "omega-3s are better absorbed with dietary fat, which also reduces fishy reflux for many people",
    management:
      "Taking fish oil with a meal may improve absorption and reduce aftertaste compared with an empty stomach.",
    evidenceGrade: "B",
  },
  {
    id: "creatine--carbohydrates",
    kind: "supplement-food",
    supplementId: "creatine",
    direction: "synergy",
    food: "carbohydrate-rich foods",
    timing: "take around a carbohydrate-containing meal",
    severity: "info",
    mechanism:
      "the insulin response to carbohydrates can modestly increase creatine uptake into muscle",
    management:
      "Pairing creatine with carbohydrates may slightly improve uptake, though consistent daily intake matters most.",
    evidenceGrade: "C",
  },
  {
    id: "berberine--meals",
    kind: "supplement-food",
    supplementId: "berberine",
    direction: "synergy",
    food: "meals",
    timing: "take with or shortly before a meal",
    severity: "info",
    mechanism:
      "taking berberine around meals aligns its glucose-lowering action with post-meal blood sugar and eases GI tolerance",
    management:
      "Dosing with or just before meals is commonly used and may improve GI comfort.",
    evidenceGrade: "C",
  },
  {
    id: "ashwagandha--meal",
    kind: "supplement-food",
    supplementId: "ashwagandha",
    direction: "synergy",
    food: "a meal (ideally containing some fat)",
    timing: "take with food",
    severity: "info",
    mechanism:
      "the active withanolides are fat-soluble, and taking with food reduces the chance of mild GI upset",
    management:
      "Taking ashwagandha with a meal may aid absorption and reduce stomach upset.",
    evidenceGrade: "C",
  },
  {
    id: "magnesium--food",
    kind: "supplement-food",
    supplementId: "magnesium",
    direction: "synergy",
    food: "food",
    timing: "take with a meal",
    severity: "info",
    mechanism:
      "taking magnesium with food commonly reduces the loose-stool / GI effects some forms cause",
    management:
      "Taking magnesium with a meal may improve tolerance, especially with more laxative forms like citrate or oxide.",
    evidenceGrade: "C",
  },

  // ---- avoid (reduces benefit / adds load) ----
  {
    id: "zinc--phytates",
    kind: "supplement-food",
    supplementId: "zinc",
    direction: "avoid",
    food: "high-phytate foods (whole grains, legumes, bran)",
    timing: "separate zinc from high-phytate meals by ~2 hours",
    severity: "caution",
    mechanism:
      "phytates bind zinc in the gut and can meaningfully reduce how much is absorbed",
    management:
      "Separating zinc from large high-phytate meals may preserve absorption; taking it between meals is one option.",
    evidenceGrade: "B",
  },
  {
    id: "zinc--calcium-foods",
    kind: "supplement-food",
    supplementId: "zinc",
    direction: "avoid",
    food: "large amounts of calcium-rich foods/dairy at the same time",
    timing: "separate by ~2 hours from a high-calcium meal",
    severity: "caution",
    mechanism:
      "high calcium intake at the same time can compete with zinc for absorption",
    management:
      "Spacing zinc apart from a large dairy/calcium-heavy meal may help absorption.",
    evidenceGrade: "C",
  },
  {
    id: "caffeine--caffeinated-drinks",
    kind: "supplement-food",
    supplementId: "caffeine",
    direction: "avoid",
    food: "coffee, tea, and other caffeinated drinks",
    timing: "account for caffeine from food/drinks in your daily total",
    severity: "warning",
    mechanism:
      "caffeine from beverages adds to a caffeine supplement, so the combined stimulant load can be higher than intended",
    management:
      "Counting caffeine from coffee, tea, and energy drinks toward your total helps avoid unintentionally high intake.",
    evidenceGrade: "B",
  },
  {
    id: "melatonin--heavy-meal",
    kind: "supplement-food",
    supplementId: "melatonin",
    direction: "avoid",
    food: "a large, high-fat meal right before dosing",
    timing: "avoid taking immediately after a heavy meal",
    severity: "caution",
    mechanism:
      "a large high-fat meal can delay absorption and shift when melatonin takes effect",
    management:
      "Allowing some time between a heavy meal and melatonin may give more predictable timing.",
    evidenceGrade: "C",
  },
];
