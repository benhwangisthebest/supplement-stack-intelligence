// The confirmation contract for irreversible account-data deletion (Phase 2 U17).
//
// WHY THIS IS NOT IN `src/app/api/account/route.ts`, WHERE IT STARTED.
// Two reasons, and the second is the one that matters.
//
//   1. Next.js type-checks route modules against `{ [x: string]: never }` — a
//      route file may export handlers and route config and NOTHING else. An
//      exported constant fails `next build` with "…is not a valid Route export
//      field". Phase 2 U5 hit the same wall with a shared rate-limit helper.
//      The unit tests passed; only the build caught it.
//   2. §4 rule 8: every trust boundary belongs in a testable module rather than
//      in a route handler. This IS the trust boundary for an irreversible
//      operation, so the build constraint pushed the code where the rule
//      already wanted it. Worth stating plainly: the move is correct on its
//      own terms, not a workaround for the compiler.
import { z } from "zod";

/**
 * The exact phrase, matched case-sensitively and in full.
 *
 * A typed literal cannot be produced by accident, cannot be replayed from a URL,
 * and cannot be arrived at by a client that merely forgot a field — which is
 * what matters for an irreversible action behind an already-authenticated
 * session. A server-issued token would be real machinery for no additional
 * property here.
 */
export const CONFIRMATION_PHRASE = "DELETE MY DATA";

/**
 * `z.literal` rather than a hand-written comparison, so every near-miss —
 * different case, trailing whitespace, a prefix, a non-string — is a parse
 * failure the route cannot forget to check. The route returns 400 and, per
 * GATE D2, must not have called the deletion repository at all.
 */
export const deleteAccountSchema = z.object({
  confirm: z.literal(CONFIRMATION_PHRASE),
});
