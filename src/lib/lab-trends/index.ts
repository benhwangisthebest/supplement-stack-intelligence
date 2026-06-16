// Domain layer — PURE, deterministic trend engine (Design §2.1, §11.4). No I/O.
// Plan SC-6: per-marker trajectory across dated panels, in CANONICAL units so
// deltas are unit-correct. Consumes already-canonicalized timeline points
// (canonicalization happens at commit via lib/biomarkers — never re-done here).
// SAFETY: no diagnosis — a TrendSignal describes movement, nothing more.
import { SEED_BIOMARKERS } from "@/data/seed-biomarkers";
import type {
  LabMarkerTimelinePoint,
  TrendDirection,
  TrendSignal,
} from "@/types/lab";

const NAME_BY_ID: Map<string, string> = new Map(
  SEED_BIOMARKERS.map((b) => [b.id, b.name]),
);

// A change smaller than this (in %) reads as "stable" rather than rising/falling.
// Bounded heuristic, documented and deterministic.
const STABLE_PCT = 5;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(earlier: string, later: string): number | null {
  const a = Date.parse(earlier);
  const b = Date.parse(later);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / MS_PER_DAY);
}

function classify(delta: number, pctChange: number | null): TrendDirection {
  if (pctChange !== null && Math.abs(pctChange) < STABLE_PCT) return "stable";
  if (delta > 0) return "rising";
  if (delta < 0) return "falling";
  return "stable";
}

/**
 * Compute per-biomarker trend signals from a user's canonical timeline points.
 * Groups by biomarkerId, orders by collectedAt, and compares the two most
 * recent points. Single-point markers yield direction "insufficient".
 * Deterministic: identical input → deep-equal output, sorted for stability.
 */
export function computeTrends(points: LabMarkerTimelinePoint[]): TrendSignal[] {
  const byMarker = new Map<string, LabMarkerTimelinePoint[]>();
  for (const p of points) {
    const list = byMarker.get(p.biomarkerId);
    if (list) list.push(p);
    else byMarker.set(p.biomarkerId, [p]);
  }

  const signals: TrendSignal[] = [];
  for (const [biomarkerId, group] of byMarker) {
    // Ascending by date; tie-break by value for determinism.
    const sorted = [...group].sort((a, b) => {
      if (a.collectedAt !== b.collectedAt) {
        return a.collectedAt < b.collectedAt ? -1 : 1;
      }
      return a.canonicalValue - b.canonicalValue;
    });
    const biomarkerName = NAME_BY_ID.get(biomarkerId) ?? biomarkerId;
    const newest = sorted[sorted.length - 1];
    const latest = {
      value: newest.canonicalValue,
      unit: newest.canonicalUnit,
      collectedAt: newest.collectedAt,
    };

    if (sorted.length < 2) {
      signals.push({
        biomarkerId,
        biomarkerName,
        latest,
        previous: null,
        delta: null,
        pctChange: null,
        direction: "insufficient",
        windowDays: null,
        points: sorted.length,
      });
      continue;
    }

    const prior = sorted[sorted.length - 2];
    const previous = {
      value: prior.canonicalValue,
      unit: prior.canonicalUnit,
      collectedAt: prior.collectedAt,
    };
    const delta = latest.value - previous.value;
    const pctChange =
      previous.value === 0 ? null : (delta / previous.value) * 100;

    signals.push({
      biomarkerId,
      biomarkerName,
      latest,
      previous,
      delta,
      pctChange,
      direction: classify(delta, pctChange),
      windowDays: daysBetween(previous.collectedAt, latest.collectedAt),
      points: sorted.length,
    });
  }

  // Stable sort: out-of-the-ordinary directions first, then by name.
  const order: Record<TrendDirection, number> = {
    rising: 0,
    falling: 1,
    stable: 2,
    insufficient: 3,
  };
  return signals.sort((a, b) => {
    if (a.direction !== b.direction) return order[a.direction] - order[b.direction];
    return a.biomarkerName.localeCompare(b.biomarkerName);
  });
}
