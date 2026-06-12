import type { EvaluationFlag, FlagSeverity } from "@/types";

// Design §5.4 — one evaluation flag: title + explanation + recommendation + evidence level.
const SEVERITY_STYLES: Record<FlagSeverity, string> = {
  critical: "border-red-300 bg-red-50",
  warning: "border-amber-300 bg-amber-50",
  info: "border-sky-200 bg-sky-50",
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
        <h4 className="text-sm font-semibold text-neutral-900">{flag.title}</h4>
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          {SEVERITY_LABEL[flag.severity]} · {flag.category}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-700">{flag.explanation}</p>
      <p className="mt-2 text-sm text-neutral-600">
        <span className="font-medium">Suggestion:</span> {flag.recommendation}
      </p>
      {flag.evidenceLevel !== "n/a" && (
        <p className="mt-1 text-xs text-neutral-400">Evidence grade: {flag.evidenceLevel}</p>
      )}
    </article>
  );
}
