// The ONE place the paid gateway's configuration is resolved (Phase 2 U33).
//
// ---------------------------------------------------------------------------
// WHY THIS MODULE EXISTS — it is not a tidy-up
// ---------------------------------------------------------------------------
// Until U33 the same four conditions — key, base URL, model, permitted host —
// were written out at three sites, and at one of them the four were split
// across TWO FUNCTIONS (`model-adapter.ts`'s `liveComplete` and `resolveModel`).
// Twelve condition-sites expressing one claim, each throwing the same message.
//
// U33 measured what that cost before changing anything. Deleting ONE condition
// at a time, twelve mutations, pre-fix:
//
//     condition        advisor/route.ts   model-adapter.ts   pdf-adapter.ts
//     key absent       detected           INVISIBLE (N-68)   INVISIBLE
//     base URL absent  INVISIBLE          INVISIBLE          INVISIBLE
//     model absent     detected           detected           INVISIBLE
//     host refused     detected           detected           INVISIBLE
//
// SEVEN OF TWELVE were invisible to the entire suite. N-68 had registered one
// of them. `pdf-adapter.ts` scored zero out of four, because both of its config
// tests unset several settings at once, so any single surviving condition kept
// the throw happening and the assertion — `toThrow("not configured")` — could
// not tell which.
//
// One resolver makes those twelve into four, and the returned `reason` makes
// each of the four nameable by a test. That is the entire design.
//
// ---------------------------------------------------------------------------
// WHY IT RETURNS A REASON AND DOES NOT THROW ONE
// ---------------------------------------------------------------------------
// The three callers dispose of a refusal in three different ways, and all three
// are correct:
//
//   * `src/app/api/advisor/route.ts` must RETURN a 503 response. Its `POST` is
//     not wrapped in `handle()`, so a throw would escape to Next.js instead of
//     becoming a 503 — and the pre-flight exists precisely to answer before the
//     200 SSE response is committed.
//   * `src/lib/advisor/model-adapter.ts` must THROW, inside the SSE path.
//   * `src/lib/lab-import/pdf-adapter.ts` must THROW, for `handle()` to map.
//
// A throwing resolver would also move the `NotConfiguredError` constructions
// out of the two adapters, and `not-configured-totality.test.ts` sanctions
// those sites BY FILE. Returning leaves every throw where that rule already
// knows about it.
//
// ---------------------------------------------------------------------------
// WHAT THIS MODULE MAY IMPORT
// ---------------------------------------------------------------------------
// `./client` (for `baseUrlPermitted` and the override's variable name) and
// `@/lib/api/errors` (which imports nothing). Both consumers live in pure
// engine directories governed by `DOMAIN_IS_PURE`, so this module must not
// acquire an edge they may not have: no `next/*`, no `@/lib/db`, no
// `@/lib/supabase`, no `@/services`, no `@/app`.
//
// ---------------------------------------------------------------------------
// THE CONDITION ORDER IS LOAD-BEARING
// ---------------------------------------------------------------------------
// key → base URL → model → host. An empty base URL ALSO fails
// `baseUrlPermitted` (`new URL("")` throws and the validator returns false), so
// deleting the emptiness check does not make the failure vanish — it silently
// relabels it `disallowed-host`. A test that names the reason catches that; a
// test that matches the message cannot, which is exactly why the base-URL
// condition was invisible at all three sites before this unit.
import { ALLOW_NON_FIRST_PARTY, baseUrlPermitted } from "./client";
import type { AiConfigReason } from "@/lib/api/errors";

/** Everything the live path needs, once every condition has held. */
export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** The resolved override, carried so the client sees the same decision. */
  allowNonFirstPartyBaseUrl: boolean;
}

export type AiConfigResult =
  | { ok: true; config: AiConfig }
  | { ok: false; reason: AiConfigReason };

/**
 * Values a caller supplies instead of the environment.
 *
 * These are ORDINARY CONSTRUCTOR INPUT, not a test-only channel — U32's point
 * when it moved the host pin onto the value actually used. Resolving them here
 * is what keeps `SOLE_PAID_CLIENT`'s two reader ratchets pinned to this file:
 * if a caller kept its own `?? process.env.OPENAI_BASE_URL` fallback, the
 * ratchet would see two readers and fail, which is a mutation this unit runs.
 */
export interface AiConfigOverrides {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/**
 * Resolve the paid gateway's configuration, or say which condition refused.
 *
 * Server-only. Reads the environment per call, not at module load, so a test
 * can stub after import and a deployment can change a setting without a
 * rebuild — the same reason `resolveModel` gave before this unit absorbed it.
 */
export function resolveAiConfig(overrides: AiConfigOverrides = {}): AiConfigResult {
  const apiKey = overrides.apiKey ?? process.env.OPENAI_API_KEY;
  const baseUrl = overrides.baseUrl ?? process.env.OPENAI_BASE_URL;
  const model = overrides.model ?? process.env.OPENAI_MODEL;
  const allowNonFirstPartyBaseUrl = process.env[ALLOW_NON_FIRST_PARTY] === "1";

  if (!apiKey) return { ok: false, reason: "missing-key" };
  if (!baseUrl) return { ok: false, reason: "missing-base-url" };
  const resolvedModel = resolveModelId(model);
  if (!resolvedModel.ok) return resolvedModel;
  if (!baseUrlPermitted(baseUrl, allowNonFirstPartyBaseUrl)) {
    return { ok: false, reason: "disallowed-host" };
  }

  return {
    ok: true,
    config: { apiKey, baseUrl, model: resolvedModel.model, allowNonFirstPartyBaseUrl },
  };
}

/**
 * The MODEL condition, alone.
 *
 * `resolveAiConfig` above calls this rather than repeating `!model`, so the
 * condition exists in exactly ONE place and M4's mutation has exactly one
 * point to delete. It is exported because `model-adapter.ts` needs the model
 * id even when a caller injects its own `complete` function — a test double
 * needs no key, base URL or host, but the model id still has to be real,
 * because N-21 was a *pinned default* reaching a gateway that rejected it.
 */
export function resolveModelId(
  explicit?: string,
): { ok: true; model: string } | { ok: false; reason: "missing-model" } {
  const model = explicit ?? process.env.OPENAI_MODEL;
  if (!model) return { ok: false, reason: "missing-model" };
  return { ok: true, model };
}
