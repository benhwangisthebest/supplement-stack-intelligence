// Domain layer — PURE. Maps SideEffectFinding → DraftFlag so the existing
// evaluator pipeline + flag UI render side-effects with no new surface.
// Design Ref: §2.1, §11.4 — mirrors interactions/to-flags + biomarkers/to-flags.
// Severity: reported-match → warning; curated-watch → info. NEVER critical
// (side-effects are informational + evidence-subordinate, never blocking).
import { SEED_SUPPLEMENTS } from "@/data/seed-supplements";
import { safetyCopy } from "@/lib/safety";
import { sideEffectLabel } from "./vocab";
import type { DraftFlag } from "@/types/evaluation";
import type { SideEffectFinding } from "@/types/side-effect";

const SUPPLEMENT_NAMES: Record<string, string> = Object.fromEntries(
  SEED_SUPPLEMENTS.map((s) => [s.id, s.name]),
);

function supplementName(id: string): string {
  return SUPPLEMENT_NAMES[id] ?? id;
}

export interface ToFlagsOptions {
  /** Resolve a supplementId → its stackItem id, so flags can target the row. */
  supplementToItemId?: Record<string, string>;
}

/** Convert side-effect findings into draft flags for the evaluator to render. */
export function toSideEffectFlags(
  findings: SideEffectFinding[],
  options: ToFlagsOptions = {},
): DraftFlag[] {
  return findings.map((finding) => {
    const name = supplementName(finding.supplementId);
    const effect = sideEffectLabel(finding.label);
    const copy =
      finding.kind === "reported-match"
        ? safetyCopy.sideEffectCorrelation(
            name,
            effect,
            finding.reportedDays ?? 0,
            finding.takenDays ?? 0,
          )
        : safetyCopy.sideEffectWatch(name, effect, finding.frequencyTier);

    return {
      stackItemId: options.supplementToItemId?.[finding.supplementId] ?? null,
      severity: finding.kind === "reported-match" ? "warning" : "info",
      category: "side-effect-caution",
      ...copy,
      evidenceLevel: "n/a",
    };
  });
}
