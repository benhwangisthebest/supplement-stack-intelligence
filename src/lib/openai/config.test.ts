// Unit tests for the ONE place the paid gateway's configuration is resolved,
// and the place where U33's whole thesis is asserted: a configuration failure
// must be able to say WHY it failed.
//
// Read `./config.ts`'s header first — it carries the measured pre-fix matrix
// (seven of twelve single-condition deletions invisible to the suite) that
// this file exists to close.

import { describe, expect, it, vi } from "vitest";
import { AI_CONFIG_REASONS, type AiConfigReason } from "@/lib/api/errors";
import { resolveAiConfig, resolveModelId } from "./config";

const FIRST_PARTY = "https://api.openai.com";

interface Env {
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
  OPENAI_MODEL: string;
  OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL?: string;
}

/** Everything set correctly. Each case below unsets EXACTLY ONE thing. */
const COMPLETE: Env = {
  OPENAI_API_KEY: "k",
  OPENAI_BASE_URL: FIRST_PARTY,
  OPENAI_MODEL: "m",
};

/**
 * ONE ENV PER REASON — and the type is the anti-vacuity guard.
 *
 * `Record<AiConfigReason, …>` means adding a fifth AI reason without adding a
 * case here is a COMPILE error, not a silently skipped test. That is
 * deliberately per-member rather than per-total: U30 finished one unit ago on
 * exactly this distinction — a floor over the whole set is satisfied while one
 * member goes unexamined.
 *
 * Each row differs from `COMPLETE` in exactly ONE dimension. That is not
 * tidiness; it is the property that makes the mutations below meaningful. The
 * pre-U33 fixtures unset several settings at once, which is why deleting a
 * single condition left them green — any surviving condition still threw, and
 * one shared message made the substitution invisible.
 */
const ENV_FOR: Record<AiConfigReason, Env> = {
  "missing-key": { ...COMPLETE, OPENAI_API_KEY: "" },
  "missing-base-url": { ...COMPLETE, OPENAI_BASE_URL: "" },
  "missing-model": { ...COMPLETE, OPENAI_MODEL: "" },
  "disallowed-host": { ...COMPLETE, OPENAI_BASE_URL: "https://gw.example" },
};

const stub = (env: Env) => {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string);
};

describe("resolveAiConfig — every refusal names its own condition", () => {
  it("resolves when every setting is present and the host is first-party", () => {
    stub(COMPLETE);
    const r = resolveAiConfig();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config).toEqual({
      apiKey: "k",
      baseUrl: FIRST_PARTY,
      model: "m",
      allowNonFirstPartyBaseUrl: false,
    });
  });

  it.each(AI_CONFIG_REASONS)("refuses with reason %s, and only that reason", (reason) => {
    stub(ENV_FOR[reason]);
    const r = resolveAiConfig();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    // THE ASSERTION THAT COULD NOT BE WRITTEN BEFORE U33. The pre-fix suite
    // matched the shared message, so every one of these four cases was
    // satisfied by any of the four conditions firing.
    expect(r.reason).toBe(reason);
  });

  it("every reason in the union is exercised — no member is skipped", () => {
    // The total, beside the per-member `Record` above. Both, because U30's
    // lesson is that a total and a member are different claims: the type
    // catches a reason with no fixture, this catches a fixture list that has
    // silently stopped being iterated.
    expect(Object.keys(ENV_FOR).sort()).toEqual([...AI_CONFIG_REASONS].sort());
    expect(AI_CONFIG_REASONS.length).toBe(4);
  });

  it("an empty base URL is 'missing-base-url', NOT 'disallowed-host'", () => {
    // The order of the two base-URL conditions is load-bearing and this is
    // what pins it. `baseUrlPermitted("")` is false — `new URL("")` throws —
    // so if the emptiness check were removed the failure would not disappear,
    // it would silently relabel itself. A test that matched the message could
    // not see the difference; this one can, and M5 is that mutation.
    stub({ ...COMPLETE, OPENAI_BASE_URL: "" });
    const r = resolveAiConfig();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("missing-base-url");
  });

  it("the override permits a non-first-party host, and is read per call", () => {
    stub({ ...ENV_FOR["disallowed-host"], OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL: "1" });
    const r = resolveAiConfig();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.allowNonFirstPartyBaseUrl).toBe(true);
    expect(r.config.baseUrl).toBe("https://gw.example");
  });

  it("an override set to anything but '1' does not permit it", () => {
    // U32's contract: the escape hatch is an exact opt-in, not a truthiness
    // check, so `=0`, `=false` and `=true` are all refusals.
    for (const value of ["0", "false", "true", "yes", " 1"]) {
      vi.stubEnv("OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL", value);
      stub(ENV_FOR["disallowed-host"]);
      const r = resolveAiConfig();
      expect(r.ok, `override=${JSON.stringify(value)} should not permit`).toBe(false);
    }
  });

  it("overrides passed as arguments are resolved here, not at the call site", () => {
    // This is what keeps SOLE_PAID_CLIENT's three reader ratchets pinned to
    // this module: a caller that kept its own `?? process.env.OPENAI_BASE_URL`
    // fallback would be a second reader and a red build. So the injected
    // values must be resolvable through this function or the callers have
    // nowhere else to put them.
    stub({ OPENAI_API_KEY: "", OPENAI_BASE_URL: "", OPENAI_MODEL: "" });
    const r = resolveAiConfig({ apiKey: "ik", baseUrl: FIRST_PARTY, model: "im" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config).toMatchObject({ apiKey: "ik", baseUrl: FIRST_PARTY, model: "im" });
  });

  it("an injected base URL is pinned too — the override is not a test channel", () => {
    // U32's finding, re-pinned at the new site: `deps.baseUrl` is ordinary
    // constructor input, so validating only the environment would leave the
    // host pin one parameter away from being bypassed.
    stub(COMPLETE);
    const r = resolveAiConfig({ baseUrl: "https://gw.example" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("disallowed-host");
  });
});

describe("resolveModelId — the model condition, in one place", () => {
  it("returns the environment's id", () => {
    stub(COMPLETE);
    expect(resolveModelId()).toEqual({ ok: true, model: "m" });
  });

  it("prefers an explicit id over the environment", () => {
    stub(COMPLETE);
    expect(resolveModelId("explicit")).toEqual({ ok: true, model: "explicit" });
  });

  it("refuses an unset id with 'missing-model' — N-21 has no default", () => {
    vi.stubEnv("OPENAI_MODEL", "");
    expect(resolveModelId()).toEqual({ ok: false, reason: "missing-model" });
  });

  it("is the SAME condition resolveAiConfig uses, not a second copy", () => {
    // Reachability (§5.3). If `resolveAiConfig` grew its own `!model` check,
    // M4 would have two deletion points and this unit's guarantee — one
    // condition, one mutation, one failing test — would quietly be false.
    stub({ ...COMPLETE, OPENAI_MODEL: "" });
    const viaConfig = resolveAiConfig();
    const viaModel = resolveModelId();
    expect(viaConfig.ok).toBe(false);
    expect(viaModel.ok).toBe(false);
    if (viaConfig.ok || viaModel.ok) return;
    expect(viaConfig.reason).toBe(viaModel.reason);
  });
});
