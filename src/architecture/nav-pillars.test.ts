import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PILLARS } from "@/components/layout/TopNav";

// ---------------------------------------------------------------------------
// NAV_PILLARS — Phase 2 U24, executing §7 decision 1 (ruled Option A 2026-08-08).
// ---------------------------------------------------------------------------
// THE RULE THIS GUARDS is rank-3 and stated as permanent in two places:
// `CLAUDE.md` §1 and `docs/product-direction.md` §3.3 — "Main navigation stays
// exactly three items: Library, Profile, Stack Lab." It was violated for
// signed-in users for months, in four lines of a component nothing asserted
// against, while both documents went on stating the rule. That is the whole
// case for this file existing: the rule lived only in prose, and §3.5 says
// prefer a mechanism over a paragraph.
//
// WHY SOURCE-LEVEL AND NOT A COMPONENT TEST. `boundaries.test.ts`'s
// `HARNESS_GAP` hard-fails on any tracked `*.test.tsx`, and this unit must not
// smuggle in a component-test harness to get around that — the constraint is
// U19's and applies here identically. So the structural half is read off the
// source text.
//
// THE SPLIT, because the two halves have very different strengths:
//   * The LABEL half imports `PILLARS` and asserts real values. Not a regex,
//     not brittle: if the array changes, this sees the change itself.
//   * The STRUCTURAL half must read source text, because "the array reaches
//     NavPills unconditionally" is a fact about the JSX, not about any value
//     the module exports. The plan named this brittleness up front rather than
//     leaving it for review, and the predicate below is deliberately narrow:
//     it asserts the ONE prop expression, and separately that no conditional
//     re-binding of the pillar list survives. A rewrite of TopNav that changes
//     how the prop is written will redden this file — and that is correct. A
//     change to how the nav is assembled SHOULD require re-reading this rule.
// ---------------------------------------------------------------------------

const TOPNAV = join(process.cwd(), "src/components/layout/TopNav.tsx");
const source = readFileSync(TOPNAV, "utf8");

// CODE ONLY — comments stripped before every structural assertion below.
//
// Not a convenience. N-14's audit of this repository's guards found that a
// literal match will happily accept a mention inside a comment; the same defect
// has the inverse shape here, and it fired on the first run: TopNav's own
// header comment says "handed to a single `<NavPills>`" while explaining the
// FU-27 defect, and the "rendered exactly once" assertion counted it as a
// second render. A guard that a file's PROSE can redden or green is not
// measuring the file's STRUCTURE.
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

/** The three names, quoted from `docs/product-direction.md` §3.3. */
const THE_THREE = ["Library", "Profile", "Stack Lab"];

describe("NAV_PILLARS — exactly three, and they are the three named ones", () => {
  it("PILLARS has exactly three entries", () => {
    expect(PILLARS).toHaveLength(3);
  });

  it("the labels are the three product-direction names, in order", () => {
    expect(PILLARS.map((p) => p.label)).toEqual(THE_THREE);
  });

  it("the hrefs are the three pillar routes", () => {
    expect(PILLARS.map((p) => p.href)).toEqual([
      "/library",
      "/profile",
      "/stack-lab",
    ]);
  });

  it("no pillar points at the Advisor", () => {
    // The specific regression FU-27 recorded. Asserted by value, so it holds
    // however the entry might be spelled or ordered.
    expect(PILLARS.some((p) => p.href.startsWith("/advisor"))).toBe(false);
    expect(PILLARS.some((p) => /advisor/i.test(p.label))).toBe(false);
  });

  it("the docs this rule lives in still say three", () => {
    // Binds the guard to the RULE rather than to a number I chose. If someone
    // deliberately relaxes the product rule (decision 1's option B, which was
    // NOT ruled), this fails and forces the guard to be revisited with it.
    const productDirection = readFileSync(
      join(process.cwd(), "docs/product-direction.md"),
      "utf8",
    );
    // Whitespace-normalised: the sentence WRAPS across a line break in the
    // source document, and a guard that a re-wrap can redden is measuring
    // formatting rather than the rule.
    expect(productDirection.replace(/\s+/g, " ")).toContain(
      "Main navigation stays exactly three items: Library, Profile, Stack Lab",
    );
  });
});

describe("NAV_PILLARS — the pillar group is fed unconditionally", () => {
  it("NavPills receives the PILLARS constant directly", () => {
    // The exact prop expression. `items={pillars}` — the old lowercase local
    // that held the conditional result — no longer exists and must not return.
    expect(code).toContain("<NavPills items={PILLARS} />");
  });

  it("no conditional array is built for the pillar group", () => {
    // The precise shape of the FU-27 defect: `user ? [...PILLARS, {…}] : PILLARS`.
    // Matches a spread of PILLARS inside an array literal anywhere in the file,
    // which is how any "append a fourth" reappears regardless of the condition.
    expect(code).not.toMatch(/\[\s*\.\.\.\s*PILLARS/);
  });

  it("NavPills is rendered exactly once", () => {
    // Two groups would satisfy every assertion above and still show four items.
    expect(code.match(/<NavPills/g) ?? []).toHaveLength(1);
  });
});

describe("NAV_PILLARS — the Advisor is top-level-adjacent, not removed", () => {
  it("the Advisor is still rendered and still reachable", () => {
    // Option A was PLACEMENT, not removal. A future change that simply deletes
    // the Advisor would satisfy every rule above and quietly lose a shipped
    // surface, so the presence is asserted as deliberately as the absence.
    expect(code).toContain('{ href: "/advisor", label: "Advisor" }');
    expect(code).toContain("href={ADVISOR.href}");
  });

  it("the Advisor renders inside the signed-in branch, beside sign-out", () => {
    // Signed-in only, as before the move — the placement changed, not the gate.
    const authedBranch = code.slice(
      code.indexOf("{user ? ("),
      code.indexOf(") : ("),
    );
    expect(authedBranch).toContain("ADVISOR.href");
    expect(authedBranch).toContain("signOut");
  });
});
