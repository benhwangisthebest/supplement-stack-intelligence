// Design §3.1 — seed entity (read-only TS module)
//
// What a Paper holds today (header corrected by Phase 4 U2, FU-58). Since Phase 3 a
// paper may carry ONE kind of provenance: a `doi` or `pmid`, and only behind an
// entry in content/verification/provenance-fixture.json, which records the title
// the resolver returned and the committed response it was read from
// (content/verification/provenance.mjs). A paper with neither is still a valid
// Paper; the type does not make every paper citable.
//
// Every other provenance field (authors/journal/year/link/studyType/sampleSize) is
// deliberately ABSENT, not optional (v13, SC-1): with no field to hold it,
// fabricating it is a type error rather than a judgement call. The fixture cannot
// smuggle them in either; it accepts no such key. Re-adding any of these fields
// requires real, verified data. Never invent it.
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
  // Phase 3 U5 (D-3): the only provenance a paper may carry, and only behind a
  // verification record. OPTIONAL on purpose — a required identifier with no real
  // source is the v13 fabrication path. A value here fails the build unless it is
  // well-formed AND content/verification/provenance-fixture.json has a matching
  // entry whose resolved title matches `title` (src/data/provenance-record.test.ts).
  doi?: string;
  pmid?: string;
}
