import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listStacks } from "@/lib/db/stack-repo";
import { listCheckins, getCheckin } from "@/lib/db/checkin-repo";
import { listSideEffectReports } from "@/lib/db/side-effect-repo";
import { getSupplementById } from "@/lib/evidence";
import { loadIdentityContext } from "@/lib/identity/context";
import { deriveStackArchetype } from "@/lib/identity";
import { analyzeCheckins } from "@/lib/checkin";
import type { StackArchetype } from "@/types/identity";
import { NewStackForm } from "@/components/stack/NewStackForm";
import { StackList } from "@/components/stack/StackList";
import { DailyCheckinForm } from "@/components/checkin/DailyCheckinForm";
import { ConsistencyHeatmap } from "@/components/checkin/ConsistencyHeatmap";
import { InsightCards } from "@/components/checkin/InsightCards";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Stack Lab — Supplement Stack Intelligence" };
export const dynamic = "force-dynamic"; // reads auth session + user data per request

// Design §5.4 — Stack Lab home: list stacks + create new.
export default async function StackLabPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const stacks = await listStacks(supabase, user.id);

  // v9 identity-cards (Design §5.4, Plan SC4) — per-stack archetype read, keyed by
  // stack id so StackList can badge each card.
  const identityCtx = await loadIdentityContext(supabase, user.id);
  const archetypes: Record<string, StackArchetype> = {};
  for (const s of identityCtx.stacks) {
    archetypes[s.stackId] = deriveStackArchetype(s, identityCtx);
  }

  // daily-checkin v10 (Design §5.1) — today's adherence targets come from the
  // active (current-mode) stack; goals + history drive the heatmap + insights.
  const today = new Date().toISOString().slice(0, 10);
  const activeStack = stacks.find((s) => s.mode === "current") ?? stacks[0] ?? null;
  const activeIdentityStack = activeStack
    ? identityCtx.stacks.find((s) => s.stackId === activeStack.id)
    : undefined;
  const checkinItems = (activeIdentityStack?.itemSupplementIds ?? [])
    .filter((id): id is string => id !== null)
    .map((id) => ({ supplementId: id, name: getSupplementById(id)?.name ?? id }));
  const [checkins, todayCheckin, recentReports] = await Promise.all([
    listCheckins(supabase, user.id),
    getCheckin(supabase, user.id, today),
    listSideEffectReports(supabase, user.id, 1),
  ]);
  const analysis = analyzeCheckins(checkins);
  // side-effect-engine v11 — prefill today's reports so re-saving the check-in
  // (idempotent per-day replace) preserves what was already logged.
  const todayReports = recentReports
    .filter((r) => r.date === today)
    .map((r) => ({ effectLabel: r.effectLabel, severity: r.severity, note: r.note }));

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
        <StackList stacks={stacks} archetypes={archetypes} />
      </div>

      <section className="mt-10 space-y-6">
        <DailyCheckinForm
          date={today}
          items={checkinItems}
          goals={identityCtx.profile?.goals ?? []}
          initial={todayCheckin}
          initialSideEffects={todayReports}
        />
        <ConsistencyHeatmap
          dates={checkins.map((c) => c.date)}
          consistency={analysis.consistency}
          today={today}
        />
        <InsightCards insights={analysis.insights} />
      </section>

      <Disclaimer variant="evaluation" className="mt-10" />
    </main>
  );
}
