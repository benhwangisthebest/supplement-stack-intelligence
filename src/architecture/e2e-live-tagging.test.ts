// Executable guardrail for `CLAUDE.md` §5.9 — the `[LIVE]` tag (Phase 1 U16,
// closing closeout finding C-9).
//
// WHY. 17 of 23 E2E spec files skip themselves unless `E2E_LIVE=1`. Run without
// it, Playwright reports those blocks as SKIPPED, which is honest — but the
// summary line a human reads ("N passed") is not, because nothing in a title
// says which coverage was actually exercised. §5.9 fixes that by requiring the
// gated block to say so in its own name. C-9 measured the state before this
// unit: 17 gated files, **0** tags.
//
// §5.9 also warns that the `L1/L2/L3` prefix does NOT signal gating, and the
// inventory proves it: `L1: advisor-actions authed validation + lifecycle` is
// gated while `L1: advisor-actions API auth guard (no auth)` is not. Same
// prefix, opposite truth. That is exactly why the tag has to be separate.
//
// WHAT IT COMPUTES — read before trusting it (§2.2 rule 7):
//   Over every `tests/e2e/*.spec.ts`, it finds each `test.describe(...)` and
//   `test(...)` block, tracks which one lexically encloses each
//   `test.skip(!LIVE, …)`, and binds gating to tagging BOTH ways:
//     * gated but untagged  -> LIVE_TAGGING (the C-9 defect);
//     * tagged but ungated  -> LIVE_TAGGING (the opposite lie — a block that
//       claims to need credentials but runs anywhere).
//
// TWO GATING SHAPES, and why both are handled (the §6.2.3 lesson from U5, where
// a guard that understood only one placement would have passed a real
// violation):
//   1. DESCRIBE-level — `test.skip(!LIVE, …)` sits directly in the describe
//      body, so the whole describe is gated. 17 blocks, one per gated file.
//   2. TEST-level — the skip sits inside a single `test(...)` body, gating only
//      that test. 1 block, in `medication-interactions.spec.ts`.
//
// The second shape is the reason this guard tags BLOCKS rather than FILES. That
// test's parent describe is `L2: Library interactions (no auth)`, whose other
// two tests genuinely run with no credentials. Tagging the describe would state
// a falsehood to remove a warning — the precise failure mode §5.9 exists to
// prevent. The gated unit gets the tag; its parent does not.
//
// WHAT IT DOES NOT COMPUTE:
//   * Whether a gated block's assertions are meaningful, or whether the skip
//     reason is accurate. It binds gating to naming, nothing more.
//   * Any skip that is not literally `test.skip(!LIVE`. A block gated some other
//     way (a different env var, a helper-wrapped predicate) is invisible here and
//     would need this parser extended — stated so nobody reads a green run as
//     "no untagged gating exists anywhere".
//
// TWO FURTHER GUARDS on `playwright.config.ts` sit at the bottom of this file
// (Phase 4 U12). They extend this spec rather than adding one, so SPEC_COUNT
// stays 30. LIVE_SERIAL binds the serialisation a live run depends on (FU-25's
// guard half). SERVER_REUSE binds N-32's fix. Both evaluate the config under a
// stubbed environment instead of reading its text.
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { blankStringsAndComments, stripComments } from "./__testing__/strip";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Tracked spec files only. §4.2's staged-file rule: an inventory built from the
 * working tree lets an untracked file pass unseen, so this reads git's index the
 * same way the boundary guard does.
 */
function trackedSpecFiles(): string[] {
  return execFileSync("git", ["ls-files", "--cached", "--", "tests/e2e"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter((f) => f.endsWith(".spec.ts"));
}

export interface Block {
  kind: "describe" | "test";
  title: string;
  file: string;
  line: number;
  gated: boolean;
  tagged: boolean;
}

/**
 * Find every `test.describe(...)` / `test(...)` block and mark the ones whose
 * body directly contains `test.skip(!LIVE, …)`.
 *
 * A character walk over the whole source, NOT a per-line scan, and a block's
 * body is taken to start at the `{` of its `=> {` — not at the first `{` on its
 * opening line. Both details are load-bearing, and the self-tests below caught
 * their absence before any mutation was run:
 *
 *   test("runs anywhere", async ({ page }) => {
 *
 * The destructuring `({ page })` opens and closes a brace before the body brace
 * exists. A naive per-line version treated that `}` as the block closing, so a
 * `test.skip(!LIVE, …)` on the following line was attributed to the enclosing
 * DESCRIBE instead of the test — which is precisely the shape-1/shape-2
 * confusion this guard exists to resolve, and it would have demanded a false
 * `[LIVE]` tag on a describe that runs anywhere.
 *
 * String and comment contents are blanked first (positions preserved) so a `{`
 * inside a title or a comment cannot shift the depth. The blanking is the shared
 * parser-based `blankStringsAndComments` (Phase 4 U19, N-88 (1)). This file's
 * private regex version blanked comments BEFORE strings with an unanchored
 * `//` pattern, so a `//` inside a URL literal blanked the rest of its line.
 */
export function parseBlocks(source: string, file = "<inline>"): Block[] {
  const stripped = blankStringsAndComments(source, file.endsWith(".ts") ? file : undefined);
  const lineOf = (index: number) => source.slice(0, index).split("\n").length;

  // Openings are matched on the ORIGINAL source (titles are string literals and
  // are blanked in `stripped`), then replayed by index during the walk.
  const openings = new Map<number, Block>();
  const add = (re: RegExp, kind: Block["kind"]) => {
    for (const m of source.matchAll(re)) {
      const index = m.index! + m[0].indexOf("test");
      openings.set(index, {
        kind,
        title: m[1],
        file,
        line: lineOf(m.index!),
        gated: false,
        tagged: m[1].includes("[LIVE]"),
      });
    }
  };
  add(/test\.describe\(\s*"((?:[^"\\]|\\.)*)"/g, "describe");
  add(/(?:^|[^.\w])test\(\s*"((?:[^"\\]|\\.)*)"/g, "test");

  const skipIndices = [...stripped.matchAll(/test\.skip\(\s*!LIVE/g)].map((m) => m.index!);
  const blocks = [...openings.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);

  const open: (Block & { baseDepth: number })[] = [];
  let pending: Block | null = null;
  let depth = 0;
  let nextSkip = 0;

  for (let i = 0; i < stripped.length; i++) {
    if (openings.has(i)) pending = openings.get(i)!;

    while (nextSkip < skipIndices.length && skipIndices[nextSkip] === i) {
      if (open.length > 0) open[open.length - 1].gated = true;
      nextSkip++;
    }

    const ch = stripped[i];
    if (ch === "{") {
      // The body brace is the one introduced by `=> `. Any earlier brace on the
      // signature (destructured params, type literals) is not the body.
      const before = stripped.slice(Math.max(0, i - 4), i).trimEnd();
      if (pending && before.endsWith("=>")) {
        open.push(Object.assign(pending, { baseDepth: depth }));
        pending = null;
      }
      depth++;
    } else if (ch === "}") {
      depth--;
      while (open.length > 0 && depth <= open[open.length - 1].baseDepth) open.pop();
    }
  }
  return blocks;
}

const SPEC_FILES = trackedSpecFiles();
const ALL_BLOCKS = SPEC_FILES.flatMap((f) =>
  parseBlocks(fs.readFileSync(path.join(REPO_ROOT, f), "utf8"), f),
);
const GATED = ALL_BLOCKS.filter((b) => b.gated);
const TAGGED = ALL_BLOCKS.filter((b) => b.tagged);

describe("LIVE_TAGGING — E2E_LIVE-gated blocks name themselves (CLAUDE.md §5.9)", () => {
  it("finds a non-empty spec inventory to check", () => {
    // Anti-vacuity. A parser that matched nothing would satisfy every rule
    // below by checking nothing at all — the failure mode this whole phase
    // exists to prevent.
    expect(
      SPEC_FILES.length,
      "LIVE_TAGGING: no tracked tests/e2e/*.spec.ts files were found. Either the\n" +
        "suite moved, or this guard is scanning an empty inventory and proving nothing.",
    ).toBeGreaterThan(0);
    expect(
      ALL_BLOCKS.length,
      "LIVE_TAGGING: spec files were found but no describe/test blocks parsed out of\n" +
        "them. The parser has rotted; see the self-tests below.",
    ).toBeGreaterThan(0);
    expect(
      GATED.length,
      "LIVE_TAGGING: no E2E_LIVE-gated blocks were found. If gating genuinely went\n" +
        "away this guard is obsolete; far more likely the skip form changed and the\n" +
        "parser no longer recognises it.",
    ).toBeGreaterThan(0);
  });

  it("tags every gated block (C-9)", () => {
    const untagged = GATED.filter((b) => !b.tagged).map(
      (b) => `${b.file}:${b.line}  ${b.kind} "${b.title}"`,
    );
    expect(
      untagged,
      "LIVE_TAGGING: this block is gated on E2E_LIVE but its title carries no\n" +
        '"[LIVE]" tag, so a reader of the run summary cannot tell that its coverage\n' +
        "was skipped (CLAUDE.md §5.9):\n  " +
        untagged.join("\n  "),
    ).toEqual([]);
  });

  it("does not tag a block that is NOT gated", () => {
    // The opposite lie, and the more tempting one: tagging a whole describe to
    // silence this guard would mark tests that run everywhere as live-only.
    const overtagged = TAGGED.filter((b) => !b.gated).map(
      (b) => `${b.file}:${b.line}  ${b.kind} "${b.title}"`,
    );
    expect(
      overtagged,
      'LIVE_TAGGING: this block carries "[LIVE]" but is not gated on E2E_LIVE — it\n' +
        "runs with no credentials. Tagging an ungated block to satisfy the rule above\n" +
        "understates real coverage, which is the same honesty defect pointing the\n" +
        "other way:\n  " +
        overtagged.join("\n  "),
    ).toEqual([]);
  });

  it("pins the gated inventory so a silently-dropped gate is visible", () => {
    // Measured 2026-08-05 at the U16 tip: 17 describe-level gates (one per gated
    // file) + 1 test-level gate. NOT a coverage count — a shape count, and the
    // reason this guard tags blocks rather than files.
    const byKind = {
      describe: GATED.filter((b) => b.kind === "describe").length,
      test: GATED.filter((b) => b.kind === "test").length,
    };
    expect(byKind).toEqual({ describe: 17, test: 1 });

    const gatedFiles = new Set(GATED.map((b) => b.file));
    expect(gatedFiles.size).toBe(17);
  });

  it("keeps §5.9's enforcement claim falsifiable", () => {
    // U14's lesson, applied to this file's own rule. §5.9 now says "Enforced by
    // src/architecture/e2e-live-tagging.test.ts"; an enforcement claim that
    // nothing binds is exactly the trust defect U14 exists to prevent, so the
    // claim and the enforcer are tied together here. Deleting this file makes
    // §5.9 a lie that nothing catches — unless this rule fails with it.
    const claude = fs.readFileSync(path.join(REPO_ROOT, "CLAUDE.md"), "utf8");
    expect(
      claude,
      "LIVE_TAGGING: CLAUDE.md §5.9 no longer names this file as its enforcer. Either\n" +
        "restore the claim, or — if this guard is being retired — remove the claim in\n" +
        "the same change so the document never promises enforcement that is gone.",
    ).toContain("src/architecture/e2e-live-tagging.test.ts");
  });

  it("confirms the L1/L2/L3 prefix does NOT signal gating (§5.9's warning)", () => {
    // Executable evidence for the sentence in CLAUDE.md, rather than a claim
    // beside it: the same prefix appears on both gated and ungated blocks.
    const prefixOf = (t: string) => /(?:\[LIVE\]\s*)?(L\d)/.exec(t)?.[1];
    const gatedPrefixes = new Set(GATED.map((b) => prefixOf(b.title)).filter(Boolean));
    const ungatedPrefixes = new Set(
      ALL_BLOCKS.filter((b) => b.kind === "describe" && !b.gated)
        .map((b) => prefixOf(b.title))
        .filter(Boolean),
    );
    const overlap = [...gatedPrefixes].filter((p) => ungatedPrefixes.has(p));
    expect(
      overlap.length,
      "LIVE_TAGGING: no L-prefix appears on both a gated and an ungated block, which\n" +
        "would mean the prefix DOES track gating and §5.9's warning is now wrong.",
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ANTI-ROT SELF-TESTS (the Phase 0 N3 pattern)
//
// The rules above pass because the specs and their tags agree. That cannot tell
// you the PARSER still works — one that finds no gates also reports no untagged
// gates. These drive it against synthetic input with a known answer.
// ---------------------------------------------------------------------------
describe("LIVE_TAGGING — parser self-tests", () => {
  const SHAPE_1 = [
    'test.describe("[LIVE] gated whole block", () => {',
    '  test.skip(!LIVE, "needs creds");',
    '  test("inner", async ({ page }) => {',
    "    await page.goto('/');",
    "  });",
    "});",
  ].join("\n");

  const SHAPE_2 = [
    'test.describe("public block", () => {',
    '  test("runs anywhere", async ({ page }) => {',
    "    await page.goto('/');",
    "  });",
    '  test("[LIVE] gated single test", async ({ page }) => {',
    '    test.skip(!LIVE, "needs creds");',
    "  });",
    "});",
  ].join("\n");

  it("shape 1: a describe-level skip gates the describe, not its inner test", () => {
    const blocks = parseBlocks(SHAPE_1);
    expect(blocks.map((b) => [b.kind, b.gated])).toEqual([
      ["describe", true],
      ["test", false],
    ]);
  });

  it("shape 2: a test-level skip gates ONLY that test, not its parent describe", () => {
    // The medication-interactions case. Getting this wrong in the permissive
    // direction would demand a false tag on a describe that runs anywhere.
    const blocks = parseBlocks(SHAPE_2);
    expect(blocks.map((b) => [b.kind, b.title, b.gated])).toEqual([
      ["describe", "public block", false],
      ["test", "runs anywhere", false],
      ["test", "[LIVE] gated single test", true],
    ]);
  });

  it("catches an untagged gate in either shape", () => {
    const untag = (s: string) => s.replace("[LIVE] ", "");
    for (const src of [SHAPE_1, SHAPE_2]) {
      const gated = parseBlocks(untag(src)).filter((b) => b.gated);
      expect(gated.length).toBe(1);
      expect(gated[0].tagged).toBe(false);
    }
  });

  it("does not let a brace inside a title or comment shift block nesting", () => {
    const blocks = parseBlocks(
      [
        'test.describe("title with { brace", () => {',
        "  // a comment with } in it",
        '  test.skip(!LIVE, "needs creds");',
        "});",
        'test.describe("second", () => {',
        '  test("plain", async () => {});',
        "});",
      ].join("\n"),
    );
    expect(blocks[0].gated).toBe(true);
    expect(blocks.find((b) => b.title === "second")?.gated).toBe(false);
  });

  it("does not let a `//` inside a URL literal hide a gate on the same line (N-88 (1), Phase 4 U19)", () => {
    // The private blanker this file carried until U19 blanked comments before
    // strings with an unanchored `//` pattern: the URL's `//` blanked the rest of
    // its line, the `test.skip(!LIVE` on it, and the `}` that closes the test.
    const blocks = parseBlocks(
      [
        'test.describe("outer", () => {',
        '  test("[LIVE] visits", async ({ page }) => { await page.goto("https://x.test/"); test.skip(!LIVE, "creds"); });',
        '  test("plain", async () => {});',
        "});",
      ].join("\n"),
    );
    expect(blocks.find((b) => b.title === "[LIVE] visits")?.gated).toBe(true);
    expect(blocks.find((b) => b.title === "outer")?.gated).toBe(false);
    expect(blocks.find((b) => b.title === "plain")?.gated).toBe(false);
  });

  it("reads tracked spec files from the git index, not the working tree", () => {
    // §4.2: an inventory built by globbing the working tree would let an
    // untracked spec pass unseen.
    expect(SPEC_FILES.every((f) => f.startsWith("tests/e2e/"))).toBe(true);
    expect(SPEC_FILES).toContain("tests/e2e/medication-interactions.spec.ts");
  });
});

// ---------------------------------------------------------------------------
// LIVE_SERIAL and SERVER_REUSE: `playwright.config.ts` evaluated, not read
// (Phase 4 U12)
//
// WHY. A live run logs every authed spec in as ONE seeded demo account, so the
// run is deterministic only while it is serial (the shared-user-race comment in
// `playwright.config.ts`). Phase 1 U16 made it serial, and nothing bound that:
// deleting either line broke no test (CLAUDE.md §5.9, FU-25). FU-25's other
// half, per-worker user isolation, belongs to D-9. This guard does not do it.
//
// N-32. `reuseExistingServer: !process.env.CI` let a stale `next dev` left on
// the port stand in for the production build the suite exists to judge. The
// U14 baseline measured the cost: 12 failures that were all the substituted
// server. The fix is `false` outside CI, so an occupied port is an error, not a
// substitution. A run that means to test a server it started itself says so
// with PLAYWRIGHT_NO_SERVER.
//
// WHAT IT COMPUTES. It imports the config afresh under each environment in a
// small matrix and asserts on the object Playwright would receive. It does not
// read the config as text, so the guard follows the value, whatever expression
// produces it.
//
// WHAT IT DOES NOT COMPUTE:
//   * A command-line override. `--workers=4` or `--fully-parallel` beats the
//     config, and no file in the repository can bind a flag someone types.
//   * Which server a PLAYWRIGHT_NO_SERVER run measured. That path is an
//     explicit opt-out, and the guard asserts only serialisation on it.
// ---------------------------------------------------------------------------
type WebServer = { reuseExistingServer?: boolean };
type LoadedConfig = {
  workers?: number | string;
  fullyParallel?: boolean;
  webServer?: WebServer | WebServer[];
  use?: { baseURL?: string };
};

// Every variable the config reads. Each load sets all of them, so the ambient
// environment cannot leak in: CI runs this suite with CI=true.
const CONFIG_ENV_KEYS = ["E2E_LIVE", "CI", "PLAYWRIGHT_NO_SERVER", "PLAYWRIGHT_BASE_URL"] as const;
type ConfigEnv = Partial<Record<(typeof CONFIG_ENV_KEYS)[number], string>>;

async function loadPlaywrightConfig(env: ConfigEnv): Promise<LoadedConfig> {
  for (const key of CONFIG_ENV_KEYS) vi.stubEnv(key, env[key]);
  // The config reads process.env at module scope. Without a fresh module
  // registry the first load would answer for every environment after it.
  vi.resetModules();
  const mod = await import("../../playwright.config");
  return mod.default as LoadedConfig;
}

const envLabel = (env: ConfigEnv) =>
  CONFIG_ENV_KEYS.map((k) => `${k}=${env[k] ?? "(unset)"}`).join(" ");

const LIVE_ENVS: ConfigEnv[] = [
  { E2E_LIVE: "1" },
  { E2E_LIVE: "1", CI: "true" },
  { E2E_LIVE: "1", PLAYWRIGHT_NO_SERVER: "1" },
  { E2E_LIVE: "1", CI: "true", PLAYWRIGHT_NO_SERVER: "1" },
];

// CI unset, live and non-live. PLAYWRIGHT_NO_SERVER stays unset: with it set
// there is no webServer, and a reuse check would pass by checking nothing.
const LOCAL_ENVS: ConfigEnv[] = [{}, { E2E_LIVE: "1" }];

describe("LIVE_SERIAL — a live E2E run is serial (FU-25's guard half, CLAUDE.md §5.9)", () => {
  it("sets workers: 1 whenever E2E_LIVE=1", async () => {
    for (const env of LIVE_ENVS) {
      const { workers } = await loadPlaywrightConfig(env);
      expect(
        workers,
        `LIVE_SERIAL: playwright.config.ts gives \`workers\` = ${JSON.stringify(workers)} under\n` +
          `${envLabel(env)}; a live run needs exactly 1. Every authed spec signs in as\n` +
          "one seeded demo account, so parallel workers interleave writes to the same\n" +
          "rows and the live run stops being deterministic. Restore\n" +
          "`workers: LIVE ? 1 : undefined`.",
      ).toBe(1);
    }
  });

  it("sets fullyParallel: false whenever E2E_LIVE=1", async () => {
    for (const env of LIVE_ENVS) {
      const { fullyParallel } = await loadPlaywrightConfig(env);
      expect(
        fullyParallel,
        `LIVE_SERIAL: playwright.config.ts gives \`fullyParallel\` = ${JSON.stringify(fullyParallel)}\n` +
          `under ${envLabel(env)}; a live run needs exactly false, stated in the config\n` +
          "rather than left to Playwright's default. Restore `fullyParallel: !LIVE`.",
      ).toBe(false);
    }
  });
});

describe("SERVER_REUSE — outside CI the E2E suite never reuses a server on the port (N-32)", () => {
  it("defines a webServer when PLAYWRIGHT_NO_SERVER is unset", async () => {
    // Anti-vacuity. With no webServer there is nothing to reuse, and the rule
    // below would pass by checking nothing.
    for (const env of LOCAL_ENVS) {
      const { webServer } = await loadPlaywrightConfig(env);
      expect(
        [webServer ?? []].flat().length,
        `SERVER_REUSE: no webServer under ${envLabel(env)}, so the reuse rule below\n` +
          "checks nothing. If the config stopped starting the app, retire this guard\n" +
          "on purpose instead of letting it pass empty.",
      ).toBeGreaterThan(0);
    }
  });

  it("sets reuseExistingServer: false whenever CI is unset", async () => {
    for (const env of LOCAL_ENVS) {
      const servers = [(await loadPlaywrightConfig(env)).webServer ?? []].flat();
      for (const server of servers) {
        expect(
          server.reuseExistingServer,
          `SERVER_REUSE: playwright.config.ts gives \`reuseExistingServer\` =\n` +
            `${JSON.stringify(server.reuseExistingServer)} under ${envLabel(env)}. Anything on\n` +
            "the port, such as a stale `next dev`, would then stand in for the\n" +
            "production build the suite exists to judge (N-32: 12 false failures in the\n" +
            "U14 baseline). Set it to false. To test a server you started yourself, set\n" +
            "PLAYWRIGHT_NO_SERVER.",
        ).toBe(false);
      }
    }
  });

  it("loads the config afresh for each environment (loader self-test)", async () => {
    // Both guards above depend on it. A cached module would answer every
    // environment with the first one's config, and the matrix would be a
    // single case repeated.
    const a = await loadPlaywrightConfig({ PLAYWRIGHT_BASE_URL: "http://sentinel-a.test" });
    const b = await loadPlaywrightConfig({ PLAYWRIGHT_BASE_URL: "http://sentinel-b.test" });
    expect([a.use?.baseURL, b.use?.baseURL]).toEqual([
      "http://sentinel-a.test",
      "http://sentinel-b.test",
    ]);
  });

  it("stubs every environment variable the config reads (loader self-test)", () => {
    // The matrix is only as good as the list it stubs. A read of any other
    // variable is ambient, and a config such as
    // `workers: LIVE && !process.env.PW_FAST ? 1 : 4` passed both guards above
    // (U12 review). So the list is checked against the config's own reads.
    // Any `process.env` access that is not `process.env.NAME` is refused
    // rather than guessed at.
    // The shared parser-based stripper (FU-47, U19): a `//` inside the config's
    // URL literal must not hide the rest of that line.
    const source = stripComments(
      fs.readFileSync(path.join(REPO_ROOT, "playwright.config.ts"), "utf8"),
      "playwright.config.ts",
    );
    const reads = [...source.matchAll(/process\.env\b(?:\.([A-Za-z_]\w*))?/g)];
    const names = [...new Set(reads.map((m) => m[1]).filter((n): n is string => !!n))];
    expect(names.length, "no process.env reads found; the check has rotted").toBeGreaterThan(0);
    expect(
      reads.filter((m) => !m[1]).length,
      "SERVER_REUSE/LIVE_SERIAL: playwright.config.ts reads process.env in a form other\n" +
        "than `process.env.NAME` (brackets, destructuring, a spread). Use the dotted form,\n" +
        "or extend this check so the variable can be stubbed.",
    ).toBe(0);
    expect(
      names.filter((n) => !(CONFIG_ENV_KEYS as readonly string[]).includes(n)),
      "SERVER_REUSE/LIVE_SERIAL: playwright.config.ts reads a variable the loader does\n" +
        "not stub, so the guards above would pass or fail on whatever the machine running\n" +
        "them has set. Add it to CONFIG_ENV_KEYS and cover it in the matrices.",
    ).toEqual([]);
  });
});
