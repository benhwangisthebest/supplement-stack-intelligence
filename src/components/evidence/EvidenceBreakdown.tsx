import type { EvidenceProfile } from "@/types/evidence-grading";
import type { Paper } from "@/types";
import { gradeBreakdown } from "@/lib/evidence-grading";

// Design §5 — per-dimension evidence breakdown (evidence-grading v5). Pure/server
// component: native <details> for zero-JS expand. Shows each dimension's rating
// bar + rationale + the papers that justify it. Rendered only for profiled effects.

const MAX = 3;

function RatingBar({ score }: { score: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {Array.from({ length: MAX }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-4 rounded-sm ${
            i < score ? "bg-success" : "bg-surface-strong"
          }`}
        />
      ))}
    </span>
  );
}

export function EvidenceBreakdown({
  profile,
  papers,
}: {
  profile: EvidenceProfile;
  papers: Paper[];
}) {
  const rows = gradeBreakdown(profile);
  const paperById = new Map(papers.map((p) => [p.id, p]));

  return (
    <details className="mt-3 rounded-md border border-hairline bg-surface-soft/60">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-body">
        Evidence breakdown
      </summary>
      <ul className="space-y-2 px-3 pb-3">
        {rows.map((r) => (
          <li key={r.dimension} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-body">{r.label}</span>
              <RatingBar score={r.score} />
              <span className="text-xs text-muted">{r.ratingLabel}</span>
            </div>
            <p className="mt-0.5 pl-[9.5rem] text-xs text-body">{r.rationale}</p>
            {r.paperIds.length > 0 && (
              <p className="mt-0.5 pl-[9.5rem] text-xs">
                {r.paperIds.map((id) => {
                  const paper = paperById.get(id);
                  if (!paper) return null;
                  return (
                    <a
                      key={id}
                      href={paper.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mr-2 inline-block rounded bg-white px-1.5 py-0.5 text-[11px] text-brand ring-1 ring-brand/20 hover:ring-brand/40"
                      title={paper.title}
                    >
                      {paper.authors.split(",")[0]} {paper.year}
                    </a>
                  );
                })}
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
