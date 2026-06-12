import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listStacks } from "@/lib/db/stack-repo";
import { NewStackForm } from "@/components/stack/NewStackForm";
import { StackList } from "@/components/stack/StackList";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata = { title: "Stack Lab — Supplement Stack Intelligence" };
export const dynamic = "force-dynamic"; // reads auth session + user data per request

// Design §5.4 — Stack Lab home: list stacks + create new.
export default async function StackLabPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const stacks = await listStacks(supabase, user.id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Stack Lab</h1>
      <p className="mt-2 text-neutral-600">
        Build, evaluate, and optimize your supplement stacks.
      </p>

      <div className="mt-6">
        <NewStackForm />
      </div>

      <div className="mt-8">
        <StackList stacks={stacks} />
      </div>

      <Disclaimer variant="evaluation" className="mt-10" />
    </main>
  );
}
