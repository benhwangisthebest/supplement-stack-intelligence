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
export function IllustrativeDatasetNotice() {
  return (
    <aside
      data-testid="illustrative-dataset-notice"
      className="mb-4 rounded-lg border border-hairline bg-surface-card p-3 text-xs text-body"
    >
      <span className="font-medium text-ink">Illustrative dataset.</span> These evidence
      summaries are sample data written to demonstrate the product — they are not real
      studies, and there are no sources to cite. Dose ranges and outcomes reflect general
      scientific consensus, but nothing here should be treated as a citation.
    </aside>
  );
}
