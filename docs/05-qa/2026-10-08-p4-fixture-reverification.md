# Phase 4 closeout — provenance-fixture re-verification, live half (2026-10-08)

> **Why this exists:** D-6 (c), closeout checklist item (1) (`docs/01-plan/phase-4-product-completion.plan.md`
> §5). Owner ruling 6 (2026-10-08): *"the check IS live"*. Run at closeout landing (b) under the owner's standing
> approval: at most 37 lookups and 60 requests, $0. Anchor `69e3e3b`, worktree `../ssi-close-b`. The offline half
> ran at landing (a) (17/17, `features/p4-closeout.plan.md` §5).

## 1. Instrument

Phase 3's driver, **unchanged**: the `js` block in `docs/01-plan/features/phase3-closeout.plan.md` §5, extracted
with `awk` into a scratch directory outside the repository, and not committed. Its sha256 is
`5ccec059055a0aedd802ab5632b70a91124b336750263d3707e56873a34b6c1d`. It imports `createClient` from
`content/verification/capture.mjs` unchanged, so the controls are the same ones the U6 scenarios and the Phase 3 RV
run used: the host allowlist (`api.crossref.org`, `eutils.ncbi.nlm.nih.gov`), a 400 ms minimum interval, the
`--max-calls` cap, and a call log. No contact email was sent (`mailto: null`).

## 2. Commands and result

```
node reverify.mjs --repo ../ssi-close-b --out <scratch>/dry  --max-calls 45 --dry-run   → planned 37, made 0
node reverify.mjs --repo ../ssi-close-b --out <scratch>/live --max-calls 37             → calls made: 37 · OK
```

- **Calls:** 37 in total, all HTTP 200, from 2026-10-08T09:54:34Z to 09:54:51Z (UTC): 36 to
  `eutils.ncbi.nlm.nih.gov` and 1 to `api.crossref.org`. That is within the approval of 37 lookups and 60 requests.
  The dry run made none. **Cost: $0.**
- **Entries:** 37 (36 PMID, 1 DOI), every one `verifiedOn` 2026-09-24. **Titles: 37/37 match**, both the fixture's
  `resolvedTitle` and the paper's title. **Identity: 37/37.** **Retraction signals: 0.** Driver stops: 0, exit 0.
- **Drift: none, so nothing is registered.**
- **Response bodies against the 2026-09-24 RV capture:** 36 of 37 are byte-identical. The one that differs is the
  Crossref record for `p-glycine-sleep`. Two fields changed, and both are Crossref's own bookkeeping: `indexed`
  (2026-09-03 → 2026-10-06) and `is-referenced-by-count` (55 → 56). Title, DOI, type and relations are unchanged.

## 3. What was not done, and why

- **No body was committed.** The bodies stay in the scratch directory. `content/` is outside landing (b)'s *May
  touch*, and `provenance-record.test.ts` hashes the committed 2026-09-24 RV bodies, so the committed set stays as is.
- **`verifiedOn` was not refreshed, and the standing policy says it should be.** The Phase 3 plan's amendment
  (`docs/01-plan/phase-3-evidence-grounding.plan.md:283`, (i), owner ruling 2026-09-25) reads: re-verification
  *"sets every re-resolved entry's `verifiedOn` to the re-verification date"*, with `verifiedBy` unchanged. The fixture
  is under `content/`, outside landing (b)'s *May touch*, so the 37 dates still read 2026-09-24. Phase 3 hit the same
  gap at its closeout (d) and closed it at (e1). **Registered as FU-96** for the owner. Landing (a)'s statement that
  the refresh *"is not written anywhere"* was wrong about `verifiedOn` (`features/p4-closeout.plan.md` §5, corrected).
  Until the refresh lands, this record is the dated evidence that the 2026-09-24 attestation still held on 2026-10-08.

## 4. Per entry

| Fixture key | Paper | Title | Identity | Publication types | Retraction | Body vs 2026-09-24 |
|---|---|---|---|---|---|---|
| `doi:10.1111/j.1479-8425.2007.00262.x` | `p-glycine-sleep` | match | match | journal-article | none | differs |
| `pmid:16930802` | `p-ltheanine-stress` | match | match | Journal Article, Randomized Controlled Trial | none | identical |
| `pmid:20464765` | `p-caffeine-shift-work` | match | match | Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:20521321` | `p-caffeine-glucose` | match | match | Comparative Study, Journal Article, Randomized Controlled Trial | none | identical |
| `pmid:21118604` | `p-creatine-vegetarian-cognition` | match | match | Journal Article, Randomized Controlled Trial | none | identical |
| `pmid:22552031` | `p-vitamin-d-deficiency` | match | match | Comparative Study, Journal Article, Meta-Analysis, Research Support, Non-U.S. Gov't, Systematic Review | none | identical |
| `pmid:23108937` | `p-caffeine-tolerance` | match | match | Journal Article, Randomized Controlled Trial, Research Support, Non-U.S. Gov't | none | identical |
| `pmid:23244547` | `p-zinc-deficiency` | match | match | Journal Article, Meta-Analysis, Research Support, Non-U.S. Gov't, Systematic Review | none | identical |
| `pmid:23691095` | `p-melatonin-sleep` | match | match | Journal Article, Meta-Analysis, Research Support, N.I.H., Extramural, Research Support, Non-U.S. Gov't | none | identical |
| `pmid:25527035` | `p-caffeine-focus` | match | match | Journal Article, Randomized Controlled Trial, Research Support, Non-U.S. Gov't, Research Support, U.S. Gov't, Non-P.H.S. | none | identical |
| `pmid:28202713` | `p-vitamin-d-respiratory-ipd` | match | match | Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:28698222` | `p-protein-mps` | match | match | Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:28969341` | `p-caffeine-military` | match | match | Journal Article, Systematic Review | none | identical |
| `pmid:29543316` | `p-b12-oral-vs-im` | match | match | Journal Article, Research Support, Non-U.S. Gov't, Systematic Review | none | identical |
| `pmid:29546641` | `p-taurine-training` | match | match | Journal Article, Meta-Analysis, Review | none | identical |
| `pmid:29704637` | `p-creatine-cognition` | match | match | Journal Article, Systematic Review | none | identical |
| `pmid:31383846` | `p-fish-oil-mood` | match | match | Journal Article, Meta-Analysis, Research Support, Non-U.S. Gov't, Review | none | identical |
| `pmid:32114706` | `p-fish-oil-longevity` | match | match | Journal Article, Meta-Analysis, Research Support, Non-U.S. Gov't, Systematic Review | none | identical |
| `pmid:33864354` | `p-magnesium-stress` | match | match | Journal Article, Randomized Controlled Trial | none | identical |
| `pmid:33865376` | `p-magnesium-sleep` | match | match | Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:34472118` | `p-creatine-recovery` | match | match | Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:34473295` | `p-vitamin-d-prediabetes-rct` | match | match | Journal Article, Multicenter Study, Randomized Controlled Trial, Research Support, N.I.H., Extramural, Research Support, Non-U.S. Gov't | none | identical |
| `pmid:34559859` | `p-ashwagandha-sleep` | match | match | Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:34836329` | `p-magnesium-glucose` | match | match | Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:34956436` | `p-berberine-metabolic` | match | match | Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:36017529` | `p-ashwagandha-stress-anxiety` | match | match | Meta-Analysis, Systematic Review, Journal Article | none | identical |
| `pmid:36615805` | `p-caffeine-training` | match | match | Meta-Analysis, Systematic Review, Journal Article | none | identical |
| `pmid:37264945` | `p-fish-oil-cv` | match | match | Meta-Analysis, Journal Article, Research Support, Non-U.S. Gov't | none | identical |
| `pmid:37832082` | `p-ashwagandha-stress` | match | match | Randomized Controlled Trial, Journal Article | none | identical |
| `pmid:38719213` | `p-zinc-immune` | match | match | Journal Article, Research Support, Non-U.S. Gov't, Systematic Review | none | identical |
| `pmid:39163858` | `p-fish-oil-triglycerides-t2d` | match | match | Clinical Trial, Phase IV, Journal Article, Multicenter Study, Randomized Controlled Trial, Research Support, Non-U.S. Gov't | none | identical |
| `pmid:39373282` | `p-b12-deficiency` | match | match | Journal Article, Systematic Review, Meta-Analysis, Research Support, Non-U.S. Gov't | none | identical |
| `pmid:39396907` | `p-vitamin-d-weekly-daily` | match | match | Comparative Study, Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:39519498` | `p-creatine-strength` | match | match | Journal Article, Meta-Analysis, Systematic Review | none | identical |
| `pmid:39993397` | `p-vitamin-d-respiratory-update` | match | match | Journal Article, Systematic Review, Meta-Analysis | none | identical |
| `pmid:40314930` | `p-ltheanine-focus` | match | match | Journal Article, Systematic Review, Meta-Analysis | none | identical |
| `pmid:41487531` | `p-b12-oral-routes` | match | match | Journal Article, Systematic Review | none | identical |
