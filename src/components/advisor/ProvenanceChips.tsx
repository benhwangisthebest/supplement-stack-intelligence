// Presentation — provenance chips under an assistant answer (Design §5.1, §5.3).
// Each chip traces one claim to the engine output behind it (Plan SC8). Library-
// linkable kinds (effect-grade / paper) deep-link to the source screen via the pure
// citationHref resolver; others render as inert tags (no dead link).
//
// Phase 3 U9 (b), CLAUDE.md §4 rule 7: every lib answer this component used to
// compute in the browser (citationHref, the current grade, the current label)
// now arrives precomputed in `index`, built on the server by `buildCitationIndex()`.
import Link from "next/link";
import { IllustrativeDatasetNotice } from "@/components/evidence/IllustrativeDatasetNotice";
import type { Citation } from "@/types/advisor";
import type { CitationIndex } from "./citation-index";

/** Own-property read: a refId like "constructor" must not resolve to Object.prototype. */
function own<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** What `citationHref(c)` returns, read from the index. */
function hrefFor(c: Citation, index: CitationIndex): string | null {
  if (c.kind === "effect-grade") return own(index.effects, c.refId)?.href ?? null;
  if (c.kind === "paper") return own(index.papers, c.refId)?.href ?? null;
  return null;
}

// Phase 3 U6 (a0), N-84: kinds whose chip text comes from the seed evidence corpus
// (a paper's title, an effect's grade). Any of them in the list mounts the sources
// notice the Library shows on the same content. Since the U6 closeout every cited
// paper is verified (P7), so the notice states provenance rather than disclaiming it.
const EVIDENCE_DATASET_KINDS: ReadonlySet<Citation["kind"]> = new Set(["paper", "effect-grade"]);

// A citation's label and detail are PERSISTED in advisor_messages.citations and
// loaded as stored (src/lib/advisor/repo.ts); the rows are not edited (owner rulings
// at Phase 3 U6 and U4 R2). The chip shows what the Library calls the id TODAY:
// `index.*[refId].label` is `libraryLabel()` from src/lib/advisor/citation-label.ts,
// the one resolver the account export also uses (Phase 4 U9, owner ruling
// 2026-09-28). For an effect that is the current supplement name, effect name and
// grade, so a pre-U6 "Cardiovascular support" chip reads "Triglyceride lowering".
// For a verified paper it is the verified title, and the stale "Illustrative
// evidence summary" note is not shown. Where the Library offers no label (unknown
// refId, unverified paper, any other kind) the stored label is shown.
function currentLabel(c: Citation, index: CitationIndex): string | null {
  if (c.kind === "effect-grade") return own(index.effects, c.refId)?.label ?? null;
  if (c.kind === "paper") return own(index.papers, c.refId)?.label ?? null;
  return null;
}

// Phase 3 U4, owner ruling R2: an effect-grade label stores the letter the grade had
// when the message was written ("… Grade A"). When that differs from the effect's
// current grade, the chip says so.
const STORED_GRADE = /Grade ([ABCD])$/;

function displayed(
  c: Citation,
  index: CitationIndex,
): { label: string; detail?: string; gradeUpdated?: boolean } {
  const current = currentLabel(c, index);
  if (c.kind === "effect-grade") {
    const stored = STORED_GRADE.exec(c.label)?.[1];
    const grade = own(index.effects, c.refId)?.grade;
    const gradeUpdated = !!stored && !!grade && stored !== grade;
    return { label: current ?? c.label, detail: c.detail, ...(gradeUpdated && { gradeUpdated }) };
  }
  if (c.kind === "paper" && current != null) return { label: current };
  return { label: current ?? c.label, detail: c.detail };
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

export function ProvenanceChips({
  citations,
  index,
}: {
  citations: Citation[];
  index: CitationIndex;
}) {
  if (citations.length === 0) return null;
  const citesEvidenceDataset = citations.some((c) => EVIDENCE_DATASET_KINDS.has(c.kind));
  return (
    <>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sources">
        {citations.map((c) => {
          const href = hrefFor(c, index);
          const shown = displayed(c, index);
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
