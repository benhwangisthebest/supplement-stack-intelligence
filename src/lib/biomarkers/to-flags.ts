// Domain layer — PURE. Maps LabFinding → DraftFlag so the existing evaluator
// pipeline + flag UI render biomarker findings with no new surface (Design §11.4).
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { safetyCopy } from "@/lib/safety";
import type { DraftFlag, FlagSeverity } from "@/types/evaluation";
import type { LabFinding } from "@/types/biomarker";

const SUPPLEMENT_NAMES: Record<string, string> = Object.fromEntries(
  SEED_SUPPLEMENTS.map((s) => [s.id, s.name]),
);

function supplementName(id: string): string {
  return SUPPLEMENT_NAMES[id] ?? id;
}

// Relation drives severity: support is informational, caution is a warning.
function mapSeverity(finding: LabFinding): FlagSeverity {
  return finding.relation === "caution" ? "warning" : "info";
}

export interface ToFlagsOptions {
  /** Resolve a supplementId → its stackItem id, so flags can target the row. */
  supplementToItemId?: Record<string, string>;
}

/** Convert engine findings into draft flags for the evaluator to persist/render. */
export function toLabFlags(
  findings: LabFinding[],
  options: ToFlagsOptions = {},
): DraftFlag[] {
  return findings.map((finding) => {
    const copy = safetyCopy.biomarkerRelevance(
      supplementName(finding.supplementId),
      finding.biomarkerName,
      finding.status,
      finding.relation,
    );
    return {
      stackItemId: options.supplementToItemId?.[finding.supplementId] ?? null,
      severity: mapSeverity(finding),
      category: "lab-relevance",
      title: copy.title,
      explanation: copy.explanation,
      recommendation: copy.recommendation,
      evidenceLevel: finding.evidenceGrade,
    };
  });
}
