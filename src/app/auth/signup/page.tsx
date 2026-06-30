import { AuthForm } from "@/components/auth/AuthForm";
import { signup } from "../actions";

export const metadata = { title: "Sign up — Supplement Stack Intelligence" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-24">
      <div>
        <h1 className="display-sm">Create your account</h1>
        <p className="mt-2 text-sm text-muted">
          Build a smarter supplement stack with evidence, context, and control.
        </p>
      </div>
      <div className="card-soft">
        <AuthForm mode="signup" action={signup} />
      </div>
    </main>
  );
}
