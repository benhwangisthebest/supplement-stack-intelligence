// CSP builder — the unit half of Phase 2 U14.
//
// ===========================================================================
// WHAT THIS FILE CAN AND CANNOT SEE, stated first because it is why a second
// and a third guard exist.
// ===========================================================================
// These tests drive the pure builder. They assert the policy STRING and the
// nonce's shape and freshness. They cannot see whether one byte of it reaches a
// browser, whether Next stamps the nonce on its inline bootstrap, or whether a
// real page violates the policy. Those are response-byte and browser questions,
// and they belong to `tests/e2e/security-headers.spec.ts`.
//
// The division mirrors U13's exactly: config test asserts intent, E2E asserts
// delivery. A failure here means the policy changed. A pass here means only that
// the policy is what we meant — not that it is in force.
import { describe, expect, it } from "vitest";

import {
  buildCsp,
  generateNonce,
  CSP_DIRECTIVES,
  CSP_ENFORCING_HEADER,
  CSP_REPORT_ONLY_HEADER,
  NONCE_BYTE_LENGTH,
  NONCE_PLACEHOLDER,
  NONCE_REQUEST_HEADER,
} from "./csp";

/** Parse a built policy back into a directive → sources map. */
function parse(policy: string): Map<string, string[]> {
  return new Map(
    policy.split(";").map((part) => {
      const [name, ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    }),
  );
}

describe("generateNonce", () => {
  it("encodes exactly the requested entropy as base64", () => {
    // Driven with known bytes so the assertion is about ENCODING, not luck.
    const nonce = generateNonce((b) => b.fill(0));
    expect(nonce).toBe(btoa("\0".repeat(NONCE_BYTE_LENGTH)));
    expect(Buffer.from(nonce, "base64")).toHaveLength(NONCE_BYTE_LENGTH);
  });

  it("carries at least the 128 bits the CSP spec asks of a nonce", () => {
    expect(NONCE_BYTE_LENGTH * 8).toBeGreaterThanOrEqual(128);
  });

  it("is different on every call", () => {
    // THE assertion of this file. A predictable nonce is not a nonce — it is a
    // constant an attacker copies into an injected <script>, and the policy then
    // authorises exactly what it exists to block. 200 calls, no repeat.
    const seen = new Set(Array.from({ length: 200 }, () => generateNonce()));
    expect(seen.size).toBe(200);
  });

  it("defaults to the platform CSPRNG rather than anything seeded", () => {
    // The injectable parameter exists for the tests. If the DEFAULT ever stops
    // being crypto-random, the freshness test above would still pass against a
    // good-enough-looking counter, so bind the default explicitly.
    const spy: number[] = [];
    const original = crypto.getRandomValues.bind(crypto);
    const patched = (b: Uint8Array) => {
      spy.push(b.length);
      return original(b);
    };
    Object.defineProperty(crypto, "getRandomValues", {
      value: patched,
      configurable: true,
    });
    try {
      generateNonce();
    } finally {
      Object.defineProperty(crypto, "getRandomValues", {
        value: original,
        configurable: true,
      });
    }
    expect(spy).toEqual([NONCE_BYTE_LENGTH]);
  });
});

describe("buildCsp — the policy this unit ships", () => {
  const NONCE = "TEST-NONCE";
  const policy = buildCsp(NONCE);
  const directives = parse(policy);

  it("substitutes the nonce into every directive that declares one", () => {
    expect(policy).not.toContain(`'nonce-${NONCE_PLACEHOLDER}'`);
    expect(directives.get("script-src")).toContain(`'nonce-${NONCE}'`);
    expect(directives.get("style-src")).toContain(`'nonce-${NONCE}'`);
  });

  it("declares exactly the directives this unit owns, and no more", () => {
    // Exact set, not a superset — U13's rule. A copied policy block must not
    // arrive unexamined.
    expect([...directives.keys()].sort()).toEqual(
      [
        "base-uri",
        "connect-src",
        "default-src",
        "font-src",
        "form-action",
        "frame-ancestors",
        "img-src",
        "object-src",
        "script-src",
        "style-src",
      ].sort(),
    );
  });

  it.each([
    ["default-src", "'self'"],
    ["frame-ancestors", "'none'"],
    ["base-uri", "'none'"],
    ["object-src", "'none'"],
    ["form-action", "'self'"],
    ["connect-src", "'self'"],
    ["font-src", "'self'"],
  ])("%s is pinned to %s", (directive, expected) => {
    expect(directives.get(directive)).toEqual([expected]);
  });

  it("keeps 'strict-dynamic' on script-src", () => {
    // Without it, `'self'` would allow any same-origin script URL — including
    // one an injection points at. With it, supporting browsers ignore host
    // sources for scripts and trust only the nonce chain.
    expect(directives.get("script-src")).toContain("'strict-dynamic'");
  });

  it.each([
    ["script-src", "'unsafe-inline'"],
    ["script-src", "'unsafe-eval'"],
    ["style-src", "'unsafe-inline'"],
    ["default-src", "*"],
  ])("%s never contains %s", (directive, banned) => {
    // The measured result (zero violations against a real production build)
    // is what makes these refusals affordable. Adding 'unsafe-inline' would
    // guarantee a clean report and prove nothing — the exact trade this unit
    // declined. Re-adding one must be a red, not a quiet convenience.
    expect(directives.get(directive) ?? []).not.toContain(banned);
  });

  it("declares NO report sink, deliberately — see N-33", () => {
    // There is no endpoint to point at: every route under src/app/api/** must
    // authenticate (§2.3 rule 11) and a browser CSP report carries no
    // credentials. The rank-1 exception was asked for and refused. Pinned so an
    // enforcing flip has to re-raise the question rather than inherit silence.
    expect(policy).not.toContain("report-uri");
    expect(policy).not.toContain("report-to");
  });

  it("refuses to build with an empty nonce rather than emitting 'nonce-'", () => {
    // A malformed source expression is silently DROPPED by browsers, leaving a
    // policy that looks present and permits nothing it meant to. Failing in
    // middleware is recoverable; shipping that quietly is not.
    expect(() => buildCsp("")).toThrow(/empty nonce/);
  });

  it("formats as a browser-parseable `directive sources; …` string", () => {
    for (const part of policy.split(";")) {
      expect(part.trim()).toMatch(/^[a-z-]+ .+$/);
    }
    expect(policy).not.toContain(";;");
  });
});

describe("CSP header names", () => {
  it("ships the Report-Only header, never the enforcing one", () => {
    // U14 ships Report-Only FIRST. The enforcing name is exported only so the
    // guards can assert its absence against a constant instead of a retyped
    // string.
    expect(CSP_REPORT_ONLY_HEADER).toBe("Content-Security-Policy-Report-Only");
    expect(CSP_ENFORCING_HEADER).toBe("Content-Security-Policy");
    expect(CSP_REPORT_ONLY_HEADER).not.toBe(CSP_ENFORCING_HEADER);
  });

  it("names the inward nonce channel", () => {
    expect(NONCE_REQUEST_HEADER).toBe("x-nonce");
  });
});

describe("CSP_DIRECTIVES — the exported data stays in step with the builder", () => {
  it("every declared directive reaches the built policy", () => {
    // Guards copy-drift the same way U13's SECURITY_HEADERS assertion does: if
    // CSP_DIRECTIVES stops being what buildCsp maps over, this fails.
    const built = parse(buildCsp("X"));
    expect(built.size).toBe(CSP_DIRECTIVES.length);
    for (const [name] of CSP_DIRECTIVES) expect(built.has(name)).toBe(true);
  });

  it("uses the placeholder only inside a nonce source expression", () => {
    // A stray NONCE elsewhere would ship the literal string into a policy.
    for (const [, sources] of CSP_DIRECTIVES) {
      for (const s of sources) {
        if (s.includes(NONCE_PLACEHOLDER)) {
          expect(s).toBe(`'nonce-${NONCE_PLACEHOLDER}'`);
        }
      }
    }
  });
});
