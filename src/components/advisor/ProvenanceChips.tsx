// Presentation — provenance chips under an assistant answer (Design §5.1, §5.3).
// Each chip traces one claim to the engine output behind it (Plan SC8). Library-
// linkable kinds (effect-grade / paper) deep-link to the source screen via the pure
// citationHref resolver; others render as inert tags (no dead link).
import Link from "next/link";
import { IllustrativeDatasetNotice } from "@/components/evidence/IllustrativeDatasetNotice";
import { citationHref } from "@/lib/advisor/citation-href";
import { defaultLibrary, getPaperById } from "@/lib/evidence";
import type { Citation } from "@/types/advisor";

// Phase 3 U6 (a0), N-84: kinds whose chip text comes from the seed evidence corpus
// (a paper's title, an effect's grade). Any of them in the list mounts the sources
// notice the Library shows on the same content. Since the U6 closeout every cited
// paper is verified (P7), so the notice states provenance rather than disclaiming it.
const EVIDENCE_DATASET_KINDS: ReadonlySet<Citation["kind"]> = new Set(["paper", "effect-grade"]);

// Phase 3 U6 closeout. A citation's label and detail are PERSISTED in
// advisor_messages.citations and loaded as stored (src/lib/advisor/repo.ts), so a
// message written before U6 still carries a paper's old illustrative title and the
// "Illustrative evidence summary" note. The rows are not edited (owner ruling). The
// chip resolves a paper by its refId at render time instead: a verified paper shows
// its current, fixture-verified title, and the stale note is not shown. An unknown
// refId falls back to what was stored.
//
// Phase 3 U4, owner ruling R2: an effect-grade chip's label stores the letter the
// grade had when the message was written ("… Grade A"), and U4 derives grades from
// verified profiles, so some letters change. The rows are not edited. The chip shows
// the effect's CURRENT grade (defaultLibrary pre-resolves it), and when that differs
// from the stored letter it says so. A label with no stored letter, or an unknown
// refId, falls back to what was stored.
const STORED_GRADE = /Grade ([ABCD])$/;

function displayed(c: Citation): { label: string; detail?: string; gradeUpdated?: boolean } {
  if (c.kind === "effect-grade") {
    const stored = STORED_GRADE.exec(c.label)?.[1];
    const current = defaultLibrary.effects.find((e) => e.id === c.refId)?.grade;
    if (!stored || !current || stored === current) return { label: c.label, detail: c.detail };
    return { label: c.label.replace(STORED_GRADE, `Grade ${current}`), detail: c.detail, gradeUpdated: true };
  }
  if (c.kind !== "paper") return { label: c.label, detail: c.detail };
  const paper = getPaperById(c.refId);
  if (!paper || !(paper.doi || paper.pmid)) return { label: c.label, detail: c.detail };
  return { label: paper.title };
}

const KIND_LABEL: Record<Citation["kind"], string> = {
  "effect-grade": "Evidence",
  "interaction-rule": "Interaction",
  "biomarker-rule": "Biomarker",
  "lab-trend": "Lab trend",
  paper: "Paper", // U6: every cited paper carries a fixture-verified DOI/PMID (P7)
  "stack-eval": "Stack",
  "side-effect": "Side-effect",
};

export function ProvenanceChips({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  const citesEvidenceDataset = citations.some((c) => EVIDENCE_DATASET_KINDS.has(c.kind));
  return (
    <>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sources">
        {citations.map((c) => {
          const href = citationHref(c);
          const shown = displayed(c);
          const body = (
            <>
              <span className="font-medium text-muted">{KIND_LABEL[c.kind]}</span>
              <span className="text-body">{shown.label}</span>
              {shown.gradeUpdated && (
                <span className="text-muted" data-testid="grade-updated">
                  · grade updated since this message
                </span>
              )}
            </>
          );
          const className =
            "inline-flex items-center gap-1 rounded-full border border-hairline bg-surface-soft px-2 py-0.5 text-xs";
          return (
            <li key={`${c.kind}:${c.refId}`} title={shown.detail}>
              {href ? (
                <Link href={href} className={`${className} hover:bg-surface-card`}>
                  {body}
                </Link>
              ) : (
                <span className={className}>{body}</span>
              )}
            </li>
          );
        })}
      </ul>
      {citesEvidenceDataset && <IllustrativeDatasetNotice variant="inline" />}
    </>
  );
}
