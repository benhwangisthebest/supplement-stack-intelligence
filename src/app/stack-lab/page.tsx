import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listStacks } from "@/lib/db/stack-repo";
import { NewStackForm } from "@/components/stack/NewStackForm";
import { StackList } from "@/components/stack/StackList";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Stack Lab — Supplement Stack Intelligence" };
export const dynamic = "force-dynamic"; // reads auth session + user data per request

// Design §5.4 — Stack Lab home: list stacks + create new.
export default async function StackLabPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const stacks = await listStacks(supabase, user.id);

  return (
    <main className="container-page max-w-4xl py-12">
      <PageHeader
        title="Stack Lab"
        lead="Build, evaluate, and optimize your supplement stacks — with you in control."
      />

      <div className="mt-8">
        <NewStackForm />
      </div>

      <div className="mt-8">
        <StackList stacks={stacks} />
      </div>

      <Disclaimer variant="evaluation" className="mt-10" />
    </main>
  );
}
