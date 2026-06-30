// Presentation — /advisor (Design §5.1). Auth-guarded server component that lists
// the user's conversations and mounts the chat panel. The advisor is an assistant
// OVER Library/Profile/Stack Lab — not a fourth pillar.
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listConversations } from "@/lib/advisor/repo";
import { AdvisorPanel } from "@/components/advisor/AdvisorPanel";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Advisor — Supplement Stack Intelligence" };
export const dynamic = "force-dynamic"; // reads auth session + user data per request

export default async function AdvisorPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const conversations = await listConversations(supabase, user.id);

  return (
    <main className="container-page max-w-5xl py-12">
      <PageHeader
        title="Advisor"
        lead="Ask in plain language. The advisor answers only from the platform's evidence base, your profile, your stack, and your labs — with sources, and it says so when it doesn't have the data."
      />

      <Disclaimer variant="general" className="mt-4" />

      <section className="mt-8">
        <AdvisorPanel initialConversations={conversations} />
      </section>
    </main>
  );
}
