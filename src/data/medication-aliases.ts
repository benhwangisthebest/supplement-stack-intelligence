import type { MedicationAlias } from "@/types/interaction";

// Seed-as-code: curated brand→generic→drug-class map. Not medical advice.
// Design §3.1, §8.5 — covers the medications referenced by SEED_INTERACTIONS.
// Keep names lowercase; normalize.ts lowercases user input before matching.
export const MEDICATION_ALIASES: MedicationAlias[] = [
  {
    canonical: "warfarin",
    brands: ["coumadin", "jantoven"],
    drugClasses: ["anticoagulant"],
  },
  {
    canonical: "apixaban",
    brands: ["eliquis"],
    drugClasses: ["anticoagulant"],
  },
  {
    canonical: "rivaroxaban",
    brands: ["xarelto"],
    drugClasses: ["anticoagulant"],
  },
  {
    canonical: "clopidogrel",
    brands: ["plavix"],
    drugClasses: ["antiplatelet"],
  },
  {
    canonical: "aspirin",
    brands: ["acetylsalicylic acid", "asa"],
    drugClasses: ["antiplatelet"],
  },
  {
    canonical: "metformin",
    brands: ["glucophage", "fortamet"],
    drugClasses: ["antidiabetic"],
  },
  {
    canonical: "glipizide",
    brands: ["glucotrol"],
    drugClasses: ["antidiabetic"],
  },
  {
    canonical: "levothyroxine",
    brands: ["synthroid", "levoxyl"],
    drugClasses: ["thyroid-medication"],
  },
  {
    canonical: "lisinopril",
    brands: ["zestril", "prinivil"],
    drugClasses: ["antihypertensive"],
  },
  {
    canonical: "amlodipine",
    brands: ["norvasc"],
    drugClasses: ["antihypertensive"],
  },
  {
    canonical: "hydrochlorothiazide",
    brands: ["hctz", "microzide"],
    drugClasses: ["thiazide-diuretic", "antihypertensive"],
  },
  {
    canonical: "lorazepam",
    brands: ["ativan"],
    drugClasses: ["sedative"],
  },
  {
    canonical: "zolpidem",
    brands: ["ambien"],
    drugClasses: ["sedative"],
  },
  {
    canonical: "prednisone",
    brands: ["deltasone"],
    drugClasses: ["immunosuppressant"],
  },
  {
    canonical: "ciprofloxacin",
    brands: ["cipro"],
    drugClasses: ["quinolone-antibiotic"],
  },
  {
    canonical: "doxycycline",
    brands: ["vibramycin", "doryx"],
    drugClasses: ["tetracycline-antibiotic"],
  },
  {
    canonical: "sertraline",
    brands: ["zoloft"],
    drugClasses: ["ssri"],
  },
  {
    canonical: "nitroglycerin",
    brands: ["nitrostat", "nitro"],
    drugClasses: ["nitrate-vasodilator"],
  },
];
