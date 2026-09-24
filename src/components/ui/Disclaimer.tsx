import type { DISCLAIMERS } from "@/lib/safety";

/** Exactly one of the standard disclaimers — the type admits no other string. */
export type DisclaimerText = (typeof DISCLAIMERS)[keyof typeof DISCLAIMERS];

// Renders standardized, non-diagnostic safety copy (Design §5, §7).
// All text comes from lib/safety — never inline it. The type enforces that: only a
// value of `DISCLAIMERS` is assignable to `text`.
//
// Phase 3 U9 (b), CLAUDE.md §4 rule 7: PRESENTATIONAL ONLY, like CoverageLimit. The
// caller passes `DISCLAIMERS.<variant>`, so this component carries no `@/lib` value
// import into the client components that render it (StackLabClient, LabReviewConfirm).
export function Disclaimer({ text, className = "" }: { text: DisclaimerText; className?: string }) {
  return (
    <p
      role="note"
      className={`text-xs leading-relaxed text-muted ${className}`}
    >
      {text}
    </p>
  );
}
