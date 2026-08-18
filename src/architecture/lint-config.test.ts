// LINT_CONFIG — Phase 2 U18, roadmap item 9.
//
// WHAT THIS GUARD IS FOR, AND WHY IT IS NOT `verify-lint.mjs`.
// `npm run lint` (scripts/verify-lint.mjs) proves that ESLint ran over every
// tracked source file and found nothing. It runs as its own CI step. This file
// runs inside `vitest run`, and it governs the things a green `npm run lint`
// CANNOT see:
//
//   1. A `reportUnusedDisableDirectives` downgraded from "error" to "warn".
//      verify-lint does not fail on warnings, so the demotion is invisible to
//      it — and it is precisely the demotion that would let inert
//      `eslint-disable` comments accumulate again. U18 found FIVE of them,
//      naming rules from tooling that had never been installed. The setting is
//      what makes that state unrepresentable rather than merely cleaned up
//      once, so the setting is what has to be pinned.
//
//   2. A `lint` script repointed away from the wrapper. If `package.json` says
//      `next lint` again, CI's Lint step goes GREEN having asserted nothing —
//      the exact P-10 vacuity this unit exists to remove — and verify-lint.mjs
//      is not there to object, because it is what was removed.
//
//   3. `eslint-config-next` arriving as a dependency. Declining it was a
//      recorded ruling (see eslint.config.mjs's header): every rule that fires
//      here should be a rule someone in this repository adjudicated. A shared
//      config is a decision to be argued, not a default that drifts in.
//
// The config is IMPORTED, not regex-matched, so these assert real resolved
// values — nav-pillars.test.ts's split, applied here: everything checkable as a
// value is checked as a value.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import eslintConfig from "../../eslint.config.mjs";

const PKG = JSON.parse(readFileSync("package.json", "utf8"));

/**
 * Flat config is an array of blocks; a setting lives in whichever block declares
 * it. Typed structurally rather than as `any` — the fields this guard reads are
 * the fields it asserts on, so naming them here is the contract.
 */
interface FlatBlock {
  files?: unknown;
  linterOptions?: { reportUnusedDisableDirectives?: unknown };
  rules?: Record<string, unknown>;
}
const blocks = eslintConfig as unknown as FlatBlock[];

describe("LINT_CONFIG — the settings a green lint run cannot vouch for", () => {
  it("resolves a non-empty flat config", () => {
    // Anti-vacuity. Every assertion below searches `blocks`; a config that
    // resolved to [] would make all of them pass having examined nothing.
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("keeps unused eslint-disable directives an ERROR, not a warning", () => {
    const declaring = blocks.filter(
      (b) => b.linterOptions?.reportUnusedDisableDirectives !== undefined,
    );
    expect(
      declaring.length,
      "LINT_CONFIG: no block sets `reportUnusedDisableDirectives` at all.\n" +
        "ESLint's default is not an error, so an `eslint-disable` comment that\n" +
        "suppresses nothing would survive silently — the state U18 removed.",
    ).toBeGreaterThan(0);

    for (const b of declaring) {
      expect(
        b.linterOptions?.reportUnusedDisableDirectives,
        "LINT_CONFIG: `reportUnusedDisableDirectives` must be \"error\".\n" +
          '"warn" does not fail `npm run lint` — the check would report OK while\n' +
          "inert disable comments accumulate exactly as they did before U18.",
      ).toBe("error");
    }
  });

  it("configures react-hooks/rules-of-hooks as an error over the client components", () => {
    // The one rule set the roadmap names as valuable. It is also what makes
    // site 1's `exhaustive-deps` waiver in `src/components/ui/Tabs.tsx` a
    // waiver of something real: drop the plugin and that directive becomes an
    // unused directive, which rule 1 above turns into an error.
    const withHooks = blocks.filter((b) => b.rules?.["react-hooks/rules-of-hooks"]);
    expect(
      withHooks.length,
      "LINT_CONFIG: `react-hooks/rules-of-hooks` is not configured anywhere.\n" +
        "Roadmap item 9 names this rule, across the repository's client components,\n" +
        "as the reason a linter is worth having here at all.",
    ).toBeGreaterThan(0);
    for (const b of withHooks) {
      expect(b.rules?.["react-hooks/rules-of-hooks"]).toBe("error");
      expect(
        b.files,
        "LINT_CONFIG: the react-hooks block must state which files it governs.",
      ).toBeDefined();
    }
  });

  it("points `npm run lint` at the wrapper, never back at `next lint`", () => {
    expect(
      PKG.scripts.lint,
      "LINT_CONFIG: `npm run lint` must run scripts/verify-lint.mjs.\n" +
        "`next lint` cannot run non-interactively, emits nothing machine-readable\n" +
        "for the scope assertion, and is removed in Next 16 — and CI's Lint step\n" +
        "would go green having proved nothing, which is the defect U18 closed.",
    ).toBe("node scripts/verify-lint.mjs");
  });

  it("declares no `eslint-config-next` dependency", () => {
    const deps = { ...PKG.dependencies, ...PKG.devDependencies };
    expect(
      Object.keys(deps).filter((d) => d === "eslint-config-next"),
      "LINT_CONFIG: `eslint-config-next` is present. Declining it was a recorded\n" +
        "ruling — it enables `next/core-web-vitals` and a set of rules nobody here\n" +
        "has adjudicated. Adopting it is a decision to argue in a plan, not a\n" +
        "dependency to add.",
    ).toEqual([]);
  });

  it("keeps eslint and @eslint/js on the SAME major", () => {
    // Not style. Unpinned, `@eslint/js` resolves to 10.x, whose peer range
    // excludes eslint 9 — the install fails. That conflict was honoured rather
    // than overridden with --force, and this pins the honouring.
    const major = (v: string) => v.replace(/^[^0-9]*/, "").split(".")[0];
    expect(major(PKG.devDependencies["@eslint/js"])).toBe(
      major(PKG.devDependencies.eslint),
    );
  });
});
