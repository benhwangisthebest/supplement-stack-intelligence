import { expect, type Page } from "@playwright/test";

// ---- lab-timeline (v4) live-trend helpers ----
// These authed lab tests share one demo account whose data accumulates across
// runs, so fixed values become non-rising on repeat. To stay idempotent: read
// the marker's current latest value, then commit a strictly-higher today-dated
// point so the final segment always rises (>10%).
//
// Serialisation used to be a manual `--workers=1` instructed here. It is now
// structural: `playwright.config.ts` sets `workers: 1` and `fullyParallel:
// false` whenever E2E_LIVE=1, because a mitigation that depends on a human
// remembering a flag is not a mitigation (CLAUDE.md §3.5). Do not re-add the
// flag instruction here — change the config if the policy changes.
const DAY_MS = 86_400_000;

/** Current latest canonical value for a biomarker via /api/lab-trends (fallback if absent). */
export async function latestValue(
  page: Page,
  biomarkerId: string,
  fallback: number,
): Promise<number> {
  const data = (await (await page.request.get("/api/lab-trends")).json()).data as Array<{
    biomarkerId: string;
    latest?: { value: number };
  }>;
  return data.find((t) => t.biomarkerId === biomarkerId)?.latest?.value ?? fallback;
}

/** A low (past-dated) + high (today-dated, ≥10% higher) pair that guarantees a rising trend. */
export function risingPair(base: number): {
  low: { date: string; value: number };
  high: { date: string; value: number };
} {
  const today = new Date().toISOString().slice(0, 10);
  const past = new Date(Date.now() - 200 * DAY_MS).toISOString().slice(0, 10);
  const bump = Math.max(6, Math.ceil(base * 0.1));
  return { low: { date: past, value: base }, high: { date: today, value: base + bump } };
}

// Live flows (auth, DB writes) require a configured Supabase project + seeded demo user.
// Set E2E_LIVE=1 in Check/QA once creds exist; otherwise these tests skip.
export const LIVE = process.env.E2E_LIVE === "1";

// Seeded, email-confirmed demo account (created by `npm run db:seed`).
// Logging in (vs signing up per test) avoids Supabase email rate limits and is deterministic.
//
// NO DEFAULT CREDENTIALS (Phase 4 U17, 2026-09-30), matching `src/lib/db/seed.ts`:
// the old defaults were published in this public repository. They are read when
// `login()` runs, not at import, so the non-live specs, which never log in,
// need neither variable.
function demoCredentials(): { email: string; password: string } {
  const email = process.env.SEED_DEMO_EMAIL;
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!email || !password) {
    const missing = [
      ...(email ? [] : ["SEED_DEMO_EMAIL"]),
      ...(password ? [] : ["SEED_DEMO_PASSWORD"]),
    ];
    throw new Error(
      `login() requires ${missing.join(" and ")}: export the credentials ` +
        "`npm run db:seed` was run with. There is no default.",
    );
  }
  return { email, password };
}

/**
 * Creates a uniquely-named stack through the Stack Lab UI, adds each item through
 * the Add item form, and clicks "Evaluate stack": the same steps the L3 core-loop
 * spec drives. Each write is awaited on its own response, so a failure surfaces at
 * the step that failed rather than as a missing flag at the end. Returns the new
 * stack's id.
 *
 * The caller deletes the stack when done (`DELETE /api/stacks/:id`). The advisor
 * treats the most recent current stack as active (`pickActiveStack`), so a stack
 * left behind becomes the advisor's context on the next live run.
 */
export async function buildAndEvaluateStack(
  page: Page,
  name: string,
  items: Array<{ supplementId: string; dose: number; unit: string }>,
): Promise<string> {
  await page.goto("/stack-lab");
  await page.getByPlaceholder(/Sleep stack/i).fill(`${name} ${Date.now()}`);
  await page.getByRole("button", { name: /^Create$/i }).click();
  await expect(page).toHaveURL(/\/stack-lab\/[0-9a-f-]+/);
  const stackId = new URL(page.url()).pathname.split("/").pop() as string;

  for (const item of items) {
    await page.getByRole("combobox").first().selectOption(item.supplementId);
    await page.getByPlaceholder("Dose").fill(String(item.dose));
    await page.getByPlaceholder("Unit").fill(item.unit);
    const added = page.waitForResponse(
      (r) => r.url().endsWith(`/api/stacks/${stackId}/items`) && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /^Add$/i }).click();
    expect((await added).ok()).toBe(true);
  }
  await expect(page.getByRole("heading", { name: `Items (${items.length})` })).toBeVisible();

  const evaluated = page.waitForResponse(
    (r) => r.url().endsWith(`/api/stacks/${stackId}/evaluate`) && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Evaluate stack/i }).click();
  expect((await evaluated).ok()).toBe(true);
  return stackId;
}

export function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 1e4)}@example.com`;
}

/** Logs in as the seeded demo user and lands authenticated (Design §8.4 auth flow). */
export async function login(page: Page) {
  const { email, password } = demoCredentials();
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  // login redirects to /stack-lab on success.
  await expect(page).toHaveURL(/\/stack-lab/);
  return { email, password };
}
