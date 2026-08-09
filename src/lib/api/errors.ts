// Typed error classes for the shared API boundary (Phase 2 U1; roadmap item 2, F3).
//
// WHY THIS FILE IMPORTS NOTHING — it is not an accident, do not add an import.
//
// Three of its consumers live in *pure engine* directories governed by
// `DOMAIN_IS_PURE` (`src/lib/advisor`, `src/lib/lab-import`). The sibling module
// `./respond.ts` imports `next/server`, so an engine reaching for a typed error
// there would acquire the transitive framework edge that Phase 1 U18's ratchet
// blames for `src/lib/advisor/actions/execute.ts`. Keeping the class in a file
// with **zero imports** means no consumer — engine, infrastructure or route —
// can gain an edge it did not already have. That is the whole reason this is a
// separate module from `respond.ts` rather than an export on it.
//
// ---------------------------------------------------------------------------
// WHY THE CLIENT-SAFE TEXT IS NOT CALLED `message`
// ---------------------------------------------------------------------------
// `src/architecture/error-disclosure.test.ts` flags any read of `.message` or
// `.stack` off a caught binding inside a scanned file, because CLAUDE.md §2.3
// rule 13 is rank 1 and this repository renders `error.message` at 17 call
// sites. `respond.ts` must read *some* text off this error to answer 503.
//
// If that field were `message`, `handle()` would read `err.message` and the
// disclosure guard would flag it on the day it was written — forcing an
// allowlist entry into a guard whose value is that it has none, and U2 extends
// that guard to `src/lib/**` immediately afterwards. Reading `publicMessage`
// instead means the read is not of error text at all by the guard's definition,
// so no allowlist is ever created. One field name, two units of consequence.
//
// `message` still mirrors it (see the constructor) so logs, stack traces and
// `toThrow("…")` assertions behave like any other Error. The two cannot drift:
// there is one constructor parameter and it sets both.

/**
 * A required piece of configuration is absent — an operational state, not an
 * unexpected exception.
 *
 * `publicMessage` is the ONLY field `respond.ts` puts in front of a client, and
 * every construction site must therefore author it deliberately: name the
 * missing setting, never a value, path, host, or driver string. The three sites
 * that exist today name only public variable names (`NEXT_PUBLIC_SUPABASE_URL`,
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_ANTHROPIC_KEY`).
 *
 * `src/architecture/not-configured-totality.test.ts` enforces that no *other*
 * error class carries "not configured" text, so this class cannot be bypassed
 * by re-spelling the old bare `Error`.
 */
export class NotConfiguredError extends Error {
  /** Client-safe operational text. Deliberately not named `message` — see above. */
  readonly publicMessage: string;

  constructor(publicMessage: string) {
    super(publicMessage);
    this.name = "NotConfiguredError";
    this.publicMessage = publicMessage;
  }
}

/**
 * The client-facing text for "the Anthropic key is absent" (Phase 2 U6,
 * findings N-9 and N-10).
 *
 * ONE constant, because there were three hand-authored copies of this string —
 * `advisor/route.ts`'s pre-flight, `claude-adapter.ts`'s throw, and
 * `lab-import/pdf-adapter.ts`'s — and nothing bound them. Editing one left the
 * others stale, and the pre-flight copy is the one users actually saw.
 *
 * The WORDING changed with the constant, deliberately. It used to be
 * `"API_ANTHROPIC_KEY not configured"`: an environment-variable name, shown to
 * an end user, who can do nothing with it and should not be told the shape of
 * the server's configuration. It now names the situation and the only true
 * remedy. It makes no claim the system has not computed — it is an operational
 * state, not an advisory one — and it promises no timeline.
 */
export const AI_SERVICE_NOT_CONFIGURED =
  "This feature is temporarily unavailable because an AI service it relies on is not configured. No information was sent anywhere, and nothing has been saved. Please try again later.";
