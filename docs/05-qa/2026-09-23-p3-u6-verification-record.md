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

## Running total

| Scenario | Calls | Budget |
|---|---|---|
| S1 | 96 | ≤130 |
| S2 | 24 | ≤40 |
| S3 | 24 | ≤ S1+S2 (owner capped this use at ≤40) |
| **All** | **144** | — · **$0 total** |
