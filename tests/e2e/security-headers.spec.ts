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

  test("the ENFORCING Content-Security-Policy is still not shipped", async ({
    request,
  }) => {
    // DELIBERATELY FLIPPED BY U14, not incidentally.
    //
    // U13 asserted BOTH forms absent. U14 ships the Report-Only form, so the
    // second half of that assertion moved to the block below and this half
    // stayed — narrowed, not deleted. The enforcing header remains a red:
    // flipping Report-Only to enforcing is a separate, evidenced decision that
    // must also answer N-33 (an enforced policy with no report sink is blind in
    // production), and it must not arrive as a one-word edit nobody noticed.
    const headers = (await request.get("/library/creatine")).headers();
    expect(headers["content-security-policy"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CONTENT SECURITY POLICY — Report-Only (Phase 2 U14).
// ---------------------------------------------------------------------------
// THIS BLOCK IS ALSO U27'S LIVENESS PROOF, and that is a load-bearing second
// job rather than a coincidence.
//
// `src/architecture/middleware-scope.test.ts` is source-level: it proves the
// middleware is at the path Next compiles, not that Next compiled it or that it
// ran. The build-artifact check (`npm run verify:middleware`) needs a build, so
// it cannot live in the declared CI chain, where `vitest run` precedes
// `next build` — it is developer-run. **The header asserted below cannot exist
// unless the middleware executed**, so once this spec runs in CI, U27's liveness
// half is CI-enforced by it. If this block is ever deleted or gated, U27 loses
// its only automated liveness evidence — say so in whatever removes it.
const CSP_HEADER = "content-security-policy-report-only";

test.describe("U14: Content-Security-Policy (Report-Only) arrives", () => {
  for (const path of PUBLIC_PATHS) {
    test(`Report-Only policy is delivered on ${path}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBeLessThan(400);
      const policy = response.headers()[CSP_HEADER];

      expect(
        policy,
        `${CSP_HEADER} missing on ${path}. Either the CSP was dropped, or the ` +
          "middleware did not run at all — see U27/N-34, where a middleware at " +
          "the wrong path compiled to nothing and every request silently ran none.",
      ).toBeDefined();

      // Spot-check the directives whose absence would be silent. A policy
      // string that parses but has lost `frame-ancestors` still looks like a CSP.
      expect(policy).toContain("default-src 'self'");
      expect(policy).toContain("frame-ancestors 'none'");
      expect(policy).toContain("base-uri 'none'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("'strict-dynamic'");
      expect(policy).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'/);
    });
  }

  test("the nonce is fresh per response, not a build-time constant", async ({
    request,
  }) => {
    // A constant nonce is worse than none: it looks enforced and authorises any
    // injected tag that copies it. Only a response-level check can see this —
    // the builder's unit test proves generateNonce() varies, not that the
    // running server calls it per request.
    const read = async () =>
      /'nonce-([A-Za-z0-9+/=]+)'/.exec(
        (await request.get("/library/creatine")).headers()[CSP_HEADER] ?? "",
      )?.[1];
    const [a, b] = [await read(), await read()];
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  test("the delivered nonce matches the one in the rendered HTML", async ({
    request,
  }) => {
    // THE assertion that decides whether this policy would survive enforcement.
    // A header nonce that does not match the document's `<script nonce>` blocks
    // every script the moment Report-Only becomes enforcing — and Report-Only
    // reports nothing about it, because the browser is not blocking yet.
    //
    // Asserted on `/library/creatine` on purpose: the build reports it as ● SSG,
    // and a build-time prerender cannot carry a per-request nonce. That it
    // matches here is the measured answer to whether static generation and a
    // nonce can coexist in this app. See the SSG/runtime-cache finding.
    const response = await request.get("/library/creatine");
    const headerNonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(
      response.headers()[CSP_HEADER] ?? "",
    )?.[1];
    const htmlNonce = /nonce="([^"]+)"/.exec(await response.text())?.[1];

    expect(headerNonce, "no nonce in the delivered policy").toBeTruthy();
    expect(htmlNonce, "no nonce in the rendered HTML").toBeTruthy();
    expect(
      htmlNonce,
      "the HTML nonce does not match the header nonce — every script would be " +
        "blocked the moment this policy is enforced, and Report-Only cannot warn you.",
    ).toBe(headerNonce);
  });

  test("a real browser reports ZERO violations of the policy", async ({
    page,
  }) => {
    // THE PIN, and the reason the whole unit is worth shipping: Report-Only's
    // value is entirely in what the browser reports, and nothing else in this
    // repository can observe that.
    //
    // ANTI-VACUITY. A collector that collects nothing passes exactly like one
    // that finds nothing wrong, so this assertion is only meaningful because it
    // was shown RED: mutation M10 set `style-src 'none'` and this test reported
    // `[report] style-src-elem <- /_next/static/css/…css` on every path. That
    // red output is recorded in the plan's U14 entry. Without it, the zero below
    // would be an unfalsifiable claim.
    await page.addInitScript(() => {
      (window as unknown as { __csp: unknown[] }).__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        (window as unknown as { __csp: unknown[] }).__csp.push({
          directive: e.effectiveDirective || e.violatedDirective,
          blockedURI: String(e.blockedURI).slice(0, 120),
          disposition: e.disposition,
        });
      });
    });

    for (const path of PUBLIC_PATHS) {
      await page.goto(path, { waitUntil: "networkidle" });
      const found = await page.evaluate(
        () => (window as unknown as { __csp: unknown[] }).__csp,
      );
      expect(
        found,
        `${path} violated the Report-Only policy. Under Report-Only nothing is ` +
          "blocked, so this is a WARNING about what enforcement would break — " +
          "which is exactly what this unit ships Report-Only to discover.",
      ).toEqual([]);
      await page.evaluate(() => {
        (window as unknown as { __csp: unknown[] }).__csp = [];
      });
    }
  });
});
