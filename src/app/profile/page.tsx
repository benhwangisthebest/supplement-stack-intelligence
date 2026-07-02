import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profile-repo";
import { listLabMarkers } from "@/lib/db/lab-marker-repo";
import { listTimelinePoints } from "@/lib/db/lab-panel-repo";
import { computeTrends } from "@/lib/lab-trends";
import { loadIdentityContext } from "@/lib/identity/context";
import { deriveUserIdentity } from "@/lib/identity";
import { IdentityCard } from "@/components/identity/IdentityCard";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { LabMarkerTable } from "@/components/profile/LabMarkerTable";
import { LabUpload } from "@/components/profile/LabUpload";
import { LabTimeline } from "@/components/profile/LabTimeline";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Profile — Supplement Stack Intelligence" };
export const dynamic = "force-dynamic"; // reads auth session + user data per request

// Design §5.4 — Profile core fields + manual lab markers (Plan Flow 3, progressive).
export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, markers, points, identityCtx] = await Promise.all([
    getProfile(supabase, user.id),
    listLabMarkers(supabase, user.id),
    listTimelinePoints(supabase, user.id),
    loadIdentityContext(supabase, user.id),
  ]);
  const trends = computeTrends(points);
  // v9 identity-cards (Design §5.1) — derived server-side (no self-fetch); the
  // /api/identity route serves the same data for any client caller.
  const identity = deriveUserIdentity(identityCtx);

  return (
    <main className="container-page max-w-3xl py-12">
      <PageHeader
        title="Profile"
        lead="Your living health context. Add as much or as little as you like — it improves over time."
      />

      <Disclaimer variant="profile" className="mt-4" />

      <section className="mt-8">
        <IdentityCard card={identity} />
      </section>

      <section className="mt-8">
        <ProfileForm initial={profile} />
      </section>

      <section className="mt-12">
        <h2 className="text-title-lg text-ink">Lab markers</h2>
        <p className="mt-1 text-sm text-muted">
          Upload a lab report, paste a table, or enter values manually. They
          inform stack evaluation prioritization and build a timeline over time.
        </p>

        <div className="mt-4">
          <LabUpload />
        </div>

        <div className="mt-6">
          <h3 className="text-title-sm text-ink">Current markers & trends</h3>
          <p className="mt-1 text-xs text-muted">
            Your latest reading per marker. Click any marker to open its full chart
            and reading history.
          </p>
          <div className="mt-2">
            <LabTimeline trends={trends} points={points} markers={markers} />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-title-sm text-ink">Manual entry</h3>
          <p className="mt-1 text-xs text-muted">
            Add or correct values. Each marker shows its current reading; earlier
            readings are archived under “+N earlier”.
          </p>
          <div className="mt-2">
            <LabMarkerTable initial={markers} />
          </div>
        </div>
        <Disclaimer variant="labs" className="mt-4" />
      </section>
    </main>
  );
}
