// Design §3.1 — seed entity (read-only TS module)
export type StudyType =
  | "meta-analysis"
  | "RCT"
  | "cohort"
  | "observational"
  | "animal"
  | "in-vitro";

export interface Paper {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  link: string;
  studyType: StudyType;
  population: string;
  sampleSize: number;
  intervention: string;
  dose: string;
  duration: string;
  outcomes: string;
  limitations: string;
  summary: string;
}
