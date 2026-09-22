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

type Criterion = { id: string | null; ticked: boolean; text: string };

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

/** `- [x] **[P2-X7]** …` → { id: "P2-X7", ticked: true, text: "…" } */
function parseCriteria(block: string): Criterion[] {
  const out: Criterion[] = [];
  for (const line of block.split("\n")) {
    const m = /^- \[( |x)\] (.*)$/.exec(line);
    if (!m) continue;
    const rest = m[2];
    const id = /^\*\*\[(P2-X\d+)\]\*\*/.exec(rest);
    out.push({
      id: id ? id[1] : null,
      ticked: m[1] === "x",
      text: rest.replace(/^\*\*\[P2-X\d+\]\*\*\s*/, "").trim(),
    });
  }
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
      (id) => plan.has(id) && roadmap.has(id) && plan.get(id)!.ticked !== roadmap.get(id)!.ticked,
    ).map((id) => `${id}: §8=${plan.get(id)!.ticked ? "[x]" : "[ ]"} roadmap=${roadmap.get(id)!.ticked ? "[x]" : "[ ]"}`);
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
