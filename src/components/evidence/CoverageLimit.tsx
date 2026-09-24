import type { CoverageCopy } from "@/lib/safety";

// Phase 3 U7 — the one renderer for a coverage statement ([P3-X4], CLAUDE.md §2.2
// rule 10). PRESENTATIONAL ONLY: the copy comes from `COVERAGE` in `@/lib/safety`,
// imported by the surface, so this component adds no `@/lib` value import to any
// client component (rule 7's measured figure stays put; U9 owns that rule).
// `data-dataset` / `data-state` are the hooks CoverageLimit.test.tsx asserts on.
export function CoverageLimit({
  copy,
  className,
}: {
  copy: CoverageCopy;
  className?: string;
}) {
  const tone = copy.state === "none" ? "text-sm text-muted" : "text-xs text-muted-soft";
  return (
    <p
      data-testid="coverage-limit"
      data-dataset={copy.dataset}
      data-state={copy.state}
      className={`${className ?? ""} ${tone}`.trim()}
    >
      {copy.text}
    </p>
  );
}
