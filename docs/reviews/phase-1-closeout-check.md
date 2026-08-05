# Phase 1 — independent closeout Check

> **Date run:** 2026-08-06 · **Certifier:** independent read-only reviewer · **Clerk:** the closing agent,
> who transcribed this record and did not author its findings or its verdict.
>
> **Tree certified:** branch `docs/phase-1-close`, HEAD `2443305` **plus the uncommitted working tree**
> (9 modified files + 1 new report). **The certified tree ships in the commit that contains this
> document** — this file was written after certification and is the only content added since.
>
> Same shape as `docs/reviews/phase-0-closeout-check.md`: numbered findings, criteria verified row by row,
> a single verdict. Phase 0's rules governed the certifier — **published docs are claims, not evidence**;
> re-derive by command; a prior review having passed is not evidence.

---

## 1. Scope

The certifier re-derived every present-tense claim by command rather than reading it: it ran
`npx tsc --noEmit`, `npx vitest run`, `npx vitest run --coverage`, `npx next build` and the full non-live
Playwright suite on the certified tree; re-counted route files, route tests, 401/400/200 assertions,
`[LIVE]` tags and gated blocks, guard test counts, `src/lib` directory counts, threshold counts,
`handle()` call sites, coverage percentages (recomputing the `src/app/api` aggregate from
`coverage/coverage-final.json`), Grade-A effect counts and `EvaluateStackInput` field counts; verified the
cited CI run through `gh`; grepped the whole corpus for credential values and for the superseded
`61/71`/`79/10` figures; and **re-executed five self-chosen guard mutations** in a disposable worktree
synced byte-for-byte to the certified tree.

**Not checked:** the live E2E suite (no credentials — that is the PARTIAL under review), `docs/archive/**`
beyond a secret scan, Phase 0's own closure, and the GitHub branch-protection ruleset beyond the `gh run`
lookup. The certifier deliberately did **not** replay the mutation strings the Phase 1 report already
records, choosing shapes the existing evidence does not cover, so its replays test the guards rather than
re-run someone else's proof.

**No tracked file was modified** during certification; only gitignored `coverage/`, `.next/` and
`test-results/` were written.

---

## 2. Findings

**Nine findings. Zero Critical. Zero Major.** Eight are documentation hygiene; the ninth is
informational. None invalidates an exit criterion, none is a claim of enforcement that nothing enforces,
none is a guard passing having checked nothing, and none is a safety, security or evidence-integrity
violation under `CLAUDE.md` §2.

| # | Severity | Finding | Disposition |
|---|---|---|---|
| **P1-1** | Minor | An orphaned sentence fragment (`2 → closed/record-only · 1 → excluded.`) left at plan §5 by the closeout recount, which replaced only the first of the tally's two physical lines. | **FIXED in this commit** — line deleted. The recount itself verified correct: 19 rows, five disjoint buckets summing to 19. |
| **P1-2** | Minor | `docs/project-status.md`'s own provenance header still said "Refreshed 2026-08-02 … and again 2026-08-03" and listed a section set that omitted §2.4, §2.5 and §6 — all of which the Phase 1 sync edited. The one document whose metadata contradicted its body. | **FIXED in this commit** — header re-dated to 2026-08-06, section list extended, current supersession marker named. |
| **P1-3** | Minor | `docs/project-status.md` still hedged "all **22–23** routes call `getUser()`" three lines below a sentence corrected to 23, contradicted by every other governing document. | **FIXED in this commit** — now 23, with the enforcing guard named. |
| **P1-4** | Minor | U8's **nullability** half is asserted by criterion 3 ("built, not cut") and Gate B1 ("plus nullability both ways") but its red text was recorded nowhere — a summary phrase, which is the shape criterion 8 exists to forbid. | **FIXED in this commit** — both directions re-executed by the clerk and pasted verbatim into report §3.2. |
| **P1-5** | Minor | The U1–U3 red in report §3.1 is an **excerpt** (one route file) presented in a section that claims each string was pasted from the run. | **FIXED in this commit** — labelled as scoped to `src/app/api/stacks/route.ts`. |
| **P1-6** | Nit | Report §8's follow-up provenance ranges were loose (FU-9/FU-10 are U4's, FU-11 is U19's, FU-12/FU-13 are §10.1's) and **FU-16 was listed twice**. Plan §12 was correct throughout. | **FIXED in this commit.** |
| **P1-7** | Nit | FU-27/FU-28 were inserted between FU-22 and FU-23, and FU-8 sat after FU-26. All 28 rows present exactly once. | **FIXED in this commit** — register sorted to FU-1…FU-28. |
| **P1-8** | Nit | `docs/roadmap.md:35` ("one exit criterion below remains unmet") became ambiguous once Phase 1 also closed with exactly one non-met criterion. | **FIXED in this commit** — phase named explicitly. |
| **P1-9** | Informational | **The certified tree is not the tree CI ran.** Criterion 11 cites run `31033669440`, whose head SHA is `2443305` — which does not contain the closing changes. | **Standing condition, honoured.** The certifier mitigated it locally (all four gates green on the certified tree; 148/148 architecture tests on a byte-identical worktree copy — which matters because `doc-truth.test.ts` reads `CLAUDE.md` from the *working tree*, and `CLAUDE.md` is modified). **The closing commit must have its own green CI run**, and does. |

**Secret scan.** A full-corpus grep for JWT prefixes, `sk-ant-`, service-role/anon-key assignments and
Supabase host strings returned **no credential value in any document**. The single Supabase hostname in
the repository sits in `docs/archive/2026-07/**`, pre-dates Phase 1, is a project reference rather than a
secret, and is recorded there as NXDOMAIN. Not a finding.

---

## 3. Exit criteria, verified row by row

Every verdict below is the certifier's own, derived by command on the certified tree.

| # | Criterion | Verdict | Measured independently |
|---|---|---|---|
| 1 | Route files: 401 + happy path + 400 where validating; exemptions enumerated | **MET** | 23 route files · 23 route test files · **23/23** assert `toBe(401)` · **23/23** assert `toBe(200)`/`toBe(201)` · **14** files contain `.parse(` · **14** assert `toBe(400)`. The two sets were `diff`ed and are **identical**, so the 14 validating files are exactly the 14 asserting 400 — leaving exactly the 9 enumerated in §10.1. |
| 2 | `mappers.ts` ≥90 % · `execute.ts` ≥80 % · `schemas.ts` ≥80 % statements | **MET** | 100 / 100 / 100 statements. `execute.ts` branches 87.87 %, which the criterion does not ask about and the plan correctly does not claim. |
| 3 | Schema↔type drift check, red on a renamed column | **MET** | 23 tests green; rename evidence at Gate B1; the certifier additionally re-executed the **nullability** half in both directions — both red (§4, mutation D). Sub-claim proven; only its recording was missing (**P1-4**). |
| 4 | Reachability covers 7/7 `evaluateStack` context fields | **MET** | `EvaluateStackInput` declares **8** fields, **6** optional; the production call site passes **7**, **5** of them optional. The design doc's corrected 8/6/7/5 wording reproduces exactly. |
| 5 | AUTH_COVERAGE + RLS_COVERAGE red against a staged non-compliant file | **MET** | 13 and 14 tests green. The certifier re-proved the §4.2 property on a **different** RLS shape — enabled-but-no-policy — false green unstaged, red staged (§4, mutation A). Stronger than what was recorded. |
| 6 | Coverage thresholds on every pure engine dir + CI step; no `branches` within 10 pp (D-2) | **MET** | 20 `src/lib` dirs · 14 thresholded · 6 excluded and all six named · `protocol-builder` carries no `branches` key · distinct `Coverage thresholds` CI step · coverage run exits 0. **And the gate was proven to fire** (§4, mutation C) — the first such demonstration in this repository. |
| 7 | `[LIVE]` on every `E2E_LIVE`-gated block | **MET** | 17 tagged files · 17 gated files · **18** tagged blocks · 23 spec files · guard 11 tests green. The 17-vs-18 discrepancy is recorded as a finding rather than reconciled by under-tagging. |
| 8 | Every guard's red output recorded in `docs/` | **MET, with two gaps** | Self-certifying by construction, so the certifier treated its own replays as the external check: all five independent mutations went red with messages of the same shape and specificity `docs/` records for their neighbours. Gaps **P1-4** and **P1-5** — both recording defects, not enforcement defects; both fixed in this commit. |
| 9 | Dated live-E2E baseline; superseded figures struck through | **PARTIAL — concur** | The non-live half **reproduces exactly**: an independent cold run gave **59 passed · 30 skipped · 0 failed**, and all 23 per-spec rows match the real per-file test counts. The live half is genuinely blocked — all env names unset, no live figure anywhere. Both superseded figures struck at `roadmap.md:185–186`; the only two surviving occurrences are the two the baseline document names, and no third exists. |
| 10 | `DOMAIN_IS_PURE` enforced, named exemptions with written reasons | **MET** | 36 tests green; 8 named rules matching what `project-status.md` now claims; 4 `IMPURE_BY_DESIGN` entries with substantive reasons; 3 ratchet entries each asserted to still violate. §4's table proven **total** by deleting a row (§4, mutation B). |
| 11 | `tsc` clean · `vitest` green · `next build` succeeds · CI green | **MET** | `tsc` exit 0 · **73 files / 859 tests** · coverage exit 0 · `✓ Compiled successfully`, 32/32 static pages, exit 0 · run `31033669440` success. See **P1-9**. |

**Independent tally: 10 MET, 1 PARTIAL** — confirming the plan's and the report's own tally.

### Negative control — is the closing commit really documentation-only?

`git diff` over `src/` and `vitest.config.ts`, filtered for `expect|toBe|lines:|branches:|functions:|statements:|thresholds`, returns **nothing**; filtered to non-comment, non-`it(`-title lines, also **nothing**. Concretely: `vitest.config.ts` changes one word inside a comment (`five` → `six`) and no threshold number; `route.test.ts` changes one `it(...)` title and its comment, and no assertion. **No production code, no assertion, and no threshold changed.** Corroborated by the unchanged test count (859) and the still-zero coverage exit.

---

## 4. The certifier's own mutation replays

Worktree synced byte-for-byte to the certified tree (working-tree diff applied, untracked report copied
in; equality verified). **Control: 7 files / 148 tests passed.** Reverted and re-verified after each.

**A · `RLS_COVERAGE` — a table *with* RLS but *no policy*.** The recorded evidence covers a table with no
RLS; the second conjunct of "RLS **+ a policy**" was untested.
```
RLS_COVERAGE: RLS enabled but no policy — denies all access, a silent outage,
not a safe default. Postgres rejects every read and write on these tables until
a policy exists:
  orphan_notes
```
Both ways per §4.2: unstaged → 14 passed (false green); `git add -N` → the above, **two** assertions firing.

**B · `DOC_TRUTH` — delete a row from `CLAUDE.md` §4's table.** Nobody had tested *totality*.
```
DOC_TRUTH: §4's table must account for every architecture rule exactly once.
A rule missing from the table has no stated enforcement status at all, and a
rule listed twice can carry two contradictory ones.
  expected [ 1, 2, 3, 4, 5, 7, 8, 9 ] to deeply equal [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
```

**C · The coverage floors — do they ever fire?** The most important of the five: both recorded mutations
(FU-21, FU-22) **survived**, so nothing demonstrated the gate had ever gone red. Deleting
`src/lib/lab-trends/lab-trends.test.ts`:
```
npx vitest run            → Tests 849 passed (849)            # GREEN
npx vitest run --coverage → ERROR: Coverage for branches (65%) does not meet
                            "src/lib/lab-trends/**" threshold (71%)   exit 1
```
`npm test` green while the coverage step goes red — `ci.yml`'s two-failure-modes argument, demonstrated.
And the **`lines`** floor would have survived (95.34 → 93.02, floor 85); the **`branches`** floor caught
it. The floors doing real work are the branch floors — the ones D-2 constrains most.

**D · `SCHEMA_DRIFT` — the nullability half, both directions** (the strings **P1-4** asks for; re-run by
the clerk and reproduced identically):
```
D1 DDL loosens  → CheckinRow.taken: type says non-null, checkins.taken is nullable
                  — an unhandled null reaches the domain
D2 type loosens → CheckinRow.taken: type says nullable, checkins.taken is NOT NULL
                  — dead null-handling downstream
```

**E · `error-disclosure` — does FU-7's declared blind spot exist?** The same leak planted twice: in
`src/services/advisor-actions.ts` it goes **red**; byte-identical in `src/lib/advisor/actions/execute.ts`
it is **invisible to all 148 architecture tests**. FU-7 is real and correctly characterised — an honestly
declared limitation, stated in the guard's own header, not a finding against the phase.

---

## 5. Follow-up register — FU-21…FU-28 verified

All eight describe real, currently-true conditions. Register complete: **FU-1…FU-28, each present exactly
once**. Highlights of the certifier's checks:

- **FU-22** — the corrected figures are right. `src/lib/validation` measures **97.96 %** and `schemas.ts`
  **100 %** on the certified tree (the row's starting points, exact); floor **87**; **10** route files
  import the module directly. The original "~0.01 pp" was wrong by roughly three orders of magnitude, as
  the row now says.
- **FU-27** — real. `TopNav.tsx` builds `[...PILLARS, { href: "/advisor" }]` and passes it to the **same**
  `NavPills` component, so an authed reader sees four. The rule was **not** relaxed to match; the
  divergence is recorded instead. Correctly handled per §8.1.
- **FU-28** — real. `notFound("Stack")` vs `notFound("Item")` produce different `error.message` values;
  the pin asserts only status and code. Correcting a *title* rather than weakening an assertion is the
  honest move.

---

## 6. Verdict

# PHASE 1 COMPLETE WITH FOLLOW-UP

Ten of eleven criteria MET on independent re-derivation; criterion 9 PARTIAL for a reason no engineering
effort in this repository can remove — the live half needs a live Supabase project, four owner-only
credentials and a seeded user. No live figure is recorded anywhere, none is simulated, all named env vars
are genuinely unset, no credential value appears in any document, and the non-live half is **reproducible**:
re-run cold, it gave `59 passed · 30 skipped · 0 failed`, identical to the record.

The baseline is clean on all four gates and the closing tree is provably documentation-only. The guards
are not decorative: five mutations of the certifier's own choosing, on shapes the existing evidence does
not cover, all went red — including the first demonstration anywhere in this repository that the coverage
gate actually fails a build.

In the certifier's words: where the record was previously overstated, this tree **narrows the claim rather
than the evidence** — "neither is cited again" → the true narrower statement; "reported identically" →
"same status and NOT_FOUND code"; "Five directories excluded" → six; "~0.01 pp" → −7.6 pp. Every one of
those corrections is in the direction of *less* confidence, which is the direction that costs something
to make.

**Conditions, all honoured in the commit containing this document:** P1-1, P1-2, P1-3 fixed rather than
deferred — they are exactly the class of defect this closeout existed to remove, and leaving them would
have been the third document-sync pass in a row to miss something adjacent to what it edited. P1-4's two
strings pasted in, closing criterion 8's last gap. P1-5, P1-6, P1-7, P1-8 fixed. **P1-9 stands: this
certification does not cover the closing commit until that commit has its own green CI run.**

FU-16, FU-20, FU-21, FU-22, and FU-24 through FU-28 remain open and correctly registered.
