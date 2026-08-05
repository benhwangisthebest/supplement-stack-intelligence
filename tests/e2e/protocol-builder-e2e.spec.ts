import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// L3 — Protocol Builder E2E (Design §8.4). Uses the seeded demo profile (goals sleep/focus).

test.describe("[LIVE] L3: protocol builder", () => {
  test.skip(!LIVE, "requires live Supabase + seeded demo user (set E2E_LIVE=1)");

  test("login → new stack → generate protocol → accept all → evaluate", async ({ page }) => {
    await login(page);

    // Fresh stack (demo user reused across runs).
    await page.goto("/stack-lab");
    await page.getByPlaceholder(/Sleep stack/i).fill(`Protocol Stack ${Date.now()}`);
    await page.getByRole("button", { name: /^Create$/i }).click();
    await expect(page).toHaveURL(/\/stack-lab\/[0-9a-f-]+/);

    // Generate a protocol from the profile.
    await page.getByRole("button", { name: /Generate Protocol/i }).click();
    // Seeded goal "sleep" → a sleep group with suggestions, each with an Accept button.
    await expect(page.getByRole("heading", { name: /^sleep \(/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Accept$/ }).first()).toBeVisible();

    // Accept all suggestions into this stack.
    await page.getByRole("button", { name: /Accept all/i }).click();
    // After accepting, at least one card shows the "Already added" state.
    await expect(page.getByRole("button", { name: /Already added/i }).first()).toBeVisible();

    // Reload → accepted items appear in the stack → evaluate works.
    await page.reload();
    await page.getByRole("button", { name: /Evaluate stack/i }).click();
    await expect(page.getByText(/critical|warning|info/i).first()).toBeVisible();
  });
});
