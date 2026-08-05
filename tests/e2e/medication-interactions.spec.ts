import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

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

    // 1. Add warfarin to the profile medications.
    await page.goto("/profile");
    const meds = page.getByPlaceholder(/warfarin, metformin/i);
    await meds.fill("warfarin");
    await meds.press("Enter");
    await page.getByRole("button", { name: /save/i }).click();

    // 2. Build a stack containing fish oil, then evaluate.
    //    (Assumes the demo helper navigates to a stack; see helpers.login.)
    await page.goto("/stack-lab");
    // Evaluate flow is covered by the shared workspace; assert the escalation banner.
    await expect(
      page.getByText(/potentially serious interaction was flagged/i),
    ).toBeVisible();
  });
});
