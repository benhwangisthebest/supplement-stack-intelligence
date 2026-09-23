# p3-u5-provenance-record — PDCA cycle artifact for Phase 3 U5

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U5**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U5** (L194–195, status APPROVED).
> Where the two disagree, the register wins.
>
> **Feature**: `p3-u5-provenance-record` · **Anchor**: `600e7f5` · **Date**: 2026-09-23 ·
> **Type**: deterministic (no network, no resolver call, no OpenAI, no deployed DB, no CI change)

---

## 1. Plan

**Problem.** `Paper` has no provenance field (v13), which is safe but leaves `[P3-X2]` with nowhere to go.
Two controls stand in the way of adding one, and neither covers the fields Phase 3 wants to add. **N-80:**
G2's `FORBIDDEN_PAPER_KEYS` (`seed-integrity.test.ts:34`) lists six names and not `doi`/`pmid`, so adding
either reddened nothing. That is reproduced in §6. **N-81:** `paperSchema` (`src/lib/validation/seed.ts:58`)
is a non-strict `z.object` with no conformance assertion, so a field on `Paper` alone would be silently
stripped by `safeParse`. **Ruling in force:** D-3 = (c) with (b)'s fields. The check runs at build time,
offline, against a committed fixture whose entries carry `verifiedOn`/`verifiedBy`. No rank-1 exception.
**Hard rule:** no real DOI or PMID is written anywhere. The fixture ships as `{}`.

**Baseline, re-measured at `600e7f5`:** **20** papers in `content/seed/seed-papers.json`, with exactly
**9** keys among them (`id,title,population,intervention,dose,duration,outcomes,limitations,summary`).
`grep -rE '10\.[0-9]{4,9}/' content/seed src/data` → **0** hits. `paperSchema` has **2** references, its
definition and one `safeParse` (`seed.ts:110`).

**Stop conditions, checked before editing. None fired.** `paperSchema` validates neither a request body nor
a persisted row: its only caller is `validateSeed`. No file under `src/app/api/**`, `src/lib/db/**`,
`src/services/**` or `supabase/migrations/**` names a paper outside a test. Only a paper's **id** persists,
at `advisor_messages.citations[].refId` (`id-manifest.json:171`), and U5 changes no id. No caller needs more
than to accept two optional fields (§2). Nothing needs the fields to be required. The title rule (§3.4) is
stated without resolver data.

## 2. AC-1: callers of `Paper` and `paperSchema`

Found with `git grep -nw Paper -- src scripts content`, plus the paper accessors (`SEED_PAPERS`,
`getPaperById`, `getPapersForEffect`, `lib.papers`). graphify's query returned a 918-node neighbourhood,
too broad to use, so the grep is the enumeration.

| Layer | Site | Status | Reason |
|---|---|---|---|
| types | `src/types/paper.ts:11` | **changed** | `doi?`/`pmid?` added (`:26-27`) |
| types | `src/types/index.ts:14` (`export *`) | unaffected | barrel |
| schema | `src/lib/validation/seed.ts:58,110` | **changed** | fields (`:71-72`) + conformance (`:82`) |
| data | `src/data/seed-papers.ts:2,15` | unaffected | generated. No row carries either field (AC-7) |
| codegen | `content/modules.json:85-88` | unaffected | `typeName` only |
| engine | `src/lib/evidence/index.ts:11,19,42,108-122` | unaffected | passes whole `Paper`s through, reads `.id` |
| advisor / API | `src/lib/advisor/tools.ts:151-155,171-175` | unaffected | maps to `{id,title}`, so the new fields cannot reach `/api/advisor` |
| UI (server) | `src/app/library/[slug]/page.tsx:4,48-53` | unaffected | collects by `.id` |
| UI | `components/library/SupplementDetail.tsx:2,13,145,175-186` | unaffected | passes through, reads `.id` |
| UI | `components/evidence/EvidenceBreakdown.tsx:2,31,34,58-66` | unaffected | reads `.id`, `.title` |
| UI | `components/evidence/PaperSummaryCard.tsx:1,12` | unaffected | reads named fields. It renders neither new field (§7) |
| API routes | none | — | no route imports `Paper` or reads a paper field |
| persistence | none. Only the id, at `advisor_messages.citations[].refId` | unaffected | no migration |
| tests | `seed-integrity.test.ts:4`, `id-stability.test.ts:30,89`, `validation/seed.test.ts:3,33`, `evidence.test.ts:10,50` | unaffected | the fields are optional, so existing literals still type-check |

## 3. Design

**3.1 Type and schema (AC-2).** `Paper` gains `doi?: string; pmid?: string`. They are **optional** on
purpose: a required identifier with no real source is the v13 path. `paperSchema` gains
`z.string().min(1).optional()` for both. It checks presence, not format, because format lives in the guard
so its message is distinct. The conformance assertion is `_PaperSchemaConformsToPaper =
Expect<Equal<z.infer<typeof paperSchema>, Paper>>` (`seed.ts:82`). It uses the same invariant `Equal<>` as
`schemas.ts:170`, so drift in either direction, including optionality, is TS2344.

**3.2 Location.** The rules are in `content/verification/provenance.mjs`, plain JS with no dependencies. The
guard imports it, and so will U6's capture script, which gives one definition of every rule. The precedent
for a test importing `content/*.mjs` is `canonical-layout.test.ts:38`. The fixture is
`content/verification/provenance-fixture.json`, which ships `{}`. The guard is
`src/data/provenance-record.test.ts`, beside G1–G4. It is outside `src/architecture/`, so `SPEC_COUNT` does
not move.

**3.3 Fixture schema (AC-3).** An object keyed by `fixtureKey(kind, id)` = `` `${kind}:${normalised id}` ``.
An entry is **exactly** `{ id, kind, resolvedTitle, source, verifiedOn, verifiedBy }`. An unknown key fails,
so an entry cannot smuggle `authors` or `year`. `kind` is `doi|pmid`. `id` is well-formed, normalised, and
its key equals `fixtureKey`. `resolvedTitle` is non-empty after normalisation. `source` is in
`SOURCES[kind]` (doi: `crossref|doi.org`, pmid: `pubmed-eutils`). `verifiedOn` is `YYYY-MM-DD`, a real
calendar date (so `2026-02-30` fails), and not after today (UTC). `verifiedBy` is in `VERIFIERS` = `["owner"]`.
That is a role, not a person, and widening it is a reviewed diff.

**3.4 Rules the guard applies.**
- **Format.** A DOI must be bare (no `doi:` or `https://doi.org/`) and match Crossref's published modern
  pattern `^10\.\d{4,9}/[-._;()/:A-Za-z0-9]+$`. A real DOI outside that pattern is a false "malformed", and
  the fix is to widen the pattern in a reviewed change. A PMID must match `^[1-9]\d{0,7}$`: positive, no
  leading zeros, at most 8 digits.
- **Normalisation.** DOIs compare lowercased, because they are case-insensitive. A PMID is already canonical.
- **Title equality.** Strip `<…>` tags, apply NFKC, lowercase, and collapse every run of non-letter,
  non-digit characters to one space. So case, punctuation, whitespace and inline markup may differ, and
  words and numbers may not. This is a rule over two strings the repository already holds. It needs no
  resolver data.

**3.5 Distinct failures.** `checkPapers` puts each defect in exactly one bucket, and each bucket has its own
test and message:

| Test | Fails when | Message |
|---|---|---|
| P0 | the corpus or fixture fails to load (anti-vacuity) | — |
| P1 | the fixture is malformed | `fixture["…"]: <field rule>` |
| P2 doi / P2 pmid | an identifier is present but malformed. It is never looked up | `…: malformed DOI` / `PMID` |
| P3 doi / P3 pmid | an identifier is well-formed but has no entry | `…: no fixture entry for doi:…` |
| P4 | an entry's `resolvedTitle` ≠ `Paper.title` (after §3.4) | `…: resolved title does not match paper title` |
| P5 | a fixture key no paper cites | the key |

**3.6 G2 (N-80).** `FORBIDDEN_PAPER_KEYS` stays. Two tests are added. The first **derives** the permitted
keys from `paperSchema.shape`, which tsc holds equal to `Paper`, so any key outside it fails whatever its
name (`seed-integrity.test.ts:84`). The second asserts that the schema admits none of the six v13 fields
(`:96`). G2 therefore permits `doi`/`pmid` structurally, and the provenance guard decides whether a value
is verified.

## 4. AC-6: refresh policy

The policy is written into the register's U5 entry at closeout (§8), which is where AC-6 requires it.
**Who:** the owner runs U6's capture script. **Triggers:** any new or changed identifier, which the guard
enforces (P3, P4); a re-verification of every entry at each phase closeout; and P5 as a staleness check.
**Stated limit:** a retraction or DOI re-registration after `verifiedOn` is caught only at re-verification.

## 5. Do: landing (a)

Files: `src/types/paper.ts`, `src/lib/validation/seed.ts`, `src/data/seed-integrity.test.ts`,
`src/data/provenance-record.test.ts` (new), `content/verification/provenance.mjs` (new),
`content/verification/provenance-fixture.json` (new, `{}`), and this artifact. Nothing under `content/seed/`
or `src/data/seed-*.ts` changes.

## 6. Check: red proofs and gate

Every plant was reverted from **file-copy backups**, never `git checkout` (`CLAUDE.md` §5.11). After each
restore, `shasum` matched the backup for both the seed JSON and the fixture. Each plant was on
`p-creatine-strength`, whose title is `Effects of creatine supplementation on strength and lean mass`. All
planted identifiers are visibly fake: `10.0000/…`, `99999999`, `00000001`.

| AC | Plant | Result (`npx vitest run src/data/provenance-record.test.ts`) |
|---|---|---|
| AC-2 | `plantedU5?: string` on `Paper` only | `npx tsc --noEmit` exit 2: `seed.ts(82,50): error TS2344` |
| AC-2 | `doi` made required on `Paper` | the same TS2344 (optionality drift) |
| AC-2 | `plantedU5` on `paperSchema` only | `seed.ts(83,50): error TS2344` (reverse direction). All restored, tsc exit 0 |
| AC-4 DOI unverified | `doi: "10.0000/p3-u5-planted"` | **P3 doi** red alone: `p-creatine-strength.doi "10.0000/p3-u5-planted": no fixture entry for doi:10.0000/p3-u5-planted`. 1 failed / 7 passed |
| AC-4 DOI malformed | `doi: "p3-u5-planted-not-a-doi"` | **P2 doi** red alone: `…: malformed DOI`. 1 / 7 |
| AC-4 PMID unverified | `pmid: "99999999"` | **P3 pmid** red alone: `…: no fixture entry for pmid:99999999`. 1 / 7 |
| AC-4 PMID malformed | `pmid: "00000001"` | **P2 pmid** red alone: `…: malformed PMID`. 1 / 7 |
| AC-5 | the DOI plant + an entry with `resolvedTitle` "P3 U5 planted title that is not the paper title" | **P4** red alone: `…: resolved title does not match paper title`. 1 / 7 |
| AC-5 control | `10.0000/P3-U5-PLANTED` + an entry titled `EFFECTS of <i>creatine</i> supplementation on strength, and lean-mass.` | **8 / 8 green**. Case, markup and punctuation are normalised, and so is DOI case |
| AC-3 | a cited entry with `source` "google-scholar", `verifiedOn` 2099-01-01, `verifiedBy` "someone", and an extra `authors` key | **P1** red alone, with 4 messages: `unknown key authors` · `source must be one of crossref\|doi.org` · `verifiedOn 2099-01-01 is in the future` · `verifiedBy must be one of owner` |
| AC-3 | a non-normalised key/id, `verifiedOn` 2026-02-30, no `verifiedBy` | **P1**: `missing verifiedBy` · `id is not normalised` · `verifiedOn must be an ISO date YYYY-MM-DD` · `verifiedBy must be one of owner`. P3 and P5 are also red, because the upper-case key is not the key the paper resolves to |
| P5 | an entry that no paper cites | **P5** red alone: `doi:10.0000/p3-u5-planted` |
| N-80, new G2 | `url` key on a paper | **G2** red: `p-creatine-strength.url`. 1 failed / 14 passed |
| N-80, reproduced | the **anchor's** G2 + a DOI plant, regenerated | **13 / 13 green**. This is the gap U5 closes. Restored, and `content:generate` re-run |

**The stated limit (P1, P4, P5).** With `{}` shipped, these tests check nothing until U6 adds entries. Their
redness is proved above, and they cannot be kept red without committing a planted identifier.

**AC-7.** `npm run content:generate -- --check` → `checked 9 modules, 0 stale`.
`git diff --stat 600e7f5 -- content/seed/` → empty. `grep -rE '10\.[0-9]{4,9}/' content/seed src/data` →
empty. The fixture is `{}`.

**AC-8.** `git ls-files 'src/architecture/*.test.ts' | wc -l` → **28**, which is the pin at
`spec-count.test.ts:97` `toBe(28)`, so it is unchanged. No non-test source file was added under `src/`, so
`LAYER_FLOORS` is unchanged. `npx vitest run src/architecture` → 28 files, **414/414**.

**Gate (§5.10), on the landing tree with the new files staged:**

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0: *380 of 380 tracked source files, 0 errors* (U3: 378, +2 new files) |
| `npx vitest run` | exit 0: **1485 / 1485 across 117 files** (U3: 1475 / 116. +8 P-tests, +2 G2 = **+10**) |
| `npx next build` | exit 0 |
| `npm run verify:rendering` | OK, no prerendered page HTML |
| Null bytes in edited files | 0 in all six |

## 7. Findings and handoff

Re-derived: `git grep -ohE 'FU-[0-9]+' -- docs CLAUDE.md | sed 's/FU-//' | sort -n -u | tail -1` → **55**,
and the N-series max is **83**.

- **FU-56** *(new, low)*: the generated `seed-papers` preamble (`content/modules.json:96-97`, emitted to
  `src/data/seed-papers.ts:10-11`) still says *"the Paper type no longer has fields to put it in"*. Since U5,
  that is half-true. It is outside this brief's May-touch list, because editing it changes `src/data/`.
  **Owner: U6**, the first unit that edits the paper corpus.
- **U6 consequence, stated rather than discovered:** the seed titles are illustrative, so P4 means U6
  cannot attach an identifier without **retitling the paper to its resolved title**. That is a content-value
  change, and it is visible on the Library.
- **Not in scope, noted:** `PaperSummaryCard` renders neither field. *Carrying* a verified identifier
  (`[P3-X2]`) does not *display* it, and a display decision belongs to U6 or U4.
- **`[P3-X2]` stays unticked.** U5 delivers the mechanism, and U6 delivers the 100%.

## 8. Report

*Written at closeout.*
