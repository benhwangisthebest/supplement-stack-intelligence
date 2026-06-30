import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// advisor-actions (v7) — Design §8.3 (L2/UI) + §8.4 (L3/E2E).
// The proposal card only appears after the LLM calls a proposal tool, so these
// require the live advisor (configured Supabase + API_ANTHROPIC_KEY + migration
// 0004 applied). Gated on E2E_LIVE, same posture as the v6 advisor L3 flow.

test.describe("L2/L3: suggest-then-confirm UI", () => {
  test.skip(!LIVE, "requires live Supabase + API_ANTHROPIC_KEY + migration 0004 (set E2E_LIVE=1)");

  test("the advisor proposes an add, the user confirms, then undoes it", async ({ page }) => {
    await login(page);
    await page.goto("/advisor");

    // A direct, grounded action request strongly induces propose_add_item.
    await page
      .getByLabel("Ask the advisor")
      .fill("Add magnesium 300 mg at bedtime to my stack.");
    await page.getByRole("button", { name: /send/i }).click();

    // The proposal card renders (Design §5.4).
    const card = page.getByText("Proposed change", { exact: false });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/nothing is saved until you confirm/i)).toBeVisible();

    // Confirm → applied toast with an Undo affordance (SC-7).
    await page.getByRole("button", { name: /^confirm$/i }).click();
    await expect(page.getByText(/✓ Applied/i)).toBeVisible({ timeout: 15_000 });

    // Undo reverses it.
    await page.getByRole("button", { name: /^undo$/i }).click();
    await expect(page.getByText(/change undone/i)).toBeVisible({ timeout: 15_000 });
  });

  test("a proposal can be rejected without applying", async ({ page }) => {
    await login(page);
    await page.goto("/advisor");

    await page.getByLabel("Ask the advisor").fill("Add creatine 5 g to my stack.");
    await page.getByRole("button", { name: /send/i }).click();

    await expect(page.getByText("Proposed change", { exact: false })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^reject$/i }).click();

    // Card dismissed; no applied toast appears.
    await expect(page.getByText("Proposed change", { exact: false })).toHaveCount(0);
    await expect(page.getByText(/✓ Applied/i)).toHaveCount(0);
  });
});
