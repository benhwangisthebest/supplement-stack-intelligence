import { AuthForm } from "@/components/auth/AuthForm";
import { login } from "../actions";

export const metadata = { title: "Log in — Supplement Stack Intelligence" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-20">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Log in to access your profile and stacks.
        </p>
      </div>
      <AuthForm mode="login" action={login} />
    </main>
  );
}
