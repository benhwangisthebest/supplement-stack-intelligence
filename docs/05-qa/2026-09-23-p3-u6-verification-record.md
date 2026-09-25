# 2026-09-23 — Phase 3 U6 verification record (live lookups)

> Dated live record for Phase 3 **U6** (register: `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 U6,
> §8 spend line). Cycle artifact: `docs/01-plan/features/p3-u6-corpus-verified.plan.md`. This record states
> what was called, how often, against what was pre-registered, and what it cost. It is appended to at each
> live landing and holds no content decisions.

## Pre-registered scenarios (from the owner's brief, before any call)

| Scenario | What | Budget | Cost |
|---|---|---|---|
| S1 | search: ~32 claims × ≤4 calls (Crossref query, PubMed esearch + efetch) | **≤130** calls, ≤3 req/s | $0 |
| S2 | capture: 1 resolve per approved identifier | **≤40** calls | $0 |
| S3 | one re-run on failure | ≤ S1 + S2 | $0 |

**STOP rule:** any call outside S1–S3, any paid API, or any OpenAI call.

## S1 — landing (b), search only — 2026-09-23

**Owner go:** given in chat on 2026-09-23 ("Go for (b), S1 only, ≤130 calls"), with the search rules the
register records under U6. **Contact email (R3):** none, so the run used `--no-mailto`.

**Command** (run on branch `p3-u6-corpus-verified` at `e4616de`, since fast-forwarded to `main`):

```
node content/verification/capture.mjs search --claims content/verification/u6-claims.json \
  --out content/verification/captures/2026-09-23-s1 --scenario S1 --max-calls 130 --no-mailto
```

**Actuals**, from `content/verification/captures/2026-09-23-s1/call-log.jsonl`, one line per call:

| Host | Endpoint | Calls | Expected |
|---|---|---|---|
| `api.crossref.org` | `/works?query.bibliographic` | **32** | 32 |
| `eutils.ncbi.nlm.nih.gov` | `esearch` (publication-type filtered) | **32** | 32 |
| `eutils.ncbi.nlm.nih.gov` | `esearch` (widened) | **0** | 0–32 (only on zero hits) |
| `eutils.ncbi.nlm.nih.gov` | `efetch` | **32** | ≤32 |
| **Total** | | **96** | **≤130** |

- Status: **all 96 returned HTTP 200**. Every line is stamped `S1`. **No other host** was contacted, since
  the script's allowlist throws on any other.
- Pace: first call 08:42:06Z, last 08:43:34Z. The minimum gap between calls is **400 ms** (≤2.5 req/s,
  under the ≤3 req/s budget), and the slowest single response took 3491 ms. The logged response bodies total
  3,718,020 bytes.
- **Paid APIs: none. OpenAI calls: none. Deployed database: not touched.** **Cost: $0.**
- **S3 not used.** No call failed.

**What was kept.** Committed: `call-log.jsonl`, `candidates.json`, and per claim `crossref.json` and
`esearch.json`, which is **66 files, 464 KB**. Local only (gitignored `local/`): 32 `efetch.xml` files
holding full abstracts. Each one's SHA-256, and each abstract's SHA-256 and length, is in `candidates.json`.
Committed excerpts are ≤300 characters.

**Outcome.** 32 claims → **99 candidates** (90 PubMed, plus 9 Crossref title-only records filling the 3
claims where the filtered PubMed search returned 1). The table and the agent's verdicts are in
`docs/01-plan/features/p3-u6-corpus-verified.candidates.md`. **No mapping was approved or written.** The
fixture is still `{}` and `content/seed/` is unchanged.

## S2 — landing (c), capture — 2026-09-23

**Owner go:** the (c) decisions in chat on 2026-09-23 (*"Apply everything else in (c): capture fixtures for the
approved rows"*). **24 approved identifiers** (23 PMIDs, 1 DOI), recorded with their approval references in
`content/verification/u6-approvals.json`.

| Host | Endpoint | Calls | Expected |
|---|---|---|---|
| `eutils.ncbi.nlm.nih.gov` | `esummary` (PMID) | **23** | 23 |
| `api.crossref.org` | `works/{doi}` | **1** | 1 |
| **Total** | | **24** | **≤40** |

- Status: all 200. Every line is stamped `S2`. The run lasted 08:56:04Z–08:56:13Z, with calls at least 400 ms apart.
- **Refusals: 0.** Every resolved title matched the approved S1 title under `normaliseTitle`. **24 fixture entries**
  were written with `verifiedBy: "owner"`, `verifiedOn: 2026-09-23`.
- $0. No paid API, no OpenAI call, no deployed DB. Log: `content/verification/captures/2026-09-23-s2/call-log.jsonl`.

## S3 — targeted re-search of 8 claims — 2026-09-23

**Owner go:** *"S3 go: re-search exactly these 8 … ≤40 calls"* (chat, 2026-09-23). This is the budgeted re-run.
The queries are in `content/verification/u6-claims-s3.json`, and the filters are the same as S1.

| Host | Endpoint | Calls | Expected |
|---|---|---|---|
| `api.crossref.org` | `/works?query.bibliographic` | **8** | 8 |
| `eutils.ncbi.nlm.nih.gov` | `esearch` (filtered; 0 widened) | **8** | 8–16 |
| `eutils.ncbi.nlm.nih.gov` | `efetch` | **8** | ≤8 |
| **Total** | | **24** | **≤40** |

- Status: all 200. Every line is stamped `S3`, and calls were at least 400 ms apart. $0.
- The captures follow the S1 layout (`efetch.xml` stays local, and its SHA-256 is committed). The table is appended to the candidate appendix.

## S2 (cont.) and S3 second pass — 2026-09-23

- **S2, 4 calls** (PubMed `esummary`), all 200, all `S2`, 0 refusals. These are the owner's S3 decisions (4 new ids), in `content/verification/u6-approvals-s3.json`. Log: `captures/2026-09-23-s2b/call-log.jsonl`.
- **S3 second pass, 12 calls** (4 Crossref, 4 filtered `esearch`, 0 widened, 4 `efetch`), all 200, all `S3`, for 4 claims with the owner's queries verbatim (`u6-claims-s3b.json`). Log: `captures/2026-09-23-s3b/call-log.jsonl`. $0.

## S2 (final) — owner rulings on the second pass — 2026-09-23

- **S2, 2 calls** (PubMed `esummary`), all 200, all `S2`, 0 refusals: #14 → 23244547 and #16 → 25527035 (`u6-approvals-s3b.json`). Log: `captures/2026-09-23-s2c/call-log.jsonl`.
- **#20: no call.** The owner approved DOI 10.1515/cclm.2002.086 only if its resolver title stated the direction of the effect. Crossref's record for that DOI, already captured in the S3 second pass (`captures/2026-09-23-s3b/paper_p-nac-antioxidant/crossref.json`), reads *"Effects of Oral N-Acetylcysteine on Plasma Homocysteine and Whole Blood Glutathione Levels …"*, which states no direction. The citation was removed without a lookup.

## Final totals — U6 closeout (2026-09-23)

| Scenario | Calls | Budget | Runs |
|---|---|---|---|
| S1 search | **96** | ≤130 | `2026-09-23-s1` |
| S2 capture | **30** (24 + 4 + 2) | ≤40 | `-s2`, `-s2b`, `-s2c` |
| S3 re-search | **36** (24 + 12) | ≤ S1+S2; owner cap ≤40 | `-s3`, `-s3b` |
| **Total** | **162** | — | **$0** |

**Every call returned HTTP 200.** No call went outside S1–S3, to a paid API, or to OpenAI. **Deployed database: never touched.** No
retirement was needed, so `[P3-X6]`'s migration path was not opened (see the register). **Fixture:** 30 entries, all
`verifiedBy: "owner"`, `verifiedOn: 2026-09-23`. **Refresh:** re-verify every entry at the Phase 3 closeout (U5's refresh policy).

## S4 — scoped U6 addendum for U4 (owner ruling R7) — 2026-09-23

**Why.** U4's B1 draft derived Grade C for `zinc-deficiency` and `vitamin-b12-deficiency`, because each effect's only verified paper does not test correcting a deficiency. The owner held both and ruled one search. **Budget: ≤16 calls**, with U6's filters and capture rules: the PubMed type filter, widening only on an empty result, metadata committed, abstracts in the gitignored `local/` folder with a SHA-256 committed. There were four queries, taken verbatim from the owner (`content/verification/u6-claims-s4.json`). `capture.mjs`'s `SCENARIOS` gained `"S4"` so its calls are stamped correctly. Nothing else in the script changed.

| Run | Calls | Hosts | Status | Budget |
|---|---|---|---|---|
| `2026-09-23-s4` search | **12** (4 queries × Crossref + esearch + efetch; no widening needed) | Crossref 4 · NCBI 8 | all **200** | ≤16 |

Dry run first: 0 calls made, 8 planned (efetch is only planned once a live esearch returns ids). Live window 19:50:36–19:50:42Z, slowest response 767 ms, 523,339 bytes logged. **$0. No OpenAI, no paid API, deployed DB not touched.** The search writes nothing to the corpus or the fixture. The candidate table and its outcome for U4 are in `docs/01-plan/features/p3-u4-profiles.s4.md`.

**Running total: 174 calls** (U6 162 + S4 12), $0.

## S2 for S4's B-1/B-2 (owner decision R11) — 2026-09-23

| Run | Calls | Status | Outcome |
|---|---|---|---|
| `2026-09-23-s2d` | **2** (PubMed `esummary` ×2) | all **200** | B-1 matched; **B-2 (29543316) refused**: resolved title ≠ approved title. All-or-nothing, so **nothing written** |
| `2026-09-23-s2e` | **2**, after the F-2 `normaliseTitle` fix | all **200** | **B-2 refused again; nothing written.** F-2 did not remove the mismatch, so its cause is **not established**: `resolve` does not save the response body. |

**Running total: 178 calls** (U6 162 · S4 12 · S2 4), $0. No OpenAI, no paid API, deployed DB untouched.
| `2026-09-23-s2f` | **2**, with response bodies now saved (committed) | all **200** | **B-2 refused a third time; nothing written.** Saved body (`s2f/p-b12-oral-vs-im/esummary.json`): `"title":"Oral vitamin B(12) versus intramuscular vitamin B(12) for vitamin B(12) deficiency."`. **Verified cause:** esummary renders the subscript as parentheses, which `normaliseTitle` turns into a space (`b 12`), while the approved title from efetch reads `b12`. It is neither tag markup nor HTML entities. |

**Running total: 180 calls** (U6 162 · S4 12 · S2 6), $0.

**S2, final run** (`2026-09-23-s2g`, **2** calls, all **200**). B-2's approved title was set, on the owner's option (i), to PubMed's `esummary` text verbatim. **Both matched and 2 fixture entries were written** (`pmid:41487531`, `pmid:29543316`), so the fixture holds 32 entries. **U4 live total: 20 calls** (S4 12 · S2 8). **Running total: 182 calls, $0.**

## S5 — scoped search for U4 B6 (owner ruling R16) — 2026-09-24

Four owner queries, taken verbatim (`content/verification/u6-claims-s5.json`), two each for vitamin-d-deficiency and caffeine-focus, run with S4's filters and capture rules. `capture.mjs` `SCENARIOS` gained `"S5"`. **Dry run first** (0 calls, 8 planned). **Live: 12 calls** (Crossref 4, NCBI 8), **all 200**, no widening needed. **$0; no OpenAI, no paid API, deployed DB untouched.** Nothing was written to the corpus or the fixture. The candidate table is `docs/01-plan/features/p3-u4-profiles.s5.md`.

**Running total: 194 calls** (U6 162 · S4 12 · S2 8 · S5 12), $0.

**S2 for S5's approvals** (`2026-09-24-s2h`, owner decision 2026-09-24: V-1, V-3, C-1, C-2, C-4; approvals `content/verification/u6-approvals-s5.json`). Dry run first (0 calls, 5 planned). **Live: 5 calls** (NCBI `esummary`), **all 200**, every response body saved. **All 5 titles matched; no refusals.** 5 fixture entries written (`pmid:34473295`, `pmid:39396907`, `pmid:20464765`, `pmid:28969341`, `pmid:20521321`), so the fixture holds 37 entries. The 5 corpus rows (`p-vitamin-d-prediabetes-rct`, `p-vitamin-d-weekly-daily`, `p-caffeine-shift-work`, `p-caffeine-military`, `p-caffeine-glucose`) are manifest adds whose card fields were written only from their S5-captured abstracts (SHA-256 matched). **U4 live total: 37 calls** (S4 12 · S2 13 · S5 12). **Running total: 199 calls, $0.**

## RV — Phase 3 closeout (d): every fixture entry re-verified — 2026-09-24

**Why:** U5's refresh policy, trigger (2), says every entry is re-resolved at each phase closeout. The build
is offline, so a retraction or a title change after `verifiedOn` becomes visible only here (register §4 U5,
*Refresh policy*).

**Pre-registered (owner brief, 2026-09-24):** re-resolve all fixture entries, **≤ 45 calls, $0**, dry run
first. **Pre-approved (owner, 2026-09-24):** if the dry run's call count and hosts match, run live without
waiting. **STOP** on title drift, a retraction, a refusal, or any call outside the scenario, and change
nothing in that case. **The fixture's entries and `content/seed/` are read and compared only.**

**Instrument:** a driver kept outside the repository. Its source is verbatim in the closeout artifact,
`docs/01-plan/features/phase3-closeout.plan.md` §5. It imports `capture.mjs`'s own `createClient`, so the
host allowlist, the 400 ms spacing, the `--max-calls` cap, dry run and the call log are the same controls
S1–S5 used, and every line is stamped **`RV`**. It makes one lookup per entry: PubMed `esummary` for a PMID,
Crossref `works/{doi}` for the DOI. No contact email is sent (R3).

| Step | Calls | Hosts | Result |
|---|---|---|---|
| Dry run | **0 made, 37 planned** | `eutils.ncbi.nlm.nih.gov` 36 (`esummary`) · `api.crossref.org` 1 (`works`) | matches the scenario: 37 ≤ 45, and both hosts are in the U6 allowlist |
| Live (`captures/2026-09-24-rv`) | **37** | NCBI 36 · Crossref 1 | **all 200**, all stamped `RV`, window 04:29:32–04:29:47Z (UTC 2026-09-25, local 2026-09-24) |

**Outcome — 37 of 37 entries (36 PMID, 1 DOI):**
- **Title:** 37/37. The resolved title still equals both the fixture's `resolvedTitle` and `Paper.title`
  under `normaliseTitle`. **0 drift.**
- **Retraction:** **0**. No PubMed record carries a `pubtype` matching `/retract/i` (*Retracted
  Publication*, *Retraction of Publication*). All 36 records returned a non-empty `pubtype`, and the
  predicate was checked against both planted values (true) and *Journal Article* (false). The Crossref
  record for `10.1111/j.1479-8425.2007.00262.x` has no `update-to` or `updated-by` field and an empty
  `relation`.
- **Identity:** 37/37. Every returned `uid`/`DOI` is the one asked for.
- **Refusals: 0. Calls outside the scenario: 0.**

**Kept (committed):** `call-log.jsonl`, `results.json` (per-entry pubtypes and the response body's SHA-256),
and each response body at `<paperId>/esummary.json` or `crossref-work.json`. 39 entries, 184 KB. No abstract
is involved: `esummary` carries none.

**What this does not do:** it does not refresh `verifiedOn`. The brief made the fixture read-only for (d),
so every entry still carries its original date, and this record is the dated evidence that the entries were
re-checked. **Stated limit:** `esummary`'s `pubtype` is the mark PubMed puts on a retracted article. An
*Expression of Concern*, or a retraction PubMed has not yet indexed, would not show there.

**$0. No OpenAI, no paid API, deployed database untouched.**

**Running total: 236 calls** (U6 162 · S4 12 · S2 13 · S5 12 · RV 37), $0.
