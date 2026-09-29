// Phase 4 U4 (FU-31) — what the auth server actions return to the browser.
//
// These actions are POST endpoints the browser calls directly, and they used to
// return Supabase's `error.message`, which can say whether an email has an
// account. The owner's direction (2026-09-29): login returns ONE message for
// every provider failure; signup translates only failures that say nothing
// about an account (a weak password, a malformed email) and returns one message
// for everything else, "already registered" included. Each branch is asserted
// on the returned text, and on the provider's text NOT reaching it.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authCopy } from "@/lib/safety";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword, signUp } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const redirect = vi.fn((to: string) => {
  // next/navigation's redirect throws; the test only needs to see where to.
  throw new Error(`REDIRECT ${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));

const { login, signup } = await import("./actions");

function form(email: string, password: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

/** A provider error as supabase-js returns it: text in `message`, a machine `code`. */
function providerError(code: string | undefined, message: string) {
  return { data: { user: null, session: null }, error: { name: "AuthApiError", code, message, status: 400 } };
}

const NOBODY = { email: "nobody@example.test", password: "correct-horse-battery" };
const PRIOR = { email: "someone@example.test", password: "correct-horse-battery" };

beforeEach(() => {
  signInWithPassword.mockReset();
  signUp.mockReset();
  redirect.mockClear();
});

describe("login — one message for every provider failure", () => {
  // The provider's own texts. Several of them identify an existing account.
  const failures: Array<[string | undefined, string]> = [
    ["invalid_credentials", "Invalid login credentials"],
    ["email_not_confirmed", "Email not confirmed"],
    ["user_banned", "User is banned"],
    ["over_request_rate_limit", "Request rate limit reached"],
    [undefined, "Database error querying schema"],
  ];

  it.each(failures)("returns the generic message for %s, never the provider's text", async (code, message) => {
    signInWithPassword.mockResolvedValueOnce(providerError(code, message));
    const state = await login({ error: null }, form(PRIOR.email, PRIOR.password));
    expect(state).toEqual({ error: authCopy.loginFailed });
    expect(state.error).not.toContain(message);
  });

  it("returns the same text for an unknown email and a wrong password", async () => {
    signInWithPassword.mockResolvedValueOnce(providerError("invalid_credentials", "Invalid login credentials"));
    const unknown = await login({ error: null }, form(NOBODY.email, NOBODY.password));
    signInWithPassword.mockResolvedValueOnce(providerError("email_not_confirmed", "Email not confirmed"));
    const existing = await login({ error: null }, form(PRIOR.email, "wrong-password"));
    expect(unknown).toEqual(existing);
  });

  it("rejects a missing field before any provider call", async () => {
    expect(await login({ error: null }, form("", "x"))).toEqual({ error: authCopy.missingFields });
    expect(await login({ error: null }, form("a@example.test", ""))).toEqual({ error: authCopy.missingFields });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("redirects to Stack Lab on success", async () => {
    signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });
    await expect(login({ error: null }, form(PRIOR.email, PRIOR.password))).rejects.toThrow("REDIRECT /stack-lab");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: PRIOR.email, password: PRIOR.password });
  });
});

describe("signup — safe failures translated, everything else generic", () => {
  it.each([
    ["weak_password", "Password should contain at least one character of each: abc", authCopy.signupWeakPassword],
    ["email_address_invalid", 'Email address "x@y" is invalid', authCopy.signupInvalidEmail],
  ])("translates %s into owned wording", async (code, message, expected) => {
    signUp.mockResolvedValueOnce(providerError(code, message));
    const state = await signup({ error: null }, form(NOBODY.email, NOBODY.password));
    expect(state).toEqual({ error: expected });
    expect(state.error).not.toContain(message);
  });

  const generic: Array<[string | undefined, string]> = [
    ["user_already_exists", "User already registered"],
    ["email_exists", "A user with this email address has already been registered"],
    ["signup_disabled", "Signups not allowed for this instance"],
    ["over_email_send_rate_limit", "Email rate limit exceeded"],
    ["validation_failed", "Unable to validate email address: invalid format"],
    ["constructor", "a code that names an Object.prototype member"],
    [undefined, "Database error saving new user"],
  ];

  it.each(generic)("returns the generic message for %s, never the provider's text", async (code, message) => {
    signUp.mockResolvedValueOnce(providerError(code, message));
    const state = await signup({ error: null }, form(PRIOR.email, PRIOR.password));
    expect(state).toEqual({ error: authCopy.signupFailed });
    expect(state.error).not.toContain(message);
    expect(state.error?.toLowerCase()).not.toContain("already registered");
  });

  it("an already-registered address reads the same as any other generic failure", async () => {
    signUp.mockResolvedValueOnce(providerError("user_already_exists", "User already registered"));
    const registered = await signup({ error: null }, form(PRIOR.email, PRIOR.password));
    signUp.mockResolvedValueOnce(providerError(undefined, "Database error saving new user"));
    const other = await signup({ error: null }, form(NOBODY.email, NOBODY.password));
    expect(registered).toEqual(other);
  });

  it("the three signup messages are distinct owned strings", () => {
    const texts = new Set([authCopy.signupWeakPassword, authCopy.signupInvalidEmail, authCopy.signupFailed]);
    expect(texts.size).toBe(3);
  });

  it("rejects a missing field or a short password before any provider call", async () => {
    expect(await signup({ error: null }, form("", "longenough"))).toEqual({ error: authCopy.missingFields });
    expect(await signup({ error: null }, form(NOBODY.email, "short"))).toEqual({ error: authCopy.passwordTooShort });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("redirects to Profile on success", async () => {
    signUp.mockResolvedValueOnce({ data: {}, error: null });
    await expect(signup({ error: null }, form(NOBODY.email, NOBODY.password))).rejects.toThrow("REDIRECT /profile");
  });
});
