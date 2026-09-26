// Phase 4 U5 — the B-gate report (owner ruling D-2 (c)). (a) listed the four candidates, report-only.
// [2026-09-26, U5 (b)] The owner batch chose G1 and deriveGrade now applies it (B_GATE), so the
// report states the chosen rule at the top. The four candidate tables are unchanged.
//
//   npm run evidence:gate-report              write docs/05-qa/2026-09-25-b-gate-report.md
//   npm run evidence:gate-report -- --out F   write F instead
//
// Reads the authored effects (content/seed/seed-effects.json) and applies each candidate rule
// through the engine itself (src/lib/evidence-grading/gate.ts), so the report cannot disagree
// with the gate. Runs under tsx because the engine is TypeScript. No network, no clock: the
// same input gives the same bytes. It changes no grade; it only lists what each rule would move.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { B_GATE, CANDIDATE_RULES, gateMoves } from "../src/lib/evidence-grading/gate.ts";
import { deriveGrade } from "../src/lib/evidence-grading/index.ts";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = "content/seed/seed-effects.json";
const DEFAULT_OUT = "docs/05-qa/2026-09-25-b-gate-report.md";
const DIMS = ["humanEvidence", "studyQuality", "consistency", "effectSize", "populationRelevance"];
const OUTSIDE = "outside D-2's wording — owner decides";

const outArg = process.argv.indexOf("--out");
const out = path.resolve(REPO, outArg > -1 ? process.argv[outArg + 1] : DEFAULT_OUT);

const raw = readFileSync(path.join(REPO, INPUT));
const effects = JSON.parse(raw.toString("utf8"));
const sha = createHash("sha256").update(raw).digest("hex");

const cell = (s) => String(s).replace(/\|/g, "\\|");
const floors = (r) => Object.entries(r.floors).map(([d, n]) => `${d} ≥ ${n}`).join(" AND ");
const tally = {};
for (const e of effects) tally[e.grade] = (tally[e.grade] ?? 0) + 1;
const mismatched = effects.filter((e) => deriveGrade(e.evidenceProfile) !== e.grade).length;
const results = CANDIDATE_RULES.map((rule) => ({ rule, moves: gateMoves(effects, rule) }));
const chosenMoves = results.find((r) => r.rule === B_GATE).moves.length;

const lines = [
  "# B-gate report — the four candidate rules (Phase 4 U5 (a))",
  "",
  `> **Chosen rule (owner batch 2026-09-26, U5 (b)): ${B_GATE.id} — ${floors(B_GATE)}.** \`deriveGrade\` caps a composite of B or better`,
  `> at **C** when it fails, and an uncited effectSize fails it (an R5 zero, FU-74). ${B_GATE.id} moves **${chosenMoves}** stored`,
  "> grades (its table below). The four tables below are U5 (a)'s candidate report.",
  "",
  `> **Generated** by \`npm run evidence:gate-report\` (\`scripts/evidence-gate-report.mjs\`) from \`${INPUT}\``,
  `> (sha256 \`${sha}\`). Do not edit by hand; re-run it.`,
  "> **The candidates (D-2 (c)).** Each table is what that rule, alone, would move. A rule applies to a composite of B or better; an effect that fails it is",
  "> shown one letter down **for this report only**. A-grade rows are marked *" + OUTSIDE + "* (ruling (ii)).",
  "> Rationales are the profile's own text, verbatim (a `|` is escaped for the table). A failing dimension that cites",
  "> no paper is marked **not assessed (R5)**: R5 scores an uncited dimension 0.",
  "",
  `**Stored grades:** ${["A", "B", "C", "D"].map((g) => `${g} ${tally[g] ?? 0}`).join(" · ")} (${effects.length} effects).`,
  `Stored ≠ derived: **${mismatched}** (G4b).`,
  "**Ratings** are listed as humanEvidence · studyQuality · consistency · effectSize · populationRelevance.",
  "",
  "## Summary",
  "",
  "| Rule | Floors | B → C | A → B |",
  "|---|---|---|---|",
  ...results.map(({ rule, moves }) => {
    const n = (g) => moves.filter((m) => m.storedGrade === g).length;
    return `| ${rule.id} | ${floors(rule)} | ${n("B")} | ${n("A")} |`;
  }),
];

for (const { rule, moves } of results) {
  lines.push("", `## ${rule.id} — ${floors(rule)}`, "");
  if (moves.length === 0) {
    lines.push("No effect moves under this rule.");
    continue;
  }
  lines.push(
    "| Effect | Stored | Composite | Ratings | Would move | Failing | Rationale (verbatim) | paperIds |",
    "|---|---|---|---|---|---|---|---|",
  );
  for (const m of moves) {
    const move = `${m.storedGrade} → ${m.movedTo}` + (m.storedGrade === "A" ? ` *(${OUTSIDE})*` : "");
    for (const f of m.failing) {
      const papers = f.paperIds.length ? f.paperIds.map((p) => `\`${p}\``).join(", ") : "— **not assessed (R5)**";
      lines.push(
        `| \`${m.id}\` | ${m.storedGrade} | ${m.composite.toFixed(3)} | ${DIMS.map((d) => m.scores[d]).join(" · ")} | ` +
          `${move} | ${f.dimension} ${f.score} < ${f.floor} | ${cell(f.rationale)} | ${papers} |`,
      );
    }
  }
}

writeFileSync(out, lines.join("\n") + "\n");
console.log(`evidence:gate-report: wrote ${path.relative(REPO, out)} (${lines.length + 1} lines)`);
