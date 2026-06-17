// Presentation — provenance chips under an assistant answer (Design §5.1, §5.3).
// Each chip traces one claim to the engine output behind it (Plan SC-5). Library-
// linkable kinds deep-link to the source screen; others render as inert tags.
import Link from "next/link";
import type { Citation } from "@/types/advisor";

const KIND_LABEL: Record<Citation["kind"], string> = {
  "effect-grade": "Evidence",
  "interaction-rule": "Interaction",
  "biomarker-rule": "Biomarker",
  "lab-trend": "Lab trend",
  paper: "Paper",
  "stack-eval": "Stack",
};

/** Deep-link target for a citation, or null when it isn't directly linkable. */
function hrefFor(c: Citation): string | null {
  if (c.kind === "paper") return null; // papers render inside Library, no stable route
  return null; // kept conservative: chips are informative; deep-linking lands in v7
}

export function ProvenanceChips({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sources">
      {citations.map((c) => {
        const href = hrefFor(c);
        const body = (
          <>
            <span className="font-medium text-neutral-500">{KIND_LABEL[c.kind]}</span>
            <span className="text-neutral-700">{c.label}</span>
          </>
        );
        const className =
          "inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs";
        return (
          <li key={`${c.kind}:${c.refId}`} title={c.detail}>
            {href ? (
              <Link href={href} className={`${className} hover:bg-neutral-100`}>
                {body}
              </Link>
            ) : (
              <span className={className}>{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
