# p3-u6-corpus-verified — PDCA cycle artifact for Phase 3 U6

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U6**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U6** (L214–217, status APPROVED),
> with §8's spend line and D-6. Where the two disagree, the register wins.
>
> **Feature**: `p3-u6-corpus-verified` · **Anchor**: `4ee80b6` · **Date**: 2026-09-23 ·
> **Type**: **live** (network: Crossref, doi.org, PubMed E-utilities; the deployed DB only on the retire path)

---

## 1. Plan

**Problem.** U5 built the record, and the record is empty. All 20 seed papers carry illustrative titles
(N-84), so P4 blocks any identifier until each paper is re-sourced or retired. D-6 adds the **3** effects and
**9** profile dimensions that cite nothing. The advisor's source chips show those illustrative titles with no
disclosure, although the Library discloses the same content (N-84's UI gap).

**Owner rulings in force (2026-09-23, recorded in the register before any work).** **R1:** a real paper for
the same claim → keep the id, take the resolver's title, attach `doi`/`pmid`. None found → retire via
tombstone, with its deployed-DB migration as a separate landing (own go, own OP row). *"Unverified but
disclosed"* is not an option. **R2:** (a0) adds the notice to the chips before any live work. **R3:** no
contact email (**none**, owner, 2026-09-23), so the script runs with `--no-mailto`. The rulings given with the go for (b)
(search rules, split captures, (c)'s rewrite rule and `tools.ts` scope) are in the register.

**Hard rules.** (1) No identifier, title or abstract from memory: every candidate comes from a resolver
response captured in this session. (2) `verifiedBy: "owner"` only for a mapping the owner approved in writing
in this session. (3) No grade or profile score changes: a contradiction is recorded for U4 and the owner.
(4) No lookup is reachable from a request path. The capture script is build-time and owner-run.

**Landings.** (a0) chip notice · (a) capture script, no network · (b) **live, search only**, then STOP for owner
decisions · (c) capture the approved mappings and revise the notice · (d) retirements only, separate go ·
closeout.

**Spend, pre-registered** (paste actuals into `docs/05-qa/<date>-p3-u6-verification-record.md`):
S1 search ≤130 calls · S2 capture ≤40 · S3 one re-run ≤ S1+S2 · all $0, ≤3 req/s. Any other call, any paid API
or any OpenAI call → STOP.

## 2. Design — (a0) the advisor chips carry the disclosure

`IllustrativeDatasetNotice` gains a `variant` prop. The default (`"panel"`) renders exactly the markup the
Library already mounts (`SupplementDetail.tsx:149,182`), so the Library is unchanged. The `"inline"` variant
is a one-line version of the same disclosure. `ProvenanceChips` mounts it below the chip list **when any
citation is a `paper` or an `effect-grade`**. Those are the two kinds whose chip text comes from the seed
evidence dataset (a paper's title from `tools.ts:175`, an effect's grade from `tools.ts:170`), matching the
two Library tabs that mount the notice. Chips of other kinds (interaction, biomarker, lab trend, stack,
side-effect) get no notice, because the dataset is not their source. Both variants sit in one file, so (c)
revises one place when verified papers make the wording untrue.

**Callers.** `ProvenanceChips` is mounted once (`AdvisorMessageBubble.tsx:54`), and the notice at `SupplementDetail.tsx:149,182` (default variant).

**Not changed, recorded for (c):** a paper citation's `detail` is `"Illustrative evidence summary"`
(`src/lib/advisor/tools.ts:176`, the chip's hover `title`). It is outside U6's May-touch, and it is persisted
in `advisor_messages.citations[]`, so historic rows keep it whatever (c) does. (c) must say what happens to it.

## 3. Design — (a) the capture script

`content/verification/capture.mjs` is plain Node with no dependencies, and **owner-run**. It imports every
identifier, title and fixture rule from `provenance.mjs`, the module U5's guard reads, so the script and the
build share one set of rules. **Nothing under `src/` imports it.** The check,
`git grep -nE "(from|import\()\s*['\"][^'\"]*capture(\.mjs)?['\"]" -- src`, gives exit 1 (no match). The
only mention under `src/` is the regenerated preamble comment. Hard rule 4 holds.

| Mode | Scenario | Calls | Writes |
|---|---|---|---|
| `search --claims F` | S1 | per claim: 1 Crossref `works?query.bibliographic` + PubMed `esearch` + `efetch` (**3**, ≤4 budgeted) | raw responses under `--out/<claim>/`, parsed `candidates.json`. **Never** the corpus or the fixture |
| `resolve --approvals F [--write]` | S2 | 1 per approved identifier: Crossref `works/{doi}` or PubMed `esummary` | with `--write`, fixture entries + the paper's `title` and `doi`/`pmid` in `seed-papers.json`; then `content:generate` |

**Controls.** `--dry-run` sends no request and prints each planned call. `--max-calls N` is a hard cap: the
call past it throws `STOP`. Every call carries `--scenario`, written to its line in `call-log.jsonl`. Calls go
one at a time, at least **400 ms** apart (NCBI allows 3 req/s without a key). A **host allowlist**
(`api.crossref.org`, `eutils.ncbi.nlm.nih.gov`) throws `STOP` for any other host. The contact address is
`--mailto` or an explicit `--no-mailto`, and it is **redacted** in the call log. `resolve` **refuses** a
mapping that has no written owner approval (`approvedBy` ∈ `VERIFIERS`, plus `approvedOn` and
`approvalRef`), a malformed identifier, or a resolved title that does not match the approved one under
`normaliseTitle`. This is the stop condition *"resolver data doesn't match"*. Any refusal blocks `--write`.
The merged fixture must pass `validateFixture` before anything is written. `verifiedBy` is copied from the
approval record, which the owner writes, and the script never invents it.

**FU-56.** The `seed-papers` preamble (`content/modules.json`) no longer says the type *"no longer has
fields"*. It says U5 returned optional `doi`/`pmid` behind the record. Regenerated, and
`content:generate -- --check` reports 0 stale.

**3.1 The rulings given with the go for (b), built in as a follow-up to (a)** (register, U6 entry). PubMed terms
are `(<query>) AND (meta-analysis[pt] OR systematic review[pt] OR randomized controlled trial[pt])`. Only if that
returns no PMIDs does a second `esearch` run unfiltered (`pubmedScope: "widened"`), which is still ≤4 calls per
claim. PubMed candidates keep esearch's relevance order and carry `pubTypes` from `PublicationTypeList`. Crossref
candidates carry their `type`. **Split captures:** `crossref.json` and `esearch*.json` hold metadata and are
committed. `efetch.xml` holds full abstracts, so it goes to `<run>/local/`, which is gitignored by
`content/verification/captures/.gitignore`. `candidates.json` commits each file's SHA-256, plus each abstract's
SHA-256, its length and an excerpt of **≤300 characters**. `u6-claims.json` now carries `libraryClaim`, copied
by a node one-off from `seed-effects.json` and `seed-supplements.json` (the citing effects' name, grade and
summary, plus the dimension rationale for dimension rows). Candidates are judged against that. The old free-text
claim becomes `illustrativeDetails`, the illustrative paper's details and not a requirement. **Offline check
(scratch):** the filter is tried first and widened on zero hits (4 calls), the efetch file lands only under
`local/`, its committed SHA-256 equals the file's, an excerpt is exactly 300 characters, and the abstract hash
equals an independent `shasum -a 256`. The dry run of all 32 claims under the fetch-thrower reported
`calls made: 0 · planned: 64`.

## 4. Do / Check — (a0)

**Test:** `src/components/advisor/ProvenanceChips.test.tsx` (jsdom). A paper chip → notice present,
beside the chip in the `Sources` list; an effect-grade chip alone → notice present; an interaction chip alone →
no notice; no citations → nothing rendered.

**Red proof (AC-1).** Backed up by file copy, then the mount line deleted from `ProvenanceChips.tsx`:

```
   × … > discloses the dataset when a paper chip is shown, alongside the chip
   × … > discloses the dataset when only an effect-grade chip is shown
     → expected null not to be null
      Tests  2 failed | 3 passed (5)
```

Restored from the backup. The restored file's `shasum` equals the backup's
(`fc4eeec5150152db03c6b940cd9838da2f930363`), and `npx vitest run --project jsdom` → **5 passed (5)**.

## 5. Do / Check — (a)

**AC-2, zero network in a dry run.** Both modes were run with `--dry-run` and
`--import 'data:…globalThis.fetch=()=>{throw …}'`, so any network call would have crashed the run. Both
exited 0. The call log reads `{"dryRun":true,"callsMade":0,"planned":4,…}` for search (2 claims × 2 calls;
`efetch` is not planned because a dry `esearch` returns no PMIDs), and `callsMade":0,"planned":1` for resolve.
The second approval, whose `approvedBy` was `"nobody"`, was `REFUSED … no written owner approval recorded`.

**Offline behaviour check (scratch, not committed):** against a stub `fetch` and visibly fake data, the parsers,
`resolve`, `applyResolved`, the title-mismatch refusal, the call cap, the host allowlist and the rate limiter all behaved as
specified. All assertions passed.

**Red proof, U5's guard against a planted unverifiable DOI.** The seed file was backed up by copy, and
`p-creatine-strength.doi = "10.0000/u6-planted-unverifiable"` was planted:

```
   × P2/P3 — doi > P3 doi: every well-formed paper doi has a fixture entry
+   "p-creatine-strength.doi \"10.0000/u6-planted-unverifiable\": no fixture entry for doi:10.0000/u6-planted-unverifiable",
      Tests  1 failed | 7 passed (8)
```

Restored from the copy. The `shasum` values match (`f57967e9…`), `git diff content/seed` is empty, and the
file → **8 passed (8)**.

## 6. Do / Check — (b), live search (S1). STOPPED for owner decisions

**Spend:** **96 calls** of ≤130 (32 Crossref, 32 filtered `esearch`, 0 widened, 32 `efetch`), all HTTP 200,
all `S1`, ≥400 ms apart, **$0**, no OpenAI, no deployed DB. Dated record:
`docs/05-qa/2026-09-23-p3-u6-verification-record.md`. Captures: `content/verification/captures/2026-09-23-s1/`
(66 committed files, 464 KB, plus 32 local `efetch.xml` whose SHA-256 values are committed).

**AC-3.** The candidate table has **32 claim rows and 99 candidates**, every one judged, each traceable to
the named response file: `crossref.json`, or `efetch.xml` via its committed SHA-256. The table is the
appendix, **`p3-u6-corpus-verified.candidates.md`**. Verdicts are the agent's judgement against the
row's Library claim. **They are not decisions.** Tally: 36 supports · 34 partial · 23 doesn't · 6 title only.

| Status | Claims |
|---|---|
| A candidate **supports** (23) | 2, 3, 6, 7, 8, 9, 11, 12, 13, 15, 17, 18, 19, 21–23, 25–29, 31, 32 |
| **No full support**, owner decides (8) | 1 `p-creatine-strength` (hypertrophy/LBM only; see #25's PMID 39519498 for strength), 4 `p-magnesium-sleep`, 5 `p-vitamin-d-deficiency` (see #28's PMID 22552031), 10 `p-glycine-sleep` (two Crossref titles match, no abstract), 16 `p-caffeine-focus` (Crossref titles only), 20 `p-nac-antioxidant` (GlyNAC combination only), 24 `magnesium-sleep/populationRelevance`, 30 `melatonin-sleep/populationRelevance` (review abstract states no findings; no DOI) |
| **No candidate supports** — stop condition (1) | 14 `p-zinc-deficiency`: all three are diet-pattern, fertility or children's-diet reviews |

**Stop conditions that fired, recorded rather than acted on:**
1. **A claim with no supporting candidate:** #14. Under R1, this is a retirement unless the owner approves a
   re-search (S3) or a candidate from another row.
2. **A withdrawn paper surfaced:** PMID 25924708 (#13) is a WITHDRAWN Cochrane review, marked *doesn't*.
   It must never be approved.
3. **Grade or score tensions, for U4 and the owner.** Nothing was edited (hard rule 3). **`caffeine-focus`
   (Grade A):** PMID 23108937 reports that tolerance leaves habitual users little net alertness gain. That
   bears on the A grade and on `populationRelevance` (score 2). **`magnesium-sleep` (Grade B):** PMID
   33865376 grades its evidence **low to very low** quality, which bears on `studyQuality` (score 2) and the
   B. Neither is a proven contradiction. Both go to U4's re-judgement.

**Finding for (c), R1 × shared papers.** Four paper ids are each cited by **two** effects:
`p-magnesium-sleep` (sleep + stress), `p-vitamin-d-deficiency` (deficiency + immune), `p-ashwagandha-stress`
(stress + sleep) and `p-protein-mps` (MPS + recovery). No candidate addresses the second effect. If R1 keeps
the id and retitles it, the second effect would cite a real paper that says nothing about it. **The owner
decides** per id: uncite it from the second effect (which U4 then re-judges), or source a separate paper.
A separate paper is a new id, a manifest `add`, and more S1/S3 calls.

**What (c) needs from the owner, per claim:** the approved PMID and/or DOI, or *retire*, or *re-search*
(S3, with the query to use). **Nothing was written:** the fixture is still `{}`, `content/seed/` is
unchanged, and no `verifiedBy` exists.

## 7. Do / Check — (c), owner decisions applied; S3 run. STOPPED before commit

**Decisions:** owner, chat 2026-09-23, recorded per identifier in `content/verification/u6-approvals.json`. **S2**
24 calls: 0 refusals, 24 fixture entries (`verifiedBy: "owner"`). **S3** 24 calls. Record: `docs/05-qa/…-record.md`.
**Corpus:** 27 papers, of which **24 are verified** (17 existing, retitled per R1; 7 new ids as manifest `add`s). **3
remain illustrative** until S3 is decided: `p-zinc-deficiency`, `p-caffeine-focus`, `p-nac-antioxidant`. Card fields: **168
rewritten** from abstracts, 41 of them *"Not reported in abstract"*. Review table: **`p3-u6-corpus-verified.cards.md`**.
**Citations:** 3 effects and 7 dimensions gained one (#21–23, #25–29, #31–32; #24 has none, per the ruling). Each paper
cited by a dimension also joins its effect's `paperIds`, because `EvidenceBreakdown` renders only papers it was
passed (`EvidenceBreakdown.tsx:58-60` returns `null` otherwise). **Shared papers** stay with their first effect. Four
second-effect citations were removed (magnesium-stress, vitamin-d-immune, ashwagandha-sleep, protein-powder-recovery),
and S3 candidates are appended to the candidate appendix. **Guards:** `DO_NOT_CITE` in `provenance.mjs` (PMID 25924708
plus its DOI). P6 fails a paper citing it (red proof: planted on `p-zinc-immune`, 1 of 10 red, restored), the fixture may
not hold it, and `resolve` refuses it (0 calls). **`tools.ts`:** a paper with `doi`/`pmid` loses the illustrative note
(red: unconditional note → the new `tools.test.ts` case fails, restored, shasum equal). **Notice** revised to *"partly
verified"*, true on every page. Which card is verified is not yet visible (see closeout finding). **Gate:** tsc 0 · lint
382/382 · vitest **1492/1492 across 118 files** · build 0 · `verify:rendering` OK · E2E `evidence-disclosure` 18/18 ·
`content:generate --check` 0 stale. **AC-5:** 0 grade/confidence/score diffs over 27 effects vs `4ee80b6`. **AC-4 not
yet met**: 3 cited papers carry no identifier.
