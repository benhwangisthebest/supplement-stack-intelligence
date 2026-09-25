# p3-u10-rule8-tests — PDCA cycle artifact for Phase 3 U10

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for Phase 3 **U10**. The record is
> the register, `docs/01-plan/phase-3-evidence-grounding.plan.md` §4 **U10** (appended 2026-09-24 on the
> owner's FU-64 ruling). Where the two disagree, the register wins.
>
> **Feature**: `p3-u10-rule8-tests` · **Anchor**: `face009` (the U8 closeout) · **Date**: 2026-09-24 ·
> **Type**: deterministic (component tests and one architecture spec; no network, no DB, no OpenAI, no CI change)

---

## 0. Owner rulings, recorded first (2026-09-24)

> **R1 NETWORK:** "no network" means no network calls made by this unit's work. `next build`'s existing
> Google Fonts fetch (FU-66) is pre-existing build behaviour and permitted.
>
> **R2 GUARD:** rule 8 becomes mechanical like rule 7. After the tests land, a guard derives the set of
> components that render a safety flag, evidence grade or citation, and fails any member without a
> component test. If the set can't be derived without a hand-kept list, STOP and report; don't hand-list it.

`CLAUDE.md` §5 rule 8, verbatim: *"Components rendering a safety flag, evidence grade, or citation ship with a
component test."*

## 1. Landing (a) — the confirmed list

### 1.1 The predicate, in words

A file is a **rule-8 component** when all three hold:

1. **Scope.** It is a tracked, non-test `.tsx` file under `src/components/**`.
2. **Renders.** Somewhere inside a JSX expression container (`{…}`, as a child **or** as an attribute value,
   including a spread `{...x}`), it has a sub-expression whose **checked type** is an anchor type, or a
   union, intersection, array or tuple containing one. "Renders" therefore covers both writing the value
   into the DOM (`{flag.title}`, `evidence {rule.evidenceGrade}`) and handing it to a child component
   (`<EffectGradeBadge grade={e.grade} />`). That second case is the brief's *"or rendering a component that
   is"*. Name slots (the `.x` of `a.x`, a parameter or binding name, a JSX attribute name) are not
   expressions and are skipped. A value that only feeds logic *outside* JSX does not count.
3. **Anchor types.** Rule 8's three nouns, resolved by the TypeScript checker to their **declarations** in
   `src/types`, not matched by name text:

| Rule-8 noun | Anchor types (declaration) |
|---|---|
| evidence grade | `EvidenceGrade` (`src/types/primitives.ts:9`) |
| safety flag | `FlagSeverity`, `EvaluationFlag`, `DraftFlag` (`src/types/evaluation.ts:3,21,38`); `InteractionSeverity`, `InteractionRule`, `InteractionFinding` (`src/types/interaction.ts:6,56,76`); `BiomarkerRelation` (`src/types/biomarker.ts:7`, whose `"caution"` means *may worsen*) |
| citation | `Citation`, `CitationKind` (`src/types/advisor.ts:16,25`); `Paper` (`src/types/paper.ts:11`, whose optional `doi`/`pmid` are the only verified provenance a paper may carry) |

**Why type-based and not keyword-based.** `library/BiomarkerRelevanceSection.tsx:45` and
`library/FoodPairingSection.tsx:27` render `rule.evidenceGrade` without naming any grade type in the file. A
name grep can only see them through a stray keyword. The checker sees the property's declared type.

**Why the anchor list is not a hand-kept list of components.** It defines the predicate: rule 8's nouns
mapped to their `src/types` declarations. No component is named anywhere in the predicate, and the set it
yields is recomputed from the tree on every run. Its residual risk is stated in §1.6: a *new* safety-flag
type added to `src/types` must be added to the anchors to be seen.

**Scope, and why `src/app` is outside it.** Rule 8 says *components*. `CLAUDE.md` §4's layering separates
`src/app` routes from `src/components`. Applied to `src/app/**/*.tsx`, the predicate matches two route files,
and both only **hand** anchor values to a component that is itself a member:

- `src/app/library/[slug]/page.tsx:89` → `papers` into `SupplementDetail` (member, tested)
- `src/app/stack-lab/[stackId]/page.tsx:48` → `flags` into `StackLabClient` (member, tested)

Neither writes an anchor value into the DOM itself. They are recorded here and are not members.

**`DISCLAIMERS` is not a rule-8 noun.** FU-64's scan used it as a keyword. A disclaimer is safety copy, not a
flag, grade or citation. `ui/Disclaimer.tsx` is tested anyway (U9, `Disclaimer.test.tsx`).

### 1.2 The predicate, as a command

At (a) the command is the script in §A, run from the repository root:

```
node <scratchpad>/rule8-derive.mjs
```

At (c) the same predicate becomes `src/architecture/rule8-component-tests.test.ts`, and the command becomes
`npx vitest run src/architecture/rule8-component-tests.test.ts`.

### 1.3 Output at `face009` (AC-1), pasted verbatim

```
src/components/advisor/ActionProposalCard.tsx  |  DraftFlag @ src/components/advisor/ActionProposalCard.tsx:178 `safetyFlags`  |  NO
src/components/advisor/AdvisorMessageBubble.tsx  |  Citation @ src/components/advisor/AdvisorMessageBubble.tsx:61 `message.citations`  |  NO
src/components/advisor/AdvisorPanel.tsx  |  DraftFlag @ src/components/advisor/AdvisorPanel.tsx:178 `m.safetyFlags ?? []`  |  NO
src/components/advisor/ProvenanceChips.tsx  |  Citation @ src/components/advisor/ProvenanceChips.tsx:86 `citations`  |  yes
src/components/evidence/EffectGradeBadge.tsx  |  EvidenceGrade @ src/components/evidence/EffectGradeBadge.tsx:29 `grade`  |  NO
src/components/evidence/EvidenceBreakdown.tsx  |  Paper @ src/components/evidence/EvidenceBreakdown.tsx:72 `paperById.get(id)`  |  NO
src/components/evidence/PaperSummaryCard.tsx  |  Paper @ src/components/evidence/PaperSummaryCard.tsx:25 `paper`  |  yes
src/components/identity/IdentityCard.tsx  |  Citation @ src/components/identity/IdentityCard.tsx:73 `sig.citation`  |  NO
src/components/library/BiomarkerRelevanceSection.tsx  |  BiomarkerRelation @ src/components/library/BiomarkerRelevanceSection.tsx:40 `rule.relation`  |  NO
src/components/library/FoodPairingSection.tsx  |  InteractionRule @ src/components/library/FoodPairingSection.tsx:25 `rule`  |  NO
src/components/library/InteractionSection.tsx  |  InteractionRule @ src/components/library/InteractionSection.tsx:40 `rules`  |  NO
src/components/library/SupplementCard.tsx  |  EvidenceGrade @ src/components/library/SupplementCard.tsx:24 `topEffect.grade`  |  NO
src/components/library/SupplementDetail.tsx  |  Paper @ src/components/library/SupplementDetail.tsx:40 `papers`  |  yes
src/components/stack/FlagCard.tsx  |  FlagSeverity @ src/components/stack/FlagCard.tsx:18 `flag.severity`  |  NO
src/components/stack/StackLabClient.tsx  |  EvaluationFlag @ src/components/stack/StackLabClient.tsx:44 `initialFlags`  |  yes
src/components/stack/StackWorkspace.tsx  |  EvaluationFlag @ src/components/stack/StackWorkspace.tsx:188 `flags`  |  NO
src/components/stack/SuggestionCard.tsx  |  EvidenceGrade @ src/components/stack/SuggestionCard.tsx:31 `s.grade`  |  NO
members 17 · without a component test 13 · scope 56 files
```

(Each row shows the **first** anchored sub-expression found. A component usually has several.)

### 1.4 The confirmed list — 13 components that (b) must test

| # | Component | Renders | Evidence (first hit) | In FU-64's named examples |
|---|---|---|---|---|
| 1 | `advisor/ActionProposalCard.tsx` | safety flag (projected `DraftFlag`s, severity) | `:178` | — |
| 2 | `advisor/AdvisorMessageBubble.tsx` | citation (hands `Citation[]` to `ProvenanceChips`) | `:61` | — |
| 3 | `advisor/AdvisorPanel.tsx` | safety flag (hands `DraftFlag[]` to the bubble) | `:178` | — |
| 4 | `evidence/EffectGradeBadge.tsx` | evidence grade | `:29` | yes |
| 5 | `evidence/EvidenceBreakdown.tsx` | citation (`Paper` titles per effect) | `:72` | — |
| 6 | `identity/IdentityCard.tsx` | citation (deep-link from `sig.citation`) | `:73` | — |
| 7 | `library/BiomarkerRelevanceSection.tsx` | safety flag (`caution` relation) + evidence grade | `:40`, `:45` | yes |
| 8 | `library/FoodPairingSection.tsx` | safety flag (`InteractionRule`) + evidence grade | `:25`, `:27` | — |
| 9 | `library/InteractionSection.tsx` | safety flag (`InteractionSeverity`) + evidence grade | `:40`, `:51` | — |
| 10 | `library/SupplementCard.tsx` | evidence grade (hands it to `EffectGradeBadge`) | `:24` | — |
| 11 | `stack/FlagCard.tsx` | safety flag (severity label, title, grade) | `:18` | yes |
| 12 | `stack/StackWorkspace.tsx` | safety flag (hands flags to `FlagCard`, by severity) | `:188` | — |
| 13 | `stack/SuggestionCard.tsx` | evidence grade (hands it to `EffectGradeBadge`) | `:31` | yes |

**Members already tested (4), not in (b)'s scope.** Owner text: *"components … without a component test"*.

| Component | Test | Does the existing test assert the rule-8 rendering? |
|---|---|---|
| `advisor/ProvenanceChips.tsx` | `ProvenanceChips.test.tsx` | **yes**: paper titles and `Grade X` labels (`:37`, `:103`) |
| `evidence/PaperSummaryCard.tsx` | `PaperSummaryCard.test.tsx` | **yes**: PMID and DOI links by role and name (`:29`, `:36`) |
| `library/SupplementDetail.tsx` | `SupplementDetail.test.tsx` | **yes**: effect grade and breakdown (`:53`, `:60`) |
| `stack/StackLabClient.tsx` | `StackLabClient.test.tsx` (U9) | **no**: it asserts disclaimers, coverage limits and product badges. Its only rule-8 act is handing `initialFlags` to `StackWorkspace`, which (b) tests directly (#12). **Finding, not fixed:** editing an existing test is outside the brief's *May touch* ("new .test.tsx files"). |

### 1.5 Reconciliation against FU-64's 12

**What FU-64 recorded.** A count (12), the keywords (`grade`, `flag`, `severity`, `citation`, `DISCLAIMERS`),
and four named examples (`stack/FlagCard.tsx`, `evidence/EffectGradeBadge.tsx`, `stack/SuggestionCard.tsx`,
`library/BiomarkerRelevanceSection.tsx`). **The 12 files were never enumerated**, in the register (§7 FU-64),
in `project-status.md`, or in the U7 cycle artifact (`p3-u7-coverage-honesty.plan.md:270`). So the list
cannot be reconciled row by row. What can be done is to re-run the recorded keyword scan at `f262437` and
reconcile against that:

```
for f in $(git ls-tree -r --name-only f262437 src/components src/app | grep -E '\.tsx$' | grep -v '\.test\.tsx$'); do
  git cat-file -e f262437:${f%.tsx}.test.tsx 2>/dev/null && continue
  git show f262437:$f | grep -qiE 'grade|flag|severity|citation|DISCLAIMERS' && echo $f
done
```

→ **24 files: 20 under `src/components`, 4 under `src/app`.** Not 12. **FU-64's "12" is not reproducible from
its own recorded keywords.** It is superseded by the derived figure here.

**All four named examples are members** (rows 4, 7, 11, 13 above).

**Over-matches: the keyword scan hits, the predicate does not (6 in `src/components`).** Each is correct to
exclude:

| File | Keyword hit | Why it is not rule 8 |
|---|---|---|
| `checkin/DailyCheckinForm.tsx:67,240` | `severity` | the user's **own** 1–3 side-effect rating (`side-effect.ts:51`, "display-only ordinal"), not a safety flag |
| `profile/SideEffectTimeline.tsx:6,32` | `DISCLAIMERS`, `severity` | the same user rating, charted, plus disclaimer copy |
| `evidence/IllustrativeDatasetNotice.tsx:12,28` | `grade`, `cited` | static prose *about* grades and citations. It renders no grade or citation value |
| `layout/SiteFooter.tsx:2,12,75` | `DISCLAIMERS`, "Evidence grades" | a nav link label and the general disclaimer |
| `stack/ProtocolPanel.tsx:97,128` | `okFlag`, "Evidence-graded" | a boolean local and a static heading. It hands whole suggestion objects to `SuggestionCard` (member #13), which renders the grade |
| `ui/Disclaimer.tsx:1,4` | `DISCLAIMERS` | disclaimer copy, not a rule-8 noun (§1.1). Tested anyway (U9) |

The 4 `src/app` keyword hits (`page.tsx`, `library/page.tsx`, `stack-lab/page.tsx`, `stack-lab/[stackId]/page.tsx`)
are outside the scope (§1.1). Only `stack-lab/[stackId]/page.tsx` matches the predicate, and it only hands
flags to a tested member.

**Under-matches: the predicate hits, the keyword scan does not.** **None among untested files.** Every one of
the 13 contains a keyword. The 3 members present in the derived set but absent from the re-scan
(`ProvenanceChips`, `PaperSummaryCard`, `SupplementDetail`) are absent only because they already had tests
at `f262437`, which the scan skips. So the keyword scan's recall was complete here. Its defect was precision
(6 false hits). The type-based predicate is still the right guard: a component that renders
`rule.evidenceGrade` while naming none of the keywords (a variable called `level`, say) would be invisible
to the grep and visible to the checker.

**Movement since `f262437`.** `StackLabClient.tsx` gained a test at U9 (`d8d3542`). At `f262437` the derived
untested set would have been 14. It is 13 at `face009`.

### 1.6 Residual risk, stated

- **A new safety-flag type.** If a future unit adds a flag-like type to `src/types` and renders it, the
  guard sees it only once it is added to the anchors. The anchors sit beside the guard, with a written
  reason per entry, and a self-test proves each still resolves (a renamed type fails loudly rather than
  silently dropping out).
- **An anchor value nested inside a non-anchor object** and handed to a child whole (e.g. `ProtocolPanel`
  passing a suggestion object) is not counted at the parent. It is counted at the child that unpacks it,
  and the child is a member. That is deliberate: the test belongs where the rendering happens.
- **Test existence, not test content.** The guard (c) requires a sibling `X.test.tsx` that imports `./X`. It
  cannot judge whether that test asserts the rule-8 rendering. (b)'s red proofs are the evidence for these
  13. §1.4 records the one existing test (`StackLabClient`) that does not.

---

## A. The (a) command — `rule8-derive.mjs`, verbatim

```js
// U10 (a) — rule-8 predicate, as a command. Run from the repo root:  node <this file>
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
const ts = createRequire(path.join(process.cwd(), "package.json"))("typescript");
const ROOT = process.cwd();
const tracked = execFileSync("git", ["ls-files", "src/components"], { encoding: "utf8" }).split("\n");
const scope = tracked.filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f));
const tests = new Set(tracked.filter((f) => /\.test\.tsx$/.test(f)));
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile("tsconfig.json", ts.sys.readFile).config, ts.sys, ROOT);
const program = ts.createProgram(scope.map((f) => path.join(ROOT, f)), { ...cfg.options, incremental: false, noEmit: true });
const checker = program.getTypeChecker();
const ANCHORS = {
  "src/types/primitives.ts": ["EvidenceGrade"],                                                   // evidence grade
  "src/types/evaluation.ts": ["FlagSeverity", "EvaluationFlag", "DraftFlag"],                     // safety flag
  "src/types/interaction.ts": ["InteractionSeverity", "InteractionRule", "InteractionFinding"],    // safety flag
  "src/types/biomarker.ts": ["BiomarkerRelation"],                                                // safety flag
  "src/types/advisor.ts": ["Citation", "CitationKind"],                                           // citation
  "src/types/paper.ts": ["Paper"],                                                                // citation
};
const decl = new Map();
for (const [f, names] of Object.entries(ANCHORS)) for (const st of program.getSourceFile(path.join(ROOT, f)).statements)
  if ((ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) && names.includes(st.name.text)) decl.set(st, st.name.text);
const expected = Object.values(ANCHORS).flat().length;
if (decl.size !== expected) throw new Error(`anchors resolved ${decl.size}/${expected}`);
const named = (s) => s?.declarations?.map((d) => decl.get(d)).find(Boolean) ?? null;
const anchorOf = (t, d = 0) => {
  if (!t || d > 4) return null;
  const a = named(t.aliasSymbol) ?? named(t.getSymbol());
  if (a) return a;
  const parts = t.isUnion() || t.isIntersection() ? t.types : checker.isArrayType(t) || checker.isTupleType(t) ? checker.getTypeArguments(t) : [];
  for (const p of parts) { const r = anchorOf(p, d + 1); if (r) return r; }
  return null;
};
const isNameSlot = (n) => { const p = n.parent; return ts.isIdentifier(n) && p && (
  (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isParameter(p) && p.name === n) ||
  (ts.isVariableDeclaration(p) && p.name === n) || (ts.isBindingElement(p) && p.name === n) ||
  (ts.isPropertyAssignment(p) && p.name === n) || (ts.isJsxAttribute(p) && p.name === n)); };
const rows = [];
for (const f of scope) {
  const sf = program.getSourceFile(path.join(ROOT, f));
  let hit = null;
  const visit = (n, inJsx) => {
    if (hit) return;
    const here = inJsx || ts.isJsxExpression(n) || ts.isJsxSpreadAttribute(n);
    if (inJsx && ts.isExpression(n) && !isNameSlot(n)) {
      const a = anchorOf(checker.getTypeAtLocation(n));
      if (a) hit = `${a} @ ${f}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1} \`${n.getText(sf).replace(/\s+/g, " ").slice(0, 36)}\``;
    }
    ts.forEachChild(n, (c) => visit(c, here));
  };
  visit(sf, false);
  if (hit) rows.push([f, hit, tests.has(f.replace(/\.tsx$/, ".test.tsx")) ? "yes" : "NO"]);
}
for (const r of rows) console.log(r.join("  |  "));
console.log(`members ${rows.length} · without a component test ${rows.filter((r) => r[2] === "NO").length} · scope ${scope.length} files`);
```
