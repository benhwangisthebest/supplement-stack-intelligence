"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthActionState } from "@/lib/auth/types";

interface AuthFormProps {
  mode: "login" | "signup";
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
}

const initialState: AuthActionState = { error: null };

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isLogin = mode === "login";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="label">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete={isLogin ? "current-password" : "new-password"}
          className="input"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Please wait…" : isLogin ? "Log in" : "Create account"}
      </button>

      <p className="text-center text-sm text-muted">
        {isLogin ? (
          <>
            No account?{" "}
            <Link href="/auth/signup" className="font-medium text-ink underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-ink underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
