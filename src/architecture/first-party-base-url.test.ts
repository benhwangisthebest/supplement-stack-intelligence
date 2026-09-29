// FIRST_PARTY_BASE_URL — the paid client's address is pinned to OpenAI's own
// host, and the pin is reachable from every place that resolves it (Phase 2 U32).
//
// ===========================================================================
// WHAT N-63 ACTUALLY WAS, AND WHY A UNIT TEST WOULD NOT HAVE CLOSED IT
// ===========================================================================
// `OPENAI_BASE_URL` was documented as first-party in `.env.example` and
// validated as nothing. Whatever host the environment named received the
// advisor's prompts — which carry health context (§2.3 rule 15) — and the
// lab-import PDF. `ecc:security-reviewer` raised it on the U31 diff.
//
// The behaviour fix is a pure validator in the paid client. This file exists
// because the fix is only as good as its REACH: a validator that three modules
// call and a fourth does not is a control with a hole, and the hole is
// invisible at the call site that lacks it. So the rule is not "the validator
// exists" — it is:
//
//   EVERY module under `src/` that resolves `OPENAI_BASE_URL` also calls the
//   validator, and both probe scripts call it too.
//
// N-66 pins the same property from the other side: `SOLE_PAID_CLIENT`'s reader
// ratchet (in `boundaries.test.ts`) asserts the reader LIST as an equality, so
// a new reader is red even before anyone asks whether it validates. Two
// assertions, one control: this file says "readers validate", the ratchet says
// "the set of readers cannot grow silently". M7 reddens both, deliberately.
//
// WHAT THIS DOES NOT DO (§2.2 rule 7). It is a source scan, not taint
// analysis. It cannot see a base URL assembled from fragments, read through an
// indirection, or dialled from outside the files it scans. And the control it
// guards is itself bounded: the override exists, and whoever can set the base
// URL can set the override. N-63 is MITIGATED, not closed.
//
// TWO SPECIFIC EVASIONS, NAMED BECAUSE A GENERAL DISCLAIMER IS NOT A LIMIT
// (both raised by ecc:code-reviewer on this diff, 2026-09-18):
//
//   1. IT SCANS `git ls-files --cached`, NOT THE WORKING TREE. An unstaged
//      file that reads the variable without validating is invisible until
//      `git add`. This is not theoretical: U32's own M7 mutation appeared
//      GREEN on its first run for exactly this reason, and reddened only when
//      the mutant file was added to the index. `not-configured-totality.ts`
//      states the same caveat; it is stated here rather than inherited.
//   2. THE CALL CHECK MATCHES A NAME, NOT A BINDING. A locally defined
//      `baseUrlPermitted` that always returns `true` and imports nothing
//      satisfies this scan. In N-14's taxonomy that is an identifier match,
//      and the honest reading is that it catches drift, not a contributor
//      working around it.
//
// ===========================================================================
// ALSO HOSTED HERE (Phase 4 U4): the rest of what `scripts/probes/` must hold
// ===========================================================================
// This is the spec that already inventories the probes, and RC-1 forbids a new
// `src/architecture` file, so the probes' other guards live beside it:
//
//   PROBE_BODIES_FROM_SRC (FU-35). Every `fetch` body in a probe is
//     `JSON.stringify(f(…))` with `f` imported from `@/…`, and no probe file
//     stringifies an object or array literal. The owner's minimum (Phase 2
//     closeout): the probes IMPORT their request bodies from `src/` rather than
//     define them. N-58 is what defining them cost: a hand-rolled body kept
//     `max_tokens` after production moved on, 400'd, and printed a verdict.
//     LIMITS: it reads syntax. A body assembled in a local variable, a builder
//     re-exported through a local module, a local function shadowing an `@/`
//     import's name, or a request sent by anything but a bare `fetch(` call
//     (`globalThis.fetch`, `const f = fetch`, an HTTP library) is not seen.
//     `fetch` options that are not an inline object, or that spread another
//     object, are reported rather than trusted; `"body"` and `["body"]` count.
//   PROBE_FIXTURE_ANSWERS (N-26). Step 3's tool result answers TOOL_BAIT and
//     cites only seeded rules, so an empty second step cannot be obedience.
//   PROBE_ENV_WARNS (FU-37). A populated `.env.local` matching no `OPENAI_*` key
//     warns; the observed N-57 case, which matched three, is pinned as silent.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { ALL_INTERACTION_RULES } from "@/lib/interactions";
import type { ToolResult } from "@/types/advisor";
import type { InteractionFinding } from "@/types/interaction";
import { BAIT_SUPPLEMENTS, probeToolResult, TOOL_BAIT } from "../../scripts/probes/advisor-fixture";
import { loadProbeEnv } from "../../scripts/probes/load-env";

const REPO_ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), "utf8");

/** The env var whose value is the address of every paid call. */
const ADDRESS_VAR = "OPENAI_BASE_URL";

/** The exported pure validator, by name. A rename moves this, not the rule. */
const VALIDATOR = "baseUrlPermitted";

/** The module the validator must live in — the same module `SOLE_PAID_CLIENT` pins. */
const PAID_CLIENT = "src/lib/openai/client.ts";

function tracked(dir: string): string[] {
  const out = execFileSync("git", ["-C", REPO_ROOT, "ls-files", "-z", "--cached", "--", dir], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return out.split("\0").filter((f) => f.length > 0);
}

/** Tracked, non-test TypeScript under a directory. */
function sources(dir: string): string[] {
  return tracked(dir).filter(
    (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test."),
  );
}

/** Files that resolve the address variable from the environment. */
export function addressReaders(files: readonly string[], readFile: (f: string) => string): string[] {
  return files.filter((f) => readFile(f).includes(`process.env.${ADDRESS_VAR}`)).sort();
}

/** Files that call the validator. A call, not a mention: the name plus an open paren. */
export function validatorCallers(
  files: readonly string[],
  readFile: (f: string) => string,
): string[] {
  const call = new RegExp(`\\b${VALIDATOR}\\s*\\(`);
  return files.filter((f) => call.test(readFile(f))).sort();
}

const SRC = sources("src");
const PROBES = sources("scripts/probes").filter((f) => f.endsWith("-probe.ts"));
/**
 * Every tracked script under `scripts/probes`: the probes and their helpers, in
 * any JS/TS extension, so a probe added as `.mjs` is scanned too (U4 review).
 */
const PROBE_MODULES = tracked("scripts/probes").filter(
  (f) => /\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(f) && !f.includes(".test."),
);

/**
 * PROBE_BODIES_FROM_SRC. Wire content a probe file writes by hand, as
 * `file:line [form] text` entries, plus the number of `fetch` bodies it saw
 * (so a scan that stopped matching is not read as a clean one).
 */
export function inlineWireContent(
  fileName: string,
  text: string,
): { violations: string[]; bodies: number } {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fromSrc = new Set<string>();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    if (!st.moduleSpecifier.text.startsWith("@/")) continue;
    const named = st.importClause?.namedBindings;
    if (named && ts.isNamedImports(named)) for (const el of named.elements) fromSrc.add(el.name.text);
  }
  const violations: string[] = [];
  let bodies = 0;
  const flag = (n: ts.Node, form: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
    violations.push(`${fileName}:${line + 1} [${form}] ${n.getText(sf).split("\n")[0]}`);
  };
  const isStringify = (n: ts.Node): n is ts.CallExpression =>
    ts.isCallExpression(n) &&
    ts.isPropertyAccessExpression(n.expression) &&
    ts.isIdentifier(n.expression.expression) &&
    n.expression.expression.text === "JSON" &&
    n.expression.name.text === "stringify";

  const visit = (n: ts.Node) => {
    if (isStringify(n)) {
      const arg = n.arguments[0];
      if (arg && (ts.isObjectLiteralExpression(arg) || ts.isArrayLiteralExpression(arg))) {
        flag(n, "inline-literal");
      }
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "fetch") {
      const init = n.arguments[1];
      if (init && !ts.isObjectLiteralExpression(init)) flag(init, "fetch-options-not-inline");
      if (init && ts.isObjectLiteralExpression(init)) {
        for (const prop of init.properties) {
          // `{ ...init }` can carry a body this scan cannot see (U4 review).
          if (ts.isSpreadAssignment(prop)) {
            flag(prop, "fetch-options-spread");
            continue;
          }
          // `body`, `"body"` and `["body"]` are the same key (U4 review).
          const key = prop.name && ts.isComputedPropertyName(prop.name) ? prop.name.expression : prop.name;
          const name =
            key && (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) ? key.text : undefined;
          if (name !== "body") continue;
          bodies += 1;
          const value = ts.isPropertyAssignment(prop) ? prop.initializer : undefined;
          const built = value && isStringify(value) ? value.arguments[0] : undefined;
          const fromBuilder =
            built !== undefined &&
            ts.isCallExpression(built) &&
            ts.isIdentifier(built.expression) &&
            fromSrc.has(built.expression.text);
          if (!fromBuilder) flag(prop, "body-not-built-in-src");
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { violations, bodies };
}

/** PROBE_FIXTURE_ANSWERS: does this tool result answer TOOL_BAIT, citing only seeded rules? */
export function answersBait(result: ToolResult): boolean {
  if (!result.ok || !Array.isArray(result.data) || result.citations.length === 0) return false;
  const seeded = new Set(ALL_INTERACTION_RULES.map((r) => r.id));
  if (!result.citations.every((c) => seeded.has(c.refId))) return false;
  const [a, b] = BAIT_SUPPLEMENTS;
  return (result.data as InteractionFinding[]).some(
    (f) => (f.supplementId === a && f.counterpart === b) || (f.supplementId === b && f.counterpart === a),
  );
}

describe("FIRST_PARTY_BASE_URL: the host pin is reachable from every resolver", () => {
  it("the validator is exported from the one paid client module", () => {
    // It lives beside `createCompletion` because that is the chokepoint both
    // paid paths already pass through, and because the client imports nothing:
    // a pure function here acquires no edge `DOMAIN_IS_PURE` would forbid.
    expect(read(PAID_CLIENT)).toMatch(new RegExp(`export function ${VALIDATOR}\\b`));
  });

  it("every src/ module that resolves the base URL also calls the validator", () => {
    const readers = addressReaders(SRC, read);
    // Anti-vacuity. If the scan stops matching — the variable is renamed, the
    // reads move behind a helper — every assertion below passes over nothing.
    //
    // [2026-09-21, U33] THE FLOOR WAS 3 AND IS NOW 1, and lowering an
    // anti-vacuity floor deserves more than a number change.
    //
    // The floor was 3 because there were three readers. U33 moved every
    // `process.env` read into `src/lib/openai/config.ts`, so there is exactly
    // one — and "the reads move behind a helper", which this comment named as
    // a FAILURE MODE, is precisely what happened, deliberately. The difference
    // between that failure and this change is where the helper lives and
    // whether it validates: a helper that resolves the address without calling
    // the pin is the defect; a helper that resolves it and calls the pin IS
    // the pin's enforcement point.
    //
    // What stops the floor from being a rubber stamp is that it is no longer
    // the thing counting readers. `SOLE_PAID_CLIENT`'s address ratchet asserts
    // the reader set EQUALS `["src/lib/openai/config.ts"]`, so a second reader
    // is a red build there. This assertion's job is only the vacuity check it
    // was always doing: zero readers means the scan has stopped working, and
    // one is the honest minimum for a tree with one resolver.
    expect(
      readers.length,
      `FIRST_PARTY_BASE_URL found no module reading process.env.${ADDRESS_VAR}. ` +
        "A reach check with nothing to reach passes vacuously.",
    ).toBeGreaterThanOrEqual(1);

    const unvalidated = readers.filter((f) => validatorCallers([f], read).length === 0);
    expect(
      unvalidated,
      `FIRST_PARTY_BASE_URL: these modules resolve ${ADDRESS_VAR} and never call ` +
        `${VALIDATOR}(). A resolver that skips the pin dials whatever the environment ` +
        "names, which is N-63 exactly:\n  " + unvalidated.join("\n  "),
    ).toEqual([]);
  });

  it("both probe scripts call the validator", () => {
    // The probes are OUTSIDE `SOLE_PAID_CLIENT` by design — owner-run
    // diagnostics the application cannot reach. They still dial the same host
    // with the same credential, so the pin has to reach them too; widening
    // `SOLE_PAID_CLIENT` to `scripts/` instead would trade a deliberate
    // exemption for a maintenance burden.
    expect(PROBES.length, "FIRST_PARTY_BASE_URL scanned no probe scripts.").toBe(2);
    expect(validatorCallers(PROBES, read)).toEqual([...PROBES].sort());
  });

  it("a backup of a local env file is ignored by git (N-64)", () => {
    // `.gitignore`'s `.env*.local` does not match `.env.local.bak-u31probe` —
    // a real file the U31 session created while repairing N-57 and had to
    // notice and delete by hand before staging. A credential file that
    // `git status` offers to commit is one keystroke from §2.3 rule 14.
    for (const candidate of [".env.local", ".env.local.bak", ".env.local.bak-u31probe"]) {
      expect(ignored(candidate), `${candidate} is NOT ignored by git`).toBe(true);
    }
  });
});

function ignored(path: string): boolean {
  try {
    execFileSync("git", ["-C", REPO_ROOT, "check-ignore", "-q", "--no-index", "--", path], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

describe("FIRST_PARTY_BASE_URL self-tests: break the scanners and these go red", () => {
  const fake = (contents: Record<string, string>) => (f: string) => contents[f] ?? "";

  it("a reader is found by its env access, not by its filename", () => {
    const files = ["a.ts", "b.ts"];
    const contents = { "a.ts": "const u = process.env.OPENAI_BASE_URL;", "b.ts": "const x = 1;" };
    expect(addressReaders(files, fake(contents))).toEqual(["a.ts"]);
  });

  it("a mention of the validator is not a call", () => {
    const files = ["a.ts", "b.ts"];
    const contents = {
      "a.ts": "// baseUrlPermitted is documented here",
      "b.ts": "if (!baseUrlPermitted(url, allow)) throw x;",
    };
    expect(validatorCallers(files, fake(contents))).toEqual(["b.ts"]);
  });
});

describe("PROBE_BODIES_FROM_SRC: probes import their request bodies from src/ (FU-35)", () => {
  it("every probe module builds its wire content in src/", () => {
    expect(PROBE_MODULES.length, "no tracked module under scripts/probes").toBeGreaterThanOrEqual(3);
    const results = PROBE_MODULES.map((f) => inlineWireContent(f, read(f)));
    // Anti-vacuity: the advisor probe's raw step and the lab-import probe's
    // file-part step each send one body. Zero means the scan stopped matching.
    expect(results.reduce((n, r) => n + r.bodies, 0)).toBeGreaterThanOrEqual(2);
    const violations = results.flatMap((r) => r.violations);
    expect(
      violations,
      "A probe writes wire content by hand. Import the builder production uses from src/\n" +
        "(buildCompletionBody, buildTranscriptionRequest, …) so the probe measures the\n" +
        "provider and not its own staleness (N-58):\n  " + violations.join("\n  "),
    ).toEqual([]);
  });
});

describe("PROBE_BODIES_FROM_SRC self-tests: an inline body is red", () => {
  const scan = (src: string) => inlineWireContent("probe.ts", src).violations;
  const header = 'import { buildCompletionBody } from "@/lib/openai/client";\nimport { local } from "./local";\n';

  it.each([
    ["an inline object body", "fetch(u, { method: 'POST', body: JSON.stringify({ model: 'm', max_tokens: 1 }) });"],
    ["a body built by a local helper", "fetch(u, { body: JSON.stringify(local({ model: 'm' })) });"],
    ["a body built by a function defined in the probe", "const mk = () => ({}); fetch(u, { body: JSON.stringify(mk()) });"],
    ["a shorthand body", "const body = '{}'; fetch(u, { body });"],
    ["options passed as a variable", "const init = { body: '{}' }; fetch(u, init);"],
    ["a quoted body key", "fetch(u, { \"body\": raw });"],
    ["a computed body key", "fetch(u, { [\"body\"]: raw });"],
    ["spread options", "const init = { body: raw }; fetch(u, { method: 'POST', ...init });"],
    ["an inline tool-result literal", "const content = JSON.stringify({ ok: true, data: { note: 'probe fixture' }, citations: [] });"],
  ])("flags %s", (_label, src) => {
    expect(scan(header + src).length).toBeGreaterThan(0);
  });

  it("passes a body built by a src/ import", () => {
    const r = inlineWireContent("probe.ts", header + "fetch(u, { body: JSON.stringify(buildCompletionBody({ model: 'm' })) });");
    expect(r).toEqual({ violations: [], bodies: 1 });
  });
});

describe("PROBE_FIXTURE_ANSWERS: the advisor probe's tool result answers its question (N-26)", () => {
  it("the bait names both supplements the fixture must answer about", () => {
    for (const id of BAIT_SUPPLEMENTS) expect(TOOL_BAIT.toLowerCase()).toContain(id);
  });

  it("the fixture is answerable, and every citation is a seeded rule", () => {
    expect(answersBait(probeToolResult())).toBe(true);
  });

  it("the fixture N-26 was raised on is not answerable", () => {
    // The literal step 3 sent until U4, verbatim.
    expect(answersBait({ ok: true, data: { note: "probe fixture" }, citations: [] } as ToolResult)).toBe(false);
  });

  it("a finding with an authored citation is not answerable", () => {
    const real = probeToolResult();
    const forged = { ...real, citations: [...real.citations, { kind: "paper", refId: "made-up-2020", label: "x" }] };
    expect(answersBait(forged as ToolResult)).toBe(false);
  });

  it("the advisor probe sends that fixture, not a literal", () => {
    const probe = read("scripts/probes/openai-advisor-probe.ts");
    expect(probe).toMatch(/from "\.\/advisor-fixture"/);
    expect(probe).toMatch(/content: JSON\.stringify\(probeToolResult\(\)\)/);
  });
});

describe("PROBE_ENV_WARNS: a populated .env.local matching no OPENAI_* key warns (FU-37)", () => {
  const withEnvFile = (text: string) => {
    const dir = mkdtempSync(join(tmpdir(), "u4-env-"));
    writeFileSync(join(dir, ".env.local"), text);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      return { loaded: loadProbeEnv(dir), warned: warn.mock.calls.map((c) => String(c[0])) };
    } finally {
      warn.mockRestore();
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it("warns, with a count and no name or value, when nothing matches", () => {
    const { loaded, warned } = withEnvFile("OMNIROUTE_BASE_URL=https://old.example\nOMNIROUTE_MODEL=u4-secret-value\n");
    expect(loaded.fromFile).toEqual([]);
    expect(warned).toHaveLength(1);
    expect(warned[0]).toBe(loaded.warning);
    expect(warned[0]).toContain("2 setting(s)");
    expect(warned[0]).not.toContain("OMNIROUTE");
    expect(warned[0]).not.toContain("u4-secret-value");
  });

  it("is silent when a key matches", () => {
    vi.stubEnv("OPENAI_U4_PROBE_TEST", "");
    const { loaded, warned } = withEnvFile("OPENAI_U4_PROBE_TEST=x\nOTHER=y\n");
    expect(loaded.fromFile).toEqual(["OPENAI_U4_PROBE_TEST"]);
    expect(warned).toEqual([]);
  });

  it("is silent on an empty or comment-only file", () => {
    expect(withEnvFile("# nothing here\n\n").warned).toEqual([]);
  });

  it("STATED LIMIT: the N-57 glued-line case matched three keys and stays silent", () => {
    for (const k of ["OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_REASONING_EFFORT"]) vi.stubEnv(k, "");
    const glued =
      "OPENAI_API_KEY=k\nOPENAI_MODEL=m\nOPENAI_REASONING_EFFORT=low\nOMNIROUTE_MODEL=oldOPENAI_BASE_URL=https://api.openai.com\n";
    const { loaded, warned } = withEnvFile(glued);
    expect(loaded.fromFile).not.toContain("OPENAI_BASE_URL");
    expect(warned).toEqual([]);
  });
});
