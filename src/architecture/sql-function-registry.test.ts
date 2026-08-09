// Executable guardrail for the SQL functions this repository defines
// (Phase 2 U3). A companion to RLS_COVERAGE: that rule governs which rows a
// user may touch, this one governs the code that is allowed to touch rows
// *around* RLS.
//
// ===========================================================================
// WHY IT EXISTS
// ===========================================================================
// U3 introduced the repository's first `SECURITY DEFINER` functions. Such a
// function runs with its OWNER's privileges, not the caller's, which is exactly
// why it can write a ledger the user is forbidden to write — and exactly why a
// mistake in one is a privilege escalation rather than a bug. Three mistakes
// are both classic and statically detectable, and this file detects all three:
//
//   1. NO `set search_path`. Postgres resolves unqualified names through the
//      CALLER's search_path. A caller creates `evil.now()` (or `evil.advisor_usage`),
//      prepends `evil` to their search_path, invokes the function, and the
//      definer's privileges execute their object. `set search_path = ''` on the
//      function pins resolution at definition time. This is the single most
//      common SECURITY DEFINER defect in Postgres, and Supabase's own linter
//      flags it.
//
//   2. A USER-ID PARAMETER. A definer function that accepts `p_user_id` and
//      trusts it hands every authenticated caller the ability to act on any
//      other user's rows — the function bypasses RLS, so nothing else is left to
//      stop them. The identity must come from `auth.uid()` INSIDE the body.
//
//   3. EXECUTE LEFT TO `PUBLIC`. Postgres grants EXECUTE to PUBLIC by default,
//      so a new definer function is callable by the anonymous role until
//      something revokes it. "The body checks auth.uid()" is a fine second
//      barrier and a bad only one.
//
// SCOPE, measured rather than assumed: the tracked migrations define THREE
// functions — `touch_updated_at` (0001, a plain trigger function) and U3's
// `reserve_advisor_tokens` / `settle_advisor_tokens`. Only the last two are
// SECURITY DEFINER, and only they are subject to the four rules. The trigger's
// non-definer status is itself pinned, so making it a definer later is a red
// build rather than a silent inheritance of privileges.
//
// ===========================================================================
// WHAT THIS DETECTOR ACTUALLY COMPUTES — read before trusting it (§2.2 rule 7)
// ===========================================================================
// Over the tracked `supabase/migrations/*.sql` files, with `--` comments
// stripped, it finds each `create [or replace] function [public.]name(params)`
// and captures the text from the function header to the end of its `$$ ... $$`
// body. Within that span it looks for the literal markers `security definer`,
// `set search_path`, and `auth.uid()`, reads the parameter names out of the
// header, and separately collects `revoke ... on function <name>` statements
// from the whole file set.
//
// WHAT IT DOES NOT COMPUTE, stated plainly rather than implied away:
//   * It does not execute SQL or consult a database. Every assertion here is
//     TEXT analysis of the migration files. That a function BEHAVES correctly —
//     that the CAS actually holds under two concurrent Postgres sessions, that
//     the revoke actually denies the anon role — is NOT established by this file
//     and is not claimed anywhere in the suite. Those are owner-run checks; the
//     exact commands are in `0008_usage_ledger_policy.sql`'s header.
//   * It does not verify that `set search_path` is set to something SAFE, only
//     that it is set. `set search_path = evil` would pass. Judging the value is
//     the same class of problem as judging a policy's `using` clause.
//   * It does not follow a function that calls another function.
//   * It matches `revoke` by function NAME, not by full signature, so revoking
//     one overload of a name satisfies the rule for all of them. This repository
//     has no overloads; if it ever does, that is a hole to close then.
//   * `$$`-quoted bodies only. A `$tag$`-quoted body would end the span early.
//     Nothing uses one; the parser's own self-test pins the `$$` form.

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function trackedMigrations(): string[] {
  let stdout: string;
  try {
    stdout = execFileSync(
      "git",
      ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "supabase/migrations"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (cause) {
    throw new Error(
      "SQL_FUNCTION_REGISTRY could not read the tracked file set.\n" +
        `Ran: git -C ${REPO_ROOT} ls-files -z --cached -- supabase/migrations\n` +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  const files = stdout.split("\0").filter((p) => p.endsWith(".sql"));
  if (files.length === 0) {
    throw new Error(
      "SQL_FUNCTION_REGISTRY found 0 tracked migration files; a guard that scans nothing\n" +
        "passes vacuously, so this is a hard failure rather than a silent green.",
    );
  }
  return files.sort();
}

export interface SqlFunction {
  name: string;
  file: string;
  params: string[];
  securityDefiner: boolean;
  setsSearchPath: boolean;
  readsAuthUid: boolean;
}

export interface FunctionFacts {
  functions: SqlFunction[];
  /** Function names appearing in a `revoke … on function <name>` statement. */
  revokedFromPublic: Set<string>;
}

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, " ");
}

/**
 * Parse migration sources into the function inventory.
 *
 * Exported so the anti-rot self-tests can drive it against synthetic SQL: if
 * this logic breaks, those go red without any real migration changing. A parser
 * that matches nothing reports no violations, which is indistinguishable from
 * compliance unless something checks the parser itself.
 */
export function readFunctionFacts(sources: { file: string; sql: string }[]): FunctionFacts {
  const functions: SqlFunction[] = [];
  const revokedFromPublic = new Set<string>();

  const HEADER = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)\s*\(([^)]*)\)/gi;
  const REVOKE = /revoke\s+[\s\S]*?\s+on\s+function\s+(?:public\.)?([a-z0-9_]+)[\s\S]*?from\s+public/gi;

  for (const { file, sql } of sources) {
    const text = stripComments(sql);

    for (const m of text.matchAll(REVOKE)) revokedFromPublic.add(m[1]);

    for (const m of text.matchAll(HEADER)) {
      const start = m.index ?? 0;
      // The span runs to the end of the `$$ … $$` body, or to the next `;` for a
      // body-less declaration. Taking the whole rest of the file instead would
      // let one function's `set search_path` satisfy the next function's rule.
      const afterHeader = text.slice(start);
      const firstDollar = afterHeader.indexOf("$$");
      const secondDollar = firstDollar === -1 ? -1 : afterHeader.indexOf("$$", firstDollar + 2);
      const span =
        secondDollar === -1
          ? afterHeader.slice(0, afterHeader.indexOf(";") + 1 || undefined)
          : afterHeader.slice(0, secondDollar + 2);

      const params = m[2]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => p.split(/\s+/)[0].toLowerCase());

      functions.push({
        name: m[1],
        file,
        params,
        securityDefiner: /security\s+definer/i.test(span),
        setsSearchPath: /set\s+search_path/i.test(span),
        readsAuthUid: /auth\.uid\s*\(\s*\)/i.test(span),
      });
    }
  }

  return { functions, revokedFromPublic };
}

/** Tracked non-test TypeScript under `src/` — the callers of these functions. */
function trackedSources(): string[] {
  const stdout = execFileSync("git", ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", "src"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  const files = stdout
    .split("\0")
    .filter((p) => p.endsWith(".ts") && !p.endsWith(".test.ts"));
  if (files.length === 0) {
    throw new Error("SQL_FUNCTION_REGISTRY found 0 tracked sources under src/; a guard that scans nothing passes vacuously.");
  }
  return files.sort();
}

/** Every `supabase.rpc("name", …)` target named in application code. */
export function readRpcCallees(sources: { file: string; ts: string }[]): Set<string> {
  const called = new Set<string>();
  const RPC = /\.rpc\(\s*["'`]([a-z0-9_]+)["'`]/gi;
  for (const { ts } of sources) {
    for (const m of ts.matchAll(RPC)) called.add(m[1]);
  }
  return called;
}

const MIGRATIONS = trackedMigrations();
const FACTS = readFunctionFacts(
  MIGRATIONS.map((file) => ({ file, sql: fs.readFileSync(path.join(REPO_ROOT, file), "utf8") })),
);
const DEFINERS = FACTS.functions.filter((f) => f.securityDefiner);
const RPC_CALLEES = readRpcCallees(
  trackedSources().map((file) => ({ file, ts: fs.readFileSync(path.join(REPO_ROOT, file), "utf8") })),
);

/** Parameter names that would mean the caller supplies an identity. */
const IDENTITY_PARAM = /^(p_)?(user_?id|uid|owner_?id|account_?id)$/;

describe("SQL_FUNCTION_REGISTRY — the real migration set", () => {
  it("finds the functions it is supposed to govern", () => {
    // Anti-vacuity, and the reason it is a floor rather than `> 0`: every rule
    // below iterates DEFINERS. A parser regression that matched nothing would
    // leave all of them green while checking no function at all. U3 defines two.
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    // 3 today: `touch_updated_at` (0001, a trigger function) plus U3's two.
    expect(FACTS.functions.length).toBeGreaterThanOrEqual(3);
    expect(DEFINERS.map((f) => f.name).sort()).toEqual([
      "reserve_advisor_tokens",
      "settle_advisor_tokens",
    ]);
  });

  it("keeps the pre-existing trigger function out of the definer rules, deliberately", () => {
    // `touch_updated_at` (0001) predates U3 and is NOT security definer, so the
    // four rules below do not apply to it — correctly, since it runs with the
    // caller's rights and can do nothing they could not.
    //
    // This is pinned rather than left implicit because "the rules apply to 2 of
    // 3 functions" is a claim, and the honest failure mode is the opposite of
    // the obvious one: if someone ever adds `security definer` to this trigger,
    // it needs a pinned search_path like any other, and the assertion below is
    // what makes that a red build instead of a quiet inheritance.
    const trigger = FACTS.functions.find((f) => f.name === "touch_updated_at");
    expect(trigger, "touch_updated_at is no longer in the inventory").toBeDefined();
    expect(trigger?.securityDefiner).toBe(false);
  });

  it("every SECURITY DEFINER function pins its search_path", () => {
    const unpinned = DEFINERS.filter((f) => !f.setsSearchPath).map((f) => `${f.name} (${f.file})`);
    expect(
      unpinned,
      "SQL_FUNCTION_REGISTRY: these are SECURITY DEFINER with no `set search_path` — a\n" +
        "caller-controlled search_path is a privilege-escalation vector. The caller creates\n" +
        "an object that shadows an unqualified name in the body, prepends their schema, and\n" +
        "the definer's privileges execute it.\n\n" +
        "Add `set search_path = ''` to the function and schema-qualify every identifier:\n  " +
        unpinned.join("\n  "),
    ).toEqual([]);
  });

  it("no SECURITY DEFINER function takes the caller's identity as a parameter", () => {
    const trusting = DEFINERS.flatMap((f) =>
      f.params
        .filter((p) => IDENTITY_PARAM.test(p))
        .map((p) => `${f.name}(${p}) in ${f.file}`),
    );
    expect(
      trusting,
      "SQL_FUNCTION_REGISTRY: a SECURITY DEFINER function accepts an identity parameter.\n" +
        "The function bypasses RLS, so a supplied id is the ONLY thing deciding whose rows\n" +
        "are touched — and the caller supplies it. Derive it inside the body instead:\n" +
        "  v_user uuid := auth.uid();\n  " +
        trusting.join("\n  "),
    ).toEqual([]);
  });

  it("every SECURITY DEFINER function establishes identity from auth.uid()", () => {
    // The other half of the rule above: forbidding the parameter is worthless if
    // the body then acts on every row instead of the caller's.
    const anonymous = DEFINERS.filter((f) => !f.readsAuthUid).map((f) => `${f.name} (${f.file})`);
    expect(
      anonymous,
      "SQL_FUNCTION_REGISTRY: a SECURITY DEFINER function never calls auth.uid(), so it\n" +
        "either acts on rows it was not asked about or trusts something else for identity:\n  " +
        anonymous.join("\n  "),
    ).toEqual([]);
  });

  it("every SECURITY DEFINER function is revoked from PUBLIC", () => {
    const open = DEFINERS.filter((f) => !FACTS.revokedFromPublic.has(f.name)).map(
      (f) => `${f.name} (${f.file})`,
    );
    expect(
      open,
      "SQL_FUNCTION_REGISTRY: Postgres grants EXECUTE to PUBLIC by default, so this\n" +
        "SECURITY DEFINER function is callable by the anonymous role until revoked.\n" +
        "Add, next to the definition:\n" +
        "  revoke all on function public.<name>(<types>) from public;\n" +
        "  grant execute on function public.<name>(<types>) to authenticated;\n  " +
        open.join("\n  "),
    ).toEqual([]);
  });
});

describe("SQL_FUNCTION_REGISTRY — SQL and its TypeScript callers are total (Phase 2 U4)", () => {
  it("every rpc() name in application code is a function some migration defines", () => {
    // A typo here is invisible until production: PostgREST answers 404 for an
    // unknown function, `error` is set, `reserveAdvisorTokens` throws, and the
    // advisor turn 500s. `tsc` cannot help — the name is a string.
    const undefinedTargets = [...RPC_CALLEES]
      .filter((name) => !FACTS.functions.some((f) => f.name === name))
      .sort();
    expect(
      undefinedTargets,
      "SQL_FUNCTION_REGISTRY: application code calls supabase.rpc() with a name no tracked\n" +
        "migration defines. The compiler cannot see this — the callee is a string literal —\n" +
        "so the first evidence would be a 404 in production:\n  " +
        undefinedTargets.join("\n  "),
    ).toEqual([]);
  });

  it("every SECURITY DEFINER function has a caller", () => {
    // The other direction, and the one that keeps this a TOTALITY rather than a
    // one-way check. A privileged function with no caller is dead code that
    // still runs with the owner's rights if anyone finds it — the worst kind to
    // leave lying around, and the kind a "did we ship the caller?" review misses.
    const uncalled = DEFINERS.filter((f) => !RPC_CALLEES.has(f.name))
      .map((f) => `${f.name} (${f.file})`)
      .sort();
    expect(
      uncalled,
      "SQL_FUNCTION_REGISTRY: a SECURITY DEFINER function has no caller in src/.\n" +
        "Either the caller was not shipped with the migration, or this is privileged code\n" +
        "nothing needs — which should be dropped rather than left executable:\n  " +
        uncalled.join("\n  "),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ANTI-ROT SELF-TESTS (the Phase 0 N3 pattern)
//
// The rules above pass because 0008 complies. That cannot tell you the PARSER
// still works. These drive it against synthetic SQL with a known answer.
// ---------------------------------------------------------------------------
describe("SQL_FUNCTION_REGISTRY — parser self-tests", () => {
  const one = (sql: string) => readFunctionFacts([{ file: "synthetic.sql", sql }]);

  const COMPLIANT = `
    create or replace function public.f(p_amount integer)
    returns integer language plpgsql security definer set search_path = ''
    as $$
    declare v uuid := auth.uid();
    begin return p_amount; end;
    $$;
    revoke all on function public.f(integer) from public;
  `;

  it("reads a compliant definer function correctly", () => {
    const f = one(COMPLIANT).functions[0];
    expect(f.name).toBe("f");
    expect(f.params).toEqual(["p_amount"]);
    expect(f.securityDefiner).toBe(true);
    expect(f.setsSearchPath).toBe(true);
    expect(f.readsAuthUid).toBe(true);
    expect(one(COMPLIANT).revokedFromPublic.has("f")).toBe(true);
  });

  it("detects a missing search_path", () => {
    const f = one(COMPLIANT.replace("set search_path = ''", "")).functions[0];
    expect(f.securityDefiner).toBe(true);
    expect(f.setsSearchPath).toBe(false);
  });

  it("detects an identity parameter", () => {
    const f = one(COMPLIANT.replace("p_amount integer", "p_user_id uuid")).functions[0];
    expect(f.params).toEqual(["p_user_id"]);
    expect(IDENTITY_PARAM.test(f.params[0])).toBe(true);
  });

  it("detects a body that never calls auth.uid()", () => {
    const f = one(COMPLIANT.replace("auth.uid()", "gen_random_uuid()")).functions[0];
    expect(f.readsAuthUid).toBe(false);
  });

  it("detects a function that was never revoked from PUBLIC", () => {
    const facts = one(COMPLIANT.replace(/revoke[^\n]*\n/, ""));
    expect(facts.functions).toHaveLength(1);
    expect(facts.revokedFromPublic.has("f")).toBe(false);
  });

  it("does not let one function's search_path satisfy the next", () => {
    // The span bug this parser is written to avoid: scanning "from the header to
    // the end of the file" makes every function inherit the first compliant
    // one's markers, and the guard then passes on a file where only the first
    // function is safe.
    const facts = one(`
      create or replace function public.safe(p_a integer)
      returns integer language plpgsql security definer set search_path = ''
      as $$ begin return auth.uid()::text::integer; end; $$;

      create or replace function public.unsafe(p_b integer)
      returns integer language plpgsql security definer
      as $$ begin return auth.uid()::text::integer; end; $$;
    `);
    expect(facts.functions.map((f) => f.name)).toEqual(["safe", "unsafe"]);
    expect(facts.functions[0].setsSearchPath).toBe(true);
    expect(facts.functions[1].setsSearchPath).toBe(false);
  });

  it("ignores a function that exists only inside a `--` comment", () => {
    expect(
      one("-- create or replace function public.ghost(p_a integer) security definer").functions,
    ).toEqual([]);
  });

  it("parses case-insensitively and without the schema qualifier", () => {
    const f = one(`
      CREATE FUNCTION g(P_AMOUNT INTEGER) RETURNS INTEGER LANGUAGE PLPGSQL
      SECURITY DEFINER SET SEARCH_PATH = ''
      AS $$ BEGIN RETURN AUTH.UID()::TEXT::INTEGER; END; $$;
    `).functions[0];
    expect(f.name).toBe("g");
    expect(f.securityDefiner).toBe(true);
    expect(f.setsSearchPath).toBe(true);
    expect(f.readsAuthUid).toBe(true);
  });

  it("reads a multi-parameter header", () => {
    const f = one(`
      create function h(p_a integer, p_b integer, p_c integer)
      returns void language plpgsql security definer set search_path = ''
      as $$ begin perform auth.uid(); end; $$;
    `).functions[0];
    expect(f.params).toEqual(["p_a", "p_b", "p_c"]);
  });

  it("reads rpc() callees out of TypeScript, in both quote styles", () => {
    expect(
      readRpcCallees([
        { file: "a.ts", ts: 'await supabase.rpc("reserve_advisor_tokens", { p_amount: 1 });' },
        { file: "b.ts", ts: "await client.rpc('settle_advisor_tokens', {});" },
        // No leading `.`, so this is not a call and is correctly not matched —
        // measured, not assumed: the first draft of this test expected it to be
        // picked up, and the regex proved stricter than its own author thought.
        { file: "c.ts", ts: "const s = 'rpc(\"not_a_call\")';" },
      ]),
    ).toEqual(new Set(["reserve_advisor_tokens", "settle_advisor_tokens"]));
  });

  it("does match a `.rpc(\"…\")` that happens to sit inside a string", () => {
    // The honest limit of text analysis, pinned so it is a known property rather
    // than a surprise. It over-matches only in the safe direction: a false
    // "this is called" can make the uncalled-function rule greener, never the
    // undefined-target rule.
    expect(readRpcCallees([{ file: "d.ts", ts: 'const doc = "call db.rpc(\'ghost\') here";' }])).toEqual(
      new Set(["ghost"]),
    );
  });

  it("treats a non-definer function as out of scope for the definer rules", () => {
    const f = one(`
      create function plain(p_a integer) returns integer language sql
      as $$ select p_a; $$;
    `).functions[0];
    expect(f.securityDefiner).toBe(false);
  });
});
