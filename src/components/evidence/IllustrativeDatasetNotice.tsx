// Design Ref: §5.3 — the disclosure the Library never had.
//
// The seed evidence dataset is illustrative. Before v13 the UI presented it as real
// research (author · journal · year · n=…, under a "View source ↗" link) while only a
// source-file comment admitted otherwise. Users never saw the comment.
//
// This notice must be MOUNTED on every surface rendering evidence-derived content —
// a disclosure that exists but isn't reachable from production is the same class of
// defect as the v11 rule that passed 385 unit tests while being dead code.
// Plan SC: SC-4 (reachability, asserted via the production render path — guard G3)
//
// Phase 3 U6 (a0), N-84: the advisor's source chips were such a surface and had no
// notice — a chip's text IS the illustrative title. The `inline` variant is the
// chips' copy of the same disclosure (ProvenanceChips.test.tsx). Both variants live
// here so U6 (c) revises one file when verified papers make the wording untrue.
//
// U6 (c2), owner scope addition 2026-09-23: the corpus is MIXED, and the card now
// says which is which — PaperSummaryCard links a fixture-verified PMID/DOI, and a
// card without that link is illustrative. The copy points at that link. Keep "not
// real studies": the G3 E2E spec asserts it on the production render path.
export function IllustrativeDatasetNotice({
  variant = "panel",
}: {
  variant?: "panel" | "inline";
}) {
  if (variant === "inline") {
    return (
      <p data-testid="illustrative-dataset-notice" className="mt-1.5 text-xs text-muted">
        <span className="font-medium">Partly verified sources.</span> A paper cited
        here is verified when its Library card links a PubMed or DOI record; the rest
        are illustrative sample data, not real studies. Grades are this app&apos;s own
        assessment.
      </p>
    );
  }
  return (
    <aside
      data-testid="illustrative-dataset-notice"
      className="mb-4 rounded-lg border border-hairline bg-surface-card p-3 text-xs text-body"
    >
      <span className="font-medium text-ink">Evidence summaries — partly verified.</span>{" "}
      A summary with a PubMed or DOI link is verified: its title is the paper&apos;s own,
      and its details come only from that paper&apos;s abstract (or read &ldquo;Not
      reported in abstract&rdquo;). A summary without a link is illustrative sample data
      written to demonstrate the product — not real studies — and should not be treated
      as a citation. Evidence grades are this app&apos;s own assessment.
    </aside>
  );
}
