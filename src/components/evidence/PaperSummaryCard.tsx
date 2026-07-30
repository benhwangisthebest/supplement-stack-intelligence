import type { Paper } from "@/types";

// Design Ref: §5.1 — illustrative evidence summary card.
//
// v13 (evidence-disclosure): the provenance line (authors · journal (year) · n=…), the
// study-type pill, and the "View source ↗" anchor are gone. They presented recalled,
// unverified citation metadata as a real, checkable source. What remains is what the
// summary can honestly support: who it concerns, what was taken, how much, for how
// long, what was seen, and what the limits are.
//
// Plan SC: SC-3 (no seed-derived external link), SC-6 (educational content preserved)
export function PaperSummaryCard({ paper }: { paper: Paper }) {
  return (
    <article className="rounded-lg border border-hairline p-4">
      <h4 className="text-sm font-medium text-ink">{paper.title}</h4>
      <p className="mt-1 text-xs text-muted">{paper.population}</p>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-body">Intervention</dt>
          <dd className="text-body">{paper.intervention}</dd>
        </div>
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
    </article>
  );
}
