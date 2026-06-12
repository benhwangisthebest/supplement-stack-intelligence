import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// L3 — Product Match E2E (Design §8.4). Uses the seeded demo stack (has magnesium etc.).

test.describe("L3: product match", () => {
  test.skip(!LIVE, "requires live Supabase + seeded demo user (set E2E_LIVE=1)");

  test("login → open seeded stack → find products → cards render with affiliate label", async ({
    page,
  }) => {
    await login(page);

    // Open the seeded "Demo Sleep Stack" (has magnesium, glycine, fish-oil).
    await page.goto("/stack-lab");
    await page.getByRole("link", { name: /Demo Sleep Stack/i }).first().click();
    await expect(page).toHaveURL(/\/stack-lab\/[0-9a-f-]+/);

    // Find products.
    await page.getByRole("button", { name: /Find Products/i }).click();
    // Magnesium group renders with at least one product fit + affiliate label.
    await expect(page.getByRole("heading", { name: /Magnesium/i }).first()).toBeVisible();
    await expect(page.getByText(/per effective dose/i).first()).toBeVisible();
    await expect(page.getByText(/does not affect ranking/i).first()).toBeVisible();
  });
});
