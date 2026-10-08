# Phase 4 closeout — independent Check (2026-10-08)

> Closeout landing (b), task 5. The Check was a separate agent (`bkit:gap-detector`), with read-only tools (Read, Glob,
> Grep), that had not seen the work. It was given the Phase 4 plan's exit criteria and register, the closeout artifact,
> the U27 artifact and the supporting records, and asked for a gap analysis. It read the worktree `../ssi-close-b` at
> anchor `69e3e3b` plus landing (b)'s uncommitted edits. It hit its turn limit once, was asked to deliver, and then
> delivered. **Its report follows verbatim.** The runner's response is in `docs/01-plan/features/p4-closeout.plan.md` §6.

---

**Phase 4 closeout Check (independent, read-only), worktree `/Users/mac/Developer/ssi-close-b`**

**A. Exit criteria and closeout checklist**

| Item | Stated | Evidence, as I checked it | Assessment |
|---|---|---|---|
| X1 | [ ] | Ruling 3 is recorded verbatim (plan:236). Roadmap:648 is also [ ], so the pair matches. The closeout §3 table lists the four artifact gaps. I did not re-read the unit-artifact line references. | Holds |
| X2 | [x] | Plan:237, roadmap:649-650. I did not re-read the project-status classification table. | Holds, except for PC-1 |
| X3 | [x] | 31 runs plus 5 run ids (closeout:80-86). I can't verify these without `gh`. | Evidence ends at `72370ee`, see PC-4 |
| X4 | [x] | M1–M5 red outputs (closeout:50-56), ruling 4 (plan:474). I did not re-run the mutations. | Holds |
| X5 | [ ] | Stated as unmet in closeout:110 and plan:240, not rounded up. | Holds |
| X6 | [x] | Ruling 5 is recorded verbatim (plan:241). I did not verify the pin's line numbers. | Holds |
| X7, X8 | [x] | Earlier ticks, unchanged (plan:242-243). | Holds |
| Checklist (1), D-6 (c) | done | The record exists. It has 37 rows: 36 PMID and 1 DOI, all titles and identities match, 0 retractions (`2026-10-08-p4-fixture-reverification.md:50-86`). FU-96 is registered. | Holds, see PC-10 |
| Checklist (2), D-12 (a) | done | Ruling 7. The roadmap's Phase 1 exception is marked EXPIRED (roadmap:331-336). | Holds, see PC-5 |
| Checklist (3), re-seed | done | Owner statement. `seed.ts:77-122` resets the profile, labs and stacks only, which confirms N-127's premise. | Holds |

Final tally: 6 of 8 ticked. The plan's §5 and the roadmap agree on X1–X3.

**B. Claims checked against the files**
- **Carry count holds.** 230 = 165 ids in the §3 source set (N-1…N-86, FU-1…FU-72, OP-1…OP-7) + 41 register N rows (N-87…N-127) + 24 register FU rows (FU-73…FU-96).
  - Enumerating every row gives 74 open: 45 from the base set (15 N, 29 FU, OP-5) and 29 from the register (13 N, 16 FU).
  - That matches closeout:114-121. The "156 closed" figure includes the void N-99 (PC-7).
- **The `CLAUDE.md` diffs match** what the artifact presented: §2.3 rule 14 at `CLAUDE.md:108`, and the §5 baseline at :239-259.
- **Run counts are consistent:** run 1 is 92+8 = 100 and run 2 is 97+3 = 100. The failure-to-row mapping agrees across closeout:139, plan:245 and roadmap:332-333.
- **Locator line numbers verified:** `ai-advisor.spec.ts:36` and `:46`, and `advisor-experience-actions.spec.ts:28`, `:36` and `:41`.
- **Discrepancies found:** PC-3, PC-7 and PC-8.

**C. Not registered:** PC-1 (an obligation the closeout dropped), PC-5 (a sequencing decision with no queue entry), PC-6 (an unanswered queue entry that isn't carried) and PC-9 (a stale `CLAUDE.md` line).

**D. Classification:** each finding below.

VERDICT: COMPLETE WITH FOLLOW-UP — the scope delivered, the rulings and the carry list hold up, but Phase 4 should not be declared closed until landing (b) fixes PC-1 and PC-2, both of which sit inside its approved scope.

**Findings**

**PC-1 — BLOCKING.** The approved plan gives the closeout an N-35 obligation, and it was dropped.
- **Evidence:** plan:73 says *"The closeout records the file [`src/lib/supabase/client.ts`] in P/B/X terms, or deletes it on an owner batch"*. No document under `docs/` gives that file a classification. The closeout only lists "N-35 (OUT for X2)" (closeout:116).
- **Why it blocks:** X2 was ticked on the understanding that this record would be made.
- **Disposition:** add the P/B/X line to `docs/project-status.md`, which is inside (b)'s scope. Alternatively, get an owner ruling that carries it, recorded in plan §5.

**PC-2 — BLOCKING.** The closeout has no gate (G) record for landing (b).
- **Evidence:** closeout §7 (:146-161) is landing (a)'s gate. Its staged set lists (a)'s files and leaves out `CLAUDE.md`, the new `05-qa` record and the roadmap's Phase 1 box. For (b), the only recorded run is `vitest run src/architecture` (:9). `CLAUDE.md` §5 rule 10 requires the full set before work is declared done.
- **Disposition:** run the full G on (b)'s staged tree. Record it in §7 with (b)'s staged set. Update the status lines at roadmap:42 and :589 and in project-status at the declaration.

**PC-3 — NON-BLOCKING.** The closeout's "Units shipped" DONE list (closeout:107) leaves out U27, which plan:158 marks DONE on 2026-10-08.
- **Disposition:** add U27 to the list.

**PC-4 — NON-BLOCKING.** X3's "continuously" evidence stops at `72370ee`.
- **Evidence:** closeout:80-86 and plan:238. The `main` push runs for `e6a0c13` and `69e3e3b` are not recorded anywhere I could find. I did not verify those runs.
- **Disposition:** add both run ids in (b), and (b)'s own run after it lands.

**PC-5 — NON-BLOCKING, but it must be settled before Phase 5 opens.** Two earlier-phase criteria are left open with nothing that lets Phase 5 start.
- **Evidence:**
  - roadmap:678 forbids starting a later phase while an earlier phase has unmet exit criteria, unless an exception is recorded.
  - The Phase 1 live-E2E box is still [~], its exception has expired, and its tick is explicitly *"the owner's call"* (roadmap:319, :335-336).
  - [P4-X1] is unticked (roadmap:648).
  - Neither has a queue entry or a dated exception.
- **Disposition:** queue an owner decision. Either tick the Phase 1 box under ruling 7, or record dated exceptions for it and for X1 before Phase 5 opens.

**PC-6 — NON-BLOCKING.** Q-20 is unanswered and is not carried.
- **Evidence:** Q-20 (the eight SQL comment strippers, N-79's class) has no answer (queue:28). It has no FU row and is missing from the carry list, which names only Q-29…Q-31 (closeout:118).
- **Disposition:** carry it explicitly, or register it as an FU row.

**PC-7 — NON-BLOCKING.** "156 closed" counts N-99, which is VOID (plan:179).
- **Disposition:** reword to "155 closed, 1 void".

**PC-8 — NON-BLOCKING.** Wrong line reference.
- **Evidence:** the N-124 row (plan:222) and Q-29 (queue:37) cite `src/lib/advisor/prompt.ts:20` for "who must confirm it". That text is at `:19`; `:20` is the grounding rule.
- **Disposition:** correct the reference to `:19`.

**PC-9 — NON-BLOCKING.** A `CLAUDE.md` line is now stale.
- **Evidence:** the §12 document-map row for `docs/05-qa/phase-1-live-e2e-baseline.md` still says *"the live half is BLOCKED(env)"*. That stopped being true when the exception expired. §12 also has no Phase 4 report or closeout-check entry.
- **Why it isn't fixed in (b):** this falls outside (b)'s `CLAUDE.md` approval, which covers only the two diffs.
- **Disposition:** queue it for the owner.

**PC-10 — NON-BLOCKING.** FU-96's options need an attestation caveat.
- **Evidence:** the refresh policy (phase-3 plan:281, :283) has the owner run the re-verification and forbids agent-authored entries. The (b) run was made by the runner under a delegated approval (record:4-6).
- **Risk:** refreshing `verifiedOn` while `verifiedBy: owner` stays unchanged would attribute an agent-run lookup to the owner.
- **Disposition:** add to FU-96 that the owner either re-runs the check or explicitly attests the record of 2026-10-08.

**Not verified:**
- the CI run ids and their results
- the M1–M5 red outputs
- the `boundaries.test.ts` and `criteria-parity.test.ts` line numbers
- the classification table in `docs/project-status.md`
- the per-artifact line references in closeout §3
- the owner's two live runs, which I took as reported

No file was modified.
