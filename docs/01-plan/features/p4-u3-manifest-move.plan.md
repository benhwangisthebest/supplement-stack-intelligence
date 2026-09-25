# p4-u3-manifest-move — PDCA cycle artifact for Phase 4 U3

> **SUBORDINATE.** This mirrors the register row, `docs/01-plan/phase-4-product-completion.plan.md` §4 **U3**, and
> never replaces it. Where the two disagree, the register wins.
>
> **Unit** U3 · Id manifest out of `src/` · **SUPERVISED** · deterministic · size M · **Anchor** `d77b36a` · **Date** 2026-09-25
> **Authority:** the owner's standing approval for U3 (2026-09-25): branch, commit, push, fast-forward `main`, delete the
> branch, on a green G over the staged tree and green branch CI. **Outside it, shown verbatim and staged only on written
> approval of that exact text:** the manifest rename, the R-2 dated notes, and the N-47 change.
> **Rulings:** D-13 (a), D-11 (a), `CLAUDE.md` §2 rule 16, `[P4-X8]`, and the owner's R-1…R-4 (recorded verbatim in the
> plan §6, *Owner rulings — recorded at U3*).

## 1. Plan

**Goal (the brief's):** move the id ledger to `content/` as a pure rename, point id-stability at it, prove the
append-only policy still bites at the new path, and prove an id-adding correction touches no non-GENERATED `src/` file.
**Carried items:** the `[P3-X5]` caveat (closes via `[P4-X8]`, id-adding case only); N-47 (proposal only).

**Premises, re-measured at `d77b36a`:**

| | Claim | Measured |
|---|---|---|
| P-a | only `id-stability.test.ts` reads the manifest | `git grep -n id-manifest -- ':!docs/' ':!graphify-out'` → `src/data/id-stability.test.ts` only: comments `:5`, `:14`; path `:68`; messages `:210`, `:230`, `:241`, `:248`. `graphify query "who reads id-manifest.json"` found no reader (it matched unrelated `manifest` nodes) |
| P-b | 9 GENERATED `seed-*.ts` | **9.** `ls src/data/seed-*.ts` lists 10; the 10th is `seed-integrity.test.ts`, a hand-written test (line 1 `import …`). Over **all** tracked `src/` files, the GENERATED line-1 set is exactly the 9 `src/data/seed-*.ts` modules |
| — | the generator references the manifest | **No.** `grep manifest content/generate.mjs content/emit.mjs` is empty, so no generator or seed file is touched |
| — | a `CLAUDE.md` line names the path | **No.** `grep -n id-manifest CLAUDE.md .claude/CLAUDE.md` is empty |
| — | highest issued ids | **N-90, FU-73** (`git grep -ohE 'N-[0-9]+' -- docs`). This unit issues **N-91** |

## 2. Design

Three changes. **(1)** `git mv` the ledger. Its bytes must not change, because it is the rank-1 baseline id-stability
trusts. **(2)** `id-stability.test.ts` reads `content/id-manifest.json` through `path.resolve(__dirname,
"../../content/…")`, and its four message strings and two header comments name the new path. **(3)** `ID_CORRECTION_DIFF`,
a new `describe` inside `canonical-layout.test.ts` beside CONTENT_FIDELITY (R-1, so `SPEC_COUNT` stays 30). It derives
the GENERATED set from line 1 of every tracked `src/` file and asserts that set **equals** the set CONTENT_FIDELITY
renders, so the header cannot be borrowed. That equality is what makes "GENERATED" mean "proven generator output".
Over it, a name-only diff may touch `content/**` plus that set, and nothing else under `src/`. The green case drives
the real emitter in memory: one paper appended to the authored JSON and the ledger, then every file whose bytes would
change. Two planted lists are the red cases.

## 3. Do — acceptance criteria, with outputs

| AC | Command | Result |
|---|---|---|
| AC-1 | `git mv src/data/id-manifest.json content/id-manifest.json`; `git diff --cached -M --stat`; `git show HEAD:src/data/id-manifest.json \| cmp - content/id-manifest.json` | `rename {src/data => content}/id-manifest.json (100%)`, 0 insertions and 0 deletions. `cmp` silent. sha256 `c8f4d76a…f1887` on both. **Held for approval, unstaged** |
| AC-2 | `npx vitest run src/data/id-stability.test.ts` | **Red first, by accident:** with the old file gone and the path not yet changed, the file fails to load. **Green:** 47/47 |
| AC-2 red A | drop `magnesium` from `namespaces.supplements.ids` | `supplements: 1 unregistered id(s): magnesium. Append each to namespaces.supplements.ids in content/id-manifest.json. If one replaces a removed id, tombstone the old id with "supersededBy" instead.` 1 failed / 46 |
| AC-2 red B | ledger registers `u3-planted-removed` under `papers`, which live data lacks (a live removal, as the guard sees it) | `papers: 1 registered id(s) vanished from live data: u3-planted-removed. This orphans existing user rows at advisor_messages.citations[].refId where kind='paper' …; and breaks the public surface /library/{slug}#paper-{id} … If intentional, move each id into "tombstones" in content/id-manifest.json with a migration note …` 1 failed / 46 |
| | restore | `cp` from a scratch backup; `cmp` equal to the backup and to `HEAD:src/data/id-manifest.json`; 47/47 |
| AC-3 green | `npx vitest run src/architecture/canonical-layout.test.ts` | 28/28 (23 before, plus 5 in `ID_CORRECTION_DIFF`) |
| AC-3 M1 | predicate weakened to admit every `src/` path | both planted cases red: `expected [] to deeply equal [ …(2) ]`, and `… [ 'src/lib/evidence/index.ts' ]`. 2 failed / 26 |
| AC-3 M2 | the in-memory correction's diff also lists `src/data/id-stability.test.ts` | `expected [ …(2) ] to deeply equal [ 'src/data/seed-papers.ts' ]`. 1 failed / 27 |
| AC-3 M3 | `seed-integrity.test.ts` (hand-written) given the GENERATED header | `expected [ …(10) ] to have a length of 9 but got 10`. 1 failed / 27 |
| AC-3 M4 | a copy of the ledger put back at `src/data/id-manifest.json` | `the id ledger lives under content/, not src/`: `expected true to be false`. 1 failed / 27 |
| AC-3 dry run | throwaway worktree at HEAD with U3's changes in **its own index** (no commit). One paper id added to the authored JSON and the ledger, then `npm run content:generate` (`wrote 9 modules, 1 changed`), then `git diff --name-only` | `content/id-manifest.json`, `content/seed/seed-papers.json`, `src/data/seed-papers.ts`. Predicate: 9 GENERATED, hand-edited `[]`. On the corrected tree, id-stability and canonical-layout pass 75/75 and `content:generate --check` finds 0 stale. Worktree removed; the main tree's `git status` shows only U3's files, and no `content/seed/*.json` differs from HEAD |
| AC-5 | `npx vitest run src/architecture`; `npm run content:generate -- --check` | **30 files, 470 tests**, all green; CONTENT_FIDELITY green; `checked 9 modules, 0 stale` |
| AC-6 | independent review | §6 |
| AC-7 | G on the staged tree in a clean worktree | §6 |

Every mutation was restored from a file-copy backup and `cmp`-checked, never by `git checkout` (§5 rule 11).

## 4. Registered

**N-91.** N-47's row (`phase-2-operational-dependability.plan.md:606`) says `dereferenced` is false in *"4 of 9"*
namespaces. Measured at every commit of the file: 1 of 8 (`77b3c36`), 2 of 9 (`ea5b270`, the state on 2026-08-21), and
2 of 10 (`08253e5`, `d77b36a`). It was never 4. Corrected in the Phase 4 register rather than at `:606`, a closed
phase's record.

## 5. N-47 — the proposal (R-3). The unit does not decide; STOP

**What the fields were meant to mean, from the ledger's prose and `git log -p --follow` of the file:**

- **`dereferenced`** was introduced with the ledger (`77b3c36`), paired with prose that says what reads the id back.
  `effects`: *"citationHref() resolves effect refIds to /library/{slug}#effect-{id}; a rename silently degrades a stored
  citation to an inert tag."* `interactionRules`, the one `false`: *"Archival only — citationHref() returns null for this
  kind, so a rename does not break a link. It does make a stored citation unresolvable, which is why the namespace is
  registered."* `ea5b270` added the second `false`, `biomarkerRelevanceRules`: *"citationHref() returns null for this
  kind, so a rename breaks no link, but refId IS the stability key for citation de-duplication … so a rename silently
  splits or merges the identity of already-stored citations."* **Meaning:** `true` means live code resolves the stored id
  into a link or record; `false` means the stored id is archival. **Both `false` namespaces state in their own prose
  that a rename still damages stored data.** The ledger's `purpose` applies the tombstone rule to every entry:
  *"Renaming or deleting an entry here silently orphans user data, so removal requires a tombstone with a migration note."*
- **`version`** was `1` at `77b3c36`; `08253e5` (U20) changed `-  "version": 1,` → `+  "version": 2,` when every namespace
  gained `publicSurfaces`. U20's commit body argues against pinning it: *"asserting `version === 2` tests that a constant
  equals itself. What needed enforcing is that every namespace DECLARES `publicSurfaces`."* The test says the bump was
  *"for the human reader"* (`id-stability.test.ts:168-169` after U3; `:165-166` at `d77b36a`). **Meaning:** a human-facing schema number.

**Option (a) — assert both, no policy effect.** Two `it(`s added to `U8 — reference-data ID manifest integrity`:
`version` pinned to `2`, and every namespace's `dereferenced` present and boolean. Draft tried from a backup and
reverted: 49/49 green; red on `version: 3`, on `dereferenced` deleted from `interactionRules`, and on the string
`"false"` in `biomarkerRelevanceRules`. Honest limit: the pin is U20's *"constant equals itself"*; it makes a version
bump a two-file edit, and it does not detect a shape change made without one. The presence check has real force.

**Option (b) — `dereferenced: false` relaxes the tombstone rule for that namespace.** It would apply to exactly
**`interactionRules`** and **`biomarkerRelevanceRules`**. A removal or rename there would pass id-stability with no
tombstone. **Evidence against it, from the ledger itself:** both namespaces' prose names the damage a rename does to
stored citations (unresolvable; split or merged identity), and `purpose` makes the tombstone rule universal. Under (b)
the guard would permit exactly the damage the ledger records. That is a change to rank-1 rule 16's enforcement.

**Not in N-47's scope, named:** `dereferencedBy`, `note`, `source`, `purpose` and `policy` are prose fields that nothing
asserts either. They are documentation, and neither option changes that.

**Outcome (owner, 2026-09-25): option (a), the patch exactly as shown.** It was applied from the shown patch file, and
the applied lines were compared with the patch (`diff` empty). id-stability then passed 49/49. Option (b) was not taken,
so the tombstone rule still binds every namespace. **N-47 is closed.**

## 6. Check

**AC-6 — independent review** (fresh `ecc:code-reviewer`, read-only; inputs: the U3 row, the diff, the plan, this file,
the N-47 draft). **Verdict: PASS.** It re-ran the id-stability and canonical-layout specs (75/75), `src/architecture`
(30 files, 470 tests), the full suite (1715/1715), tsc and lint. It re-derived P-b and N-91's per-commit counts, and
checked the rename with `cmp` and the R-2 insertions with `grep -n`. It found `ID_CORRECTION_DIFF` non-vacuous: the
GENERATED set is derived rather than listed, and its equality with CONTENT_FIDELITY's rendered set closes a borrowed
header. It noted the guard's honest scope: it binds the generator's own I/O, not every future PR diff. It found the
N-47 derivation faithful and neutral. **One MINOR, fixed:** §5 cited `:165-166` for the *"human reader"* comment, which
is `:168-169` after U3's edit. There were no BLOCKING or MAJOR findings.

**Pre-approval G** (clean worktree at `d77b36a` + the full candidate: the rename, both specs, the plan, this file and
the R-2 notes; N-47 not applied): tsc clean · lint **416/416**, 0 errors · vitest **1715/1715** (144 files; +5 =
`ID_CORRECTION_DIFF`) · `test:coverage` green, no floor edited · `next build` · `verify:bundle` OK · `verify:rendering`
OK · E2E **70 passed / 30 `[LIVE]` skipped** · `content:generate --check` 0 stale.

**AC-7** runs on the final staged tree after the owner's approval, so it is not recorded here. Writing it here would
change the tree it measured. It goes in the commit body, and the CI run id goes in the unit report.

## 7. Report

**Owner approval, 2026-09-25:** the rename, the five R-2 notes with their id-adding-only wording, N-47 option (a) and
the `[P4-X8]` tick were each approved as shown. **The `[P3-X5]` caveat remains for id removals and renames and is not
closed.** This is recorded in the plan (§3, §5). **Closed:** N-47, and `[P4-X8]` for id-adding corrections.
**Registered:** N-91. **Amended in:** U20 (owns N-90's code part). **Not touched:** `CLAUDE.md`, `content/seed/*.json`,
`src/types/**`, `src/lib/**`, the generator, every allowlist. No id was added, removed or renamed. Nothing live, no spend.
