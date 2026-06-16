// Domain layer — lab-timeline entities (Design §3.1). PURE types, no I/O.
// Plan SC: dated panels make biomarkers longitudinal; candidates are review-only
// and NEVER persisted as-is (the confirm gate lives between them and storage).

/** Where a panel's markers came from. */
export type LabSource = "pdf" | "csv" | "paste" | "manual";

export const LAB_SOURCES: readonly LabSource[] = [
  "pdf",
  "csv",
  "paste",
  "manual",
] as const;

/** A dated group of markers from one upload/entry. Persisted (Supabase). */
export interface LabPanel {
  id: string;
  userId: string;
  source: LabSource;
  collectedAt: string; // ISO date — the timeline axis for this panel
  createdAt: string;
}

/**
 * Output of `extract`, input to the confirm UI. Transcription/parse only — the
 * server RECOMPUTES biomarkerId + canonical values on commit and never trusts
 * client-supplied canonical fields (Design §4.2, §7). NEVER stored as-is.
 */
export interface ParsedMarkerCandidate {
  rawLabel: string; // exactly as read from the document
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  biomarkerId: string | null; // normalizeMarker(rawLabel) preview (advisory)
  confidence: "high" | "low"; // parse/adapter confidence (drives review sorting)
}

/** Direction of a marker's movement between its two latest timeline points. */
export type TrendDirection = "rising" | "falling" | "stable" | "insufficient";

/**
 * Output of `lib/lab-trends`. Pure & deterministic. All values are in the
 * biomarker's CANONICAL unit so deltas are unit-correct across panels.
 */
export interface TrendSignal {
  biomarkerId: string;
  biomarkerName: string;
  latest: TrendPoint; // most recent timeline point (canonical unit)
  previous: TrendPoint | null; // prior point, or null when only one exists
  delta: number | null; // latest.value − previous.value (canonical)
  pctChange: number | null; // null when previous is null or 0
  direction: TrendDirection;
  windowDays: number | null; // days between previous and latest
  points: number; // number of timeline points for this marker
}

export interface TrendPoint {
  value: number; // canonical unit
  unit: string; // canonical unit string
  collectedAt: string; // ISO date
}

/**
 * A persisted lab_markers row enriched with timeline fields. The trend engine
 * consumes these (panelled rows AND legacy `panel_id IS NULL` rows alike).
 */
export interface LabMarkerTimelinePoint {
  biomarkerId: string; // canonical id (rows with null id are excluded upstream)
  canonicalValue: number; // value in the biomarker's canonical unit
  canonicalUnit: string;
  collectedAt: string; // panel.collected_at ?? lab_markers.date
}
