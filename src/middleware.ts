import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  buildCsp,
  generateNonce,
  CSP_REPORT_ONLY_HEADER,
  NONCE_REQUEST_HEADER,
} from "@/lib/security/csp";

// ---------------------------------------------------------------------------
// Keeps Supabase auth sessions fresh on navigation (Design §7).
// ---------------------------------------------------------------------------
// THE PATH IS THE POINT. This file lived at the REPOSITORY ROOT from `910d773`
// (2026-06-12, MVP v1) until Phase 2 U27, and Next never compiled it: with a
// `src/` directory present, Next 15 resolves middleware at `src/middleware.ts`
// only. Measured by A/B in a clean clone — same content, only the path changed:
// at the root the build emits `"middleware": {}` and no `ƒ Middleware` line; here
// it emits a registered matcher and `ƒ Middleware  87.2 kB`. So `updateSession`
// had never run in this application's history.
//
// DO NOT MOVE THIS FILE BACK, and do not add a second copy at the root. Both are
// red: `src/architecture/middleware-scope.test.ts` asserts this path holds the
// middleware and that no root file shadows it, in both directions.
//
// KEEP IT THIN. A loose file directly under `src/` belongs to no layer, so the
// boundary rules skip it (closeout finding C-11); it is registered in
// `EXEMPT_ROOT_FILES` with a written reason, which is what makes that skip a
// decision rather than an accident. Logic belongs in a governed module and is
// called from here.
// ---------------------------------------------------------------------------
// TWO THINGS HAPPEN PER REQUEST, and U14 COMPOSES with U27 rather than
// replacing it — the session refresh is unchanged, still awaited, and still the
// source of the returned response:
//   1. `updateSession` refreshes the Supabase auth cookie (Design §7, U27).
//   2. A fresh per-request nonce is minted and the Report-Only policy built from
//      it is attached BOTH inward and outward —
//        * on the forwarded REQUEST, so Next can read the nonce and stamp it on
//          the inline bootstrap it generates. Request headers never reach the
//          browser.
//        * on the RESPONSE, which is the only half a browser or an E2E sees.
//
// Order matters and is not incidental: the request headers must carry the nonce
// BEFORE `updateSession` builds its `NextResponse.next({ request })`, or the
// forwarded copy will not contain them.
export async function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const policy = buildCsp(nonce);

  request.headers.set(NONCE_REQUEST_HEADER, nonce);
  request.headers.set(CSP_REPORT_ONLY_HEADER, policy);

  const response = await updateSession(request);
  response.headers.set(CSP_REPORT_ONLY_HEADER, policy);
  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets & images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
