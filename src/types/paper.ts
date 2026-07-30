// Design §3.1 — seed entity (read-only TS module)
//
// v13 (evidence-disclosure): this is an ILLUSTRATIVE EVIDENCE SUMMARY, not a citable
// study. The provenance fields (authors/journal/year/link/studyType/sampleSize) are
// deliberately ABSENT, not optional: `link: string` being REQUIRED is what compelled
// 20 fabricated placeholder URLs in the first place. With no field to hold provenance,
// fabricating it is a type error rather than a judgement call.
//
// Plan SC: SC-1 — provenance is unauthorable by construction.
// Re-adding any of these fields requires real, verified DOI/PMID data. Never invent it.
export interface Paper {
  id: string;
  title: string;
  population: string;
  intervention: string;
  dose: string;
  duration: string;
  outcomes: string;
  limitations: string;
  summary: string;
}
