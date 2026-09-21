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
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
