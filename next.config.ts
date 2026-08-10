import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// SECURITY HEADERS — the non-CSP half (Phase 2 U13, roadmap item 7)
// ---------------------------------------------------------------------------
// CSP IS DELIBERATELY ABSENT AND BELONGS TO U14, NOT HERE.
//
// A strict `Content-Security-Policy` breaks Next 15's inline bootstrap unless a
// nonce is threaded through `middleware.ts`, so it ships Report-Only first and
// needs a pure builder module to be testable at all. Adding it here would put
// security logic in a root-level file that `TREE_PARTITION` does not govern and
// no test covers. Every header below was chosen because it CANNOT break the
// shipped app; that is the line between this unit and the next one.
//
// Each entry is justified individually. A set nobody can defend line by line is
// a set nobody will dare change later.
//
// `X-Content-Type-Options: nosniff`
//   Stops a browser re-interpreting a response as a type the server did not
//   declare. This app serves user-supplied lab-report text back to the user;
//   sniffing is the mechanism that turns "some text we echoed" into "a document
//   the browser executed". No legitimate client depends on sniffing.
//
// `Referrer-Policy: strict-origin-when-cross-origin`
//   Full URL on same-origin navigation, bare origin cross-origin, nothing on a
//   downgrade. This is a §2.3 rule 15 control, not a generic hardening knob:
//   Library paths are health-revealing by construction — `/library/berberine`
//   in a Referer header tells a third party something about the reader that
//   they told only us.
//
// `X-Frame-Options: DENY`
//   Clickjacking. The app is never framed by design, and no flow embeds it.
//   CSP's `frame-ancestors` supersedes this header in modern browsers and is
//   therefore U14's; DENY is precisely the part of that protection obtainable
//   without CSP, which is what makes it this unit's.
//
// `Strict-Transport-Security: max-age=63072000; includeSubDomains`
//   Two years, subdomains included. Inert over plain HTTP, so local development
//   and the E2E run are unaffected by construction.
//   `preload` IS DELIBERATELY OMITTED — see the register note. Submitting to
//   the browser preload list is an outward-facing act with a slow, manual
//   reversal, which makes it an owner decision rather than a code change.
//
// `Permissions-Policy: camera=(), microphone=(), geolocation=()`
//   The app requests none of these. Denying them means a future dependency that
//   asks cannot succeed silently. Empty allowlists deny for first AND third
//   party, which is the intent.
//
// DELIBERATELY NOT SET, each for a reason — absence here is a decision:
//   * `Content-Security-Policy`      U14 owns it. See above.
//   * `X-XSS-Protection`             The legacy auditor is removed from modern
//                                    browsers and its filter was itself an
//                                    exploitable oracle. Setting it to `0` is
//                                    defensible; setting it to `1; mode=block`
//                                    is actively worse than nothing. Neither
//                                    earns a line here.
//   * `Cross-Origin-Opener-Policy`   COOP `same-origin` severs `window.opener`,
//     `Cross-Origin-Embedder-Policy` which is how OAuth popup flows return, and
//                                    COEP rejects any third-party subresource
//                                    lacking CORP. Both CAN break the shipped
//                                    app, which by this unit's own rule makes
//                                    them not-U13. Registered, not absorbed.
//   * `X-DNS-Prefetch-Control`       No articulable threat model for this app.
//                                    Included in most copied header sets, which
//                                    is the reason to leave it out.
//
// The values are asserted twice, and not redundantly:
//   * `src/architecture/security-headers.test.ts` asserts THIS CONFIG.
//   * `tests/e2e/security-headers.spec.ts` asserts the RESPONSE BYTES.
// A header scoped to a path that never matches satisfies the first and fails
// the second. That mutation is recorded in the unit report.
// ---------------------------------------------------------------------------

/**
 * Applied to every route. Exported so the architecture test asserts the same
 * object Next consumes, rather than a copy that can drift from it.
 */
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
] as const;

/** Every path, including the public Library the E2E spec asserts against. */
export const SECURITY_HEADER_SOURCE = "/:path*";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: SECURITY_HEADER_SOURCE,
        headers: SECURITY_HEADERS.map(({ key, value }) => ({ key, value })),
      },
    ];
  },
};

export default nextConfig;
