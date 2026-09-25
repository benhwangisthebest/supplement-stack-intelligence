// CRITERIA_PARITY — the Phase 2 plan's §8 exit criteria and `docs/roadmap.md`'s
// Phase 2 list are two copies of one set of obligations, and until 2026-09-22
// nothing bound them. Spec: the Phase 2 plan §10.5, guard 1; obligation N-44,
// deferred to the closeout by U18 with its shape already written down.
//
// WHAT WENT WRONG WITHOUT IT, measured at close — the drift ran BOTH ways,
// which is the argument for a guard rather than a convention:
//   · `[P2-X7]` (db:migrate + CI coherence) was ticked in the roadmap on
//     2026-08-12 and never in §8.
//   · `[P2-X8]` (security headers) was ticked in §8 on 2026-08-10 and never in
//     the roadmap. That one was deliberate for a day and then expired, and
//     survived thirteen months because nothing read both lists.
//   · `[P2-X6]` (the ID manifest) existed ONLY in the roadmap. It had been met
//     since Phase 0 U8 and §8 did not know the obligation existed.
// A one-way drift reads as a convention. A two-way drift reads as nothing
// binding the lists, which is what it was.
//
// WHAT THIS DOES NOT DO, and the omission is the design:
//   It NEVER compares criterion TEXT. The two wordings differ on purpose — the
//   roadmap states the product obligation, §8 states the mechanical check. A
//   guard that compared text would force one list to become the other and
//   destroy the reason both exist. `tolerates divergent wording` below asserts
//   that divergence is present, so this cannot be quietly tightened later.
//
// Ids live in BOTH documents as `**[P2-Xn]**`. A criterion with no id is
// plan-only by design (the ten mechanism criteria the roadmap never claimed)
// and is deliberately out of the compared set — see `plan-only criteria`.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const PLAN = "docs/01-plan/phase-2-operational-dependability.plan.md";
const ROADMAP = "docs/roadmap.md";

/** Every id the phase issued. Pinned, so a parse that finds nothing fails. */
const EXPECTED_IDS = [
  "P2-X1", "P2-X2", "P2-X3", "P2-X4", "P2-X5",
  "P2-X6", "P2-X7", "P2-X8", "P2-X9",
] as const;

/** §8's total criterion count, id-carrying and plan-only together. */
const EXPECTED_PLAN_CRITERIA = 19;

/**
 * FU-42, Phase 4 U1: `[~]` is a third state. Before U1 the line regex skipped it
 * entirely, so marking a criterion partial dropped the pinned count and reddened
 * the build — a guard making one honest answer costlier than another. It is now
 * parsed, counted, and treated as NOT ticked; and it must carry its explanation.
 */
type State = " " | "x" | "~";
type Criterion = { id: string | null; ticked: boolean; state: State; text: string; explained: boolean };

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

/**
 * Slice a document between a start heading and the first terminator after it.
 * Fails loudly rather than returning an empty string: a section that moved is a
 * guard that silently stops checking, which is the failure mode this whole file
 * exists to prevent.
 */
function section(source: string, rel: string, start: RegExp, end: RegExp): string {
  const from = source.search(start);
  if (from < 0) throw new Error(`CRITERIA_PARITY: cannot find the criteria section in ${rel} (${start})`);
  const rest = source.slice(from);
  const to = rest.slice(1).search(end);
  return to < 0 ? rest : rest.slice(0, to + 1);
}

/**
 * A partial criterion is explained when it says PARTIAL and then says why: at
 * least 20 non-punctuation characters after the word, on its line or on the
 * indented lines that continue it (the roadmap's Phase 1 live-E2E row is the
 * live case). A bare `[~]` is an unexplained partial, the thing FU-42's
 * "no partial left unexplained" wording forbids.
 */
export function partialExplained(text: string): boolean {
  const i = text.search(/\bPARTIAL\b/);
  return i >= 0 && text.slice(i + "PARTIAL".length).replace(/[\s*.—–-]/g, "").length >= 20;
}

/** `- [x] **[P2-X7]** …` → { id: "P2-X7", ticked: true, state: "x", … }. `[~]` included. */
export function parseCriteria(block: string): Criterion[] {
  const out: Criterion[] = [];
  const lines = block.split("\n");
  lines.forEach((line, i) => {
    const m = /^- \[( |x|~)\] (.*)$/.exec(line);
    if (!m) return;
    const rest = m[2];
    const id = /^\*\*\[(P\d+-X\d+)\]\*\*/.exec(rest);
    let full = rest;
    for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) full += " " + lines[j].trim();
    const state = m[1] as State;
    out.push({
      id: id ? id[1] : null,
      ticked: state === "x",
      state,
      text: rest.replace(/^\*\*\[P\d+-X\d+\]\*\*\s*/, "").trim(),
      explained: state !== "~" || partialExplained(full),
    });
  });
  return out;
}

const planCriteria = parseCriteria(
  section(read(PLAN), PLAN, /^## 8\. Exit criteria$/m, /^## 9\. /m),
);
const roadmapCriteria = parseCriteria(
  section(
    section(read(ROADMAP), ROADMAP, /^## Phase 2 — Operational dependability$/m, /^## Phase 3 /m),
    ROADMAP,
    /^\*\*Exit criteria \(measurable\)\*\*$/m,
    /^---$/m,
  ),
);

const idsOf = (c: Criterion[]) => c.filter((x) => x.id).map((x) => x.id as string);
const byId = (c: Criterion[]) => new Map(c.filter((x) => x.id).map((x) => [x.id as string, x]));

describe("CRITERIA_PARITY — §8 and docs/roadmap.md's Phase 2 list", () => {
  it("finds a non-empty criteria list in each document", () => {
    expect(planCriteria.length).toBe(EXPECTED_PLAN_CRITERIA);
    expect(roadmapCriteria.length).toBeGreaterThan(0);
    expect(idsOf(planCriteria).length).toBeGreaterThan(0);
    expect(idsOf(roadmapCriteria).length).toBeGreaterThan(0);
  });

  it("issues exactly the pinned id set in the plan", () => {
    expect([...idsOf(planCriteria)].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("issues exactly the pinned id set in the roadmap", () => {
    expect([...idsOf(roadmapCriteria)].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("uses each id at most once per document", () => {
    for (const [rel, list] of [[PLAN, planCriteria], [ROADMAP, roadmapCriteria]] as const) {
      const ids = idsOf(list);
      expect(ids.length, `${rel} repeats an id: ${ids.join(", ")}`).toBe(new Set(ids).size);
    }
  });

  it("set equality, plan → roadmap: every §8 id has a roadmap counterpart", () => {
    const missing = idsOf(planCriteria).filter((id) => !byId(roadmapCriteria).has(id));
    expect(
      missing,
      `§8 carries ${missing.join(", ")} and ${ROADMAP} does not. ` +
        `Add the counterpart, or remove the id if the criterion is plan-only.`,
    ).toEqual([]);
  });

  it("set equality, roadmap → plan: every roadmap id has a §8 counterpart", () => {
    const missing = idsOf(roadmapCriteria).filter((id) => !byId(planCriteria).has(id));
    expect(
      missing,
      `${ROADMAP} carries ${missing.join(", ")} and §8 does not. ` +
        `This is P2-X6's failure mode: an obligation tracked in one list only.`,
    ).toEqual([]);
  });

  it("tick-state parity: no id is ticked on one side and not the other", () => {
    const plan = byId(planCriteria);
    const roadmap = byId(roadmapCriteria);
    const divergent = EXPECTED_IDS.filter(
      (id) => plan.has(id) && roadmap.has(id) && plan.get(id)!.state !== roadmap.get(id)!.state,
    ).map((id) => `${id}: §8=[${plan.get(id)!.state}] roadmap=[${roadmap.get(id)!.state}]`);
    expect(divergent, `tick state diverges — ${divergent.join(" · ")}`).toEqual([]);
  });

  it("tolerates divergent wording — the texts differ by design, and are never compared", () => {
    // Positive assertion of a NEGATIVE property: at least one paired criterion
    // is worded differently in the two documents. If this ever goes red it means
    // the lists have been flattened into each other, and the roadmap has stopped
    // stating the product obligation in its own voice.
    const plan = byId(planCriteria);
    const roadmap = byId(roadmapCriteria);
    const differing = EXPECTED_IDS.filter(
      (id) => plan.has(id) && roadmap.has(id) && plan.get(id)!.text !== roadmap.get(id)!.text,
    );
    expect(differing.length).toBeGreaterThan(0);
  });

  it("plan-only criteria carry no id, and there are some", () => {
    // The ten mechanism criteria the roadmap never claimed. Demanding roadmap
    // counterparts for these would be false by design — see §10.4.
    const planOnly = planCriteria.filter((c) => !c.id);
    expect(planOnly.length).toBe(EXPECTED_PLAN_CRITERIA - EXPECTED_IDS.length);
  });
});

// ---------------------------------------------------------------------------
// FU-42 and D-11 (a), Phase 4 U1. The roadmap now carries [P4-X1]…[P4-X3]
// (roadmap Phase 4, "Exit criteria"); the Phase 4 plan's §5 carries X1…X8. X4…X8
// are plan-only BY NAME, as Phase 3's X6…X9 were: they bind roadmap Testing and
// Security requirements and the opening decisions, and have no roadmap
// counterpart by design. Wording is NOT compared: X1…X3 are verbatim today, and a
// future edit to either side is a wording choice, not drift.
// ---------------------------------------------------------------------------
const P4_PLAN = "docs/01-plan/phase-4-product-completion.plan.md";
const P4_SHARED_IDS = ["P4-X1", "P4-X2", "P4-X3"] as const;
const P4_PLAN_ONLY_BY_NAME = ["P4-X4", "P4-X5", "P4-X6", "P4-X7", "P4-X8"] as const;

const p4Plan = parseCriteria(section(read(P4_PLAN), P4_PLAN, /^## 5\. Exit criteria$/m, /^## 6\. /m));
const p4Roadmap = parseCriteria(
  section(
    section(read(ROADMAP), ROADMAP, /^## Phase 4 — Product completion$/m, /^## Commercial /m),
    ROADMAP,
    /^\*\*Exit criteria \(measurable\)\*\*$/m,
    /^\*\*Backlog|^---$/m,
  ),
);

describe("CRITERIA_PARITY — Phase 4: §5 and docs/roadmap.md's Phase 4 list (FU-42, D-11 (a))", () => {
  it("CRITERIA_PARITY: the plan issues exactly X1…X8, the roadmap exactly X1…X3", () => {
    expect([...idsOf(p4Plan)].sort()).toEqual([...P4_SHARED_IDS, ...P4_PLAN_ONLY_BY_NAME].sort());
    expect([...idsOf(p4Roadmap)].sort()).toEqual([...P4_SHARED_IDS].sort());
  });

  it("CRITERIA_PARITY: the plan-only ids are excluded by name, and none appears in the roadmap", () => {
    const leaked = P4_PLAN_ONLY_BY_NAME.filter((id) => read(ROADMAP).includes(`[${id}]`));
    expect(leaked, `plan-only id(s) found in ${ROADMAP}: ${leaked.join(", ")}`).toEqual([]);
  });

  it("CRITERIA_PARITY: tick-state parity across [ ], [x] and [~] for X1…X3", () => {
    const plan = byId(p4Plan);
    const roadmap = byId(p4Roadmap);
    const divergent = P4_SHARED_IDS.filter((id) => plan.get(id)!.state !== roadmap.get(id)!.state).map(
      (id) => `${id}: §5=[${plan.get(id)!.state}] roadmap=[${roadmap.get(id)!.state}]`,
    );
    expect(divergent, `tick state diverges — ${divergent.join(" · ")}`).toEqual([]);
  });
});

describe("PARTIAL_EXPLAINED — a [~] criterion carries its explanation (FU-42)", () => {
  const roadmapAll = parseCriteria(read(ROADMAP));

  it("PARTIAL_EXPLAINED: the roadmap's [~] rows are parsed, and there is at least one (the live case)", () => {
    // Anti-vacuity: the Phase 1 live-E2E row is [~] today. A parser that stopped
    // seeing [~] would otherwise make the rule below pass by checking nothing.
    expect(roadmapAll.filter((c) => c.state === "~").length).toBeGreaterThan(0);
  });

  it("PARTIAL_EXPLAINED: every [~] in docs/roadmap.md and in the parity-read lists says PARTIAL and why", () => {
    const bare = [...roadmapAll, ...planCriteria, ...p4Plan]
      .filter((c) => c.state === "~" && !c.explained)
      .map((c) => c.text.slice(0, 80));
    expect(bare, `unexplained partial criterion(s):\n  ${bare.join("\n  ")}`).toEqual([]);
  });

  it("PARTIAL_EXPLAINED: self-test — a bare [~] is rejected, an explained one accepted, and [~] counts as not ticked", () => {
    const parsed = parseCriteria(
      [
        "- [~] Bare partial.",
        "- [~] Explained. — **PARTIAL.**",
        "      Non-live half measured; live half blocked on scheduling.",
        "- [x] Done.",
      ].join("\n"),
    );
    expect(parsed.map((c) => [c.state, c.explained, c.ticked])).toEqual([
      ["~", false, false],
      ["~", true, false],
      ["x", true, true],
    ]);
  });
});

// ---------------------------------------------------------------------------
// ARTIFACT_CAP — FU-45, Phase 4 U1 (owner clarification C-2, 2026-09-25).
//
// Cycle artifacts under docs/01-plan/features/*.plan.md carry a stated 200-line
// cap that nothing measured (FU-45: one reached 403). The set is derived from
// `git ls-files` (SPEC_COUNT's pattern), never from a directory listing, and is
// pinned non-empty so a glob that stops matching cannot pass. Files already over
// 200 at `66e6804` are pinned by name at that length on a SHRINK-ONLY list: they
// may not grow, an entry may only be lowered or removed, and an entry whose file
// is back under the cap must be removed. History is not shortened to fit (C-2).
// ---------------------------------------------------------------------------
const ARTIFACT_CAP = 200;
const ARTIFACT_GRANDFATHERED: Record<string, number> = {
  "docs/01-plan/features/architecture-boundary-repair.plan.md": 527,
  "docs/01-plan/features/context-adjusted-evidence.plan.md": 399,
  "docs/01-plan/features/mvp-core-loop.plan.md": 330,
  "docs/01-plan/features/p3-u10-rule8-tests.plan.md": 517,
  "docs/01-plan/features/p3-u2-corpus-migrates.plan.md": 217,
  "docs/01-plan/features/p3-u7-coverage-honesty.plan.md": 282,
  "docs/01-plan/features/p3-u8-bundle-budget.plan.md": 398,
  "docs/01-plan/features/p3-u9-rule7.plan.md": 249,
  "docs/01-plan/features/phase3-closeout.plan.md": 573,
  "docs/01-plan/features/phase3-plan.plan.md": 239,
  "docs/01-plan/features/phase4-plan.plan.md": 264,
  "docs/01-plan/features/product-match.plan.md": 286,
  "docs/01-plan/features/protocol-builder.plan.md": 292,
  "docs/01-plan/features/u31-openai-first-party.plan.md": 426,
};

/** Line count as `wc -l` reports it: the number of newline characters. */
const lineCount = (rel: string) => (read(rel).match(/\n/g) ?? []).length;

const ARTIFACTS = execFileSync("git", ["ls-files", "docs/01-plan/features/*.plan.md"], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter((f) => f.length > 0);

describe("ARTIFACT_CAP — cycle artifacts stay within 200 lines (FU-45, C-2)", () => {
  it("ARTIFACT_CAP: derives a non-empty artifact set from git ls-files", () => {
    expect(ARTIFACTS.length).toBeGreaterThan(20);
  });

  it("ARTIFACT_CAP: every artifact not grandfathered is at most 200 lines", () => {
    const over = ARTIFACTS.filter((f) => !(f in ARTIFACT_GRANDFATHERED))
      .map((f) => [f, lineCount(f)] as const)
      .filter(([, n]) => n > ARTIFACT_CAP)
      .map(([f, n]) => `${f}: ${n} lines`);
    expect(over, `artifact(s) over the ${ARTIFACT_CAP}-line cap:\n  ${over.join("\n  ")}`).toEqual([]);
  });

  it("ARTIFACT_CAP: a grandfathered artifact may not grow past its pinned length", () => {
    const grown = Object.entries(ARTIFACT_GRANDFATHERED)
      .filter(([f, pin]) => ARTIFACTS.includes(f) && lineCount(f) > pin)
      .map(([f, pin]) => `${f}: ${lineCount(f)} lines, pinned at ${pin}`);
    expect(grown, `grandfathered artifact(s) grew — the list is shrink-only:\n  ${grown.join("\n  ")}`).toEqual([]);
  });

  it("ARTIFACT_CAP: the grandfather list only shrinks — every entry is tracked and still over the cap", () => {
    const stale = Object.keys(ARTIFACT_GRANDFATHERED).filter((f) => !ARTIFACTS.includes(f) || lineCount(f) <= ARTIFACT_CAP);
    expect(stale, `remove these entries — untracked, or back under ${ARTIFACT_CAP}:\n  ${stale.join("\n  ")}`).toEqual([]);
  });
});
