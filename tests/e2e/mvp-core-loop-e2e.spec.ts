import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// L3 — E2E scenario tests (Design §8.4). The full North Star loop.
// Relies on the seeded demo profile (goal=sleep, allergy=fish).

test.describe("L3: core loop", () => {
  test.skip(!LIVE, "requires live Supabase + seeded demo user (set E2E_LIVE=1)");

  test("login → build stack → evaluate (allergy flag) → compare", async ({ page }) => {
    await login(page);

    // Create a uniquely-named stack (demo user is reused across runs).
    await page.goto("/stack-lab");
    await page.getByPlaceholder(/Sleep stack/i).fill(`Loop Stack ${Date.now()}`);
    await page.getByRole("button", { name: /^Create$/i }).click();
    await expect(page).toHaveURL(/\/stack-lab\/[0-9a-f-]+/);

    // Add magnesium (good fit) + fish oil (allergy conflict).
    await page.getByRole("combobox").first().selectOption("magnesium");
    await page.getByPlaceholder("Dose").fill("300");
    await page.getByPlaceholder("Unit").fill("mg");
    await page.getByRole("button", { name: /^Add$/i }).click();
    await expect(page.getByText(/Magnesium — 300/)).toBeVisible();

    await page.getByRole("combobox").first().selectOption("fish-oil");
    await page.getByPlaceholder("Dose").fill("1000");
    await page.getByPlaceholder("Unit").fill("mg");
    await page.getByRole("button", { name: /^Add$/i }).click();
    // Wait for the fish-oil row to persist before evaluating (avoids racing the POST).
    await expect(page.getByText(/— 1000 mg/)).toBeVisible();

    // Evaluate → expect an allergy-conflict flag for fish oil.
    await page.getByRole("button", { name: /Evaluate stack/i }).click();
    await expect(page.getByText(/allergen conflict/i)).toBeVisible();

    // Compare → sleep goal should be covered by magnesium.
    await page.getByRole("button", { name: /^Compare$/i }).click();
    await expect(page.getByRole("heading", { name: /^Covered \(/ })).toBeVisible();
    await expect(page.getByText("sleep", { exact: true })).toBeVisible();
  });

  test("auth guard: stack-lab redirects to login when logged out", async ({ page }) => {
    await page.goto("/stack-lab");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
