import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// identity-cards (v9) — Design §8.2 (L1/API) + §8.3 (L2/UI) + §8.4 (L3/E2E).
// The auth-guard + public Library badge checks run anywhere; the authed card
// requires E2E_LIVE (a configured Supabase project with seeded profile + stacks).

test.describe("L1: identity API auth guard (no auth)", () => {
  test("GET /api/identity returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.get("/api/identity");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });
});

test.describe("L2: public Library supplement archetype badge", () => {
  test("a seed supplement page renders its compound archetype badge", async ({ page }) => {
    await page.goto("/library/creatine");
    const badge = page.getByText("Archetype", { exact: false }).first();
    await expect(badge).toBeVisible();
  });
});

test.describe("[LIVE] L3: authed identity card", () => {
  test.skip(!LIVE, "requires live Supabase with a seeded profile + stacks (set E2E_LIVE=1)");

  test("returns a card with five trait axes and per-stack archetypes", async ({ page }) => {
    await login(page);
    const res = await page.request.get("/api/identity");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data?.card?.archetype).toBeTruthy();
    expect(body.data?.card?.traits).toHaveLength(5);
    expect(Array.isArray(body.data?.stackArchetypes)).toBe(true);
    // Confidence is one of the three documented levels.
    expect(["emerging", "developing", "established"]).toContain(
      body.data?.card?.confidence,
    );
  });

  test("the Profile page renders the Identity Card", async ({ page }) => {
    await login(page);
    await page.goto("/profile");
    await expect(
      page.getByRole("region", { name: /your supplement identity/i }),
    ).toBeVisible();
  });
});
