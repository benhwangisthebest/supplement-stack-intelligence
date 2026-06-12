import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profile-repo";
import { listLabMarkers } from "@/lib/db/lab-marker-repo";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { LabMarkerTable } from "@/components/profile/LabMarkerTable";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata = { title: "Profile — Supplement Stack Intelligence" };
export const dynamic = "force-dynamic"; // reads auth session + user data per request

// Design §5.4 — Profile core fields + manual lab markers (Plan Flow 3, progressive).
export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, markers] = await Promise.all([
    getProfile(supabase, user.id),
    listLabMarkers(supabase, user.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-2 text-neutral-600">
        Your living health context. Add as much or as little as you like — it
        improves over time.
      </p>

      <Disclaimer variant="profile" className="mt-4" />

      <section className="mt-8">
        <ProfileForm initial={profile} />
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">Lab markers</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Manually enter lab values to inform stack evaluation prioritization.
        </p>
        <div className="mt-4">
          <LabMarkerTable initial={markers} />
        </div>
        <Disclaimer variant="labs" className="mt-4" />
      </section>
    </main>
  );
}
