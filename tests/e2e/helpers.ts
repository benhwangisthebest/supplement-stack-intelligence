import { expect, type Page } from "@playwright/test";

// ---- lab-timeline (v4) live-trend helpers ----
// These authed lab tests share one demo account whose data accumulates across
// runs, so fixed values become non-rising on repeat. To stay idempotent: read
// the marker's current latest value, then commit a strictly-higher today-dated
// point so the final segment always rises (>10%). Run these specs with
// --workers=1 (the extract-no-write count check needs no concurrent writes).
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
export const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? "demo@example.com";
export const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo-password-123";

export function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 1e4)}@example.com`;
}

/** Logs in as the seeded demo user and lands authenticated (Design §8.4 auth flow). */
export async function login(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  // login redirects to /stack-lab on success.
  await expect(page).toHaveURL(/\/stack-lab/);
  return { email, password };
}
