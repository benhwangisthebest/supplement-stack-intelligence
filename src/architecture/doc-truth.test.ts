// Executable guardrail for the ENFORCEMENT CLAIMS in `CLAUDE.md` (Phase 1 U14).
//
// WHY, and why only this. A stale count is a record defect; a stale ENFORCEMENT
// claim is a trust defect. A reader who sees
//
//     | 4 (`src/data` is a leaf) | **Enforced** | `boundaries.test.ts` — B4, B4b |
//
// stops checking, and reasonably so. If `B4b` were deleted tomorrow, nothing in
// this repository would notice: the rule would silently stop being enforced while
// the document went on promising that it was. That is the one doc↔code binding
// worth making executable, because both sides are already mechanical — the table
// names a file and rule ids, and those ids are literal test-title prefixes.
//
// EXPLICITLY OUT OF SCOPE, stated here so this file is not "helpfully" extended
// (plan §9, which argued the case against each):
//   * COUNTS of any kind — test counts, file counts, route counts, LOC, coverage
//     percentages. `CLAUDE.md` §5 already declares its own figures to be drifting
//     snapshots with CI as the authority; a guard that turned them into build
//     failures would contradict the document it claims to protect, and would fire
//     on every innocuous change until someone exempted it into uselessness.
//   * Anything under `docs/archive/**`, and anything in a dated review record.
//     §7 forbids rewriting the historical record; a guard that demanded a 2026-08
//     review be edited to match today's code would be demanding exactly that.
//
// WHAT IT ACTUALLY COMPUTES — read before trusting it (§2.2 rule 7):
//   A. Over `CLAUDE.md` §4 (from its heading to §5's), it extracts the rule table
//      and every `B<n>` id mentioned in the section, then binds them BOTH ways
//      against the real test titles in the files the table names. Both directions
//      matter: a rule that quietly GAINED enforcement without a doc update is a
//      staleness bug too, just a happier one.
//   B. Over `CLAUDE.md` §5's CI sentence and `.github/workflows/ci.yml`, it
//      checks the declared triggers, and binds the declared step chain to the
//      workflow's `run:` steps TOTALLY — as an ordered equality, not a subset.
//      Totality was added by FU-23 after U13 added a fifth step (coverage) and
//      this guard stayed green: it only asserted that the four DECLARED steps
//      were present and ordered, so an UNDECLARED step was invisible to it.
//      §5 was corrected by hand, and nothing forced that. Now the two lists must
//      match exactly, so a step added to CI without a doc update fails here.
//
// WHAT IT DOES NOT COMPUTE:
//   * It cannot tell that a test named `B4b:` actually enforces rule 4. It binds
//     NAMES, not semantics. A test gutted to `expect(true).toBe(true)` under the
//     same title passes here — that is what mutation proofs are for.
//   * It does not parse Markdown. It reads the section as text between two
//     headings, which is why a renamed heading fails loudly rather than silently
//     scanning nothing (see the anti-vacuity assertions).
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

const CLAUDE_MD = read("CLAUDE.md");
const CI_YML = read(".github/workflows/ci.yml");
const BOUNDARIES = read("src/architecture/boundaries.test.ts");

/** The text between two `## ` headings, matched by their leading number. */
export function section(markdown: string, from: number, to: number): string {
  const start = markdown.indexOf(`\n## ${from}.`);
  const end = markdown.indexOf(`\n## ${to}.`);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `DOC_TRUTH could not locate CLAUDE.md §${from}…§${to}. A renamed or renumbered\n` +
        "heading fails here loudly rather than letting this guard scan an empty string.",
    );
  }
  return markdown.slice(start, end);
}

export interface RuleRow {
  /** Rule numbers named in the first cell — `1, 2, 3` yields three. */
  rules: number[];
  enforced: boolean;
  /** `*.test.ts` files named in the third cell. */
  files: string[];
  /** `B<n>` ids named in the third cell. */
  ids: string[];
}

/** Parse the `| Rule | Status | Enforced by |` table out of §4. */
export function readRuleTable(sectionText: string): RuleRow[] {
  const rows: RuleRow[] = [];
  let inTable = false;
  for (const line of sectionText.split("\n")) {
    if (/^\|\s*Rule\s*\|\s*Status\s*\|/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!line.startsWith("|")) break; // table ended
    if (/^\|[-\s|]+\|$/.test(line)) continue; // separator

    const cells = line.split("|").slice(1, -1);
    if (cells.length < 3) continue;
    const [ruleCell, statusCell, byCell] = cells;
    rows.push({
      rules: [...ruleCell.matchAll(/\d+/g)].map((m) => Number(m[0])),
      // "Not enforced" and "Not enforced generally" are both negative; only a
      // bare "Enforced" counts, so the check cannot be fooled by the substring.
      enforced: !/not enforced/i.test(statusCell) && /enforced/i.test(statusCell),
      files: [...byCell.matchAll(/([a-z0-9-]+\.test\.ts)/gi)].map((m) => m[1]),
      ids: [...byCell.matchAll(/\bB\d+[a-z]?\b/g)].map((m) => m[0]),
    });
  }
  return rows;
}

/** `it("B4b: …")` → `B4b`. The ids in the table are literal title prefixes. */
export function testIdsIn(source: string): string[] {
  return [...source.matchAll(/it\(\s*"(B\d+[a-z]?):/g)].map((m) => m[1]);
}

/**
 * The step chain §5 declares, e.g. "`npm ci` → typecheck → `vitest run` →
 * **coverage thresholds** → `next build`", as plain labels in order.
 *
 * Anchored on `GitHub Actions \`CI\`:` and terminated by the first `,` after the
 * chain — §5 continues ", on **every branch push**", which is the trigger clause
 * that a separate rule already binds.
 */
export function readDeclaredSteps(sectionText: string): string[] {
  const m = /GitHub Actions `CI`:([^,]*)/.exec(sectionText);
  if (!m) {
    throw new Error(
      "DOC_TRUTH could not find §5's CI step chain. It is anchored on the literal\n" +
        "'GitHub Actions `CI`:' — a reworded sentence fails here rather than letting\n" +
        "this guard bind an empty list.",
    );
  }
  return m[1]
    .split("→")
    .map((s) => s.replace(/[`*]/g, "").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0);
}

/** Every `run:` command in `ci.yml`, in file order. */
export function readWorkflowRunSteps(yml: string): string[] {
  return [...yml.matchAll(/^\s*(?:-\s*)?run:\s*(.+?)\s*$/gm)].map((m) => m[1]);
}

/**
 * §5 names steps the way a reader would ("typecheck"), while the workflow runs
 * npm scripts ("npm run typecheck"). This is the ONLY place the two vocabularies
 * are joined, so an unmapped label is a hard failure rather than a silent skip:
 * adding a step to §5 without deciding what it binds to must not pass.
 */
const DECLARED_STEP_COMMANDS: Record<string, string> = {
  "npm ci": "npm ci",
  typecheck: "npm run typecheck",
  "vitest run": "npm test",
  "coverage thresholds": "npm run test:coverage",
  "next build": "npm run build",
};

const SECTION_4 = section(CLAUDE_MD, 4, 5);
const SECTION_5 = section(CLAUDE_MD, 5, 6);
const TABLE = readRuleTable(SECTION_4);

/**
 * Rules the table calls unenforced, and the guard name each would carry if it
 * ever gained one. Binding these is the "gained enforcement silently" direction.
 */
const UNENFORCED_MARKERS: Record<number, string> = {
  5: "DOMAIN_IS_PURE",
  7: "CLIENT_PROPS",
  9: "PAID_API_BUDGET",
};

describe("DOC_TRUTH — CLAUDE.md §4's enforcement table", () => {
  it("finds a non-empty rule table to check", () => {
    // Anti-vacuity. Every rule below iterates TABLE; a parse that silently
    // produced nothing would make all of them pass having checked nothing.
    expect(TABLE.length).toBeGreaterThan(0);
    expect(TABLE.some((r) => r.enforced)).toBe(true);
    expect(TABLE.some((r) => !r.enforced)).toBe(true);
  });

  it("accounts for architecture rules 1–9 exactly once each", () => {
    const seen = TABLE.flatMap((r) => r.rules).sort((a, b) => a - b);
    expect(
      seen,
      "DOC_TRUTH: §4's table must account for every architecture rule exactly once.\n" +
        "A rule missing from the table has no stated enforcement status at all, and a\n" +
        "rule listed twice can carry two contradictory ones.",
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("names an enforcer on every row it calls Enforced", () => {
    // Found by U14's own M2 mutation, which SURVIVED without this rule: flipping
    // rule 5's status to "**Enforced**" changed nothing, because that row names
    // no test file and no rule id, so there was nothing for the bindings below to
    // check. An "Enforced" claim with no named enforcer is unfalsifiable — the
    // one thing a doc-truth guard must not permit.
    const unbacked = TABLE.filter((r) => r.enforced && r.files.length === 0 && r.ids.length === 0)
      .map((r) => `rule ${r.rules.join(", ")}`)
      .sort();
    expect(
      unbacked,
      "DOC_TRUTH: §4 marks a rule Enforced without naming what enforces it.\n" +
        "Name the test file and its rule ids, or mark the row Not enforced. A bare\n" +
        '"Enforced" is a promise no reader can check and no guard can bind:\n  ' +
        unbacked.join("\n  "),
    ).toEqual([]);
  });

  it("names only test files that exist", () => {
    const missing = TABLE.flatMap((r) => r.files)
      .filter((f) => !fs.existsSync(path.join(REPO_ROOT, "src/architecture", f)))
      .sort();
    expect(
      missing,
      "DOC_TRUTH: §4's table claims enforcement by a file that does not exist:\n  " +
        missing.join("\n  "),
    ).toEqual([]);
  });

  it("names only rule ids that are real test titles", () => {
    const real = testIdsIn(BOUNDARIES);
    const claimed = TABLE.flatMap((r) => r.ids);
    const phantom = claimed.filter((id) => !real.includes(id)).sort();
    expect(
      phantom,
      "DOC_TRUTH: §4 claims a rule is enforced by a test that does not exist.\n" +
        "This is the exact failure the guard exists for: the document promises\n" +
        "enforcement a reader will not re-verify:\n  " + phantom.join("\n  "),
    ).toEqual([]);
  });

  it("mentions every rule test that exists — the reverse direction", () => {
    // A `B<n>` test added without a doc update leaves the table understating
    // what is enforced. Ids are collected from the whole of §4, not only the
    // table, because B5 is documented in the prose beneath it.
    const documented = [...SECTION_4.matchAll(/\bB\d+[a-z]?\b/g)].map((m) => m[0]);
    const undocumented = testIdsIn(BOUNDARIES)
      .filter((id) => !documented.includes(id))
      .sort();
    expect(
      undocumented,
      "DOC_TRUTH: these boundary rules are enforced but §4 never mentions them.\n" +
        "Undocumented enforcement is the happier staleness, but it is still drift —\n" +
        "and the next reader cannot tell the rule from an accident:\n  " +
        undocumented.join("\n  "),
    ).toEqual([]);
  });

  it("claims no enforcement for the rules it lists as unenforced", () => {
    const titles = [...BOUNDARIES.matchAll(/it\(\s*"([^"]+)/g)].map((m) => m[1]);
    const contradictions: string[] = [];
    for (const row of TABLE) {
      if (row.enforced) continue;
      for (const rule of row.rules) {
        const marker = UNENFORCED_MARKERS[rule];
        if (marker && titles.some((t) => t.startsWith(`${marker}:`))) {
          contradictions.push(`rule ${rule}: §4 says not enforced, but ${marker}: exists`);
        }
      }
    }
    expect(
      contradictions.sort(),
      "DOC_TRUTH: §4 understates enforcement — a guard now exists for a rule the\n" +
        "table still calls unenforced. Update the table when the ratchet lands:\n  " +
        contradictions.join("\n  "),
    ).toEqual([]);
  });
});

describe("DOC_TRUTH — CLAUDE.md §5's CI claim vs the workflow", () => {
  it("finds the CI sentence to check", () => {
    expect(SECTION_5).toContain("GitHub Actions");
  });

  it("matches the declared triggers", () => {
    // §5 claims: "on every branch push, on PRs into `main`, and on
    // `workflow_dispatch`". Each clause is bound to the YAML separately so the
    // failure names which one drifted.
    const claimsEveryBranch = /every branch push/i.test(SECTION_5);
    const claimsPrIntoMain = /PRs into `main`/i.test(SECTION_5);
    const claimsDispatch = /workflow_dispatch/i.test(SECTION_5);

    expect(claimsEveryBranch && claimsPrIntoMain && claimsDispatch).toBe(true);

    expect(
      /push:\s*\n\s*branches:\s*\["\*\*"\]/.test(CI_YML),
      "DOC_TRUTH: §5 says CI runs on EVERY branch push, but ci.yml's push trigger is\n" +
        'not `branches: ["**"]`. An enumerated prefix list silently excluded every\n' +
        "fix/*, docs/* and chore/* branch for the whole of Phase 0 — the reason the\n" +
        "workflow comments say a prefix list goes stale and `**` cannot.",
    ).toBe(true);

    expect(
      /pull_request:\s*\n(?:\s*#[^\n]*\n)*\s*branches:\s*\[main\]/.test(CI_YML),
      "DOC_TRUTH: §5 claims PRs into `main` are verified; ci.yml does not say so.",
    ).toBe(true);

    expect(
      /^\s{2}workflow_dispatch:/m.test(CI_YML),
      "DOC_TRUTH: §5 claims a manual trigger; ci.yml has no workflow_dispatch.",
    ).toBe(true);
  });

  it("every step §5 declares is one this guard knows how to bind", () => {
    // Anti-vacuity, and the reason an unmapped label cannot pass quietly: a step
    // added to §5 with no entry in DECLARED_STEP_COMMANDS would otherwise drop
    // out of the comparison below and weaken the very rule it extends.
    const declared = readDeclaredSteps(SECTION_5);
    expect(declared.length, "DOC_TRUTH: §5's CI step chain parsed as empty.").toBeGreaterThan(0);

    const unmapped = declared.filter((d) => !(d in DECLARED_STEP_COMMANDS));
    expect(
      unmapped,
      "DOC_TRUTH: §5 names a CI step this guard cannot bind to a command:\n  " +
        `${unmapped.join(", ")}\n` +
        "Add it to DECLARED_STEP_COMMANDS with the `run:` command it refers to.",
    ).toEqual([]);
  });

  it("binds the declared step chain to ci.yml's steps EXACTLY, in order", () => {
    // TOTAL, not a subset — see FU-23 in the header. The two lists are compared
    // as ordered sequences, so BOTH failure directions are caught: a declared
    // step missing from CI, and a step CI runs that §5 never declared.
    const declared = readDeclaredSteps(SECTION_5).map((d) => DECLARED_STEP_COMMANDS[d]);
    const actual = readWorkflowRunSteps(CI_YML);

    expect(
      actual,
      "DOC_TRUTH: §5's declared CI steps and ci.yml's `run:` steps have diverged.\n" +
        `  §5 declares: ${declared.join(" → ")}\n` +
        `  ci.yml runs: ${actual.join(" → ")}\n` +
        "Either the workflow gained/lost/reordered a step, or §5 was not updated with it.\n" +
        "This is an ordered EQUALITY: an undeclared extra step fails exactly as a\n" +
        "missing one does.",
    ).toEqual(declared);
  });

  it("resolves the npm-script indirections §5 names by their real command", () => {
    // §5 says "typecheck", "vitest run" and "next build"; CI runs npm scripts.
    // Without this, the mapping above could point at a script that no longer
    // runs the tool §5 promises.
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.typecheck).toContain("tsc");
    expect(pkg.scripts.test).toContain("vitest run");
    expect(pkg.scripts["test:coverage"]).toContain("coverage");
    expect(pkg.scripts.build).toContain("next build");
  });
});

// ---------------------------------------------------------------------------
// ANTI-ROT SELF-TESTS (the Phase 0 N3 pattern)
//
// The rules above pass because the document and the code agree. That cannot tell
// you the PARSERS still work — a parser that matches nothing also reports no
// drift. These drive them against synthetic input with a known answer.
// ---------------------------------------------------------------------------
describe("DOC_TRUTH — parser self-tests", () => {
  const TABLE_MD = [
    "| Rule | Status | Enforced by |",
    "|---|---|---|",
    "| 1, 2 | **Enforced** | `boundaries.test.ts` — B1, B2b |",
    "| 3 (something) | Not enforced | no mechanical check |",
    "| 4 | Not enforced generally | partly via `error-disclosure.test.ts` |",
    "",
    "trailing prose mentioning B9",
  ].join("\n");

  it("reads multi-rule cells, files and ids", () => {
    const rows = readRuleTable(TABLE_MD);
    expect(rows).toHaveLength(3);
    expect(rows[0].rules).toEqual([1, 2]);
    expect(rows[0].ids).toEqual(["B1", "B2b"]);
    expect(rows[0].files).toEqual(["boundaries.test.ts"]);
  });

  it("reads `Not enforced generally` as NOT enforced", () => {
    // The substring "enforced" appears in both statuses; only the negation
    // distinguishes them, and getting this backwards would silently invert the
    // strictest rule in the file.
    const rows = readRuleTable(TABLE_MD);
    expect(rows.map((r) => r.enforced)).toEqual([true, false, false]);
  });

  it("stops at the end of the table instead of eating following prose", () => {
    expect(readRuleTable(TABLE_MD).flatMap((r) => r.ids)).not.toContain("B9");
  });

  it("extracts test-title ids and ignores non-rule titles", () => {
    const ids = testIdsIn(
      'it("B4: src/data is a leaf", () => {});\nit("discovers the source tree", () => {});\nit("B4b: x", () => {});',
    );
    expect(ids).toEqual(["B4", "B4b"]);
  });

  it("fails loudly when a section heading cannot be found", () => {
    expect(() => section("# nothing here", 4, 5)).toThrow(/could not locate/);
  });

  // --- FU-23: the two parsers behind the TOTAL step binding ------------------

  it("reads §5's step chain, stripping markdown and stopping at the trigger clause", () => {
    expect(
      readDeclaredSteps(
        "prose (GitHub Actions `CI`: `npm ci` → typecheck → **coverage thresholds** → " +
          "`next build`, on **every branch push**, and on `workflow_dispatch`).",
      ),
      // The trailing ", on **every branch push**…" must NOT be read as a step.
    ).toEqual(["npm ci", "typecheck", "coverage thresholds", "next build"]);
  });

  it("fails loudly when §5's CI sentence is reworded away", () => {
    expect(() => readDeclaredSteps("CI runs some steps.")).toThrow(/could not find/);
  });

  it("reads every `run:` step from a workflow, in order", () => {
    const yml = [
      "jobs:",
      "  verify:",
      "    steps:",
      "      - name: Install",
      "        run: npm ci",
      "      # a comment between steps",
      "      - name: Typecheck",
      "        run: npm run typecheck",
      "      - name: Build",
      "        run: npm run build",
    ].join("\n");
    expect(readWorkflowRunSteps(yml)).toEqual(["npm ci", "npm run typecheck", "npm run build"]);
  });

  it("sees an UNDECLARED extra step — the case that let FU-23 through", () => {
    // The old rule asked only "are the declared steps present, in order?", which
    // this input satisfies. Totality is what makes the extra step visible.
    const declared = ["npm ci", "npm run build"];
    const actual = readWorkflowRunSteps(
      ["        run: npm ci", "        run: npm run sneaky", "        run: npm run build"].join(
        "\n",
      ),
    );
    expect(declared.every((d) => actual.includes(d))).toBe(true); // old rule: green
    expect(actual).not.toEqual(declared); // total rule: red
  });
});
