// E2E_BROWSER_PARITY — the documented install and CI's install name the same browser (Phase 2 U22).
//
// ===========================================================================
// WHAT THIS ENFORCES, AND WHY IT IS NOT A STRING COMPARISON OF THE COMMAND
// ===========================================================================
// FU-26: a fresh clone cannot run the E2E suite. The pinned browser is not
// installed, and the failure presents as dozens of specs failing at once —
// which U17 recorded as reading like "a catastrophic application regression
// rather than a missing binary". The sharper half of that observation is the
// part worth keeping: the cache held a browser NEWER than the pin wanted, so
// "my browsers are installed" was actively misleading.
//
// U22 adds an install script and a README line. Both are prose-shaped things,
// and §3.5 is explicit that a documented rule nothing runs will rot. So the
// property is pinned mechanically:
//
//   The browser named by `package.json`'s install script, and the browser
//   named by the install step in `.github/workflows/ci.yml`, are the same.
//   And the README names the script, so the reader can find it.
//
// THE COMMANDS ARE DELIBERATELY NOT COMPARED, ONLY THE BROWSER. CI runs
// `playwright install --with-deps chromium`; the script runs `playwright
// install chromium`. `--with-deps` installs OS packages through the system
// package manager: correct on a disposable Linux runner, wrong on a
// developer's machine where it needs sudo and may prompt or fail. Documenting
// CI's exact string would hand a developer a command that fails precisely when
// they most need it. Asserting command equality would therefore force one of
// the two to be wrong, so the guard asserts the thing that actually has to
// agree — WHICH BROWSER — and lets the flag differ.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), "utf8");

/** Playwright's browser names. A install step naming none of these is a violation, not a pass. */
const BROWSERS = ["chromium", "firefox", "webkit", "chrome", "msedge"] as const;

/**
 * The browser a `playwright install …` command names.
 *
 * Returns `null` when the command installs no named browser — `playwright
 * install` with no argument installs ALL browsers, which is a different
 * (and much slower) contract than the pinned single browser CI uses, so it is
 * reported rather than silently treated as equal.
 */
export function installedBrowser(command: string): string | null {
  if (!/\bplaywright\s+install\b/.test(command)) return null;
  const after = command.split(/\bplaywright\s+install\b/)[1] ?? "";
  const words = after.split(/\s+/).filter((w) => w.length > 0 && !w.startsWith("-"));
  const named = words.find((w) => (BROWSERS as readonly string[]).includes(w));
  return named ?? null;
}

/**
 * The `run:` lines of every step in a workflow file.
 *
 * SINGLE-LINE `run:` ONLY, and that is a stated limitation rather than a bug.
 * A YAML block scalar (`run: |` / `run: >`) captures the indicator character,
 * not the indented body, so a block-scalar install step contributes nothing to
 * the inventory. It cannot produce a false GREEN — the "CI installs exactly one
 * named browser" assertion above fails loud on an empty inventory — but it
 * would read as a mystery failure, so: if `ci.yml`'s install step is ever
 * rewritten as a block scalar, this parser is what needs widening, not the
 * workflow. (ecc:code-reviewer, U22, advisory.)
 */
export function workflowRunLines(yaml: string): string[] {
  return [...yaml.matchAll(/^\s*run:\s*(.+)$/gm)].map((m) => m[1].trim());
}

// ---------------------------------------------------------------------------
// The inventories
// ---------------------------------------------------------------------------

const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
const SCRIPTS = PKG.scripts ?? {};

/** Scripts whose command installs a Playwright browser. */
const INSTALL_SCRIPTS = Object.entries(SCRIPTS).filter(([, cmd]) => installedBrowser(cmd) !== null);

const CI_YAML = read(".github/workflows/ci.yml");
const CI_INSTALLS = workflowRunLines(CI_YAML)
  .map(installedBrowser)
  .filter((b): b is string => b !== null);

const README = read("README.md");

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

describe("E2E_BROWSER_PARITY: the documented install and CI's install agree", () => {
  it("CI installs exactly one named browser", () => {
    // Anti-vacuity on the CI side. If this regex stops matching — the step is
    // renamed, moved to a composite action, or the workflow is restructured —
    // every other assertion here would pass over an empty set.
    expect(
      CI_INSTALLS,
      "E2E_BROWSER_PARITY found no `playwright install <browser>` step in ci.yml. " +
        "A parity check with nothing to compare against passes vacuously.",
    ).toHaveLength(1);
  });

  it("package.json has an install script, so the command is not CI-only", () => {
    // THE FU-26 ASSERTION. Before U22 the install command existed in exactly
    // one tracked file — ci.yml — so the only way to learn it was to read the
    // CI workflow, and the cost of not knowing it was a suite that failed as
    // dozens of specs at once.
    expect(
      INSTALL_SCRIPTS.map(([name]) => name),
      "E2E_BROWSER_PARITY: no script in package.json installs a Playwright browser, " +
        "so a fresh clone can only learn the command by reading .github/workflows/ci.yml (FU-26).",
    ).not.toEqual([]);
  });

  it("the script and CI name the same browser", () => {
    const fromScripts = [...new Set(INSTALL_SCRIPTS.map(([, cmd]) => installedBrowser(cmd)))];
    expect(
      fromScripts,
      `E2E_BROWSER_PARITY: package.json installs ${JSON.stringify(fromScripts)} but ci.yml installs ` +
        `${JSON.stringify([...new Set(CI_INSTALLS)])}. A developer following the documented step would ` +
        `install a different browser from the one CI runs the suite on.`,
    ).toEqual([...new Set(CI_INSTALLS)]);
  });

  it("the README names the install script, so a reader can find it", () => {
    // The script existing is not the deliverable; the script being FINDABLE is.
    const named = INSTALL_SCRIPTS.filter(([name]) => README.includes(name));
    expect(
      named.map(([name]) => name),
      "E2E_BROWSER_PARITY: README.md does not mention the install script, so the fresh-clone " +
        "reader is back to reading ci.yml — which is the whole of FU-26.",
    ).toEqual(INSTALL_SCRIPTS.map(([name]) => name));
  });
});

// ---------------------------------------------------------------------------
// Anti-rot — the detector's own logic, on synthetic input
// ---------------------------------------------------------------------------

describe("E2E_BROWSER_PARITY self-tests: break the detector and these go red", () => {
  it("reads the browser past any number of flags", () => {
    expect(installedBrowser("npx playwright install --with-deps chromium")).toBe("chromium");
    expect(installedBrowser("playwright install chromium")).toBe("chromium");
    expect(installedBrowser("npx playwright install --with-deps --force firefox")).toBe("firefox");
  });

  it("returns null for a bare install, which installs ALL browsers — a different contract", () => {
    expect(installedBrowser("npx playwright install")).toBeNull();
    expect(installedBrowser("npx playwright install --with-deps")).toBeNull();
  });

  it("is not fooled by a command that merely mentions a browser", () => {
    expect(installedBrowser("echo chromium")).toBeNull();
    expect(installedBrowser("playwright test --project=chromium")).toBeNull();
  });

  it("reads every run: line in a workflow, not just the first", () => {
    const yaml = ["      - name: a", "        run: npm ci", "      - name: b", "        run: npx playwright install webkit"].join("\n");
    expect(workflowRunLines(yaml)).toEqual(["npm ci", "npx playwright install webkit"]);
    expect(workflowRunLines(yaml).map(installedBrowser).filter(Boolean)).toEqual(["webkit"]);
  });
});
