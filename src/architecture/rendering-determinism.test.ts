// RENDERING_DETERMINISM — the app renders the same way whether or not Supabase
// env vars are present at build time (Phase 2 U28, closing finding N-38).
//
// ===========================================================================
// THE DEFECT THIS EXISTS TO PREVENT RECURRING
// ===========================================================================
// `getUser()` used to short-circuit on `!isSupabaseConfigured()` BEFORE calling
// `createClient()`, and `createClient()` was the only thing that called
// `cookies()`. `cookies()` is what opts a route out of static generation, and
// `TopNav` calls `getUser()` from the root layout on every page. So:
//
//   credentialed build -> cookies() reached -> 0 prerendered .html
//   clean-env build    -> short-circuited   -> 20 prerendered .html
//
// CI has no credentials by design (P-03 — this repository is public), so CI had
// been building a materially different app from production for as long as CI
// has existed. Nothing noticed until U14's CSP: a per-request nonce cannot
// exist inside a build-time prerender, so its E2E reported 72 `script-src-elem`
// violations in CI and zero locally, and the local measurement was the
// contaminated one.
//
// ===========================================================================
// WHAT THIS FILE CAN AND CANNOT SEE — read before trusting it (§2.2 rule 7)
// ===========================================================================
// SOURCE-LEVEL, therefore ORDER-SAFE: it needs no build artifact, which is what
// lets it run in the declared CI chain where `vitest run` precedes
// `next build`. It asserts the dynamic MARKER is still in the source.
//
// It CANNOT see what a build produced. A marker present in source but defeated
// some other way — a caller that stops going through `getUser()`, a Next
// version that treats `cookies()` differently — leaves this green.
// `npm run verify:rendering` reads the actual build output and is the half that
// can see that. UNLIKE U27's build-half, it runs in CI: it costs a directory
// read, so there was no honest reason to defer it.
//
// So: green here means the marker is written. Green there means the build
// obeyed it. Both are required and neither implies the other.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");
const SESSION_PATH = "src/lib/auth/session.ts";

/** Comments stripped, so prose can neither trip nor satisfy a rule. */
function sessionCode(): string {
  return readFileSync(join(REPO_ROOT, SESSION_PATH), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("RENDERING_DETERMINISM: the dynamic marker is unconditional", () => {
  it("getUser() calls cookies()", () => {
    expect(
      sessionCode(),
      `RENDERING_DETERMINISM: ${SESSION_PATH} no longer calls cookies().\n` +
        "That call is a DYNAMIC MARKER, not a data read — it is what stops Next\n" +
        "statically prerendering every page that renders the root layout.\n" +
        "Without it, rendering mode depends on whether Supabase env vars are set\n" +
        "at BUILD time, and CI (which has none, by design) silently builds a\n" +
        "different app from production. That is finding N-38.",
    ).toContain("cookies()");
  });

  it("imports cookies from next/headers", () => {
    // Binds the call to the real dynamic API. A local helper named `cookies()`
    // would satisfy the assertion above and mark nothing.
    expect(
      sessionCode(),
      `RENDERING_DETERMINISM: ${SESSION_PATH} does not import cookies from\n` +
        "next/headers. Only that import is the dynamic API; a same-named local\n" +
        "function would pass the call check above and opt nothing out of static\n" +
        "generation.",
    ).toMatch(/import\s*\{[^}]*\bcookies\b[^}]*\}\s*from\s*"next\/headers"/);
  });

  it("calls cookies() BEFORE the isSupabaseConfigured() short-circuit", () => {
    // THE assertion of this file, and the exact shape of the original defect.
    // A `cookies()` call placed after the early return is present in the source,
    // satisfies both checks above, and still leaves the unconfigured path
    // short-circuiting before it — which is precisely the bug, reintroduced
    // while looking correct.
    const code = sessionCode();
    const marker = code.indexOf("cookies()");
    const shortCircuit = code.indexOf("isSupabaseConfigured()");

    expect(marker, "no cookies() call found").toBeGreaterThan(-1);
    expect(shortCircuit, "no isSupabaseConfigured() check found").toBeGreaterThan(-1);
    expect(
      marker,
      "RENDERING_DETERMINISM: cookies() is called AFTER the\n" +
        "isSupabaseConfigured() short-circuit, so the unconfigured path still\n" +
        "returns before reaching it. That is the N-38 defect exactly: the marker\n" +
        "is present in the file and unreachable in the environment that needs it.\n" +
        "Move the call above the early return.",
    ).toBeLessThan(shortCircuit);
  });

  it("the marker is awaited — cookies() is async in Next 15", () => {
    // An un-awaited call still opts the route out, but leaves a floating promise
    // and would break the moment the value is used. Pinned so the shape stays
    // correct rather than accidentally correct.
    expect(sessionCode()).toMatch(/await\s+cookies\(\)/);
  });
});
