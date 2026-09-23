// Design Ref: §5.3 — the disclosure the Library never had.
//
// History (kept, per CLAUDE.md §7): before v13 the UI presented an illustrative
// evidence dataset as real research, and this notice was the fix — "Illustrative
// dataset … not real studies". U6 (a0) mounted it on the advisor's source chips
// (N-84); U6 (c)/(c2) reworded it for a partly verified corpus.
//
// Phase 3 U6 closeout (owner, 2026-09-23): EVERY paper the corpus cites now carries a
// DOI/PMID verified against content/verification/provenance-fixture.json, which P7 in
// src/data/provenance-record.test.ts enforces, and PaperSummaryCard links it. So the
// notice no longer says any summary is illustrative. It says what IS true: where
// titles and details come from, and that grades are this app's own assessment rather
// than the papers' conclusions. It covers evidence summaries and grades only. No other
// dataset (products, interactions, food pairings) was ever in its wording.
//
// The component keeps its name so its two Library mounts (SupplementDetail.tsx) stay
// untouched. It must stay MOUNTED on every surface rendering evidence-derived content
// (Plan SC: SC-4, reachability asserted by the G3 E2E spec).
export function IllustrativeDatasetNotice({
  variant = "panel",
}: {
  variant?: "panel" | "inline";
}) {
  if (variant === "inline") {
    return (
      <p data-testid="evidence-sources-notice" className="mt-1.5 text-xs text-muted">
        <span className="font-medium">Sources.</span> Papers cited here are verified
        against their PubMed or DOI record, linked on each Library card. Grades are this
        app&apos;s own assessment of the evidence, not the papers&apos; conclusions.
      </p>
    );
  }
  return (
    <aside
      data-testid="evidence-sources-notice"
      className="mb-4 rounded-lg border border-hairline bg-surface-card p-3 text-xs text-body"
    >
      <span className="font-medium text-ink">Evidence sources.</span> Each summary is
      matched to a published paper, linked by its PubMed or DOI record: the title is the
      paper&apos;s own, and the details come only from that paper&apos;s abstract (or read
      &ldquo;Not reported in abstract&rdquo;). A summary condenses an abstract, so read
      the paper before relying on it. Evidence grades are this app&apos;s own assessment
      of the evidence, not the papers&apos; conclusions.
    </aside>
  );
}
