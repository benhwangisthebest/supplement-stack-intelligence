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
 * missing setting, never a value, path, host, or driver string. Of the three
 * sites that exist today, only `supabase/env.ts` names variables at all
 * (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, both public);
 * the two AI sites share `AI_SERVICE_NOT_CONFIGURED`, which names none — and
 * that is why Phase 2 U25's provider swap moved no byte of user-facing copy.
 *
 * `src/architecture/not-configured-totality.test.ts` enforces that no *other*
 * error class carries "not configured" text, so this class cannot be bypassed
 * by re-spelling the old bare `Error`.
 */
/**
 * WHY EVERY CONFIGURATION FAILURE CARRIES A MACHINE-READABLE REASON (Phase 2 U33).
 *
 * `publicMessage` is one string for every AI configuration failure, deliberately
 * — it names no setting, which is why two provider swaps moved no user-facing
 * byte. That property is good for the client and terrible for a test: an
 * assertion written as `rejects.toThrow("not configured")` cannot say WHY it
 * passed, so an early return added ahead of an existing check silently
 * re-points every test behind it, and nothing goes red.
 *
 * That is not a hypothesis. U33 measured it before changing anything: of the
 * TWELVE condition-deletions available across the three sites that resolve this
 * configuration, **SEVEN were invisible to the whole suite** — including every
 * one of `pdf-adapter.ts`'s four. N-68 had registered one of the seven.
 *
 * So the reason is REQUIRED, not optional. An optional field re-creates the
 * defect one un-reasoned throw at a time and makes every consumer handle
 * `undefined`; §8.4 — prefer deleting a field over guarding it — points the same
 * way. The compiler now enumerates the throw sites instead of a reviewer.
 *
 * THE REASON IS FOR TESTS AND LOGS. IT NEVER REACHES A CLIENT. `respond.ts`
 * reads `publicMessage` and nothing else, and
 * `not-configured-totality.test.ts` asserts the 503 body is byte-identical
 * across all four AI reasons — because which environment variable is unset is
 * internal state, and §2.3 rule 13 does not bend for a convenient debugging
 * aid.
 */
export const AI_CONFIG_REASONS = [
  "missing-key",
  "missing-model",
  "missing-base-url",
  "disallowed-host",
] as const;

/** Why the AI gateway could not be configured. Ordered as the resolver checks. */
export type AiConfigReason = (typeof AI_CONFIG_REASONS)[number];

/**
 * Every reason this error can carry.
 *
 * `missing-supabase-env` is not an AI failure and is deliberately NOT in
 * `AI_CONFIG_REASONS`: `src/lib/supabase/env.ts` is the one site whose
 * `publicMessage` names variables (both public), so its 503 body differs from
 * the AI one and always has. The byte-identity assertion is therefore over the
 * four AI reasons, not over all five — a distinction worth keeping, because the
 * difference is the MESSAGE, never the reason.
 */
export type NotConfiguredReason = AiConfigReason | "missing-supabase-env";

export class NotConfiguredError extends Error {
  /** Client-safe operational text. Deliberately not named `message` — see above. */
  readonly publicMessage: string;

  /** Machine-readable cause. Internal: never serialised, never sent. */
  readonly reason: NotConfiguredReason;

  constructor(publicMessage: string, reason: NotConfiguredReason) {
    super(publicMessage);
    this.name = "NotConfiguredError";
    this.publicMessage = publicMessage;
    this.reason = reason;
  }
}

/**
 * The client-facing text for "the LLM provider is not configured" (Phase 2 U6,
 * findings N-9 and N-10). Written for the Anthropic key; **unchanged when U25
 * swapped the provider**, because it deliberately names no setting — the point
 * the paragraph below makes, demonstrated by a change it survived.
 *
 * ONE constant, because there were three hand-authored copies of this string —
 * `advisor/route.ts`'s pre-flight, `model-adapter.ts`'s throw, and
 * `lab-import/pdf-adapter.ts`'s — and nothing bound them. Editing one left the
 * others stale, and the pre-flight copy is the one users actually saw.
 *
 * The WORDING changed with the constant, deliberately. It used to be
 * `"API_ANTHROPIC_KEY not configured"`: an environment-variable name, shown to
 * (HISTORICAL — that variable no longer exists; U25 removed it with the Anthropic
 *  SDK. The example is kept because the RULE it illustrates is unchanged, and §7
 *  forbids deleting rationale. Today the equivalent slip would name OPENAI_*.)
 * an end user, who can do nothing with it and should not be told the shape of
 * the server's configuration. It now names the situation and the only true
 * remedy. It makes no claim the system has not computed — it is an operational
 * state, not an advisory one — and it promises no timeline.
 */
export const AI_SERVICE_NOT_CONFIGURED =
  "This feature is temporarily unavailable because an AI service it relies on is not configured. No information was sent anywhere, and nothing has been saved. Please try again later.";
