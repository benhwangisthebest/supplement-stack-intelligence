// Domain layer — PURE. The SINGLE source of user-facing advisory copy.
// Design Ref: §1.1, §10.4 — centralize phrasing so no diagnostic language leaks into the UI.
// Plan SC: "no diagnostic claims" — all evaluator strings flow through here.

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
} as const;

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

  medicationCaution(supplementName: string): FlagCopy {
    return {
      title: "Possible medication interaction",
      explanation: `${supplementName} may interact with medications in some cases. The app cannot assess this from the available information.`,
      recommendation:
        "This may be worth discussing with a clinician or pharmacist before continuing.",
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
  productReasonValue(): string {
    return "Good value by price per effective dose.";
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

  /** A medication that could not be matched to the dataset — never implies safety. */
  unrecognizedMedication(name: string): FlagCopy {
    return {
      title: "Medication not recognized",
      explanation: `The app could not match "${name}" to its interaction dataset, so it could not check for interactions.`,
      recommendation:
        "This does not mean the combination is safe. Consider confirming with a clinician or pharmacist.",
    };
  },
} as const;
