import { expect, test } from "@playwright/test";

// side-effect-engine (v11) — Design §8.3 (L2/UI). Public Library surface renders
// without auth; the authed capture/timeline surfaces require login (guard).

test.describe("L2: Library 'What to watch' (public)", () => {
  test("renders the curated What to watch section on a profiled supplement", async ({ page }) => {
    // Berberine has a curated side-effect profile (GI upset / diarrhea).
    await page.goto("/library/berberine");
    await expect(page.getByRole("heading", { name: /what to watch/i })).toBeVisible();
  });
});

test.describe("L2: authed side-effect surfaces require auth", () => {
  test("anonymous visitor to /profile is redirected to login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("anonymous visitor to /stack-lab is redirected to login", async ({ page }) => {
    await page.goto("/stack-lab");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
