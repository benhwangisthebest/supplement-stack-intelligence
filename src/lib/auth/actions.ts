"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authCopy } from "@/lib/safety";
import type { AuthActionState } from "./types";

// NOTE: this module is "use server" — every VALUE export must be an async
// function. AuthActionState therefore lives in ./types and is re-declared
// nowhere else; AuthForm imports that same declaration.
//
// ERROR TEXT (Phase 4 U4, FU-31). Supabase returns `{ error }` rather than
// throwing, and its `error.message` used to be returned to the browser as-is,
// which can say whether an email has an account. Every string returned here now
// comes from `authCopy` in src/lib/safety. The provider's error is inspected
// only by its `code`, and only on signup, only to pick between owned strings.
// `error-disclosure.test.ts` fails a read of a destructured result error's text.

/**
 * Signup failures that concern the submitted password or the address's format,
 * not whether an account exists. Anything else gets `authCopy.signupFailed`.
 * ASSUMED, NOT VERIFIED: that the provider rejects these before it looks the
 * address up, so an existing address cannot produce a different code here. No
 * provider source was read and no live call was made (U4 artifact §4).
 */
const SIGNUP_SAFE_COPY: ReadonlyMap<string, string> = new Map([
  ["weak_password", authCopy.signupWeakPassword],
  ["email_address_invalid", authCopy.signupInvalidEmail],
]);

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function login(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: authCopy.missingFields };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // One message for every failure: never "no such user" vs "wrong password".
  if (error) return { error: authCopy.loginFailed };

  revalidatePath("/", "layout");
  redirect("/stack-lab");
}

export async function signup(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: authCopy.missingFields };
  if (password.length < 8) return { error: authCopy.passwordTooShort };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const code = typeof error.code === "string" ? error.code : "";
    // A Map, not an object: a code such as "constructor" must not find an inherited member.
    return { error: SIGNUP_SAFE_COPY.get(code) ?? authCopy.signupFailed };
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
