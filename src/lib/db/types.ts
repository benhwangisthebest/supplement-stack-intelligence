// Infrastructure layer — DB row shapes (snake_case as stored in Postgres).
// Mapped to/from domain camelCase by lib/db/mappers.ts.

export interface UserProfileRow {
  id: string;
  user_id: string;
  goals: string[];
  diet: string | null;
  risk_tolerance: string | null;
  allergies: string[];
  medications: string[];
  avoided_ingredients: string[];
  form_preferences: string[];
  caffeine_sensitivity: boolean | null;
  experience_level: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabMarkerRow {
  id: string;
  user_id: string;
  marker: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  date: string | null;
  notes: string | null;
  // lab-timeline (migration 0002, additive). Null for legacy v3 rows.
  panel_id: string | null;
  biomarker_id: string | null;
  canonical_value: number | null;
  canonical_unit: string | null;
}

// lab-timeline (migration 0002).
export interface LabPanelRow {
  id: string;
  user_id: string;
  source: string;
  collected_at: string;
  created_at: string;
}

export interface StackRow {
  id: string;
  user_id: string;
  name: string;
  intent: string;
  mode: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StackItemRow {
  id: string;
  stack_id: string;
  supplement_id: string | null;
  custom_name: string | null;
  dose: number;
  unit: string;
  timing: string | null;
  frequency: string | null;
  reason: string | null;
  notes: string | null;
}

export interface EvaluationFlagRow {
  id: string;
  stack_id: string;
  stack_item_id: string | null;
  severity: string;
  category: string;
  title: string;
  explanation: string;
  recommendation: string;
  evidence_level: string;
  created_at: string;
}
