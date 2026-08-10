import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// SECURITY HEADERS — the RESPONSE-BYTES half of Phase 2 U13.
// ---------------------------------------------------------------------------
// UNGATED, DELIBERATELY. Every assertion here runs against the public Library,
// which is static and needs no credentials, no Supabase session and no seeded
// demo user. So this spec carries no `[LIVE]` tag and must not acquire one:
// `src/architecture/e2e-live-tagging.test.ts` enforces that relationship BOTH
// ways — a gated block without the tag fails, and a tagged block that is not
// gated fails too. It also never touches the shared demo account, so it is
// exempt from the serialisation `playwright.config.ts` applies to live runs.
//
// WHY THIS EXISTS WHEN A CONFIG TEST ALREADY PASSES.
// `src/architecture/security-headers.test.ts` asserts what `next.config.ts`
// DECLARES. It cannot observe whether one byte of that declaration reaches a
// client. A header declared under a `source` matching no route, a header lost
// to a rewrite, a header a future middleware strips — all leave the config test
// green and all ship zero protection. This spec reads the bytes off a real
// production-built response and is the only thing in the repository that can
// tell the difference.
//
// The plan requires that non-redundancy be PROVEN, not claimed: scoping a
// header to a non-matching path leaves the config test green and turns this
// spec red. That mutation and its red output are recorded in the unit report.
//
// Note the runner: playwright.config.ts builds and starts the PRODUCTION app
// rather than `next dev`. That matters here more than anywhere else in the
// suite — `headers()` is a production-server behaviour, and a header verified
// only against a dev server would not support a claim about the shipped app.
// ---------------------------------------------------------------------------

/** Public, static, credential-free. */
const PUBLIC_PATHS = ["/", "/library", "/library/creatine"];

/** Must arrive with these exact values. Mirrors next.config.ts by intent. */
const EXPECTED: ReadonlyArray<readonly [string, string]> = [
  ["x-content-type-options", "nosniff"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["x-frame-options", "DENY"],
  ["strict-transport-security", "max-age=63072000; includeSubDomains"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=()"],
];

test.describe("U13: security headers arrive on real responses", () => {
  for (const path of PUBLIC_PATHS) {
    test(`every declared header is present on ${path}`, async ({ request }) => {
      const response = await request.get(path);
      expect(
        response.status(),
        `${path} must be reachable for this assertion to mean anything`,
      ).toBeLessThan(400);

      // Playwright lowercases header names; HTTP header names are
      // case-insensitive, so this is the normalised form, not a weakening.
      const headers = response.headers();

      for (const [name, value] of EXPECTED) {
        expect(
          headers[name],
          `${name} missing from the response for ${path} — declared in ` +
            `next.config.ts but not delivered. The config test cannot see this.`,
        ).toBeDefined();
        expect(headers[name], `${name} delivered with an unexpected value`).toBe(
          value,
        );
      }
    });
  }

  test("the headers survive a nested dynamic route, not just the root", async ({
    request,
  }) => {
    // A source pattern can match `/` and miss `/library/creatine`. Asserting
    // only the root is how a path-scoping regression hides.
    const response = await request.get("/library/magnesium");
    expect(response.status()).toBeLessThan(400);
    const headers = response.headers();
    for (const [name, value] of EXPECTED) {
      expect(headers[name], `${name} missing on a nested dynamic route`).toBe(
        value,
      );
    }
  });

  test("Content-Security-Policy is NOT shipped by this unit", async ({
    request,
  }) => {
    // U14 owns CSP and ships Report-Only first. If a CSP appears here before
    // that unit lands, it arrived without the nonce work Next 15 needs and is
    // likely breaking the app silently for some users. Asserted as bytes, since
    // the risk is a middleware adding it — which no config test would see.
    const headers = (await request.get("/library/creatine")).headers();
    expect(headers["content-security-policy"]).toBeUndefined();
    expect(headers["content-security-policy-report-only"]).toBeUndefined();
  });
});
