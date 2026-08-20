// Application — the one place an API error becomes text a person reads.
// Phase 2 U19, discharging F5.

/**
 * The correlation-id suffix, as a single template.
 *
 * `respond.ts`'s `ApiError.correlationId` has documented itself since Phase 0 as
 * "safe to render, quote in a support ticket, or paste into an incident report".
 * F5 is the observation that no surface ever rendered it, so that sentence was
 * a promise the product did not keep: the id existed, the server logged it, and
 * the only person who could have quoted it never saw it.
 *
 * "Reference" rather than "Correlation ID" deliberately. The word a user has to
 * repeat to a human should be one they can repeat.
 */
const reference = (id: string) => ` (Reference: ${id})`;

/**
 * Compose the user-facing text for an API error.
 *
 * THE DOMINANT CASE IS NO ID, AND THAT IS WHY THIS FUNCTION EXISTS RATHER THAN
 * A TEMPLATE LITERAL AT EACH CALL SITE. `correlationId` is present only on
 * unexpected-exception 500s — `respond.test.ts` pins it *undefined* for 401,
 * 404 and validation failures, which are the errors users actually hit. A call
 * site interpolating the id inline is therefore correct on the rare path and
 * renders the string "Reference: undefined" on the common one. Centralising the
 * absent case is the whole point; the present case is the easy half.
 *
 * Pure by construction: no `next/*`, no I/O, no `ApiError` value import. The
 * envelope's shape is taken structurally so a client component can call this
 * without dragging `next/server` into the browser bundle.
 *
 * @param message  Client-safe text. Already generic by the time it reaches here
 *                 — CLAUDE.md §2.3 rule 13 is enforced at the API boundary by
 *                 `error-disclosure.test.ts`, not here. This function does not
 *                 sanitise, and must not be mistaken for something that does.
 * @param correlationId  The opaque id, when the envelope carried one.
 */
export function errorText(message: string, correlationId?: string | null): string {
  const id = typeof correlationId === "string" ? correlationId.trim() : "";
  return id ? `${message}${reference(id)}` : message;
}
