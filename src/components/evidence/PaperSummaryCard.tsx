import type { Paper } from "@/types";

// Design §5.3, §5.4 — seeded study summary card (title, type, dose, outcomes, limitations).
export function PaperSummaryCard({ paper }: { paper: Paper }) {
  return (
    <article className="rounded-lg border border-hairline p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-ink">{paper.title}</h4>
        <span className="shrink-0 rounded-full bg-surface-card px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-body">
          {paper.studyType}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {paper.authors} · {paper.journal} ({paper.year}) · n={paper.sampleSize}
      </p>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-body">Dose</dt>
          <dd className="text-body">{paper.dose}</dd>
        </div>
        <div>
          <dt className="font-medium text-body">Duration</dt>
          <dd className="text-body">{paper.duration}</dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-body">{paper.summary}</p>

      <details className="mt-2 text-xs text-body">
        <summary className="cursor-pointer font-medium text-body">
          Outcomes &amp; limitations
        </summary>
        <p className="mt-1">
          <span className="font-medium">Outcomes:</span> {paper.outcomes}
        </p>
        <p className="mt-1">
          <span className="font-medium">Limitations:</span> {paper.limitations}
        </p>
      </details>

      <a
        href={paper.link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs font-medium text-brand underline"
      >
        View source ↗
      </a>
    </article>
  );
}
