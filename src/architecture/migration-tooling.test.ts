// MIGRATION_TOOLING — the order-safe half of Phase 2 U15's coherence proof.
//
// ===========================================================================
// WHY THERE ARE TWO HALVES, AND WHAT EACH CAN SEE (§2.2 rule 7)
// ===========================================================================
// `npm run verify:migrations` applies the migration set to a REAL Postgres and
// interrogates the catalog. It is the half that can see whether the SQL is
// coherent and whether the counter tables ended up SELECT-only (N-16). It needs
// a database, so it cannot be a vitest test: `vitest run` must stay runnable on
// a laptop with no Postgres, and it precedes `next build` — and the migration
// step — in the declared CI chain.
//
// THIS file needs no database. It asserts the things that make the other half
// TRUSTWORTHY, which the other half cannot assert about itself:
//
//   * the auth prelude is a test double and stays minimal, so application
//     objects can never migrate into it and be "proven" against themselves;
//   * the prelude is not, and never becomes, a migration;
//   * the runner discovers migrations by READING THE DIRECTORY, so a new
//     `0010` cannot be silently skipped;
//   * the runner cannot swallow a failure;
//   * CI actually runs it, against a real Postgres service.
//
// Green here means the apparatus is honest. Green there means the migration set
// is coherent. Neither implies the other.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");
const PRELUDE = "supabase/ci/auth-prelude.sql";
const RUNNER = "scripts/verify-migrations.mjs";
const WORKFLOW = ".github/workflows/ci.yml";
const MIGRATIONS_DIR = "supabase/migrations";

function read(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), "utf8");
}

/** `--` comments stripped, so prose in a header can neither trip nor satisfy a rule. */
function sqlCode(relative: string): string {
  return read(relative).replace(/--[^\n]*/g, " ");
}

/** JS line comments stripped, same reason — this file's own header names `0010`. */
function jsCode(relative: string): string {
  return read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

/**
 * Bodies of every `catch` block, found by BRACE MATCHING rather than by regex.
 *
 * The first version of this helper ended a block at the first `\n}` — a closing
 * brace in column 0 — and mutation M4 sailed straight through it: the runner's
 * catch blocks are indented, so the captured "body" ran past the block and
 * swept up a `fail(` from further down the file. The guard was vacuous against
 * the exact mutation it was written for, and only running M4 revealed it (§5.2;
 * the same shape as U27's M1 and U28's M2b).
 */
function catchBodies(code: string): string[] {
  const bodies: string[] = [];
  const opener = /catch\s*(?:\([^)]*\))?\s*\{/g;
  for (const match of code.matchAll(opener)) {
    let depth = 1;
    let i = (match.index ?? 0) + match[0].length;
    const start = i;
    while (i < code.length && depth > 0) {
      if (code[i] === "{") depth += 1;
      else if (code[i] === "}") depth -= 1;
      i += 1;
    }
    bodies.push(code.slice(start, i - 1));
  }
  return bodies;
}

function trackedUnder(dir: string): string[] {
  const stdout = execFileSync("git", ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", dir], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return stdout.split("\0").filter((p) => p.endsWith(".sql")).sort();
}

describe("MIGRATION_TOOLING: the auth prelude is a test double and stays one", () => {
  it("exists", () => {
    expect(existsSync(join(REPO_ROOT, PRELUDE)), `${PRELUDE} is missing`).toBe(true);
  });

  it("is NOT inside supabase/migrations/", () => {
    // A test double that ships to a real database is worse than no double: it
    // would create a fake `auth.users` alongside the real one.
    const tracked = trackedUnder(MIGRATIONS_DIR);
    expect(
      tracked.filter((f) => f.includes("prelude") || f.includes("/ci/")),
      "MIGRATION_TOOLING: the auth prelude appears to have moved into the\n" +
        "migration set. It is CI scaffolding — a labelled fake of Supabase's\n" +
        "`auth` schema — and applying it to a real database would create a\n" +
        "counterfeit `auth.users` next to the genuine one.",
    ).toEqual([]);
  });

  it("creates ONLY auth-schema objects and the three Supabase roles", () => {
    // The condition that keeps this double from becoming the N-26 hazard it
    // flirts with. If an application table can be created here, the coherence
    // run could "prove" a migration set against objects the prelude invented
    // for it — the instrument would be manufacturing its own subject.
    const code = sqlCode(PRELUDE);

    const created = [...code.matchAll(/create\s+(?:or\s+replace\s+)?(table|schema|function|view|materialized\s+view|index|type|sequence)\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)/gi)]
      .map((m) => ({ kind: m[1].toLowerCase(), name: m[2].replace(/"/g, "").toLowerCase() }));

    expect(created.length, "no created objects found — has the prelude been emptied?").toBeGreaterThan(0);

    const nonAuth = created.filter(
      ({ kind, name }) => !(name === "auth" && kind === "schema") && !name.startsWith("auth."),
    );
    expect(
      nonAuth.map((o) => `${o.kind} ${o.name}`),
      "MIGRATION_TOOLING: the auth prelude creates a NON-AUTH object.\n" +
        "It may contain only what the migration set actually references from\n" +
        "Supabase's `auth` schema — nothing speculative, and above all nothing\n" +
        "belonging to the application. An application object defined here would\n" +
        "be invented by the instrument and then verified by it.",
    ).toEqual([]);

    const roles = [...code.matchAll(/create\s+role\s+([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase());
    expect(
      roles.filter((r) => !["anon", "authenticated", "service_role"].includes(r)),
      "MIGRATION_TOOLING: the prelude creates a role beyond the three Supabase\n" +
        "roles the migration set grants to.",
    ).toEqual([]);
  });

  it("states that it is not the real auth schema", () => {
    // §8.3 — a stand-in that does not announce itself is a trust defect.
    expect(
      read(PRELUDE).slice(0, 400).toUpperCase(),
      `${PRELUDE} must say in its header that it is a test double.`,
    ).toContain("NOT THE REAL THING");
  });
});

describe("MIGRATION_TOOLING: the runner cannot skip a migration or swallow a failure", () => {
  it("discovers migrations by reading the directory, not from a hardcoded list", () => {
    // Mutation M3. A literal file list is how a new `0010` gets skipped while
    // the check still reports success — the failure mode that makes a green
    // coherence run meaningless.
    const code = jsCode(RUNNER);
    expect(code, `${RUNNER} must enumerate the migration directory`).toMatch(/readdirSync\(/);
    expect(
      code.match(/["'`][^"'`]*\d{4}[a-z0-9_]*\.sql["'`]/gi) ?? [],
      "MIGRATION_TOOLING: the runner hardcodes a migration filename. It must\n" +
        "read the directory, so a migration added tomorrow is covered the day it\n" +
        "is written rather than the day someone remembers to list it.",
    ).toEqual([]);
  });

  it("has no catch block that continues without failing", () => {
    // Mutation M4, and it is not hypothetical: the throwaway harness used while
    // designing this unit reported a broken migration as `exit=0`, because the
    // shell `if` consumed `$?`. A runner that catches an error and carries on
    // reports a coherent set when it has proven nothing.
    const code = jsCode(RUNNER);
    const catches = catchBodies(code);
    expect(catches.length, "no catch blocks found in the runner").toBeGreaterThan(0);

    // THE RULE IS ABOUT THE FIRST STATEMENT, not about `fail(` appearing
    // somewhere. M4's second run proved why: `void error; continue; fail(…)`
    // still CONTAINS `fail(` — unreachable, after a `continue` — so a
    // does-the-word-appear rule passed a catch block that swallows every
    // failure. Presence is not reachability (§5.3), and this guard needed two
    // corrections before it could see the mutation it was written for.
    const resuming = catches.filter((body) => {
      const first = body.trim();
      return !(first.startsWith("fail(") || first.startsWith("throw"));
    });
    expect(
      resuming,
      "MIGRATION_TOOLING: a catch block in the runner does not fail or rethrow\n" +
        "AS ITS FIRST STATEMENT. Every error path must terminate the run\n" +
        "immediately — a swallowed psql exit code turns this whole check into a\n" +
        "report that psql was invoked. If a catch legitimately needs to run code\n" +
        "before failing, change this rule deliberately rather than working\n" +
        "around it: the rule is the only thing standing between a broken\n" +
        "migration and a green build.",
    ).toEqual([]);
    expect(code, "the runner must not neutralise a command's exit status").not.toMatch(/\|\|\s*true/);
  });

  it("refuses to pass when it applied nothing", () => {
    const code = jsCode(RUNNER);
    expect(
      code,
      "MIGRATION_TOOLING: the runner must fail on an empty migration set.\n" +
        "An empty set applies without error — U27's M5 lesson at a second site.",
    ).toMatch(/length === 0/);
  });

  it("the tracked migration set and the on-disk set are the same", () => {
    // An untracked local `.sql` makes a developer's run green against files CI
    // will never see; a tracked file missing on disk does the reverse. Either
    // way the two halves are judging different sets.
    const tracked = trackedUnder(MIGRATIONS_DIR).map((p) => p.replace(`${MIGRATIONS_DIR}/`, ""));
    const onDisk = readdirSync(join(REPO_ROOT, MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
    expect(tracked.length, "0 tracked migrations — a guard that scans nothing passes vacuously").toBeGreaterThan(0);
    expect(
      onDisk,
      "MIGRATION_TOOLING: the migration directory on disk differs from what git\n" +
        "tracks. An untracked file is applied locally and never in CI, so the two\n" +
        "coherence results describe different migration sets.",
    ).toEqual(tracked);
  });
});

describe("MIGRATION_TOOLING: db:migrate fails instructively, and never falsely succeeds", () => {
  const WRAPPER = "scripts/db-migrate.mjs";

  it("db:migrate goes through the wrapper, not straight at the CLI", () => {
    // Measured before the wrapper existed: `supabase db push` with no CLI
    // installed prints `sh: supabase: command not found` and exits 127 — which
    // names neither the CLI, nor `supabase link`, nor why config.toml is
    // absent. §8.3: an affordance that fails obscurely is a trust defect.
    const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["db:migrate"]).toContain("db-migrate.mjs");
  });

  it("the failure message routes the operator to the record that explains it", () => {
    const code = read(WRAPPER);
    expect(code, "the wrapper must point at the deployed-schema record").toContain(
      "docs/05-qa/2026-08-12-deployed-schema-record.md",
    );
    expect(code, "the wrapper must name `supabase link`").toContain("supabase link --project-ref");
  });

  it("propagates the CLI's exit status instead of inventing one", () => {
    // The failure this guards is worse than the one the wrapper fixes: a
    // wrapper that reports a FAILED push as success tells an operator their
    // migrations are deployed when they are not. Same lesson as M4 — a layer
    // that swallows an exit code turns a check into a report that a command
    // was invoked.
    const code = jsCode(WRAPPER);
    expect(
      code,
      "MIGRATION_TOOLING: db-migrate.mjs must exit with the CLI's own status.\n" +
        "Hardcoding an exit code makes a failed `supabase db push` look like a\n" +
        "successful deploy.",
    ).toMatch(/process\.exit\(\s*push\.status/);
    expect(code, "the wrapper must not force a zero exit").not.toMatch(/process\.exit\(\s*0\s*\)/);
  });
});

describe("MIGRATION_TOOLING: CI actually runs the coherence check", () => {
  it("the workflow runs verify:migrations against a Postgres service", () => {
    // §10.3 — a guardrail that does not run in CI does not exist. The whole
    // reworded exit criterion is "CI proves the migration set coherent"; a
    // script nobody invokes proves nothing.
    const workflow = read(WORKFLOW);
    expect(workflow, "ci.yml must invoke the coherence check").toContain("verify:migrations");
    expect(
      workflow,
      "MIGRATION_TOOLING: ci.yml declares no Postgres service, so the coherence\n" +
        "step has nothing to apply migrations to.",
    ).toMatch(/image:\s*postgres:16/);
  });

  it("package.json exposes it as a script, so ci.yml and a developer run the same thing", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["verify:migrations"], "package.json is missing verify:migrations").toContain(
      "verify-migrations.mjs",
    );
  });
});
