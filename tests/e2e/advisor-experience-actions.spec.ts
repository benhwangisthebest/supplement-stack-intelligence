import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// advisor-experience (v8) — Design §8.3 (L2/UI). The deep-link TARGET check runs
// anywhere (it only needs the public Library); the live progress strip + multi-action
// confirm card require the live advisor (configured Supabase + API_ANTHROPIC_KEY +
// migration 0005), gated on E2E_LIVE — same posture as the v6/v7 advisor flows.

test.describe("L2: provenance deep-link targets (public Library)", () => {
  test("the Effects tab renders an #effect-{id} anchor that chips link to", async ({ page }) => {
    await page.goto("/library/magnesium");
    // citationHref maps effect-grade refId → /library/magnesium#effect-magnesium-sleep.
    await page.getByRole("tab", { name: "Effects" }).click();
    await expect(page.locator("#effect-magnesium-sleep")).toBeVisible();
  });

  test("a #effect-{id} deep link AUTO-opens the Effects tab (no manual click)", async ({ page }) => {
    // Simulates clicking an advisor provenance chip (gap G1 fix).
    await page.goto("/library/magnesium#effect-magnesium-sleep");
    await expect(page.getByRole("tab", { name: "Effects" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#effect-magnesium-sleep")).toBeVisible();
  });
});

test.describe("[LIVE] L2: live streaming + multi-action confirm", () => {
  test.skip(!LIVE, "requires live Supabase + API_ANTHROPIC_KEY + migration 0005 (set E2E_LIVE=1)");

  test("a live answer shows a progress label then streams tokens in", async ({ page }) => {
    await login(page);
    await page.goto("/advisor");

    await page.getByLabel("Ask the advisor").fill("Is creatine safe with my meds?");
    await page.getByRole("button", { name: /send/i }).click();

    // A progress label (e.g. "Checking interactions…") appears before the answer.
    await expect(page.getByText(/…$/)).toBeVisible({ timeout: 10_000 });
    // Then the gated answer streams in (provenance chips appear at the end).
    await expect(page.getByLabel("Sources")).toBeVisible({ timeout: 30_000 });
  });

  test("a multi-part request yields a batch card whose actions can be toggled", async ({ page }) => {
    await login(page);
    await page.goto("/advisor");

    await page
      .getByLabel("Ask the advisor")
      .fill("Add magnesium 300 mg at bedtime AND add glycine 3 g to my stack.");
    await page.getByRole("button", { name: /send/i }).click();

    // The batch confirm card lists multiple proposed actions with checkboxes.
    const actions = page.getByRole("list", { name: "Proposed actions" });
    await expect(actions).toBeVisible({ timeout: 30_000 });
    const checkboxes = actions.getByRole("checkbox");
    await expect(checkboxes.first()).toBeVisible();

    // Unchecking one action narrows the confirm button's count.
    await checkboxes.first().uncheck();
    await expect(page.getByRole("button", { name: /confirm/i })).toBeVisible();
    await expect(page.getByText(/nothing is saved until you confirm/i)).toBeVisible();
  });
});
