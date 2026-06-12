import { expect, type Page } from "@playwright/test";

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
