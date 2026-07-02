// Domain layer — PURE. generateProtocol() (Design §2.2, §11.4).
// Plan SC: deterministic, explainable, conflict-safe; unit-testable without a DB.
import {
  defaultLibrary,
  effectComposite,
  getBestEffectForOutcome,
  getEffectsByOutcome,
  getSupplementById,
  type EvidenceLibrary,
} from "@/lib/evidence";
import { safetyCopy, checkinCopy } from "@/lib/safety";
import { feedbackFor } from "@/lib/checkin";
import type {
  LabMarker,
  OutcomeCategory,
  ProtocolGroup,
  ProtocolResult,
  ProtocolSuggestion,
  StackItem,
  UserProfile,
} from "@/types";
import type { TrendSignal } from "@/types/lab";
import type { FeedbackSignal } from "@/types/checkin";
import { labBoost } from "@/lib/biomarkers";
import {
  compareSuggestions,
  hasAllergenConflict,
  hasMedicationCaution,
  tierFor,
  timingForGoal,
  trendAdjustment,
} from "./rules";

export interface GenerateProtocolInput {
  profile: UserProfile | null;
  labMarkers?: LabMarker[];
  trends?: TrendSignal[];
  stackItems?: StackItem[]; // target stack (for alreadyInStack annotation)
  // daily-checkin v10: optional bounded, evidence-subordinate ranking nudges.
  // Absent ⇒ byte-for-byte prior behavior (Plan SC5, feedback-regression.test).
  feedbackSignal?: FeedbackSignal[];
  library?: EvidenceLibrary;
}

/**
 * Builds goal-grouped, grade-ranked, conflict-filtered suggestions from a profile.
 * Pure: same inputs → same output. No I/O.
 */
export function generateProtocol(input: GenerateProtocolInput): ProtocolResult {
  const profile = input.profile;
  const labMarkers = input.labMarkers ?? [];
  const trends = input.trends ?? [];
  const library = input.library ?? defaultLibrary;
  const feedbackSignal = input.feedbackSignal ?? [];
  const goals = profile?.goals ?? [];
  const allergies = profile?.allergies ?? [];
  const medications = profile?.medications ?? [];
  const inStack = new Set(
    (input.stackItems ?? [])
      .map((i) => i.supplementId)
      .filter((id): id is string => id !== null),
  );

  const groups: ProtocolGroup[] = [];

  for (const goal of goals as OutcomeCategory[]) {
    const seen = new Set<string>(); // dedupe supplements within the group
    const suggestions: ProtocolSuggestion[] = [];

    for (const effect of getEffectsByOutcome(goal, library)) {
      const supplementId = effect.supplementId;
      if (seen.has(supplementId)) continue;
      const supp = getSupplementById(supplementId, library);
      if (!supp) continue;

      // Conflict filter: never suggest an allergen-conflicting supplement.
      if (hasAllergenConflict(supp, allergies)) continue;
      seen.add(supplementId);

      // Use the best effect for this goal (highest grade) for grade/dose.
      const best = getBestEffectForOutcome(supplementId, goal, library) ?? effect;
      const labSignal = labBoost(supplementId, labMarkers);
      // lab-timeline v4: fold a bounded trajectory nudge into the lab signal.
      const trend = trendAdjustment(supplementId, trends);
      const labScore = Math.max(-1, Math.min(1, labSignal.score + trend.delta));
      const labRationale =
        [labSignal.rationale, trend.note].filter(Boolean).join(" ") || null;
      const labBoosted = labScore > 0; // derived — keeps the "✦ lab" badge
      // daily-checkin v10: bounded, evidence-subordinate feedback nudge (Design §2.0
      // Option C). Ranked BELOW grade in compareSuggestions — cannot override evidence.
      const feedback = feedbackFor(feedbackSignal, supplementId, goal);
      const feedbackNote = feedback !== 0 ? checkinCopy.feedbackNudgeNote : null;
      const tier = tierFor(best.grade, supp.tags);

      const confidenceReason = labBoosted
        ? "lab"
        : best.grade === "C" || best.grade === "D"
          ? "grade"
          : null;

      suggestions.push({
        supplementId,
        supplementName: supp.name,
        outcomeCategory: goal,
        effectId: best.id,
        grade: best.grade,
        tier,
        dose: best.studiedDose ?? supp.generalDose,
        timing: timingForGoal(goal),
        rationale: safetyCopy.protocolRationale(supp.name, goal, best.grade),
        confidenceNote: safetyCopy.protocolConfidenceNote(confidenceReason),
        labBoosted,
        labSignal: labScore,
        labRationale,
        feedback,
        feedbackNote,
        composite: effectComposite(best) ?? undefined,
        medicationCaution: hasMedicationCaution(supplementId, medications),
        alreadyInStack: inStack.has(supplementId),
      });
    }

    suggestions.sort(compareSuggestions);
    if (suggestions.length > 0) groups.push({ goal, suggestions });
  }

  return {
    groups,
    generatedFor: { goals: goals as OutcomeCategory[], hasLabs: labMarkers.length > 0 },
  };
}

export * from "./rules";
