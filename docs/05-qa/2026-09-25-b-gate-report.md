# B-gate report — the four candidate rules (Phase 4 U5 (a))

> **Chosen rule (owner batch 2026-09-26, U5 (b)): G1 — effectSize ≥ 1.** `deriveGrade` caps a composite of B or better
> at **C** when it fails, and an uncited effectSize fails it (an R5 zero, FU-74). G1 moves **0** stored
> grades (its table below). The four tables below are U5 (a)'s candidate report.

> **Generated** by `npm run evidence:gate-report` (`scripts/evidence-gate-report.mjs`) from `content/seed/seed-effects.json`
> (sha256 `8471c1ddf79f1de0f8699664d9f706a8185727d37c9e0cee34a2c9ae486d6827`). Do not edit by hand; re-run it.
> **The candidates (D-2 (c)).** Each table is what that rule, alone, would move. A rule applies to a composite of B or better; an effect that fails it is
> shown one letter down **for this report only**. A-grade rows are marked *outside D-2's wording — owner decides* (ruling (ii)).
> Rationales are the profile's own text, verbatim (a `|` is escaped for the table). A failing dimension that cites
> no paper is marked **not assessed (R5)**: R5 scores an uncited dimension 0.

**Stored grades:** A 4 · B 9 · C 8 · D 6 (27 effects).
Stored ≠ derived: **0** (G4b).
**Ratings** are listed as humanEvidence · studyQuality · consistency · effectSize · populationRelevance.

## Summary

| Rule | Floors | B → C | A → B |
|---|---|---|---|
| G1 | effectSize ≥ 1 | 0 | 0 |
| G2 | effectSize ≥ 2 | 3 | 1 |
| G3 | effectSize ≥ 1 AND consistency ≥ 2 | 8 | 0 |
| G4 | effectSize ≥ 1 AND consistency ≥ 1 | 1 | 0 |

## G1 — effectSize ≥ 1

No effect moves under this rule.

## G2 — effectSize ≥ 2

| Effect | Stored | Composite | Ratings | Would move | Failing | Rationale (verbatim) | paperIds |
|---|---|---|---|---|---|---|---|
| `l-theanine-focus` | B | 0.550 | 2 · 2 · 1 · 1 · 2 | B → C | effectSize 1 < 2 | Small to moderate: SMD 0.20 for vigilance accuracy and 0.33 for attention switching. | `p-ltheanine-focus` |
| `melatonin-sleep` | B | 0.683 | 3 · 2 · 2 · 1 · 1 | B → C | effectSize 1 < 2 | Modest, in the authors' words: sleep latency 7.06 minutes shorter, total sleep 8.25 minutes longer, sleep-quality SMD 0.22. | `p-melatonin-sleep` |
| `ashwagandha-sleep` | B | 0.550 | 2 · 2 · 1 · 1 · 2 | B → C | effectSize 1 < 2 | Described by the authors as small but significant (SMD −0.59). | `p-ashwagandha-sleep` |
| `protein-powder-training` | A | 0.750 | 3 · 2 · 2 · 1 · 3 | A → B *(outside D-2's wording — owner decides)* | effectSize 1 < 2 | +2.49 kg one-repetition maximum and +0.30 kg fat-free mass. | `p-protein-mps` |

## G3 — effectSize ≥ 1 AND consistency ≥ 2

| Effect | Stored | Composite | Ratings | Would move | Failing | Rationale (verbatim) | paperIds |
|---|---|---|---|---|---|---|---|
| `vitamin-d-deficiency` | B | 0.650 | 2 · 2 · 1 · 3 · 2 | B → C | consistency 1 < 2 | Heterogeneity was high in the weekly-versus-daily repletion analysis (I² 85.3%); the D3-over-D2 advantage held for bolus but not daily dosing. | `p-vitamin-d-weekly-daily`, `p-vitamin-d-deficiency` |
| `fish-oil-mood` | B | 0.700 | 3 · 2 · 1 · 2 · 2 | B → C | consistency 1 < 2 | Benefit only in the EPA-rich subgroups of one meta-analysis (EPA-major P = 0.03); DHA-dominant formulations showed none. | `p-fish-oil-mood` |
| `l-theanine-focus` | B | 0.550 | 2 · 2 · 1 · 1 · 2 | B → C | consistency 1 < 2 | Confidence intervals often cross no effect; the authors note uncertainty in direction and magnitude. | `p-ltheanine-focus` |
| `ashwagandha-stress` | B | 0.567 | 2 · 1 · 1 · 3 · 2 | B → C | consistency 1 < 2 | High heterogeneity for stress (I² 83.1%). | `p-ashwagandha-stress-anxiety` |
| `ashwagandha-sleep` | B | 0.550 | 2 · 2 · 1 · 1 · 2 | B → C | consistency 1 < 2 | Substantial heterogeneity (I² 62%); effects larger in insomnia, at ≥600 mg/day and over ≥8 weeks. | `p-ashwagandha-sleep` |
| `berberine-metabolic` | B | 0.633 | 3 · 2 · 0 · 2 · 2 | B → C | consistency 0 < 2 | Not addressed by a verified paper in the corpus. | — **not assessed (R5)** |
| `vitamin-b12-deficiency` | B | 0.550 | 2 · 1 · 1 · 2 · 3 | B → C | consistency 1 < 2 | Substantial heterogeneity between studies (I² > 80% in most comparisons). | `p-b12-oral-routes` |
| `caffeine-focus` | B | 0.617 | 3 · 1 · 1 · 2 · 2 | B → C | consistency 1 < 2 | The benefit depends on context: clear under sleep deprivation or shift work, little mental-alertness gain in non-low habitual consumers, and only simple reaction time in rested young adults. | `p-caffeine-shift-work`, `p-caffeine-military`, `p-caffeine-tolerance`, `p-caffeine-glucose` |

## G4 — effectSize ≥ 1 AND consistency ≥ 1

| Effect | Stored | Composite | Ratings | Would move | Failing | Rationale (verbatim) | paperIds |
|---|---|---|---|---|---|---|---|
| `berberine-metabolic` | B | 0.633 | 3 · 2 · 0 · 2 · 2 | B → C | consistency 0 < 1 | Not addressed by a verified paper in the corpus. | — **not assessed (R5)** |
