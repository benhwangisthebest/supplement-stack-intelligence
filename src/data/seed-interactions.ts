import type { InteractionRule } from "@/types/interaction";

// Seed-as-code: curated, conservative interaction rules. NOT medical advice.
// Design §3.1, §8.5 — ≥8 supplement↔drug + ≥3 supplement↔supplement.
// Curation rule: only well-documented pairs; absence of a rule never implies "safe".
// All supplementId / otherSupplementId values must exist in SEED_SUPPLEMENTS
// (integrity-checked in interactions.test.ts).
export const SEED_INTERACTIONS: InteractionRule[] = [
  // ---- supplement ↔ drug-class ----
  {
    id: "fish-oil--anticoagulant",
    kind: "supplement-drug",
    supplementId: "fish-oil",
    drugClass: "anticoagulant",
    severity: "warning",
    mechanism: "omega-3s can mildly reduce platelet aggregation, which may add to a blood thinner's effect",
    management:
      "Bleeding risk may be higher when combined; this is worth reviewing with the prescriber before continuing.",
    evidenceGrade: "B",
  },
  {
    id: "fish-oil--antiplatelet",
    kind: "supplement-drug",
    supplementId: "fish-oil",
    drugClass: "antiplatelet",
    severity: "caution",
    mechanism: "omega-3s and antiplatelet drugs both reduce platelet aggregation",
    management:
      "The combined effect on bleeding is usually modest, but worth mentioning to the prescriber.",
    evidenceGrade: "C",
  },
  {
    id: "berberine--antidiabetic",
    kind: "supplement-drug",
    supplementId: "berberine",
    drugClass: "antidiabetic",
    severity: "warning",
    mechanism: "berberine can lower blood glucose, which may add to a glucose-lowering medication",
    management:
      "Combined use may lower blood sugar more than expected; glucose monitoring and prescriber input are reasonable.",
    evidenceGrade: "B",
  },
  {
    id: "magnesium--quinolone-antibiotic",
    kind: "supplement-drug",
    supplementId: "magnesium",
    drugClass: "quinolone-antibiotic",
    severity: "caution",
    mechanism: "magnesium can bind the antibiotic in the gut and reduce its absorption",
    management:
      "Separating the doses by several hours generally avoids this; a clinician or pharmacist can advise on timing.",
    evidenceGrade: "B",
  },
  {
    id: "magnesium--tetracycline-antibiotic",
    kind: "supplement-drug",
    supplementId: "magnesium",
    drugClass: "tetracycline-antibiotic",
    severity: "caution",
    mechanism: "magnesium can chelate tetracyclines and reduce antibiotic absorption",
    management:
      "Spacing the doses apart usually prevents the interaction; confirm timing with a pharmacist.",
    evidenceGrade: "B",
  },
  {
    id: "magnesium--thyroid-medication",
    kind: "supplement-drug",
    supplementId: "magnesium",
    drugClass: "thyroid-medication",
    severity: "caution",
    mechanism: "magnesium may reduce absorption of thyroid hormone replacement",
    management:
      "Taking them several hours apart generally avoids the issue; a pharmacist can advise on timing.",
    evidenceGrade: "C",
  },
  {
    id: "zinc--quinolone-antibiotic",
    kind: "supplement-drug",
    supplementId: "zinc",
    drugClass: "quinolone-antibiotic",
    severity: "caution",
    mechanism: "zinc can bind the antibiotic and reduce its absorption",
    management:
      "Separating the doses by several hours generally avoids this; check timing with a pharmacist.",
    evidenceGrade: "B",
  },
  {
    id: "zinc--thyroid-medication",
    kind: "supplement-drug",
    supplementId: "zinc",
    drugClass: "thyroid-medication",
    severity: "caution",
    mechanism: "zinc may reduce absorption of thyroid hormone replacement",
    management: "Taking them several hours apart generally avoids the issue.",
    evidenceGrade: "C",
  },
  {
    id: "vitamin-d--thiazide-diuretic",
    kind: "supplement-drug",
    supplementId: "vitamin-d",
    drugClass: "thiazide-diuretic",
    severity: "caution",
    mechanism: "thiazides reduce calcium excretion, and vitamin D raises calcium absorption, which together may raise blood calcium",
    management:
      "At high vitamin D doses this is worth monitoring; a clinician can advise on dosing.",
    evidenceGrade: "C",
  },
  {
    id: "ashwagandha--sedative",
    kind: "supplement-drug",
    supplementId: "ashwagandha",
    drugClass: "sedative",
    severity: "caution",
    mechanism: "ashwagandha may have calming effects that add to sedative medications",
    management: "Additive drowsiness is possible; worth noting if combining the two.",
    evidenceGrade: "C",
  },
  {
    id: "ashwagandha--thyroid-medication",
    kind: "supplement-drug",
    supplementId: "ashwagandha",
    drugClass: "thyroid-medication",
    severity: "caution",
    mechanism: "ashwagandha may increase thyroid hormone levels, which can add to thyroid replacement",
    management:
      "Combined use may raise thyroid hormone more than intended; prescriber input is reasonable.",
    evidenceGrade: "C",
  },
  {
    id: "ashwagandha--immunosuppressant",
    kind: "supplement-drug",
    supplementId: "ashwagandha",
    drugClass: "immunosuppressant",
    severity: "warning",
    mechanism: "ashwagandha may stimulate immune activity, which can oppose immunosuppressant therapy",
    management:
      "This combination may work against the medication's purpose and is worth discussing with the prescriber.",
    evidenceGrade: "C",
  },
  {
    id: "melatonin--sedative",
    kind: "supplement-drug",
    supplementId: "melatonin",
    drugClass: "sedative",
    severity: "caution",
    mechanism: "melatonin can add to the drowsiness from sedative medications",
    management: "Additive sedation is possible, especially next-morning grogginess.",
    evidenceGrade: "B",
  },
  {
    id: "melatonin--anticoagulant",
    kind: "supplement-drug",
    supplementId: "melatonin",
    drugClass: "anticoagulant",
    severity: "caution",
    mechanism: "some reports suggest melatonin may affect blood thinner activity",
    management:
      "Evidence is limited; mentioning the combination to the prescriber is reasonable.",
    evidenceGrade: "D",
  },
  {
    id: "nac--nitrate-vasodilator",
    kind: "supplement-drug",
    supplementId: "nac",
    drugClass: "nitrate-vasodilator",
    severity: "caution",
    mechanism: "NAC may enhance the blood-vessel-widening effect of nitrates, which can lower blood pressure",
    management:
      "Headache or lightheadedness may be more likely; worth reviewing with the prescriber.",
    evidenceGrade: "C",
  },
  {
    id: "l-theanine--antihypertensive",
    kind: "supplement-drug",
    supplementId: "l-theanine",
    drugClass: "antihypertensive",
    severity: "info",
    mechanism: "L-theanine may modestly lower blood pressure, which could add to blood-pressure medication",
    management: "The effect is usually small; no action is typically needed.",
    evidenceGrade: "D",
  },
  {
    id: "caffeine--stimulant",
    kind: "supplement-drug",
    supplementId: "caffeine",
    drugClass: "stimulant",
    severity: "caution",
    mechanism: "caffeine adds to the effects of stimulant medications",
    management:
      "Jitteriness, raised heart rate, or sleep disruption may be more likely when combined.",
    evidenceGrade: "C",
  },

  // ---- supplement ↔ supplement ----
  {
    id: "magnesium--zinc",
    kind: "supplement-supplement",
    supplementId: "magnesium",
    otherSupplementId: "zinc",
    severity: "info",
    mechanism: "at high doses, magnesium and zinc can compete for absorption in the gut",
    management:
      "At typical doses this is minor; separating them or taking with food can help if you take large amounts.",
    evidenceGrade: "C",
  },
  {
    id: "melatonin--ashwagandha",
    kind: "supplement-supplement",
    supplementId: "melatonin",
    otherSupplementId: "ashwagandha",
    severity: "caution",
    mechanism: "both can promote relaxation or drowsiness, which may be additive",
    management: "Combined evening use may increase sedation; adjust timing if you feel groggy.",
    evidenceGrade: "C",
  },
  {
    id: "melatonin--glycine",
    kind: "supplement-supplement",
    supplementId: "melatonin",
    otherSupplementId: "glycine",
    severity: "info",
    mechanism: "both are used for sleep and may have a mild additive effect",
    management: "Generally well tolerated together; no specific action is usually needed.",
    evidenceGrade: "D",
  },
];
