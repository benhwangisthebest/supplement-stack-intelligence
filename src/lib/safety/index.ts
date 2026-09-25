// Domain layer — PURE. The SINGLE source of user-facing advisory copy.
// Design Ref: §1.1, §10.4 — centralize phrasing so no diagnostic language leaks into the UI.
// Plan SC: "no diagnostic claims" — all evaluator strings flow through here.

import type { Paper } from "@/types";

export interface FlagCopy {
  title: string;
  explanation: string;
  recommendation: string;
}

// Standardized disclaimers (Design §5, §7). Rendered near Profile / labs / evaluation.
export const DISCLAIMERS = {
  general:
    "This tool is for education and decision support only. It does not diagnose, treat, cure, or prevent any disease.",
  profile:
    "The information you provide is used to personalize educational context. It is not a medical assessment.",
  labs:
    "Lab values are used only to inform educational prioritization. They are not interpreted as a diagnosis. Discuss results with a qualified clinician.",
  evaluation:
    "This evaluation is educational and not medical advice. For medications, pregnancy, chronic conditions, abnormal labs, or high doses, consult a clinician.",
  // medication-interactions (v2). Shown near interaction findings; escalates on high severity.
  interaction:
    "Interaction findings are educational and drawn from a limited curated dataset. The absence of a finding does not mean a combination is safe. For anything involving medications, review supplements with a clinician or pharmacist.",
  // side-effect-engine (v11). Shown near "what to watch" + reported-effect surfaces.
  sideEffect:
    "These are effects people commonly report, drawn from a limited curated dataset — not predictions or diagnoses. The absence of a listed effect does not mean none can occur. Discuss anything concerning with a clinician.",
  // food-pairings (v12). Shown near the "Food & absorption" surface.
  food:
    "Food-pairing notes are educational and drawn from a limited curated dataset. They describe general absorption and timing tendencies, not personal advice. The absence of a note does not mean a food has no effect.",
} as const;

/**
 * Phase 3 U7 — coverage honesty (roadmap item 4, [P3-X4], CLAUDE.md §2.2 rule 10).
 * Every surface that shows a curated dataset states its coverage limit through
 * `<CoverageLimit copy={COVERAGE.…} />`. `none`: the dataset holds nothing for this
 * subject, and that must not read as "there is nothing". `limit`: it holds
 * something, and that is not everything. Reviewed strings are reused by
 * reference, not retyped, so one wording cannot drift into two.
 * Cycle record: docs/01-plan/features/p3-u7-coverage-honesty.plan.md.
 */
export type CoverageDataset =
  | "effects"
  | "interactions"
  | "food"
  | "side-effects"
  | "safety-lists"
  | "stack-evaluation";
export type CoverageState = "none" | "limit";
export interface CoverageCopy {
  dataset: CoverageDataset;
  state: CoverageState;
  text: string;
}

export const COVERAGE = {
  effectsNone: {
    dataset: "effects",
    state: "none",
    text: "No graded effects for this supplement in our dataset yet. This does not mean it has no effect — our dataset is limited.",
  },
  effectsLimit: {
    dataset: "effects",
    state: "limit",
    text: "These are the effects this library has graded so far. An effect not shown here has not been assessed — that is not the same as having no effect.",
  },
  interactionsNone: {
    dataset: "interactions",
    state: "none",
    text: "No known interactions in our dataset. This does not mean a combination is safe — our dataset is limited.",
  },
  interactionsLimit: { dataset: "interactions", state: "limit", text: DISCLAIMERS.interaction },
  foodNone: {
    dataset: "food",
    state: "none",
    text: "No food-pairing guidance in our dataset yet. This does not mean food has no effect — our dataset is limited.",
  },
  foodLimit: { dataset: "food", state: "limit", text: DISCLAIMERS.food },
  watchNone: {
    dataset: "side-effects",
    state: "none",
    text: "No notes on what to watch for this supplement in our dataset yet. This does not mean it has no side effects — our dataset is limited.",
  },
  watchLimit: { dataset: "side-effects", state: "limit", text: DISCLAIMERS.sideEffect },
  sideEffectsNone: {
    dataset: "safety-lists",
    state: "none",
    text: "No side effects listed in our dataset. This does not mean none can occur — our dataset is limited.",
  },
  contraindicationsNone: {
    dataset: "safety-lists",
    state: "none",
    text: "No contraindications listed in our dataset. This does not mean there are none — our dataset is limited.",
  },
  safetyListsLimit: {
    dataset: "safety-lists",
    state: "limit",
    text: "Side effects and contraindications show what our dataset holds, not everything that can occur. If you take medications, are pregnant, or have a medical condition, this may be worth discussing with a clinician.",
  },
  stackEvaluationLimit: {
    dataset: "stack-evaluation",
    state: "limit",
    text: "These checks cover only what our curated dataset holds. The absence of a flag does not mean a stack is safe.",
  },
  stackCustomItems: {
    dataset: "stack-evaluation",
    state: "limit",
    text: "Custom items that are not in the Library are not checked for interactions, dose, allergens or evidence.",
  },
  // U7 (b2), owner wording 2026-09-24 (U4 closeout note 1). Grade D, split by
  // whether the effect cites a paper that can SUPPORT it (R6: a title-only paper
  // cannot; Phase 3 closeout (e2), P3-7): see gradeDCoverage.
  gradeDLimited: {
    dataset: "effects",
    state: "limit",
    text: "Very limited evidence: the verified studies in this library are too few or too weak to support this effect. That is not evidence that it doesn't work.",
  },
  gradeDUncited: {
    dataset: "effects",
    state: "none",
    text: "No verified evidence in this library for this effect. That is not the same as evidence that it doesn't work.",
  },
} as const satisfies Record<string, CoverageCopy>;

/**
 * U4 ruling R6 (owner, 2026-09-23): a title-only paper supports nothing. A paper is
 * title-only when no abstract was captured for it, so every card field reads this
 * literal (U6 (c): card fields come only from the abstract).
 */
export const NOT_IN_ABSTRACT = "Not reported in abstract";
const CARD_FIELDS = ["population", "intervention", "dose", "duration", "outcomes", "limitations", "summary"] as const;

export function isTitleOnly(paper: Pick<Paper, (typeof CARD_FIELDS)[number]>): boolean {
  return CARD_FIELDS.every((f) => paper[f] === NOT_IN_ABSTRACT);
}

/**
 * Does the effect cite at least one paper that can support it (R6)? A cited id
 * missing from `papers` counts as supporting, so an incomplete list can never
 * turn a cited effect into "no verified evidence"; callers pass the effect's own
 * papers (`getPapersForEffect`) or a superset.
 */
export function hasSupportingPaper(
  effect: { paperIds: readonly string[] },
  papers: readonly Paper[],
): boolean {
  const byId = new Map(papers.map((p) => [p.id, p]));
  return effect.paperIds.some((id) => {
    const p = byId.get(id);
    return p === undefined || !isTitleOnly(p);
  });
}

/**
 * U7 (b2) — the Grade D statement for an effect, or null when the grade is not D.
 * D1 (`gradeDLimited`) when the effect cites at least one paper that can support
 * it; D2 (`gradeDUncited`) otherwise. Decided by the EFFECT's `paperIds`, not its
 * dimensions' (owner, 2026-09-24).
 * Phase 3 closeout (e2), owner ruling on Check finding P3-7 (2026-09-25): D1/D2
 * follows R6, so an effect whose cited papers are ALL title-only is D2. That is
 * glycine-sleep, whose summary already says "No verified evidence in this library";
 * D1 beside it contradicted it. ~~glycine-sleep cites one verified, title-only paper,
 * so it is D1, and "no verified evidence" would be false there.~~ (Superseded: R6
 * already said that paper supports nothing.)
 */
export function gradeDCoverage(
  effect: { grade: string; paperIds: readonly string[] },
  papers: readonly Paper[],
): CoverageCopy | null {
  if (effect.grade !== "D") return null;
  return hasSupportingPaper(effect, papers) ? COVERAGE.gradeDLimited : COVERAGE.gradeDUncited;
}

/**
 * Affirmative directive/diagnostic claims the product must never produce.
 * Phrased as full clauses so safe negations ("does not diagnose, treat, cure")
 * in disclaimers are not falsely flagged.
 * Used by safety unit tests to guard all generated copy.
 */
export const BANNED_PHRASES: readonly string[] = [
  "you have a deficiency",
  "this will treat",
  "this will cure",
  "this cures",
  "you should take",
  "you must take",
  "stop taking your medication",
  "replaces medication",
  "guaranteed",
  // side-effect-engine (v11): forbid causal/directive side-effect claims.
  "side effect of",
  "because you took",
  "will cause your",
  "is caused by",
];

/** True if text contains any banned (diagnostic/directive) phrase. */
export function containsBannedLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.some((p) => lower.includes(p));
}

// ---- Flag copy builders (Design §11.4). Hedged, explainable language only. ----

export const safetyCopy = {
  evidenceLimited(supplementName: string, intent: string): FlagCopy {
    return {
      title: "Limited evidence for this stack's intent",
      explanation: `${supplementName} has limited human evidence for ${intent} based on the current dataset.`,
      recommendation:
        "Consider whether this item is essential, or treat it as experimental and track how it works for you.",
    };
  },

  doseBelowRange(supplementName: string, min: number, unit: string): FlagCopy {
    return {
      title: "Dose below commonly studied range",
      explanation: `Your ${supplementName} dose is below the commonly studied range (from ${min} ${unit}).`,
      recommendation:
        "A higher dose within the studied range may be more consistent with the evidence, if appropriate for you.",
    };
  },

  doseExceedsRange(
    supplementName: string,
    dose: number,
    max: number,
    unit: string,
  ): FlagCopy {
    return {
      title: "Dose exceeds common studied range",
      explanation: `Your ${supplementName} dose (${dose} ${unit}) is above the commonly studied range (up to ${max} ${unit}).`,
      recommendation:
        "Consider lowering toward the studied range unless you have a specific reason and have discussed it with a clinician.",
    };
  },

  doseCritical(
    supplementName: string,
    dose: number,
    max: number,
    unit: string,
  ): FlagCopy {
    return {
      title: "Dose well above studied range",
      explanation: `Your ${supplementName} dose (${dose} ${unit}) is well above the commonly studied range (up to ${max} ${unit}), which may raise safety concerns.`,
      recommendation:
        "This is flagged as a potential safety concern. Consider reducing the dose and discussing it with a clinician.",
    };
  },

  redundancy(supplementNames: string[], outcome: string): FlagCopy {
    return {
      title: "Possible redundancy",
      explanation: `Several items (${supplementNames.join(", ")}) target ${outcome} through overlapping mechanisms.`,
      recommendation:
        "You may be able to simplify by keeping the item with the strongest fit, if that suits your goals.",
    };
  },

  allergyConflict(supplementName: string, allergens: string[]): FlagCopy {
    return {
      title: "Potential allergen conflict",
      explanation: `${supplementName} is associated with ${allergens.join(", ")}, which you listed as an allergy or sensitivity.`,
      recommendation:
        "Review the product's ingredients carefully and consider an alternative form that avoids this allergen.",
    };
  },

  allergyCritical(supplementName: string, allergens: string[]): FlagCopy {
    return {
      title: "Allergen conflict flagged for safety",
      explanation: `${supplementName} is associated with ${allergens.join(", ")}, which you flagged as a significant allergy.`,
      recommendation:
        "This is flagged as a potential safety concern. Avoid unless a clinician confirms it is appropriate for you.",
    };
  },

  goalMisalignment(supplementName: string): FlagCopy {
    return {
      title: "Not aligned with your stated goals",
      explanation: `${supplementName} does not clearly map to the goals in your profile, based on the current dataset.`,
      recommendation:
        "Confirm why this item is in your stack, or consider whether it still fits your current goals.",
    };
  },

  labSupported(supplementName: string, marker: string): FlagCopy {
    return {
      title: "Supported by your labs",
      explanation: `Your ${marker} is below the reference range you entered, which is relevant to ${supplementName}.`,
      recommendation:
        "Could be relevant based on the information provided. Consider confirming with a clinician.",
    };
  },

  labCaution(supplementName: string, marker: string): FlagCopy {
    return {
      title: "Lab value worth reviewing",
      explanation: `Your ${marker} is above the reference range you entered, and ${supplementName} may raise it further.`,
      recommendation:
        "This is flagged for review. Consider discussing with a clinician before continuing.",
    };
  },

  complexity(itemCount: number): FlagCopy {
    return {
      title: "Stack may be hard to keep up with",
      explanation: `This stack has ${itemCount} items, which can be difficult to follow consistently.`,
      recommendation:
        "Consider whether every item earns its place, to improve adherence.",
    };
  },

  // ---- Side-effect copy (side-effect-engine v11). CORRELATIONAL, non-causal. ----
  // Every string describes what people REPORT, never that a supplement caused an
  // effect. Swept by lib/side-effects/side-effects.test.ts (Plan SC7).

  /** A curated "what to watch" note for a stacked supplement (no user data). */
  sideEffectWatch(
    supplementName: string,
    effect: string,
    tier: "common" | "infrequent" | "rare",
  ): FlagCopy {
    const freq =
      tier === "common" ? "commonly" : tier === "infrequent" ? "sometimes" : "rarely";
    return {
      title: "Commonly reported effect to watch",
      explanation: `${effect} is ${freq} reported by people taking ${supplementName}, based on the current dataset.`,
      recommendation:
        "This is informational, not a prediction. If you notice it and it concerns you, discuss it with a clinician.",
    };
  },

  /**
   * Correlational match. Every number here MUST come from the engine's computed
   * co-occurrence (Act-1 / gap G1): `reportedDays` = days the effect was logged
   * AND the supplement was logged taken; `takenDays` = total days it was taken.
   * Do not add any clause asserting a relationship the engine did not compute.
   */
  sideEffectCorrelation(
    supplementName: string,
    effect: string,
    reportedDays: number,
    takenDays: number,
  ): FlagCopy {
    return {
      title: "Something you logged lines up with a commonly reported effect",
      explanation: `You logged ${effect} on ${reportedDays} of the ${takenDays} days you logged taking ${supplementName} — an effect people commonly report while taking it.`,
      recommendation:
        "This is a correlation from your own logs, not a cause — it does not account for anything else going on those days. Track it over time and raise anything concerning with a clinician.",
    };
  },

  // ---- Protocol Builder copy (Design §11.4). Hedged, non-diagnostic. ----

  /** "Why it fits" rationale for a generated suggestion. */
  protocolRationale(
    supplementName: string,
    goal: string,
    grade: string,
  ): string {
    const strength =
      grade === "A"
        ? "has strong human evidence"
        : grade === "B"
          ? "has moderate evidence"
          : grade === "C"
            ? "has limited evidence"
            : "is mechanistically plausible but preliminary";
    return `${supplementName} ${strength} for ${goal}, which matches a goal in your profile.`;
  },

  /** "What would raise confidence" note, or null if nothing obvious applies. */
  protocolConfidenceNote(reason: "lab" | "grade" | null): string | null {
    if (reason === "lab") {
      return "A recent related lab value would help confirm whether this is relevant for you.";
    }
    if (reason === "grade") {
      return "Evidence here is limited; treat this as optional or experimental and track how it works for you.";
    }
    return null;
  },

  // ---- Product Match copy (Design §11.4). Describes fit, not endorsement. ----
  productReasonDoseMatch(targetDose: number, unit: string): string {
    return `Matches your target dose of ${targetDose} ${unit}.`;
  },
  productReasonDoseOff(): string {
    return "Dose per serving differs from your target — you may need to adjust servings.";
  },
  productReasonFormMatch(form: string): string {
    return `${form} matches your form preference.`;
  },
  productReasonTested(): string {
    return "Carries a third-party testing certification.";
  },
  productReasonAdditives(): string {
    return "Contains additives or fillers you may prefer to avoid.";
  },

  // ---- Interaction copy (medication-interactions v2). Hedged, non-diagnostic. ----

  /** Supplement↔drug interaction finding. `counterpart` is a human-readable label. */
  interactionWithDrug(
    supplementName: string,
    counterpart: string,
    mechanism: string,
    management: string,
  ): FlagCopy {
    return {
      title: `Possible interaction with ${counterpart}`,
      explanation: `${supplementName} may interact with ${counterpart}: ${mechanism}.`,
      recommendation: `${management} This may be worth discussing with a clinician or pharmacist.`,
    };
  },

  /** Supplement↔supplement interaction finding within a stack. */
  interactionBetweenSupplements(
    nameA: string,
    nameB: string,
    mechanism: string,
    management: string,
  ): FlagCopy {
    return {
      title: `Possible interaction: ${nameA} + ${nameB}`,
      explanation: `${nameA} and ${nameB} may interact: ${mechanism}.`,
      recommendation: management,
    };
  },

  // ---- Food-pairing copy (food-pairings v12). Absorption-focused, hedged. ----

  /** Supplement↔food synergy — helpful guidance, never phrased as a warning. */
  foodSynergy(
    supplementName: string,
    food: string,
    mechanism: string,
    timing?: string,
  ): FlagCopy {
    return {
      title: `${supplementName} pairs well with ${food}`,
      explanation: `${supplementName} may be better absorbed with ${food}: ${mechanism}.`,
      recommendation: timing
        ? `Tip: ${timing}.`
        : `Pairing it with ${food} may help.`,
    };
  },

  /** Supplement↔food to avoid/space out — reduces benefit rather than a safety risk. */
  foodAvoid(
    supplementName: string,
    food: string,
    mechanism: string,
    management: string,
  ): FlagCopy {
    return {
      title: `${supplementName}: consider spacing from ${food}`,
      explanation: `Taking ${supplementName} with ${food} may reduce its benefit: ${mechanism}.`,
      recommendation: management,
    };
  },

  /** A medication that could not be matched to the dataset — never implies safety. */
  unrecognizedMedication(name: string): FlagCopy {
    return {
      title: "Medication not recognized",
      explanation: `The app could not match "${name}" to its interaction dataset, so it could not check for interactions.`,
      recommendation:
        "This does not mean the combination is safe. Consider confirming with a clinician or pharmacist.",
    };
  },

  // ---- Biomarker copy (biomarker-intelligence v3). Hedged, non-diagnostic. ----

  /** A lab-driven relevance finding, keyed by marker status × relation. */
  biomarkerRelevance(
    supplementName: string,
    biomarkerName: string,
    status: "low" | "high",
    relation: "support" | "caution",
  ): FlagCopy {
    const side = status === "low" ? "below" : "above";
    if (relation === "caution") {
      return {
        title: "Lab value worth reviewing",
        explanation: `Your ${biomarkerName} is ${side} the reference range, and ${supplementName} could affect it further.`,
        recommendation:
          "This is flagged for review. Consider discussing with a clinician before continuing.",
      };
    }
    return {
      title: "Could be relevant to your labs",
      explanation: `Your ${biomarkerName} is ${side} the reference range, which is commonly studied in relation to ${supplementName}.`,
      recommendation:
        "Could be relevant based on the information provided. Consider confirming with a clinician.",
    };
  },

  // ---- Lab-timeline copy (lab-timeline v4). Hedged, non-diagnostic. ----

  /**
   * A lab marker's TRAJECTORY over time, anchored to a stacked supplement.
   * Describes movement only — never a diagnosis or a directive. `direction` is
   * "improving" when the marker is moving toward its healthy side, "worsening"
   * when moving away (decided by the caller from trend + relevance).
   */
  biomarkerTrend(
    supplementName: string,
    biomarkerName: string,
    direction: "improving" | "worsening",
    pctChange: number,
  ): FlagCopy {
    const magnitude = `${Math.abs(Math.round(pctChange))}%`;
    if (direction === "improving") {
      return {
        title: "Lab value trending in a helpful direction",
        explanation: `Your ${biomarkerName} has moved about ${magnitude} toward its reference range since your previous entry, which is relevant to ${supplementName}.`,
        recommendation:
          "This may be worth keeping in view as you decide whether this item is still a priority.",
      };
    }
    return {
      title: "Lab value trending away from range",
      explanation: `Your ${biomarkerName} has moved about ${magnitude} further from its reference range since your previous entry, which is relevant to ${supplementName}.`,
      recommendation:
        "This is flagged for review. Consider revisiting it, and discussing the trend with a clinician.",
    };
  },

  /** Short trajectory note appended to a protocol suggestion's lab rationale. */
  protocolTrendNote(
    biomarkerName: string,
    direction: "improving" | "worsening",
  ): string {
    return direction === "improving"
      ? `${biomarkerName} has been trending toward range recently.`
      : `${biomarkerName} has been trending away from range recently.`;
  },

  /** A lab marker that could not be matched to the biomarker registry. */
  unrecognizedMarker(name: string): FlagCopy {
    return {
      title: "Lab marker not recognized",
      explanation: `The app could not match "${name}" to its biomarker dataset, so it could not assess its relevance.`,
      recommendation:
        "This does not mean the value is fine. Consider reviewing it with a clinician.",
    };
  },
} as const;

// ---- Daily check-in copy (daily-checkin v10). CORRELATIONAL, non-diagnostic. ----
// Every string here describes a SELF-REPORTED correlation, never a causal or
// efficacy claim. Swept by lib/checkin/honesty.test.ts (Plan SC6/SC10).
export const checkinCopy = {
  /** A correlational outcome insight — describes association, not effect. */
  outcomeInsight(
    supplementName: string,
    outcomeLabel: string,
    takenAvg: number,
    notTakenAvg: number,
  ): { text: string; qualifier: string } {
    const t = takenAvg.toFixed(1);
    const n = notTakenAvg.toFixed(1);
    return {
      text: `You rated ${outcomeLabel} ${t} on days you took ${supplementName} vs ${n} on other days.`,
      qualifier: "Correlational only — this reflects what you logged, not a measure of effectiveness.",
    };
  },

  /** Shown near the optional side-effect / note field. */
  sideEffectDisclaimer:
    "Notes are for your own tracking. The app does not interpret them as medical information — discuss anything concerning with a clinician.",

  /** Shown when a re-ranked suggestion was nudged by check-in feedback. */
  feedbackNudgeNote:
    "Adjusted slightly by your check-ins. Evidence still leads — this only refines the order.",
} as const;
