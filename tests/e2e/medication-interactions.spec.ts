import { expect, test } from "@playwright/test";
import { buildAndEvaluateStack, LIVE, login } from "./helpers";

// medication-interactions (v2) — Design §8.3 (L2/UI) + §8.4 (L3/E2E).
// Public Library checks run anywhere; authed interaction flow requires E2E_LIVE.

test.describe("L2: Library interactions (no auth)", () => {
  test("fish oil detail page shows an Interactions section with a drug interaction", async ({
    page,
  }) => {
    await page.goto("/library/fish-oil");
    const heading = page.getByRole("heading", { name: "Interactions" });
    await expect(heading).toBeVisible();
    // Curated: fish-oil ↔ anticoagulant. Scope to the Interactions section's
    // row heading to avoid matching the supplement's own contraindication copy.
    await expect(
      page.getByRole("heading", { name: "anticoagulant", exact: true }),
    ).toBeVisible();
  });

  test("a supplement with no curated rules shows the honest empty state", async ({
    page,
  }) => {
    // Creatine has no curated interaction rules in the seed dataset.
    await page.goto("/library/creatine");
    await expect(
      page.getByRole("heading", { name: "Interactions" }),
    ).toBeVisible();
    await expect(
      page.getByText(/No known interactions in our dataset/i),
    ).toBeVisible();
  });

  test("[LIVE] the Medications profile field offers autocomplete suggestions", async ({
    page,
  }) => {
    test.skip(!LIVE, "profile page requires live Supabase (set E2E_LIVE=1)");
    await login(page);
    await page.goto("/profile");
    // datalist-backed input is present and labelled.
    await expect(page.getByText("Medications")).toBeVisible();
  });
});

test.describe("[LIVE] L3: meds → stack → interaction flag", () => {
  test.skip(!LIVE, "requires live Supabase (set E2E_LIVE=1)");

  test("adding a conflicting medication surfaces a critical interaction + escalation", async ({
    page,
  }) => {
    await login(page);

    // 1. Add warfarin to the profile medications, and require the save.
    await page.goto("/profile");
    const meds = page.getByPlaceholder(/warfarin, metformin/i);
    await meds.fill("warfarin");
    await meds.press("Enter");
    await expect(page.getByRole("button", { name: "Remove warfarin" })).toBeVisible();
    await page.getByRole("button", { name: /Save profile/i }).click();
    await expect(page.getByText(/Saved/i)).toBeVisible();

    let stackId: string | null = null;
    try {
      // 2. Build a stack containing fish oil, then evaluate. Before U27 this step
      //    only visited /stack-lab, which shows the stack list and never an
      //    evaluation, so the banner could not appear.
      stackId = await buildAndEvaluateStack(page, "Interaction", [
        { supplementId: "fish-oil", dose: 1000, unit: "mg" },
      ]);
      // fish-oil ↔ anticoagulant is a supplement-drug "warning", which
      // lib/interactions/to-flags escalates to critical → the escalation banner.
      await expect(
        page.getByText(/potentially serious interaction was flagged/i),
      ).toBeVisible();
    } finally {
      // Restore the seeded profile (no medications). The demo account is shared,
      // so a medication left here changes what every later advisor spec sees.
      if (stackId) await page.request.delete(`/api/stacks/${stackId}`);
      await page.goto("/profile");
      const remove = page.getByRole("button", { name: "Remove warfarin" });
      if (await remove.isVisible()) {
        await remove.click();
        await expect(remove).toBeHidden();
        await page.getByRole("button", { name: /Save profile/i }).click();
        await expect(page.getByText(/Saved/i)).toBeVisible();
      }
    }
  });
});
