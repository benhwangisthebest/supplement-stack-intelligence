import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStackDetail } from "@/services/evaluation";
import { getAllSupplements } from "@/lib/evidence";
import { StackLabClient } from "@/components/stack/StackLabClient";
import type { SupplementOption } from "@/components/stack/AddItemForm";

export const metadata = { title: "Stack — Supplement Stack Intelligence" };
export const dynamic = "force-dynamic"; // reads auth session + user data per request

// Design §5.4 — Stack detail: editor, evaluate, report, compare (the core loop).
export default async function StackDetailPage({
  params,
}: {
  params: Promise<{ stackId: string }>;
}) {
  const user = await requireUser();
  const { stackId } = await params;
  const supabase = await createClient();
  const detail = await getStackDetail(supabase, user.id, stackId);
  if (!detail) notFound();

  const supplements: SupplementOption[] = getAllSupplements().map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.generalDose.unit,
  }));

  return (
    <main className="container-page max-w-4xl py-10">
      <Link href="/stack-lab" className="text-sm font-medium text-muted hover:text-ink">
        ← Back to Stack Lab
      </Link>

      <header className="mt-4">
        <h1 className="display-sm">{detail.stack.name}</h1>
        <p className="mt-2 text-sm capitalize text-muted">
          {detail.stack.mode} · intent: {detail.stack.intent}
        </p>
      </header>

      <StackLabClient
        stack={detail.stack}
        initialItems={detail.items}
        initialFlags={detail.flags}
        supplements={supplements}
      />
    </main>
  );
}
