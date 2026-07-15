// Domain layer — PURE. Side-effect engine (v11). Sibling to lib/interactions
// and lib/biomarkers. No I/O, no React, no Supabase. Emits OBSERVATIONS, never
// causal claims. Design Ref: §2.1, §11 — curatedWatchList (Library) +
// correlateReports (Stack Evaluation, min-sample gated).
import { SEED_SIDE_EFFECTS } from "@/data/seed-side-effects";
import type {
  CanonicalSideEffect,
  DatedSideEffectReport,
  SideEffectFinding,
  SideEffectProfile,
} from "@/types/side-effect";
import type { DailyCheckin } from "@/types/checkin";
import type { StackItem } from "@/types";

/** Minimum CO-OCCURRENCE days (effect reported AND supplement logged taken). */
export const MIN_REPORTS = 3;
/** Minimum days the supplement was logged as taken — the adherence sample gate. */
export const MIN_TAKEN_DAYS = 5;

function indexProfiles(
  profiles: SideEffectProfile[],
): Record<string, SideEffectProfile> {
  return Object.fromEntries(profiles.map((p) => [p.supplementId, p]));
}

/** Curated profile for a single supplement, if one exists (Library surface). */
export function profileForSupplement(
  supplementId: string,
  profiles: SideEffectProfile[] = SEED_SIDE_EFFECTS,
): SideEffectProfile | undefined {
  return indexProfiles(profiles)[supplementId];
}

/**
 * Curated commonly-reported effects for the supplements in a stack (NO user data).
 * Powers the Library "What to watch" surface — deterministic, deduped per
 * (supplement, effect). Not used by Stack Evaluation.
 */
export function curatedWatchList(
  items: StackItem[],
  profiles: SideEffectProfile[] = SEED_SIDE_EFFECTS,
): SideEffectFinding[] {
  const byId = indexProfiles(profiles);
  const findings: SideEffectFinding[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.supplementId) continue;
    const profile = byId[item.supplementId];
    if (!profile) continue;
    for (const entry of profile.entries) {
      const key = `${item.supplementId}:${entry.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        supplementId: item.supplementId,
        label: entry.label,
        frequencyTier: entry.frequencyTier,
        kind: "curated-watch",
        paperIds: entry.paperIds,
      });
    }
  }
  return findings;
}

export interface CorrelateInput {
  /** Dated side-effect reports (one row = one day, by DB uniqueness). */
  reports: DatedSideEffectReport[];
  /** v10 adherence — supplies the days each supplement was actually taken. */
  checkins: DailyCheckin[];
  items: StackItem[];
  profiles?: SideEffectProfile[];
  minReports?: number;
  minTakenDays?: number;
}

/**
 * Correlate a user's DATED reports against the days they logged actually TAKING
 * each stacked supplement (v10 adherence), restricted to that supplement's
 * curated effects. Design §2.2 — the min-sample-gated taken-vs-not aggregate.
 *
 * `reportedDays` is a TRUE co-occurrence: |reportDates ∩ takenDates|. It is never
 * inferred from stack membership alone — that was gap G1, where the copy claimed
 * a co-occurrence the engine had not computed. Two gates keep it honest:
 *   - the supplement must have >= minTakenDays logged taken (adherence sample), and
 *   - the effect must co-occur on >= minReports of those days.
 * Correlational only — never a causal claim.
 */
export function correlateReports(input: CorrelateInput): SideEffectFinding[] {
  const {
    reports,
    checkins,
    items,
    profiles = SEED_SIDE_EFFECTS,
    minReports = MIN_REPORTS,
    minTakenDays = MIN_TAKEN_DAYS,
  } = input;

  // effect → the set of dates it was reported on
  const datesByEffect = new Map<CanonicalSideEffect, Set<string>>();
  for (const r of reports) {
    const set = datesByEffect.get(r.effectLabel) ?? new Set<string>();
    set.add(r.date);
    datesByEffect.set(r.effectLabel, set);
  }

  // supplementId → the set of dates it was logged as TAKEN
  const takenDatesBySupplement = new Map<string, Set<string>>();
  for (const c of checkins) {
    for (const supplementId of c.taken) {
      const set = takenDatesBySupplement.get(supplementId) ?? new Set<string>();
      set.add(c.date);
      takenDatesBySupplement.set(supplementId, set);
    }
  }

  const byId = indexProfiles(profiles);
  const findings: SideEffectFinding[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.supplementId) continue;
    const profile = byId[item.supplementId];
    if (!profile) continue;

    const takenDates = takenDatesBySupplement.get(item.supplementId);
    // No adherence history for this supplement ⇒ no co-occurrence can be claimed.
    if (!takenDates || takenDates.size < minTakenDays) continue;

    for (const entry of profile.entries) {
      const reportDates = datesByEffect.get(entry.label);
      if (!reportDates) continue;

      let coOccurrence = 0;
      for (const d of reportDates) if (takenDates.has(d)) coOccurrence++;
      if (coOccurrence < minReports) continue; // insufficient data stays silent

      const key = `${item.supplementId}:${entry.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        supplementId: item.supplementId,
        label: entry.label,
        frequencyTier: entry.frequencyTier,
        kind: "reported-match",
        reportedDays: coOccurrence,
        takenDays: takenDates.size,
        paperIds: entry.paperIds,
      });
    }
  }
  return findings;
}
