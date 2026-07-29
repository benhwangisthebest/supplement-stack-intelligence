import type { DoseRange, SupplementForm } from "./primitives";

// Design §3.1 — seed entity (read-only TS module)
export interface Supplement {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  category: string;
  description: string; // plain-English overview
  commonForms: SupplementForm[];
  mechanismSummary: string;
  sideEffects: string[];
  contraindications: string[];
  allergenTags: string[]; // e.g. ['fish','shellfish','soy']
  generalDose: DoseRange;
  relatedSupplementIds: string[];
  tags: string[];
}
