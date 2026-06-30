import { AuthForm } from "@/components/auth/AuthForm";
import { login } from "../actions";

export const metadata = { title: "Log in — Supplement Stack Intelligence" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-24">
      <div>
        <h1 className="display-sm">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">
          Log in to access your profile and stacks.
        </p>
      </div>
      <div className="card-soft">
        <AuthForm mode="login" action={login} />
      </div>
    </main>
  );
}
