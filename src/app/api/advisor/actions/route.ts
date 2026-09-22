// Application — POST /api/advisor/actions (Design §4.2). Transport only.
//
// The trust boundary itself — re-load context server-side → re-validate the
// proposal + edits against fresh, owned data → authoritative safety gate →
// execute via existing repos → audit with an inverse — lives in
// `src/services/advisor-actions.ts` (CLAUDE.md §4 rule 8; moved by Phase 1
// U11, behaviour-preserving). Read that module's header before changing
// anything here: it explains why the error-disclosure guard must keep scanning
// `src/services/**`.
//
// What remains in this file is what genuinely needs the request: authentication,
// body parsing, and the Supabase client. The client's canonical values are
// NEVER trusted; only the editable dose/timing subset is merged, then re-parsed
// downstream. Plan SC-4 (safety), SC-5 (edit), SC-6 (server re-validate),
// SC-7 (audit).
import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { confirmSchema, toActions } from "@/lib/advisor/actions/schema";
import { confirmAndApply } from "@/services/advisor-actions";
import { fail, internalError, unauthorized, validationError } from "@/lib/api/respond";
import { NotConfiguredError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // [2026-09-22, N-76 / (d1b) by owner ruling] THE PRE-DELEGATION WINDOW IS
  // GUARDED. `confirmAndApply` reports its own failures at every exit, so the
  // WORK was always covered; what was not was the window before it. A throw from
  // `createClient()` — `NotConfiguredError` on unset Supabase env, or a
  // `cookies()` failure — escaped `POST` and became an uncorrelated framework
  // 500, the same defect P2-R4 closed in `advisor/route.ts`.
  //
  // The window is one call. That is not why it was nearly deferred and not a
  // reason it is safe: it is the same `createClient()` whose throw path was just
  // proven reachable in the sibling route. `FIVE_XX_IS_LOGGED` now requires BOTH
  // unwrapped routes to carry a reporting catch, with no exemptions.
  //
  // [2026-09-22, WIDENED ON OWNER RULING] It is now TWO calls, because the
  // window opened one statement too late: `getUser()` ran ahead of every `try`
  // and could throw the same way — `cookies()` is unconditional inside it, and
  // the auth SDK re-throws anything that is not an `AuthError`. The sibling
  // route had the identical gap at its identical first line.
  //
  // ORDER IS PRESERVED: the `try` opens earlier, the auth check does not move
  // later. Parsing an anonymous caller's body before answering 401 would tell
  // them whether it validated. Bound by "an unauthenticated caller still gets
  // 401 before anything is parsed" below, and positionally by
  // `FIVE_XX_IS_LOGGED`. Nothing is hoisted out of the block here — unlike the
  // sibling route, this window ends in its own `return`, so `user` and `body`
  // are never read after it closes.
  //
  // `return await`, not `return`: a returned promise is not caught by the
  // enclosing try, so without the await a rejection from `confirmAndApply` would
  // pass straight through this guard.
  try {
    const user = await getUser();
    if (!user) return unauthorized();

    let body;
    try {
      body = confirmSchema.parse(await request.json());
    } catch (err) {
      if (err instanceof ZodError) return validationError(err);
      return fail("BAD_REQUEST", "Invalid request body.", 400);
    }

    const supabase = await createClient();
    return await confirmAndApply(supabase, user.id, toActions(body), body.conversationId ?? null);
  } catch (e) {
    // `NotConfiguredError` first — it is a DECLARED OPERATIONAL STATE (U1), so
    // it answers 503, mints no id and writes no record, exactly as every
    // `handle()`-wrapped route does for the identical cause.
    if (e instanceof NotConfiguredError) {
      return fail("NOT_CONFIGURED", e.publicMessage, 503);
    }
    return internalError(e, { code: "ACTIONS_PRESTREAM_ERROR" });
  }
}
