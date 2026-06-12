import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStackDetail } from "@/services/evaluation";
import { getAllSupplements } from "@/lib/evidence";
import { StackWorkspace } from "@/components/stack/StackWorkspace";
import { ProtocolPanel } from "@/components/stack/ProtocolPanel";
import { ProductMatchPanel } from "@/components/stack/ProductMatchPanel";
import type { SupplementOption } from "@/components/stack/AddItemForm";
import { Disclaimer } from "@/components/ui/Disclaimer";

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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/stack-lab" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Back to Stack Lab
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight">{detail.stack.name}</h1>
        <p className="mt-1 text-sm capitalize text-neutral-500">
          {detail.stack.mode} · intent: {detail.stack.intent}
        </p>
      </header>

      <div className="mt-8">
        <StackWorkspace
          stack={detail.stack}
          initialItems={detail.items}
          initialFlags={detail.flags}
          supplements={supplements}
        />
      </div>

      <div className="mt-10">
        <ProtocolPanel stackId={detail.stack.id} />
        <p className="mt-2 text-xs text-neutral-400">
          Accepted suggestions are added to this stack — reload to see them in Items, then re-evaluate.
        </p>
      </div>

      <div className="mt-10">
        <ProductMatchPanel stackId={detail.stack.id} />
      </div>

      <Disclaimer variant="evaluation" className="mt-10" />
    </main>
  );
}
