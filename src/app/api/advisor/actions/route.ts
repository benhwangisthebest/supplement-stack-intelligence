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
import { fail, unauthorized, validationError } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
  return confirmAndApply(supabase, user.id, toActions(body), body.conversationId ?? null);
}
