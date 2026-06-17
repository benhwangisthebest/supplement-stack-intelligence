// Presentation — /advisor (Design §5.1). Auth-guarded server component that lists
// the user's conversations and mounts the chat panel. The advisor is an assistant
// OVER Library/Profile/Stack Lab — not a fourth pillar.
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listConversations } from "@/lib/advisor/repo";
import { AdvisorPanel } from "@/components/advisor/AdvisorPanel";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata = { title: "Advisor — Supplement Stack Intelligence" };
export const dynamic = "force-dynamic"; // reads auth session + user data per request

export default async function AdvisorPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const conversations = await listConversations(supabase, user.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Advisor</h1>
      <p className="mt-2 text-neutral-600">
        Ask in plain language. The advisor answers only from the platform&apos;s
        evidence base, your profile, your stack, and your labs — with sources, and
        it says so when it doesn&apos;t have the data.
      </p>

      <Disclaimer variant="general" className="mt-4" />

      <section className="mt-8">
        <AdvisorPanel initialConversations={conversations} />
      </section>
    </main>
  );
}
