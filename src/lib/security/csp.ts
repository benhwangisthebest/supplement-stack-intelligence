// ---------------------------------------------------------------------------
// CONTENT SECURITY POLICY — the pure builder (Phase 2 U14, roadmap item 7).
// ---------------------------------------------------------------------------
// WHY THIS MODULE EXISTS AT ALL, rather than a string in `middleware.ts`.
//
// `middleware.ts` sits at the REPOSITORY ROOT, outside `src/`. `TREE_PARTITION`
// in `boundaries.test.ts` partitions loose files under `src/` only, so the root
// file is outside its reach entirely and, before this unit, was covered by no
// test in the repository. Putting policy logic there recreates closeout finding
// C-11 at a path C-11's own fix cannot see. So the policy is computed HERE — in
// a layer the boundary rules govern and a unit test can drive — and the root
// file is reduced to a call. `src/architecture/middleware-scope.test.ts` is what
// keeps it reduced.
//
// PURITY. This module imports NOTHING: no `next/*`, no db, no packages. That is
// what makes it testable without a request, and it keeps it clean under
// `DOMAIN_IS_PURE`. It uses two globals — `crypto.getRandomValues` and `btoa` —
// which exist in both the Edge runtime middleware runs in and Node 18+, where
// the unit tests run. The RNG is injectable so the tests never depend on
// randomness they cannot control.
//
// REPORT-ONLY FIRST, and the reason it is not timidity.
// A strict CSP breaks Next 15's inline bootstrap unless every inline script
// carries a nonce. Whether Next threads a nonce correctly under the
// REPORT-ONLY header variant, and whether `next/font`'s injected `<style>` tag
// receives one, are empirical questions this repository cannot answer by
// reading documentation (§2.2 rule 7: never assert a fact the system did not
// compute). Report-Only enforces nothing in the browser, so shipping it makes
// those questions MEASURABLE — the violations a real browser reports against a
// real production build are the answer. `tests/e2e/security-headers.spec.ts`
// collects them and pins the result.
//
// NO REPORT SINK, and it is a decision rather than an oversight.
// There is no `report-uri`/`report-to` directive because there is no endpoint
// to point at. Every route under `src/app/api/**` must authenticate and return
// 401 (CLAUDE.md §2.3 rule 11), and a browser-generated CSP report carries no
// credentials — so a collector route would need a rank-1 exception, which was
// asked for and refused. Under Report-Only the E2E collector IS the collector.
// This is registered as a finding, and an eventual ENFORCING flip must re-raise
// it: an enforced CSP with no sink is blind in production, which is a different
// and worse position than this one.
// ---------------------------------------------------------------------------

/** Response header. Report-Only observes and reports; it blocks nothing. */
export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";

/**
 * Response header this unit deliberately does NOT set. Named so the guards can
 * assert its absence against a constant rather than a retyped string.
 */
export const CSP_ENFORCING_HEADER = "Content-Security-Policy";

/**
 * Forwarded REQUEST header carrying the nonce inward. Request headers never
 * reach the browser; this is how a server component that needs the nonce reads
 * it, and it is the documented Next.js channel.
 */
export const NONCE_REQUEST_HEADER = "x-nonce";

/** 16 bytes. 128 bits of entropy, the CSP specification's floor for a nonce. */
export const NONCE_BYTE_LENGTH = 16;

/**
 * The policy, as data rather than a string, so a test can assert one directive
 * without parsing prose and a reader can see the whole shape at once.
 *
 * `NONCE` is a placeholder the builder substitutes per request. It is a marker
 * and not a value: a policy that shipped this literal would be strictly worse
 * than no policy, because it would look enforced and permit a constant.
 *
 * Every directive is justified individually, for the reason U13 gave for its
 * header set — a policy nobody can defend line by line is one nobody will dare
 * change later.
 */
export const CSP_DIRECTIVES: ReadonlyArray<readonly [string, readonly string[]]> = [
  // Everything not named below falls back to same-origin.
  ["default-src", ["'self'"]],

  // `'strict-dynamic'` lets Next's nonce-carrying bootstrap load the chunks it
  // needs without every chunk URL being allow-listed. In browsers that honour
  // it, `'self'` is ignored for scripts — which is the point: an injected
  // `<script src>` on our own origin is exactly the attack a host allow-list
  // fails to stop.
  ["script-src", ["'self'", "'nonce-NONCE'", "'strict-dynamic'"]],

  // `next/font` injects an inline `<style>` block for its @font-face rules.
  // Whether Next nonces that tag is one of the two things this unit MEASURES
  // rather than assumes. No `'unsafe-inline'` here: adding it pre-emptively
  // would guarantee zero violations and prove nothing.
  ["style-src", ["'self'", "'nonce-NONCE'"]],

  // `data:` covers inlined SVG/PNG; `blob:` covers Next's image optimisation.
  ["img-src", ["'self'", "data:", "blob:"]],

  // `next/font/google` self-hosts at build time — the fonts are served from
  // `/_next/static`, so no external font origin is needed. If that ever stops
  // being true, this directive is where it surfaces.
  ["font-src", ["'self'"]],

  // Same-origin only, and this one is a real assertion rather than a formality:
  // the browser Supabase client (`src/lib/supabase/client.ts`) is imported by
  // NO non-test module — authentication runs server-side through route handlers
  // — so the browser never calls the Supabase origin directly. Report-Only is
  // what verifies that claim instead of this comment asserting it.
  ["connect-src", ["'self'"]],

  // Stops an injected `<form action="https://attacker">` exfiltrating a POST.
  ["form-action", ["'self'"]],

  // Supersedes `X-Frame-Options: DENY` in modern browsers. U13 shipped the
  // header and said so: DENY was precisely the part of this protection
  // obtainable without a CSP. Both now ship; neither is redundant, because the
  // header still covers browsers that do not implement `frame-ancestors`.
  ["frame-ancestors", ["'none'"]],

  // An injected `<base href>` silently re-points every relative URL on the page,
  // including script sources. `'none'` costs nothing here: the app sets no base.
  ["base-uri", ["'none'"]],

  // No `<object>`, `<embed>` or `<applet>` anywhere in this app.
  ["object-src", ["'none'"]],
];

/** The literal the builder replaces. Exported so tests bind to it, not a copy. */
export const NONCE_PLACEHOLDER = "NONCE";

/**
 * Cryptographically random, base64, fresh per call.
 *
 * The RNG is a parameter with a default rather than a hard reference so the
 * tests can drive it with known bytes. A nonce that is predictable is not a
 * nonce — it is a constant an attacker can copy into an injected tag — so the
 * tests pin both the encoding and the freshness.
 */
export function generateNonce(
  fillRandom: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b),
): string {
  const bytes = fillRandom(new Uint8Array(NONCE_BYTE_LENGTH));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * The policy string for one request.
 *
 * Throws on an empty nonce rather than emitting `'nonce-'`, which browsers
 * treat as a malformed source expression and silently drop — leaving a policy
 * that looks present and permits nothing it was meant to permit. Failing loudly
 * in middleware is recoverable; shipping a quietly broken policy is not.
 */
export function buildCsp(nonce: string): string {
  if (nonce.length === 0) {
    throw new Error(
      "buildCsp: refusing to build a policy with an empty nonce — the result " +
        "would contain a malformed `'nonce-'` source expression that browsers drop.",
    );
  }
  return CSP_DIRECTIVES.map(
    ([directive, sources]) =>
      `${directive} ${sources
        .map((s) => s.replace(NONCE_PLACEHOLDER, nonce))
        .join(" ")}`,
  ).join("; ");
}
