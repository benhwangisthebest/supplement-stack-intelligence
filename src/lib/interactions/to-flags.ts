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
  if (finding.severity === "serious") return "critical";
  if (finding.severity === "warning") {
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
    const copy = isDrug
      ? safetyCopy.interactionWithDrug(
          name,
          humanizeCounterpart(finding.counterpart),
          finding.mechanism,
          finding.management,
        )
      : safetyCopy.interactionBetweenSupplements(
          name,
          supplementName(finding.counterpart),
          finding.mechanism,
          finding.management,
        );

    return {
      stackItemId: options.supplementToItemId?.[finding.supplementId] ?? null,
      severity: mapSeverity(finding),
      category: isDrug ? "medication-caution" : "interaction-risk",
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
