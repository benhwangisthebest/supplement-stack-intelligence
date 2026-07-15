// Domain layer — PURE. Maps InteractionFinding → DraftFlag so the existing
// evaluator pipeline + flag UI render interactions with no new surface (Design §11.4).
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { safetyCopy } from "@/lib/safety";
import type { DraftFlag, FlagSeverity } from "@/types/evaluation";
import type { InteractionFinding } from "@/types/interaction";

const SUPPLEMENT_NAMES: Record<string, string> = Object.fromEntries(
  SEED_SUPPLEMENTS.map((s) => [s.id, s.name]),
);

function supplementName(id: string): string {
  return SUPPLEMENT_NAMES[id] ?? id;
}

/** "thyroid-medication" → "thyroid medication". */
function humanizeCounterpart(counterpart: string): string {
  return counterpart.replace(/-/g, " ");
}

/**
 * Severity mapping (Design §11.4):
 *   serious                       → critical
 *   warning (supplement-drug)     → critical  (drug-interaction warnings are safety-relevant)
 *   warning (supplement-supplement) → warning
 *   caution                       → warning
 *   info                          → info
 */
function mapSeverity(finding: InteractionFinding): FlagSeverity {
  // food-pairings (v12): synergy is helpful guidance — never escalate it.
  if (finding.kind === "supplement-food" && finding.direction === "synergy") {
    return "info";
  }
  if (finding.severity === "serious") return "critical";
  if (finding.severity === "warning") {
    // Only drug-safety warnings escalate to critical; food never does.
    return finding.kind === "supplement-drug" ? "critical" : "warning";
  }
  if (finding.severity === "caution") return "warning";
  return "info";
}

export interface ToFlagsOptions {
  /** Resolve a supplementId → its stackItem id, so flags can target the row. */
  supplementToItemId?: Record<string, string>;
}

/** Convert engine findings into draft flags for the evaluator to persist/render. */
export function toInteractionFlags(
  findings: InteractionFinding[],
  options: ToFlagsOptions = {},
): DraftFlag[] {
  return findings.map((finding) => {
    const name = supplementName(finding.supplementId);
    const isDrug = finding.kind === "supplement-drug";
    const isFood = finding.kind === "supplement-food";

    let copy;
    let category: DraftFlag["category"];
    if (isDrug) {
      copy = safetyCopy.interactionWithDrug(
        name,
        humanizeCounterpart(finding.counterpart),
        finding.mechanism,
        finding.management,
      );
      category = "medication-caution";
    } else if (isFood) {
      // food-pairings (v12): synergy vs avoid get distinct, non-alarming copy.
      const food = finding.food ?? finding.counterpart;
      copy =
        finding.direction === "synergy"
          ? safetyCopy.foodSynergy(name, food, finding.mechanism, finding.timing)
          : safetyCopy.foodAvoid(name, food, finding.mechanism, finding.management);
      category = "food-pairing";
    } else {
      copy = safetyCopy.interactionBetweenSupplements(
        name,
        supplementName(finding.counterpart),
        finding.mechanism,
        finding.management,
      );
      category = "interaction-risk";
    }

    return {
      stackItemId: options.supplementToItemId?.[finding.supplementId] ?? null,
      severity: mapSeverity(finding),
      category,
      title: copy.title,
      explanation: copy.explanation,
      recommendation: copy.recommendation,
      evidenceLevel: finding.evidenceGrade,
    };
  });
}

/** True if any finding maps to a critical flag (drives the clinician-escalation banner). */
export function hasCriticalInteraction(findings: InteractionFinding[]): boolean {
  return findings.some((f) => mapSeverity(f) === "critical");
}
