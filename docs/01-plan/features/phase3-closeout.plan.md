# phase3-closeout — PDCA cycle artifact for the Phase 3 closeout

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact (`phase3-closeout`) for the
> closeout of the **approved** Phase 3 plan, `docs/01-plan/phase-3-evidence-grounding.plan.md` (rank 5 in
> `CLAUDE.md` §6). That register is the authoritative record, and this file **mirrors it rather than
> replacing it**. It carries no approval status of its own.
>
> **Anchor:** `194ee08` *"docs(plan): U10 closeout — …"*, verified at session open (`git rev-parse HEAD
> origin/main` → both `194ee08…`; tree: only `?? .claude/launch.json`).
> **Brief:** the owner's Phase 3 closeout brief, 2026-09-24. Landings (a) carry list · (b) report · (c)
> independent Check · (d) fixture re-verification [LIVE, owner go] · (e…) remediations · final.
> **Standing approval (owner, this session):** a deterministic landing may branch, commit, push,
> fast-forward `main` and delete its branch without asking, when its §5 gate is green (including the full
> non-live E2E suite, `verify:rendering` and `verify:bundle`), its staged files are inside *May touch*, and
> its branch CI passes. **The following are not covered:** (d), any `CLAUDE.md` diff, and the phase-closed declaration.

---

## Landings

| | Landing | SHA | CI |
|---|---|---|---|
| (a) | carry list: three `CLAUDE.md` corrections (lint included, owner "go + lint"), register residue, U4 pointer, FU-67 fixed, N-85 registered | `78277b6` | 36094543027 success |
| (d) | fixture re-verification: 37/37, 37 calls, $0, 0 drift, 0 retractions | `2969b89` | 36094964293 success |
| (b) | the phase report; FU-50 and FU-25 §7 rows (late-registered) | `c20db92` | 36095361219 success |
| (c) | independent Check, recorded verbatim: **COMPLETE WITH FOLLOW-UP**, P3-1…P3-11 | *this landing* | — |

---

## 1. The carry list, re-derived at `194ee08` (not trusted)

The U10 artifact §4.1 lists eight items. Each was checked against the tree at `194ee08` and is still true:

| # | Item (U10 §4.1) | Re-derived at `194ee08` | Done in (a) |
|---|---|---|---|
| 1 | `CLAUDE.md` §5 baseline stale | reads *"27 executable architecture specs"* and *"1446/1446 … 114 files"*; `git ls-files 'src/architecture/*.test.ts' \| wc -l` → **30** | corrected (§3) |
| 2 | §4 rule-7 row stale | reads *"Not enforced · Would fail today on 8 of 31"*; `client-props.test.ts` exists, `CLIENT_LIB_IMPORT_ALLOWLIST = []`, one `NAMED_EXEMPTIONS` entry | corrected (§3) |
| 3 | §5 rule 8 has no enforcement note | none; `rule8-component-tests.test.ts` exists | added (§3) |
| 4 | U4 closeout §5 reads as open | no pointer | dated pointer added |
| 5 | N-82 §7 row reads *"OPEN for U8"* | yes, and so does N-82's §3 disposition | both stamped CLOSED at U8 (a) `4326811` |
| 6 | `[P3-X7]` list omits U10 | yes | U10 added (not ticked; ticking is FINAL's) |
| 7 | FU-67 has no §7 row | `grep -c 'FU-67' <register>` → only U10's §4 entry | row added, CLOSED |
| 8 | §8 *"ten units (U0…U9)"* | yes | left as written (append-only), as §4.1 says |

**Found while re-deriving:** **N-85** (§3 below). The carry list did not have it, because it only becomes
visible once the rule-7 row is corrected.

---

## 2. FU-67 — fixed in the two test files, red-proved

**What changed (test files only):**
- `src/components/stack/StackLabClient.test.tsx`: a new block, *"the evaluation flags it is handed reach
  the page (rule 8, FU-67)"*. It hands the component three flags out of severity order and asserts each
  one's title (in critical → warning → info order), severity and category label, explanation, suggestion,
  evidence grade (or its absence at `n/a`), the count line and the clinician banner. It also asserts the
  empty case.
- `src/components/library/SupplementDetail.test.tsx`: the test titled *"shows its grade"* now asserts the
  badge. A new block asserts each effect card's own badge for A, B, C and D with its confidence, and that
  every paper renders at its `#paper-{id}` anchor in the Evidence summaries tab.

**Counts:** jsdom 24 files / 126 → **130** tests (+4). The node project is unchanged at 120 / 1549.

**Red proofs.** Each mutation is a `sed` on the component. It runs against the **new** test and then against
**HEAD's** test (`git show HEAD:<test>`), and both files are restored from backup and `cmp`-verified against
`HEAD`. Output, verbatim (durations trimmed):

```
=== SL-M1 StackLabClient hands StackWorkspace no flags
-- new test:
   × StackLabClient — the evaluation flags it is handed reach the page (rule 8, FU-67) > renders every flag's title, severity, category, explanation, suggestion and evidence grade, and counts them
   × StackWorkspace / StackLabClient — safety copy from the server page (U9) > renders the interaction disclaimer, both coverage limits and the evaluation disclaimer verbatim
      Tests  2 failed | 4 passed (6)
-- HEAD's test:
   × StackWorkspace / StackLabClient — safety copy from the server page (U9) > renders the interaction disclaimer, both coverage limits and the evaluation disclaimer verbatim
      Tests  1 failed | 3 passed (4)
restored: cmp OK
=== SL-M2 StackLabClient drops the first flag
-- new test:            (same two failures)      Tests  2 failed | 4 passed (6)
-- HEAD's test:         (same one failure)       Tests  1 failed | 3 passed (4)
restored: cmp OK
=== SL-M3 StackLabClient passes on only interaction flags
-          initialFlags={initialFlags}
+          initialFlags={initialFlags.filter((f) => f.category === "interaction-risk")}
-- new test:
   × StackLabClient — the evaluation flags it is handed reach the page (rule 8, FU-67) > renders every flag's title, severity, category, explanation, suggestion and evidence grade, and counts them
      Tests  1 failed | 5 passed (6)
-- HEAD's test:
 ✓ |jsdom| src/components/stack/StackLabClient.test.tsx (4 tests)
      Tests  4 passed (4)
restored: cmp OK
=== SD-M1 every effect badge hard-coded to A          (s/grade={e.grade}/grade={"A"}/)
-- new test:
   × SupplementDetail — the no-profile fallback (U4, FU-63) > an effect without an evidenceProfile shows its grade but no breakdown
   × SupplementDetail — each effect shows its own grade; each cited paper renders (rule 8, FU-67) > every effect card carries the badge for its own grade and confidence
      Tests  2 failed | 2 passed (4)
-- HEAD's test:
 ✓ |jsdom| src/components/library/SupplementDetail.test.tsx (2 tests)
      Tests  2 passed (2)
restored: cmp OK
=== SD-M2 effect badge removed                         (/<EffectGradeBadge grade=/d)
-- new test:            (same two failures)      Tests  2 failed | 2 passed (4)
-- HEAD's test:         Tests  2 passed (2)
restored: cmp OK
=== SD-M3 PapersTab renders no paper card              (s|<PaperSummaryCard paper={p} />|null|)
-- new test:
   × SupplementDetail — each effect shows its own grade; each cited paper renders (rule 8, FU-67) > the Evidence summaries tab renders every paper it is given, at its anchor
      Tests  1 failed | 3 passed (4)
-- HEAD's test:
 ✓ |jsdom| src/components/library/SupplementDetail.test.tsx (2 tests)
      Tests  2 passed (2)
restored: cmp OK
```

**What this shows, precisely.** Every one of the six mutations reddens the new tests. **Four of the six
stay green on HEAD's tests** (SL-M3, SD-M1, SD-M2, SD-M3), which is FU-67's gap measured. **Two did not
stay green:** HEAD's U9 test already caught SL-M1 and SL-M2, because dropping every flag also drops the
interaction disclaimer that test asserts. So FU-67 as registered (*"asserts disclaimers and badges, not
flags"*) was **true of what the test asserts, and slightly overstated as a coverage hole** for
StackLabClient. It caught the total loss of flags, but not a partial loss. **FU-67: CLOSED.**

---

## 3. The three `CLAUDE.md` corrections, and N-85

Each figure was re-derived by command on (a)'s tree:

| Correction | Command → value |
|---|---|
| §5 baseline, spec count | `git ls-files 'src/architecture/*.test.ts' \| wc -l` → **30** |
| §5 baseline, unit tests | `npx vitest run` → **144 files / 1679 tests**; `--project node` → 120 / 1549; `--project jsdom` → 24 / 130 |
| §5 baseline, E2E | full non-live suite in the gate → *see the gate row* |
| §4 rule-7 row | `client-props.test.ts` present; `CLIENT_LIB_IMPORT_ALLOWLIST: readonly string[] = []`; `NAMED_EXEMPTIONS` has 1 key (`AdvisorPanel.tsx -> @/lib/api/error-text`) |
| §5 rule 8 | `rule8-component-tests.test.ts` present; no allowlist in the file |

| §5 baseline, lint (both sites) | `npm run lint` → *"lints 415 of 415 tracked source files"* · *"reported 0 errors"* |

**Lint figure — owner ruling (2026-09-24, "go + lint").** At first the lint figure was left out: the brief
named spec and test counts only. It was raised alongside the diff, and the owner ruled that **369 → 415 in
both places** counts as part of correction 3, the §5 baseline. The rule-7 row names the guard in plain
text, and the owner **accepted** that because of N-85. The owner also set **N-85's owner: Phase 4**. If the
independent Check raises it, the owner decides whether to fix it here.

**N-85 (new; register §7).** DOC_TRUTH is blind to rule 7's enforcement. The probe below was run against
`src/architecture/doc-truth.test.ts`, with `CLAUDE.md` restored from backup and `cmp`-verified after each
step:

```
== current (a) text                                                  Tests  22 passed (22)
== D1: HEAD's CLAUDE.md (row 7 'Not enforced' while client-props.test.ts exists)
                                                                     Tests  22 passed (22)
== D2: backtick the guard name in the row
   × DOC_TRUTH — CLAUDE.md §4's enforcement table > names only guard tokens that exist in src/architecture — P2-R2, closes P2-4
     → CLAUDE.md §4 cites guard token(s) that exist nowhere in src/architecture/: CLIENT_TAKES_PROPS.
                                                                     Tests  1 failed | 21 passed (22)
== D3: status cell flipped to Not enforced on the new row            Tests  22 passed (22)
restored
```

---

## 4. Gate

The gate ran in a `git worktree` with no `.env.local`, with (a)'s files staged there.

| Landing | tsc | lint | vitest (node / jsdom) | build | rendering | bundle | E2E non-live | null bytes |
|---|---|---|---|---|---|---|---|---|
| (a) | 0 | 415/415, 0 errors | **144 / 1679** (120 / 1549 · 24 / 130) | 0 | OK | OK, every route +14–15 B (N-82 path effect; no component source changed) | **70 passed / 30 skipped** | 6 changed files clean; the control file with a null byte was detected |
| (d) | 0 | 415/415, 0 errors | 144 / 1679 (120 / 1549 · 24 / 130) | 0 | OK | OK | **70 passed / 30 skipped** | 41 staged paths (37 bodies, `call-log.jsonl`, `results.json`, 2 `.md`) clean; control detected |
| (b) | 0 | 415/415, 0 errors | 144 / 1679 (120 / 1549 · 24 / 130) | 0 | OK | OK | **70 passed / 30 skipped** | 3 changed `.md` clean (checked as part of the 46 paths since `78277b6`); control detected |

**About the null-byte check:** the first attempt used `grep -P`, which macOS grep does not support, and
`2>/dev/null` hid the error, so the check passed without checking anything. It was redone with Node's
`Buffer.includes(0)`, together with a positive control. This is recorded because it is the vacuous-check
class this project guards against.

**After the owner's "go + lint":** only `.md` files changed, namely `CLAUDE.md`, the register and this
artifact. `vitest` (144 / 1679, DOC_TRUTH included), lint (415, 0 errors), `tsc` 0 and the null-byte check
were re-run on the final tree. The build, rendering, bundle and E2E rows above ran on a tree that differs
from the committed one **only in those `.md` files**. No `.md` file is a build input:
`git grep -l "\.md['\"]" -- src 'next.config.*' 'playwright.config.*'` finds only 8 `src/architecture/*.test.ts` specs, which read docs by design and which `vitest` re-ran above.

---

## 5. Landing (d): fixture re-verification [LIVE, owner pre-approved]

**Scenario (owner):** re-resolve every fixture entry, **≤ 45 calls, $0**, dry run first. Pre-approved on
2026-09-24 to run live if the dry run's count and hosts matched. **Result: 37/37 entries re-verified; 0 title
drift, 0 retractions, 0 identity mismatches, 0 refusals.** 37 calls, all 200, $0. The full record is in
`docs/05-qa/2026-09-23-p3-u6-verification-record.md` § *RV*, and the bodies are in
`content/verification/captures/2026-09-24-rv/`.

**Entry count, re-derived rather than taken from the brief:** `Object.keys(provenance-fixture.json).length`
→ **37** (36 PMID, 1 DOI). That equals the number of papers carrying an identifier, which is 37 of 38. The
exception is `p-nac-antioxidant`, uncited, FU-57.

**Order:** (d) ran before (b), so that the report's live-call total is final. The Check reads neither
document, so the order does not affect it.

**Why a driver rather than `capture.mjs resolve`:** `resolve` requires owner approval rows per mapping, and
it is built to *write*. `capture.mjs` is outside the closeout's *May touch*, so no `RV` scenario could be
added to it. The driver imports its `createClient` unchanged, so every control is the same. It is not
committed as a `.mjs`, because a tracked `content/**/*.mjs` would enter the lint set and G1's walk. Its
source, verbatim:

```js
// Phase 3 closeout (d): re-verify every provenance-fixture entry against its resolver.
// Owner-run driver (U5 refresh policy, trigger 2: re-verify at every phase closeout).
// Reads the fixture and the paper corpus; WRITES NOTHING to either. One lookup per
// entry through capture.mjs's own client, so the host allowlist, the rate limit, the
// --max-calls cap, dry run and the call log are the same controls every U6 scenario
// used. Every response body is saved under --out/<paperId>/.
//
// Checks per entry:
//   title     normaliseTitle(resolved) must equal normaliseTitle(fixture.resolvedTitle)
//             AND normaliseTitle(Paper.title) — drift on either is a STOP
//   retraction PubMed: any esummary `pubtype` matching /retract/i ("Retracted
//             Publication", "Retraction of Publication") — STOP.
//             Crossref: any `update-to` / `updated-by` / `relation` entry whose type
//             matches /retract|withdraw/i — STOP.
//   identity  the record returned is the one asked for (uid / DOI) — else STOP
// Usage: node reverify.mjs --repo DIR --out DIR --max-calls N [--dry-run]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a === "--dry-run") acc.push(["dry-run", true]);
    else if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]]);
    return acc;
  }, []),
);
const REPO = path.resolve(args.repo);
const OUT = path.resolve(REPO, args.out);
const MAX = Number(args["max-calls"]);
const DRY = Boolean(args["dry-run"]);
if (!Number.isInteger(MAX) || MAX < 1) throw new Error("--max-calls N is required");

const cap = await import(pathToFileURL(path.join(REPO, "content/verification/capture.mjs")));
const prov = await import(pathToFileURL(path.join(REPO, "content/verification/provenance.mjs")));
const fixture = JSON.parse(readFileSync(path.join(REPO, "content/verification/provenance-fixture.json"), "utf8"));
const papers = JSON.parse(readFileSync(path.join(REPO, "content/seed/seed-papers.json"), "utf8"));

const byKey = new Map();
for (const p of papers) {
  for (const kind of prov.KINDS) if (p[kind]) byKey.set(prov.fixtureKey(kind, p[kind]), p);
}

mkdirSync(OUT, { recursive: true });
const client = cap.createClient({
  dryRun: DRY,
  maxCalls: MAX,
  scenario: "RV",
  mailto: null, // U6 R3: no contact email
  logFile: path.join(OUT, "call-log.jsonl"),
});

const rows = [];
const stops = [];
try {
  for (const key of Object.keys(fixture).sort()) {
    const e = fixture[key];
    const paper = byKey.get(key);
    if (!paper) {
      stops.push(`${key}: no paper carries this identifier`);
      continue;
    }
    const url =
      e.kind === "doi"
        ? client.withContact(`https://api.crossref.org/works/${encodeURIComponent(e.id)}`, "crossref")
        : client.withContact(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${e.id}`,
            "ncbi",
          );
    const body = await client.get(url);
    if (body === null) continue; // dry run
    const file = path.join(OUT, paper.id, e.kind === "doi" ? "crossref-work.json" : "esummary.json");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, body);
    const json = JSON.parse(body);
    let title, returnedId, retraction, pubtypes;
    if (e.kind === "doi") {
      const m = json?.message ?? {};
      title = m.title?.[0];
      returnedId = String(m.DOI ?? "").toLowerCase();
      const links = [
        ...(m["update-to"] ?? []),
        ...(m["updated-by"] ?? []),
        ...Object.entries(m.relation ?? {}).flatMap(([t, v]) => (v ?? []).map((x) => ({ ...x, type: t }))),
      ];
      retraction = links.filter((l) => /retract|withdraw/i.test(String(l.type ?? "")));
      pubtypes = [m.type];
    } else {
      const r = json?.result?.[e.id] ?? {};
      title = r.title;
      returnedId = String(r.uid ?? "");
      pubtypes = r.pubtype ?? [];
      retraction = pubtypes.filter((t) => /retract/i.test(t));
    }
    const titleOk =
      typeof title === "string" &&
      prov.normaliseTitle(title) === prov.normaliseTitle(e.resolvedTitle) &&
      prov.normaliseTitle(title) === prov.normaliseTitle(paper.title);
    const idOk = returnedId === String(e.id).toLowerCase();
    const row = {
      key,
      paperId: paper.id,
      kind: e.kind,
      verifiedOn: e.verifiedOn,
      titleMatches: titleOk,
      identityMatches: idOk,
      pubtypes,
      retraction,
      bodySha256: cap.sha256(body),
    };
    rows.push(row);
    if (!titleOk) stops.push(`${key} (${paper.id}): TITLE DRIFT — resolver now says ${JSON.stringify(title)}`);
    if (!idOk) stops.push(`${key} (${paper.id}): returned record ${JSON.stringify(returnedId)} is not the one asked for`);
    if (retraction.length) stops.push(`${key} (${paper.id}): RETRACTION signal ${JSON.stringify(retraction)}`);
  }
} catch (err) {
  stops.push(`ERROR: ${err.message}`);
} finally {
  console.log(`${DRY ? "[dry-run] " : ""}entries: ${Object.keys(fixture).length} · calls made: ${client.state.made}${DRY ? ` · planned: ${client.state.planned}` : ""}`);
}
if (!DRY) {
  writeFileSync(
    path.join(OUT, "results.json"),
    JSON.stringify({ entries: Object.keys(fixture).length, callsMade: client.state.made, stops, rows }, null, 2) + "\n",
  );
}
for (const s of stops) console.error(`STOP ${s}`);
console.log(stops.length ? `STOP: ${stops.length} condition(s)` : "OK: no title drift, no retraction, no identity mismatch");
process.exit(stops.length ? 2 : 0);
```

**Commands:**
```
node reverify.mjs --repo . --out <scratchpad>/rv-dry --max-calls 45 --dry-run   → planned 37, made 0
node reverify.mjs --repo . --out content/verification/captures/2026-09-24-rv --max-calls 45
                                                     → calls made: 37 · OK: no title drift, no retraction, no identity mismatch
```

---

## 6. Landing (b): the report

`docs/04-report/phase-3-evidence-grounding.report.md`. The exit criteria were re-run at HEAD by command
(its §3), and the red evidence is compiled from the units' records (§5). **Two register gaps were found
while compiling it,** and both got §7 rows in this landing, dated as late-registered:
- **FU-50**: open since U0, with no §7 row.
- **FU-25**: never named in Phase 3, because §7's source set was line-bounded.

**One roadmap gap:** *"the next operational phase"*, which the register uses for 12 deferrals, is not a
phase in `docs/roadmap.md`. The report assigns those items to **Phase 4 (assigned at closeout)** for the
owner to confirm. **The verdict is left to (c).**

---

## 7. Landing (c): the independent Check

`docs/reviews/phase-3-closeout-check.md`, recorded verbatim under a clerk's note. **Verdict: COMPLETE WITH
FOLLOW-UP.**
- **Inputs:** the register, the roadmap, `CLAUDE.md` and the repository at `c20db92` only. The report and
  the cycle artifacts were not read, and the review's header says so.
- **The reviewer's own work:** 16 mutation replays over 11 guards, 6 effects traced end to end, 36/36
  abstracts re-hashed and 37/37 fixture entries cross-checked against the (d) bodies.
- **Must be resolved before the phase is marked complete:** P3-1 (roadmap status), P3-2 (`project-status.md`
  §2.1), P3-3 (X6/X7 unticked), P3-4 (open items with no row or owner).
- **Carried, each needing an owner:** P3-5…P3-11.
- The Check did **not** raise N-85, so the owner's stop condition for N-85 did not fire.

**Stopped here for the owner (brief): the Check's items are shown before any remediation.**

---

## 8. Remediation (e1): verification hardening (P3-5, P3-6)

**Owner ruling (2026-09-25).** Scoped exception: `content/verification/**`, the provenance guard in
`src/data`, and the fixture's link and date fields. Every fixture entry must reference its saved resolver
response, and the guard re-parses that response.

**What changed.**
- `provenance.mjs`: `ENTRY_KEYS` gains `response` (`{ path, sha256 }`, a `crossref-work.json` or
  `esummary.json` under `RESPONSE_ROOT`). It adds `parseResponse(kind, text)`, which requires exactly one
  uid, and `checkResponses(fixture, { isTracked, read, sha256 })`, which sorts defects into separate
  buckets: missing, uncommitted, hash, unparseable, identity and title.
- **P8a–d** in `provenance-record.test.ts`, which judges "committed" by `git ls-files`.
- `capture.mjs resolve` now writes `response` on every new entry.
- The fixture: 37 entries linked to their (d) bodies. Each digest was re-hashed from the file and checked
  against (d)'s `results.json`. `verifiedOn` was set to 2026-09-24 (32 changed, 5 already had that date).
  **No other field changed**, as a field-by-field diff shows: `{ verifiedOn: 32, response: 37 }`.
- Callers of the fixture shape were enumerated with
  `git grep provenance-fixture -- ':!docs'`. Only `capture.mjs` and this guard read it; the rest are
  comments.

**Red proofs.** Each case was planted in the main tree and restored from backup, and `cmp` confirmed the
restore. The planted body was `git add`-ed so the guard would treat it as committed, then removed with
`git rm --cached`.

```
=== E1-R0 (before, at cd3cb1b): hand-written entry, invented DOI 10.5555/closeout.planted.0001, no body
 Test Files  2 passed (2)      Tests  35 passed (35)          ← the Check's P3-5 probe, reproduced
=== E1-R1a: same entry, NO response field
   × P1 — … every entry has exactly the recorded fields …
   × P8 — … P8a every entry names a committed response
      Tests  2 failed | 15 passed (17)
=== E1-R1b: response names a body that does not exist
   × P8 — … P8a every entry names a committed response
      Tests  1 failed | 16 passed (17)
=== E1-R2: planted, COMMITTED body; the entry's sha256 does not match it
   × P8 — … P8b every named response hashes to its recorded sha256
      Tests  1 failed | 16 passed (17)
=== E1-R2b (limit, recorded): the same planted committed body, with the entry's sha256 CORRECT
      Tests  17 passed (17)
=== E1-R3: a real entry pointed at ANOTHER paper's committed body (correct hash)
   × P8 — … P8c every response parses, and is the record for the entry's identifier
      Tests  1 failed | 16 passed (17)
=== E1-R4: the entry's resolvedTitle AND the paper's title both changed (P4 stays green)
   × P8 — … P8d every entry's resolvedTitle is the title in its response
      Tests  1 failed | 16 passed (17)
=== restore: all green        Tests  17 passed (17)
```

**E1-R2b is the residual, stated rather than hidden.** An offline build cannot tell a real resolver body
from a hand-written, resolver-shaped one with a correct digest. What (e1) changes is the cost of a forgery:
it now needs a committed body in the diff, where before an unreviewable six-field entry was enough. The
phase-closeout live re-resolution, now the amended refresh policy's trigger (2), would fail an invented
identifier. **So "no known bypass" would overstate it.** The accurate wording is: *no bypass without
committing a forged resolver response, which review and the next closeout re-verification each catch.*

**P3-6:** the refresh policy (register §4 U5) is amended so that re-verification refreshes `verifiedOn`.
The U6 dated record notes the date change and that no call was made.

**Gate (e1):** tsc 0 · lint 415/415, 0 errors · vitest node 120 / **1554** (+5, P8) · jsdom 24 / 130 · build 0 · rendering OK · bundle OK · E2E 70 passed / 30 skipped · 55 staged paths clean, with the control detected.

---

## 9. Remediation (e2): content and copy (P3-7, P3-8 in part, P3-9)

**P3-7: D1/D2 now follows R6.** `src/lib/safety`:
- `NOT_IN_ABSTRACT` names the literal every card field reads when no abstract was captured.
- `isTitleOnly(paper)` is true when all seven card fields are unreported.
- `hasSupportingPaper(effect, papers)` counts a cited id missing from the list as supporting, so an
  incomplete list can never produce "no verified evidence".
- `gradeDCoverage(effect, papers)` now requires the papers, so the compiler enumerated its callers:
  `SupplementDetail`'s card and breakdown.
- The advisor's `effectView` uses the same predicate.

**glycine-sleep is now D2** on the card, in the breakdown header and in the advisor, which agrees with its
own summary. The seed case that pinned D1 was re-derived, and there are new unit tests for both R6 cases
plus the edges.

```
=== P37-M1 gradeDCoverage back to the old predicate (cites any paper → D1)
   × gradeDCoverage — D1/D2 follows R6 (P3-7) > all cited papers title-only → D2
   × coverage honesty — render (U7, [P3-X4]) > SupplementDetail — D2: glycine-sleep (…) — card and breakdown header
      Tests  2 failed | 52 passed (54)
=== P37-M2 isTitleOnly always false
   × … isTitleOnly … · × … all cited papers title-only → D2 · × … an effect whose cited papers are all title-only carries it too · × … D2: glycine-sleep …
      Tests  4 failed | 50 passed (54)
=== P37-M3 advisor back to its old uncited-only predicate
   × uncited effects carry the D2 sentence > getSupplement: an effect whose cited papers are all title-only carries it too
      Tests  1 failed | 53 passed (54)
=== restore        Tests  54 passed (54)
```

**P3-8, the parts that are done:**
- `caffeine-training.relevantPopulation`: *"athletes, training adults"* → **"recreational and trained runners,
  mostly men"**, taken from its one paper's abstract-derived population, *"254 recreational and trained
  runners, mostly men"* (PMID 36615805). It went JSON → `content:generate`, and exactly 2 files changed:
  the JSON and its generated module.
- The fish-oil-cardiovascular name versus its triglyceride outcome is registered as **FU-68**, Phase 4.

**P3-8, the part that is STOPPED: the studyQuality convention.** Codified as ruled (*"a randomised design with
no reported risk-of-bias rating = studyQuality 2"*), it does not match two effects, measured with
`deriveGrade` on a one-dimension variant:

| Effect | Rationale | Scored | The convention says | Grade if conformed |
|---|---|---|---|---|
| creatine-strength (A) | *"Placebo-controlled studies; the abstract reports **no randomisation** or risk-of-bias detail."* | 2 | not covered (randomisation not reported) | **A → B** (0.7667 → 0.6833) if re-judged to 1 |
| creatine-cognition (C) | *"Small randomised trials with no quality rating reported; the authors call for larger samples."* | 1 | 2 | C → C (0.4167 → 0.5000) |

The convention covers 8 effects without conflict: fish-oil-cardiovascular, protein-powder-training,
ashwagandha-sleep, berberine-metabolic, fish-oil-mood, l-theanine-focus, melatonin-sleep and
magnesium-metabolic. **Recording it cannot honestly claim "no grade moves" while creatine-strength sits
outside it**, and conforming either effect is a content change. Held for the owner.

**P3-9:** the three stale comments are fixed (comments only). `seed-effects.ts`'s generated header goes
through `content/modules.json`. `weights.ts:2` now states the derivation direction. `evidence-grading.ts:33`
now points at FU-63. The two that were unregistered are **FU-69** and **FU-70**, both registered as closed.

**Gate (e2):** tsc 0 · lint 415/415, 0 errors · vitest node 120 / **1560** (+6) · jsdom 24 / 130 · build 0 · rendering OK · bundle OK · E2E 70 passed / 30 skipped · 72 paths clean, with the control detected.

---

## 10. Remediation (e3): three `CLAUDE.md` corrections (P3-10), owner GO 2026-09-25

The diff is exactly as drafted and shown to the owner: the §4 header (~~measured 2026-08-02~~ re-checked
2026-09-25, pointing at DOC_TRUTH and N-85), §5 rule 10 (`npm run verify:bundle` after the build), and §12's
document map (7 rows: the Phase 2 plan, report and Check; the Phase 3 plan, plan review, report and Check).
DOC_TRUTH: 22/22.

---

## 11. Remediation (e2b): the studyQuality convention, R17 (P3-8), owner rulings 2026-09-25

**The first ruling** (*"a randomised design with no reported RoB rating = 2"*) did not fit creatine-strength
or creatine-cognition, and it was held (§9). **The second ruling** derived the convention from
`src/types/evidence-grading.ts:10`: controlled (randomised OR placebo-controlled) → 2, minus 1 when the
abstract itself flags small samples or high risk of bias; uncontrolled or mixed-observational → 1. It
applies only where the abstract reports no risk-of-bias rating.

**The scan.** A driver parsed every local `efetch.xml` and keyed each abstract by PMID. For the papers that
each studyQuality dimension cites, falling back to the effect's own papers, it looked for design words
(randomised / placebo / observational), a rating (risk of bias, GRADE, certainty, quality) and a flag (small
sample, larger sample, high risk of bias). Every ambiguous hit was then read in context. The false positives
it caught: *"sample size of 72 598"* is a count, and protein-mps reads *"only randomised controlled trials"*.
It found **2 disagreements**, magnesium-stress and l-theanine-stress, both convention 2 against a current 1.
**The third ruling:** apply the convention as written, with no exceptions.

**What changed:** both scores 1 → 2. The rationales use the abstracts' own words and keep the limits
visible. *"Post-hoc"* is not in the magnesium abstract, which says *"previously unreported secondary
analysis"*, so that is the wording used. Re-derived: **magnesium-stress D (0.2167 → 0.3000), l-theanine-stress D
(0.2500 → 0.3333); confidence `low` for both; all 27 stored grades equal `deriveGrade`.** The R10 tier pins
(D → experimental) needed no change. **New R17 pins** in `grade-changes.test.ts`:

```
=== E2b-M: magnesium-stress score back to 1 (JSON + regenerate)
   × R17 studyQuality convention … > 'magnesium-stress' → studyQuality 2, Grade 'D', confidence 'low'
      Tests  1 failed | 62 passed (63)
=== E2b-M: l-theanine-stress score back to 1 (JSON + regenerate)
   × R17 studyQuality convention … > 'l-theanine-stress' → studyQuality 2, Grade 'D', confidence 'low'
      Tests  1 failed | 62 passed (63)
=== restore        Tests  63 passed (63)
```

**Registered:** **R17** in the register (§4, before U5), with the 27-row table. **FU-71**: the size clause
relies on the authors' flag; an objective threshold is proposed; Phase 4, grouped with FU-61. **FU-72**:
scheduled live re-verification between closeouts; Phase 4.

**Gate (e2b):** tsc 0 · lint 415/415, 0 errors · vitest node 120 / **1562** (+2) · jsdom 24 / 130 · build 0 · rendering OK · bundle OK · E2E 70 passed / 30 skipped · 67 paths clean, with the control detected. **Gate (e3):** as for (e2), with DOC_TRUTH 22/22.

---

## 12. Remediation (e4): P3-1…P3-4, P3-11, docs

- **Roadmap:** the Phase 3 status line and section (all 11 units DONE; the Check is COMPLETE WITH FOLLOW-UP; the declaration is pending the owner). The five exit boxes are ticked, each pointing at its evidence. A dated note gives item 5's seam half as UNMET → FU-65 (P3-1). A dated note corrects the migration table to `advisor_messages.citations[].refId`, and the X5 caveat is written into the criterion's place (P3-11).
- **Register:** `[P3-X6]` is ticked (met trivially; the tombstone obligation moves to FU-57) and `[P3-X7]` is ticked with per-guard pointers (P3-3). There are §7 rows for FU-61, FU-62 and FU-63; owners and phases for FU-57, FU-58, FU-59 (products), FU-60 and FU-66; FU-49's glycine residue → FU-62, and `content/notes.json` now says so; criteria parity → Phase 4 with N-85 (P3-4).
- **`project-status.md`:** §2.1's figures were re-derived by command, and the old text is kept below. Risk #1 is restated. **The classification X → P is PROPOSED, not applied:** it is applied at the phase-closed declaration on the owner's go (P3-2).
- **Report:** the deferral table gains FU-68, FU-71 and FU-72, and the FU-62 and criteria-parity rows are updated.

**Gate (e4):** tsc 0 · lint 415/415, 0 errors · vitest node 120 / 1562 · jsdom 24 / 130 · build 0 · rendering OK · bundle OK · E2E 70 passed / 30 skipped · 70 paths clean, with the control detected.

---

## 13. Landing (f): delta check

The addendum is §8 of `docs/reviews/phase-3-closeout-check.md`, recorded verbatim. It ran against `8913605` with only the review, the register and the repo as inputs. **Result: 7 ADDRESSED · 4 CARRIED-WITH-OWNER · 0 NOT ADDRESSED; no finding blocks the declaration.** It ran 7 mutations of its own (M-A…M-G), and vitest gave 144 / 1692. It raised five items: D-1 (MINOR, the roadmap migration note omits products from `stack_items`), D-2 (TRIVIAL, a stale comment), D-3 (MINOR, the X5 decision is unrecorded), D-4 (TRIVIAL, redundant glycine copy) and D-5 (INFO, the `CLAUDE.md` baseline 1679 vs 1692). **They are held for the owner at the declaration.**
