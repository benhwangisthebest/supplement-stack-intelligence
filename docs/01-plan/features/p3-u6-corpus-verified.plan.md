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

**Callers.** `ProvenanceChips` is mounted once (`AdvisorMessageBubble.tsx:54`). `IllustrativeDatasetNotice`
is mounted at `SupplementDetail.tsx:149,182`, both on the default variant, so neither changes.

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

**Offline behaviour check (scratch, not committed).** The script was run against a stub `fetch` and
synthetic, visibly fake data. PubMed XML parsing covers entities, inline `<i>`, labelled abstract sections
and the DOI. The Crossref parse, `resolve` building a `validateFixture`-clean entry, and `applyResolved`
retitling the paper all behaved. A title mismatch was refused, the cap threw on the 4th call of 3, a
non-allowlisted host threw, the limiter waited between back-to-back calls, and search made exactly 3 calls
per claim with the contact address attached. Result: all assertions passed.

**Red proof, U5's guard against a planted unverifiable DOI.** The seed file was backed up by copy, and
`p-creatine-strength.doi = "10.0000/u6-planted-unverifiable"` was planted:

```
   × P2/P3 — doi > P3 doi: every well-formed paper doi has a fixture entry
+   "p-creatine-strength.doi \"10.0000/u6-planted-unverifiable\": no fixture entry for doi:10.0000/u6-planted-unverifiable",
      Tests  1 failed | 7 passed (8)
```

Restored from the copy. The `shasum` values match (`f57967e9…`), `git diff content/seed` is empty, and the
file → **8 passed (8)**.
