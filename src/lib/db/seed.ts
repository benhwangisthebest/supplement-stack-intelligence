/**
 * DB seed for local/demo + E2E tests (Design §8.5).
 * Creates (or reuses) a demo auth user, then seeds a profile + a sample sleep stack
 * with items chosen to exercise the evaluator (dose flag, allergy path, redundancy).
 *
 * Requires service-role access. Run with:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed
 *
 * Idempotent: safe to run repeatedly (re-uses the demo user, resets their stacks).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? "demo@example.com";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo-password-123";

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Seed requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureDemoUser(admin: SupabaseClient): Promise<string> {
  // Try to create; if already exists, look it up.
  const created = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (created.data.user) return created.data.user.id;

  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  const existing = data.users.find((u) => u.email === DEMO_EMAIL);
  if (!existing) throw new Error("Could not create or find the demo user.");
  return existing.id;
}

export async function seed(): Promise<void> {
  const admin = adminClient();
  const userId = await ensureDemoUser(admin);

  // Profile: goal=sleep, allergy=fish (so fish-oil triggers an allergy flag).
  await admin
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        goals: ["sleep", "focus"],
        diet: "omnivore",
        risk_tolerance: "moderate",
        allergies: ["fish"],
        medications: [],
        avoided_ingredients: [],
        form_preferences: ["capsule"],
        caffeine_sensitivity: true,
        experience_level: "intermediate",
        notes: "Demo seed profile.",
      },
      { onConflict: "user_id" },
    );

  // Lab marker: low Vitamin D (exercises lab-relevance rule).
  await admin.from("lab_markers").delete().eq("user_id", userId);
  await admin.from("lab_markers").insert({
    user_id: userId,
    marker: "Vitamin D",
    value: 18,
    unit: "ng/mL",
    reference_low: 30,
    reference_high: 100,
  });

  // Reset and recreate a demo sleep stack.
  await admin.from("stacks").delete().eq("user_id", userId);
  const { data: stack, error: stackErr } = await admin
    .from("stacks")
    .insert({
      user_id: userId,
      name: "Demo Sleep Stack",
      intent: "sleep",
      mode: "current",
      description: "Seeded demo stack.",
    })
    .select("id")
    .single();
  if (stackErr) throw stackErr;

  const stackId = stack.id as string;
  await admin.from("stack_items").insert([
    // Magnesium at 800mg -> dose-fit warning (>1.5x studied max 400).
    { stack_id: stackId, supplement_id: "magnesium", dose: 800, unit: "mg", timing: "bedtime", frequency: "daily" },
    // Glycine -> good sleep fit (no flag).
    { stack_id: stackId, supplement_id: "glycine", dose: 3, unit: "g", timing: "bedtime", frequency: "daily" },
    // Fish oil -> allergy-conflict (profile allergy=fish).
    { stack_id: stackId, supplement_id: "fish-oil", dose: 1000, unit: "mg", timing: "morning", frequency: "daily" },
  ]);
  console.log(`Seeded demo user ${DEMO_EMAIL} (${userId}) with stack ${stackId}.`);
}

// Allow `tsx src/lib/db/seed.ts` / node ESM execution.
if (process.argv[1] && process.argv[1].includes("seed")) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
