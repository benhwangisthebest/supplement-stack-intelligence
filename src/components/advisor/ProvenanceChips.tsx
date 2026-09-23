// Presentation — provenance chips under an assistant answer (Design §5.1, §5.3).
// Each chip traces one claim to the engine output behind it (Plan SC8). Library-
// linkable kinds (effect-grade / paper) deep-link to the source screen via the pure
// citationHref resolver; others render as inert tags (no dead link).
import Link from "next/link";
import { IllustrativeDatasetNotice } from "@/components/evidence/IllustrativeDatasetNotice";
import { citationHref } from "@/lib/advisor/citation-href";
import type { Citation } from "@/types/advisor";

// Phase 3 U6 (a0), N-84: kinds whose chip text comes from the illustrative seed
// evidence dataset (a paper's title, an effect's grade). Any of them in the list
// mounts the disclosure the Library shows on the same content.
const EVIDENCE_DATASET_KINDS: ReadonlySet<Citation["kind"]> = new Set(["paper", "effect-grade"]);

const KIND_LABEL: Record<Citation["kind"], string> = {
  "effect-grade": "Evidence",
  "interaction-rule": "Interaction",
  "biomarker-rule": "Biomarker",
  "lab-trend": "Lab trend",
  paper: "Evidence summary", // v13: not a citable paper — see types/paper.ts
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
          const body = (
            <>
              <span className="font-medium text-muted">{KIND_LABEL[c.kind]}</span>
              <span className="text-body">{c.label}</span>
            </>
          );
          const className =
            "inline-flex items-center gap-1 rounded-full border border-hairline bg-surface-soft px-2 py-0.5 text-xs";
          return (
            <li key={`${c.kind}:${c.refId}`} title={c.detail}>
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
