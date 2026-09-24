import type { EvidenceProfile } from "@/types/evidence-grading";
import type { Paper } from "@/types";
import { gradeBreakdown } from "@/lib/evidence-grading";
import type { CoverageCopy } from "@/lib/safety";
import { CoverageLimit } from "@/components/evidence/CoverageLimit";

// Design §5 — per-dimension evidence breakdown (evidence-grading v5). Pure/server
// component: native <details> for zero-JS expand. Shows each dimension's rating
// bar + rationale + the papers that justify it. Rendered only for profiled effects.

const MAX = 3;

// Phase 3 U7 (b2), U4 closeout note 2 (B4 ruling): a dimension scoring 0 that cites
// no paper was never assessed; "none" (RATING_LABELS[0]) is kept for a 0 that cites
// papers, i.e. evidence of no effect. Display only: scores and RATING_LABELS are
// untouched, so the grade the dimension feeds is unchanged.
const NOT_ASSESSED = "not assessed";

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
  gradeNote,
}: {
  profile: EvidenceProfile;
  papers: Paper[];
  /** U7 (b2): the Grade D statement for this effect (gradeDCoverage), if any. */
  gradeNote?: CoverageCopy | null;
}) {
  const rows = gradeBreakdown(profile);
  const paperById = new Map(papers.map((p) => [p.id, p]));

  return (
    <details className="mt-3 rounded-md border border-hairline bg-surface-soft/60">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-body">
        Evidence breakdown
      </summary>
      {gradeNote && <CoverageLimit copy={gradeNote} className="px-3 pb-2" />}
      <ul className="space-y-2 px-3 pb-3">
        {rows.map((r) => (
          <li key={r.dimension} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-body">{r.label}</span>
              <RatingBar score={r.score} />
              <span className="text-xs text-muted">
                {r.score === 0 && r.paperIds.length === 0 ? NOT_ASSESSED : r.ratingLabel}
              </span>
            </div>
            <p className="mt-0.5 pl-[9.5rem] text-xs text-body">{r.rationale}</p>
            {/* v13 (evidence-disclosure): inert tags, not anchors. These pointed at
                fabricated placeholder URLs and were labelled with recalled, unverified
                author/year metadata. Same idiom as ProvenanceChips: a non-linkable
                source renders as a tag, never as a dead link.
                Plan SC: SC-3 */}
            {r.paperIds.length > 0 && (
              <p className="mt-0.5 pl-[9.5rem] text-xs">
                {r.paperIds.map((id) => {
                  const paper = paperById.get(id);
                  if (!paper) return null;
                  return (
                    <span
                      key={id}
                      className="mr-2 mt-1 inline-block max-w-[16rem] truncate align-bottom rounded bg-white px-1.5 py-0.5 text-[11px] text-body ring-1 ring-hairline"
                      title={paper.title}
                    >
                      {paper.title}
                    </span>
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
