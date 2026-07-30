import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// L3 — Product Match E2E (Design §8.4). Uses the seeded demo stack (has magnesium etc.).

test.describe("L3: product match", () => {
  test.skip(!LIVE, "requires live Supabase + seeded demo user (set E2E_LIVE=1)");

  test("login → open seeded stack → find products → cards render, affiliate disclosure is coupled to the link", async ({
    page,
  }) => {
    await login(page);

    // Open the seeded "Demo Sleep Stack" (has magnesium, glycine, fish-oil).
    await page.goto("/stack-lab");
    await page.getByRole("link", { name: /Demo Sleep Stack/i }).first().click();
    await expect(page).toHaveURL(/\/stack-lab\/[0-9a-f-]+/);

    // Find products.
    await page.getByRole("button", { name: /Find Products/i }).click();
    // Magnesium group renders with at least one product fit.
    await expect(page.getByRole("heading", { name: /Magnesium/i }).first()).toBeVisible();
    await expect(page.getByText(/per effective dose/i).first()).toBeVisible();

    // v13 (evidence-disclosure): the seed catalog's affiliate links were fabricated
    // placeholders and are now null, so no affiliate anchor renders — and the
    // disclosure that lives inside that block is therefore absent too. This test
    // previously asserted the label unconditionally, which encoded the fabrication.
    //
    // The real, durable contract is the COUPLING: an affiliate anchor must never
    // render without its disclosure. That holds vacuously today and will hold when
    // real listings arrive. (Brief: keep evidence and monetization separate.)
    const affiliateAnchors = page.getByRole("link", { name: /view product/i });
    const disclosures = page.getByText(/does not affect ranking/i);
    expect(await disclosures.count()).toBe(await affiliateAnchors.count());
  });
});
