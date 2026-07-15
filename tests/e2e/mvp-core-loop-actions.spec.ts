import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// L2 — UI action tests (Design §8.3).

test.describe("L2: public Library (no auth)", () => {
  test("search filters supplements by name", async ({ page }) => {
    await page.goto("/library");
    // Scoped to <main>: SiteFooter has a "Library" column heading too.
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Library", level: 1 }),
    ).toBeVisible();

    const search = page.getByPlaceholder(/Search supplements/i);
    await search.fill("magnesium");
    await expect(page.getByRole("link", { name: /Magnesium/i })).toBeVisible();
  });

  test("detail page shows tabs and effect grades", async ({ page }) => {
    await page.goto("/library/creatine");
    await expect(page.getByRole("heading", { name: /Creatine/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Effects/i })).toBeVisible();
    await page.getByRole("tab", { name: /Effects/i }).click();
    await expect(page.getByText(/Strength & power/i)).toBeVisible();
  });

  test("detail page exposes Add to Stack buttons", async ({ page }) => {
    await page.goto("/library/magnesium");
    await expect(page.getByRole("button", { name: /Add to Current Stack/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add to Planned Stack/i })).toBeVisible();
  });
});

test.describe("L2: authenticated profile + stack", () => {
  test.skip(!LIVE, "requires live Supabase (set E2E_LIVE=1)");

  test("save profile then build & evaluate a stack", async ({ page }) => {
    await login(page);

    // Profile save path. Add a non-seeded goal (additive — must not toggle off the
    // seeded sleep/focus goals that the shared demo user relies on in L3).
    await page.goto("/profile");
    await page.getByRole("button", { name: /^recovery$/i }).click();
    await page.getByRole("button", { name: /Save profile/i }).click();
    await expect(page.getByText(/Saved/i)).toBeVisible();

    // Create a uniquely-named stack (demo user is reused across runs).
    await page.goto("/stack-lab");
    await page.getByPlaceholder(/Sleep stack/i).fill(`L2 Stack ${Date.now()}`);
    await page.getByRole("button", { name: /^Create$/i }).click();
    await expect(page).toHaveURL(/\/stack-lab\/[0-9a-f-]+/);

    // Add an item and evaluate.
    await page.getByRole("combobox").first().selectOption("magnesium");
    await page.getByPlaceholder("Dose").fill("800");
    await page.getByPlaceholder("Unit").fill("mg");
    await page.getByRole("button", { name: /^Add$/i }).click();
    await expect(page.getByText(/Magnesium — 800/)).toBeVisible();

    await page.getByRole("button", { name: /Evaluate stack/i }).click();
    // 800mg magnesium for a sleep stack -> dose-fit warning.
    await expect(page.getByText(/exceeds common studied range/i)).toBeVisible();
  });
});
