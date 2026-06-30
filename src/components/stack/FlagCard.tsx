import type { EvaluationFlag, FlagSeverity } from "@/types";

// Design §5.4 — one evaluation flag: title + explanation + recommendation + evidence level.
const SEVERITY_STYLES: Record<FlagSeverity, string> = {
  critical: "border-error/30 bg-error/10",
  warning: "border-warning/30 bg-warning/10",
  info: "border-brand/30 bg-brand/10",
};

const SEVERITY_LABEL: Record<FlagSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

export function FlagCard({ flag }: { flag: EvaluationFlag }) {
  return (
    <article className={`rounded-lg border p-4 ${SEVERITY_STYLES[flag.severity]}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-ink">{flag.title}</h4>
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted">
          {SEVERITY_LABEL[flag.severity]} · {flag.category}
        </span>
      </div>
      <p className="mt-1 text-sm text-body">{flag.explanation}</p>
      <p className="mt-2 text-sm text-body">
        <span className="font-medium">Suggestion:</span> {flag.recommendation}
      </p>
      {flag.evidenceLevel !== "n/a" && (
        <p className="mt-1 text-xs text-muted-soft">Evidence grade: {flag.evidenceLevel}</p>
      )}
    </article>
  );
}
