// SPEC_COUNT — the number of executable architecture specs is stated in four
// documents, and until 2026-09-22 nothing bound any of them to the directory.
// Spec: the Phase 2 plan §10.5, guard 2; obligation N-52's mechanism half, and
// the retirement of the stacked date brackets at all four sites.
//
// WHY A GUARD AND NOT A DATED BRACKET, which is this repository's usual answer.
// "Date beside, never rewrite" is the right instrument for a claim that WAS
// true once. A monotonically changing number is not that: it restacks a bracket
// every time a unit adds a spec, and `docs/project-status.md` was already
// carrying FIVE stacked values (20 · 21 · 22 · 23 · 24) before this landing.
// The bracket was correct for a claim that changed twice and wrong for a claim
// that changes every unit.
//
// WHAT IT BINDS: the number a reader actually sees. Each site carries a visible
// `BOUND BY SPEC_COUNT at <n>` clause, and <n> must equal the directory count.
// A marker invisible in rendered Markdown was rejected: the prose could then say
// "seven" while a hidden comment said 26, which is the defect with extra steps.
//
// The leading "seven" at each site is HISTORICAL and deliberately left standing
// — it was true on 2026-08-06 and is dated as such. This guard binds the
// bracket's current value, not the sentence's original one.
//
// ANTI-VACUITY, the LINT_SCOPE lesson (M1c produced a green run reporting
// "39 of 39" with 316 files unlinted): the derived set is asserted non-empty AND
// pinned, and the site list is asserted to have found all four claims. A regex
// that matches nothing cannot pass.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

/**
 * Every document that states the count, with the phrase a reader scans for.
 * Adding a fifth site means adding it here — which is itself a claim this file
 * makes, and the reason the length is asserted below.
 */
const SITES = [
  { rel: "docs/project-status.md", occurrences: 2 },
  { rel: "docs/02-design/architecture-boundaries.md", occurrences: 1 },
  { rel: "README.md", occurrences: 1 },
] as const;

const EXPECTED_TOTAL_CLAIMS = 4;

/**
 * The count, derived from git rather than from the filesystem.
 *
 * `git ls-files` and not `readdirSync`: a verdict must be a property of the
 * REPOSITORY, not of one working tree (the R1 rule `boundaries.test.ts` already
 * follows). An untracked scratch spec must not move the number, and a spec that
 * is staged but not yet committed must — which is why a new spec needs
 * `git add -N` before this guard sees it, exactly as RLS_COVERAGE's M8 required.
 */
function trackedArchitectureSpecs(): string[] {
  const out = execFileSync("git", ["ls-files", "-z", "src/architecture"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  });
  return out.split("\0").filter((f) => f.endsWith(".test.ts"));
}

const specs = trackedArchitectureSpecs();
const N = specs.length;

/**
 * Normalise a document so a claim can be found whether it sits in prose or is
 * wrapped across the comment lines of a fenced code block. Strips leading `#`
 * comment markers and collapses whitespace; the claim's WORDS are what bind,
 * not its line breaks.
 */
function normalise(text: string): string {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*#\s?/, " "))
    .join(" ")
    .replace(/\s+/g, " ");
}

/** `BOUND BY \`SPEC_COUNT\` at \`26\`` → 26, in prose or in a comment fence. */
function claimsIn(rel: string): number[] {
  const text = normalise(readFileSync(path.join(ROOT, rel), "utf8"));
  const re = /BOUND BY `?SPEC_COUNT`? at `?\*{0,2}(\d+)\*{0,2}`?/g;
  const found: number[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) found.push(Number(m[1]));
  return found;
}

describe("SPEC_COUNT — the architecture-spec count, bound to the directory", () => {
  it("derives a non-empty spec set from git, not from a hand-written list", () => {
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.every((f) => f.startsWith("src/architecture/"))).toBe(true);
    // Pinned. A guard whose own inventory can silently empty is not a guard.
    expect(N).toBe(28);
  });

  it("finds a stated count at every site it claims to govern", () => {
    for (const site of SITES) {
      const claims = claimsIn(site.rel);
      expect(
        claims.length,
        `${site.rel}: expected ${site.occurrences} \`BOUND BY SPEC_COUNT at <n>\` claim(s), found ${claims.length}. ` +
          `A site that stops carrying the clause stops being checked — which is the whole defect.`,
      ).toBe(site.occurrences);
    }
  });

  it("finds exactly the four documented claims, no more and no fewer", () => {
    const total = SITES.reduce((n, s) => n + claimsIn(s.rel).length, 0);
    expect(total).toBe(EXPECTED_TOTAL_CLAIMS);
  });

  it("every documented count equals the directory count", () => {
    const wrong: string[] = [];
    for (const site of SITES) {
      claimsIn(site.rel).forEach((claimed, i) => {
        if (claimed !== N) wrong.push(`${site.rel} (claim ${i + 1}): says ${claimed}, directory has ${N}`);
      });
    }
    expect(
      wrong,
      `documented architecture-spec counts disagree with \`git ls-files src/architecture\`:\n  ` +
        wrong.join("\n  ") +
        `\nFix the DOCUMENT, not this guard: the directory is the fact.`,
    ).toEqual([]);
  });

  it("no site has quietly reverted to an unbound number", () => {
    // The four sites still carry their historical "seven" by design. What must
    // not happen is a site losing its bound clause and keeping only the prose.
    for (const site of SITES) {
      const text = normalise(readFileSync(path.join(ROOT, site.rel), "utf8"));
      expect(text, `${site.rel} no longer names SPEC_COUNT`).toContain("SPEC_COUNT");
    }
  });
});
