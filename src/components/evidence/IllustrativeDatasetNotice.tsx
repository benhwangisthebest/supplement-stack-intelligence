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
// U6 (c): the corpus is now MIXED — most papers carry a fixture-verified DOI/PMID,
// with card fields rewritten only from the abstract; a few remain illustrative.
// Neither the card nor this notice can yet say WHICH (the card renders no
// identifier), so the copy states the mix, true on every page, and still tells the
// reader not to treat a summary as a citation. Keep "not real studies": the G3 E2E
// spec asserts it on the production render path.
export function IllustrativeDatasetNotice({
  variant = "panel",
}: {
  variant?: "panel" | "inline";
}) {
  if (variant === "inline") {
    return (
      <p data-testid="illustrative-dataset-notice" className="mt-1.5 text-xs text-muted">
        <span className="font-medium">Partly verified sources.</span> Some evidence
        summaries cited here are matched to published papers; others are still
        illustrative sample data, not real studies. Grades are this app&apos;s own
        assessment. Don&apos;t treat any of this as a citation.
      </p>
    );
  }
  return (
    <aside
      data-testid="illustrative-dataset-notice"
      className="mb-4 rounded-lg border border-hairline bg-surface-card p-3 text-xs text-body"
    >
      <span className="font-medium text-ink">Evidence summaries — partly verified.</span>{" "}
      Some summaries in this Library are matched to a published paper: the title is the
      paper&apos;s own, and the details come only from its PubMed abstract (or read
      &ldquo;Not reported in abstract&rdquo;). Others are still illustrative sample data
      written to demonstrate the product — not real studies. Evidence grades are this
      app&apos;s own assessment. Until each summary shows its source, don&apos;t treat
      any of them as a citation.
    </aside>
  );
}
