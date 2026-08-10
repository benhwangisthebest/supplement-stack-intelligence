import { describe, expect, it } from "vitest";

import nextConfig, {
  SECURITY_HEADERS,
  SECURITY_HEADER_SOURCE,
} from "../../next.config";

// ---------------------------------------------------------------------------
// SECURITY_HEADERS — the CONFIG half of Phase 2 U13.
// ---------------------------------------------------------------------------
// WHAT THIS FILE CAN AND CANNOT SEE, stated first because the answer is the
// reason a second test exists.
//
// This test invokes `nextConfig.headers()` — the real function Next calls — and
// asserts the header NAMES and VALUES it returns. It is a fast, credential-free
// guard that catches a deleted header, a weakened value, and the reappearance
// of a header this unit deliberately excluded.
//
// It CANNOT see whether a single byte of any of this reaches a browser. A
// header correctly declared under a `source` that matches no route satisfies
// every assertion below and ships zero protection. `tests/e2e/security-headers
// .spec.ts` asserts the response bytes and is the only thing that closes that
// gap. The plan (§5 Group D, U13) requires that non-redundancy be PROVEN rather
// than asserted, with a named mutation: scope a header to a non-matching path,
// and this file stays green while the E2E goes red. That red text is recorded
// in the unit report.
//
// So: a failure here means the intent changed. A pass here means only that the
// intent is intact — not that it is in force.
// ---------------------------------------------------------------------------

/** Resolve the real config's headers() to a flat name → value map. */
async function resolveHeaders() {
  expect(nextConfig.headers, "next.config.ts must define headers()").toBeTypeOf(
    "function",
  );
  const rules = await nextConfig.headers!();
  expect(rules).toHaveLength(1);
  const [rule] = rules;
  return {
    source: rule.source,
    map: new Map(rule.headers.map((h) => [h.key, h.value])),
  };
}

describe("SECURITY_HEADERS — the declared set", () => {
  it("declares exactly the five non-CSP headers this unit owns, and no more", async () => {
    const { map } = await resolveHeaders();
    // Exact set, not a superset. A superset assertion would let a copied header
    // block arrive unexamined, which is the failure this unit's header comment
    // argues against.
    expect([...map.keys()].sort()).toEqual(
      [
        "Permissions-Policy",
        "Referrer-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ].sort(),
    );
  });

  it.each(SECURITY_HEADERS.map((h) => [h.key, h.value]))(
    "%s is set to its justified value: %s",
    async (key, value) => {
      const { map } = await resolveHeaders();
      expect(map.get(key)).toBe(value);
    },
  );
});

describe("SECURITY_HEADERS — values that must not silently weaken", () => {
  it("nosniff is the only accepted X-Content-Type-Options value", async () => {
    const { map } = await resolveHeaders();
    expect(map.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("Referrer-Policy does not leak a health-revealing path cross-origin", async () => {
    const { map } = await resolveHeaders();
    // §2.3 rule 15. `/library/berberine` in a Referer tells a third party what
    // the reader was reading. These four policies all send the full path
    // cross-origin and are therefore disqualified regardless of other merits.
    const LEAKS_PATH_CROSS_ORIGIN = [
      "unsafe-url",
      "no-referrer-when-downgrade",
      "origin-when-cross-origin",
      "same-origin",
    ];
    expect(LEAKS_PATH_CROSS_ORIGIN).not.toContain(map.get("Referrer-Policy"));
    expect(map.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("X-Frame-Options denies framing outright rather than allow-listing", async () => {
    const { map } = await resolveHeaders();
    expect(map.get("X-Frame-Options")).toBe("DENY");
  });

  it("HSTS max-age is at least one year and covers subdomains", async () => {
    const { map } = await resolveHeaders();
    const hsts = map.get("Strict-Transport-Security") ?? "";
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0);
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
    expect(hsts).toContain("includeSubDomains");
  });

  it("HSTS does NOT carry preload — that is an owner decision, not a code change", async () => {
    const { map } = await resolveHeaders();
    // Preload submission is outward-facing and slow to reverse. Registered as a
    // finding rather than shipped by an agent. If a future change adds it, this
    // assertion should be deleted deliberately, by whoever made that decision.
    expect(map.get("Strict-Transport-Security")).not.toContain("preload");
  });

  it("Permissions-Policy denies the three capabilities the app never requests", async () => {
    const { map } = await resolveHeaders();
    const pp = map.get("Permissions-Policy") ?? "";
    for (const feature of ["camera", "microphone", "geolocation"]) {
      // `feature=()` — an empty allowlist denies first and third party alike.
      expect(pp).toContain(`${feature}=()`);
    }
  });
});

describe("SECURITY_HEADERS — deliberate exclusions stay excluded", () => {
  // Each of these is absent for a reason written into next.config.ts. A test is
  // what stops a later "add the standard set" commit from re-adding them
  // without reading why they were left out.
  it.each([
    [
      "Content-Security-Policy",
      "U14 owns it, Report-Only first — it needs a nonce threaded through middleware",
    ],
    [
      "Content-Security-Policy-Report-Only",
      "also U14's; this unit ships neither form",
    ],
    [
      "X-XSS-Protection",
      "the legacy auditor was itself an exploitable oracle and is gone from modern browsers",
    ],
    [
      "Cross-Origin-Opener-Policy",
      "same-origin severs window.opener, which is how OAuth popup flows return",
    ],
    [
      "Cross-Origin-Embedder-Policy",
      "require-corp rejects third-party subresources lacking CORP",
    ],
  ])("%s is not set here — %s", async (key) => {
    const { map } = await resolveHeaders();
    expect(map.has(key)).toBe(false);
  });
});

describe("SECURITY_HEADERS — the exported constants stay in step with the config", () => {
  it("every exported constant actually reaches headers()", async () => {
    // Guards the copy-drift this unit avoided by exporting the array: if
    // SECURITY_HEADERS stops being the source headers() maps over, this fails.
    const { map } = await resolveHeaders();
    for (const { key, value } of SECURITY_HEADERS) {
      expect(map.get(key)).toBe(value);
    }
    expect(map.size).toBe(SECURITY_HEADERS.length);
  });

  it("the source is a single rule applying to every path", async () => {
    const { source } = await resolveHeaders();
    expect(source).toBe(SECURITY_HEADER_SOURCE);
    // NOTE, and it is the point of the E2E: this asserts the source is what the
    // constant says. It does NOT assert the constant matches any real route.
    // Changing BOTH together — the mutation the plan names — leaves this green.
  });
});
