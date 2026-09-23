# p3-u4-profiles — appendix B1: the four Grade A effects without a profile

> Appendix to `p3-u4-profiles.plan.md` §4. **For owner review before B1 is committed.** Listed by command at `fe0441d`:
> `node -e 'const E=require("./content/seed/seed-effects.json");console.log(E.filter(e=>e.grade==="A"&&!e.evidenceProfile).map(e=>e.id))'`
> → `zinc-deficiency`, `vitamin-b12-deficiency`, `caffeine-training`, `protein-powder-training`.
>
> **Drafted by Claude (R1)** only from each cited paper's captured PubMed abstract. Every abstract used was checked against the SHA-256 committed in U6's `candidates.json` (all four: match). **Conventions**, each derived from the rubric's own words (`src/types/evidence-grading.ts:9-13`, `weights.ts` rating labels): a dimension the cited abstract does not address gets `paperIds: []`, score **0** and the fixed rationale *"Not addressed by a verified paper in the corpus."* (**R5**). *Consistency* means agreement **across studies**, so a pooled result without a heterogeneity figure or a subgroup comparison does not score it. Grades come from `deriveGrade` itself, not from hand arithmetic.

## Derived grades

| Effect | Composite | Derived grade | Current grade (at `fe0441d`) |
|---|---|---|---|
| zinc-deficiency | 0.4333 | **C** | A (hand-typed) — **changes** |
| vitamin-b12-deficiency | 0.3500 | **C** | A (hand-typed) — **changes** |
| caffeine-training | 0.7667 | **A** | A (hand-typed) |
| protein-powder-training | 0.7500 | **A** | A (hand-typed) |

**Two composites sit exactly on a threshold:** `vitamin-b12-deficiency` = 0.3500 (C floor, 0.35) and `protein-powder-training` = 0.7500 (A floor, 0.75). The engine returns C and A for them (computed, not assumed). **Any one-point change to either moves the letter**, so those two rows deserve the closest look.

## Per-dimension drafts

| Effect | Dimension | Score | Rationale | paperIds | Basis (paraphrase of the abstract) |
|---|---|---|---|---|---|
| **zinc-deficiency** | humanEvidence | 2 (moderate) | Meta-analysis of human randomised trials and observational studies relating zinc intake to serum/plasma zinc. | `p-zinc-deficiency`<br>PMID 23244547 | EURRECA review pooled adult RCTs and observational studies (to Feb 2010) for an intake-status regression coefficient. |
|  | studyQuality | 1 (weak) | Pools randomised trials with observational studies; the abstract reports no quality assessment. | `p-zinc-deficiency`<br>PMID 23244547 | Design mixes RCTs and observational studies; no risk-of-bias rating appears in the abstract. |
|  | consistency | 1 (weak) | High heterogeneity across studies (I² 84.5%). | `p-zinc-deficiency`<br>PMID 23244547 | Pooled beta 0.08 with I-squared 84.5%. |
|  | effectSize | 1 (weak) | About 6% higher serum/plasma zinc for each doubling of zinc intake. | `p-zinc-deficiency`<br>PMID 23244547 | Beta 0.08 means each doubling of intake associates with ~6% higher serum or plasma zinc. |
|  | populationRelevance | 1 (weak) | Adults generally; the abstract reports no analysis of deficient individuals. | `p-zinc-deficiency`<br>PMID 23244547 | Adult population; authors say it remains debated whether the relationship can set intakes for normal status. |
| **vitamin-b12-deficiency** | humanEvidence | 2 (moderate) | Meta-analysis of 17 human studies of B12 status in adult vegans. | `p-b12-deficiency`<br>PMID 39373282 | 19 studies reviewed, 17 meta-analysed, comparing vegans with vegetarians and omnivores on B12 biomarkers. |
|  | studyQuality | 1 (weak) | Observational diet comparisons; the supplement finding comes from a non-randomised subgroup of vegans. | `p-b12-deficiency`<br>PMID 39373282 | Supplement effect is a subgroup analysis of vegan users versus non-users, not a randomised comparison. |
|  | consistency | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | Abstract reports no between-study agreement or heterogeneity for the supplement subgroup. |
|  | effectSize | 0 (none) | Not addressed by a verified paper in the corpus. | *(empty)* | Subgroup improvement described as significant on all biomarkers; no magnitude reported. |
|  | populationRelevance | 2 (moderate) | Adult vegans only. | `p-b12-deficiency`<br>PMID 39373282 | Population is adult vegans; older adults and malabsorption are not studied in the abstract. |
| **caffeine-training** | humanEvidence | 3 (strong) | 21 placebo-controlled crossover trials in runners. | `p-caffeine-training`<br>PMID 36615805 | Meta-analysis of 21 randomised crossover trials comparing caffeine with placebo, 254 participants. |
|  | studyQuality | 2 (moderate) | Randomised, blinded crossover trials rated unclear-to-low risk of bias; 254 participants in total. | `p-caffeine-training`<br>PMID 36615805 | Single- or double-blind randomised crossovers; RoB 2 rating unclear-to-low; small total sample. |
|  | consistency | 2 (moderate) | Benefit found in both recreational and trained runners, and in both test types. | `p-caffeine-training`<br>PMID 36615805 | Time to exhaustion improved in both runner subgroups; time trials also improved. |
|  | effectSize | 2 (moderate) | Medium for time to exhaustion (g 0.39); small for time trials (g −0.10). | `p-caffeine-training`<br>PMID 36615805 | Time to exhaustion g = 0.392 (medium); time-trial time g = -0.101 (small). |
|  | populationRelevance | 2 (moderate) | Recreational and trained runners, mostly men; few women studied. | `p-caffeine-training`<br>PMID 36615805 | 220 men, 19 women; authors call for more evidence in women and on the best dose. |
| **protein-powder-training** | humanEvidence | 3 (strong) | 49 randomised trials in 1863 healthy adults. | `p-protein-mps`<br>PMID 28698222 | Meta-analysis of 49 RCTs, 1863 participants, protein supplementation with resistance training. |
|  | studyQuality | 2 (moderate) | Randomised controlled trials of at least 6 weeks; the abstract reports no risk-of-bias rating. | `p-protein-mps`<br>PMID 28698222 | Eligibility limited to RCTs with resistance training of 6 weeks or more; no bias assessment reported. |
|  | consistency | 2 (moderate) | Gains significant across strength and muscle-size outcomes; smaller with age, larger in trained people. | `p-protein-mps`<br>PMID 28698222 | Strength, fat-free mass and cross-sectional area all increased; meta-regression found age and training status modify the effect. |
|  | effectSize | 1 (weak) | +2.49 kg one-repetition maximum and +0.30 kg fat-free mass. | `p-protein-mps`<br>PMID 28698222 | Pooled gains: 1-RM 2.49 kg, fat-free mass 0.30 kg; no further gain above ~1.62 g/kg/day. |
|  | populationRelevance | 3 (strong) | Healthy adults in resistance training; the fat-free-mass gain was larger in resistance-trained people. | `p-protein-mps`<br>PMID 28698222 | Healthy adults; supplementation more effective in resistance-trained individuals (0.75 kg). |

## What the two grade changes do (P-14), probed against `fe0441d`

The probe runs the real engines over the seed library at the anchor and with B1 applied: `getBestEffectForOutcome`, `generateProtocol` for a profile whose only goal is the effect's outcome, and the stack-evaluator/identity A-or-B test.

| Effect | Grade | Best effect for its outcome | Stack-evaluator *evidence-fit* info flag | Protocol tier, rank in its goal group | Identity "high grade" |
|---|---|---|---|---|---|
| zinc-deficiency | A → C | A → C | false → true | foundational → advanced, rank 3/3 → 2/3 | true → false |
| vitamin-b12-deficiency | A → C | A → C | false → true | foundational → advanced, rank 2/3 → 3/3 | true → false |

**Fixtures:** with B1 applied, `npx vitest run` is **1500/1500 across 119 files** with **no fixture edited**. No engine test names either effect: `git grep -n "zinc-deficiency\|vitamin-b12-deficiency" -- 'src/**/*.test.ts*'` hits only G4's allowlist. `protocol-builder.test.ts` runs the real seed for the `deficiency` goal but asserts only that lab-boosted vitamin D comes first, which still holds. **So nothing needed re-deriving, and nothing yet pins the new behaviour.** The closeout's AC-4 table records that.

**Persisted citations.** Advisor messages store `"… Grade A"` in an `effect-grade` citation's label (`proposals.ts:57,252`, `tools.ts:114,170`). **R2's grade-updated marker lands before B1 is committed**, so no stored "Grade A" for these two is shown unmarked.

## For the owner: raised while drafting, not edited

1. **caffeine-training summary.** *"…reduces perceived exertion across many trials"*: the cited abstract reports no perceived-exertion outcome. It is not among R3(a)'s items (1, 4, 6, 7). Add it to B5, or leave it?
2. **`confidence: "high"`** stays on `zinc-deficiency` and `vitamin-b12-deficiency` at Grade C. `confidence` is outside this brief's *May touch*. Recorded, not changed.
3. The **zinc-deficiency** and **b12-deficiency** summaries (*"Effectively restores…"*, *"Reliably corrects…"*) are items 7 and 6, and **B5** corrects them under R3(a).

## As committed (owner rulings to 2026-09-23)

| Effect | Grade (anchor → committed) | Composite | Confidence | Cites |
|---|---|---|---|---|
| zinc-deficiency | A → **C** | 0.4333 | high → **low** (R8) | `p-zinc-deficiency` (S4 found no candidate; owner confirmed) |
| vitamin-b12-deficiency | A → **B** | 0.55 exactly (B only after F-1, `478ccf7`) | high → **moderate** (R8) | `p-b12-deficiency`, **`p-b12-oral-routes`** (PMID 41487531), **`p-b12-oral-vs-im`** (PMID 29543316): the re-draft and owner scores are in [S4](p3-u4-profiles.s4.md), with populationRelevance 3 |
| caffeine-training | A → A | 0.7667 | high | as drafted, approved |
| protein-powder-training | A → A | 0.75 exactly | high | as drafted, approved |

**P-14, final** (probe vs `fe0441d`): zinc-deficiency gets the evidence-fit flag (false → true), its tier goes foundational → **advanced**, and identity high-grade goes true → false. vitamin-b12-deficiency: flag unchanged (false), tier foundational → **targeted**, high-grade unchanged (true). **R10 pins:** `src/lib/protocol-builder/grade-changes.test.ts`, one row per changed effect. Both rows failed against the pre-B1 seed. **R8 guard G5** (`seed-integrity.test.ts`) failed on exactly `zinc-deficiency: Grade C, confidence high` before its confidence was set.
