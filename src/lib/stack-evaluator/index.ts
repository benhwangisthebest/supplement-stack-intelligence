// Domain layer — PURE. evaluateStack() orchestrates the rule set (Design §2.2, §11.4).
// Plan SC: produces non-trivial, explainable flags; unit-testable without a DB.
import { defaultLibrary, type EvidenceLibrary } from "@/lib/evidence";
import type {
  DraftFlag,
  EvaluationSummary,
  FlagSeverity,
  LabMarker,
  Stack,
  StackItem,
  UserProfile,
} from "@/types";
import type { TrendSignal } from "@/types/lab";
import { ALL_RULES, type EvalContext } from "./rules";

export interface EvaluateStackInput {
  stack: Stack;
  items: StackItem[];
  profile?: UserProfile | null;
  labMarkers?: LabMarker[];
  trends?: TrendSignal[];
  library?: EvidenceLibrary;
}

export interface EvaluationResult {
  flags: DraftFlag[];
  summary: EvaluationSummary;
}

const SEVERITY_ORDER: Record<FlagSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/**
 * Pure evaluation entry point. Runs every rule, then sorts flags by severity
 * (critical first) for stable, predictable report rendering.
 */
export function evaluateStack(input: EvaluateStackInput): EvaluationResult {
  const ctx: EvalContext = {
    stack: input.stack,
    items: input.items,
    profile: input.profile ?? null,
    labMarkers: input.labMarkers ?? [],
    trends: input.trends ?? [],
    library: input.library ?? defaultLibrary,
  };

  const flags = ALL_RULES.flatMap((rule) => rule(ctx)).sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return { flags, summary: summarize(flags) };
}

export function summarize(flags: DraftFlag[]): EvaluationSummary {
  return {
    critical: flags.filter((f) => f.severity === "critical").length,
    warning: flags.filter((f) => f.severity === "warning").length,
    info: flags.filter((f) => f.severity === "info").length,
  };
}

export * from "./rules";
