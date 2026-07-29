import type { OutcomeCategory, SupplementForm } from "./primitives";

export type RiskTolerance = "low" | "moderate" | "high";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

// Design §3.1 — persisted (Supabase)
export interface UserProfile {
  id: string;
  userId: string;
  goals: OutcomeCategory[];
  diet: string | null;
  riskTolerance: RiskTolerance | null;
  allergies: string[];
  medications: string[];
  avoidedIngredients: string[];
  formPreferences: SupplementForm[];
  caffeineSensitivity: boolean | null;
  experienceLevel: ExperienceLevel | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Design §3.1 — persisted (Supabase)
export interface LabMarker {
  id: string;
  userId: string;
  marker: string;
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  date: string | null;
  notes: string | null;
}
