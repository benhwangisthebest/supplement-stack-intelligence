import { AuthForm } from "@/components/auth/AuthForm";
import { signup } from "../actions";

export const metadata = { title: "Sign up — Supplement Stack Intelligence" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Build a smarter supplement stack with evidence, context, and control.
        </p>
      </div>
      <AuthForm mode="signup" action={signup} />
    </main>
  );
}
