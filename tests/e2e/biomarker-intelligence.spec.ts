import { expect, test } from "@playwright/test";
import { buildAndEvaluateStack, LIVE, login } from "./helpers";

// biomarker-intelligence (v3) — Design §8.3 (L2/UI) + §8.4 (L3/E2E).
// Public Library checks run anywhere; authed lab flow requires E2E_LIVE.

test.describe("L2: Library biomarker relevance (no auth)", () => {
  test("vitamin D page shows a Relevant biomarkers section with 25-OH Vitamin D", async ({
    page,
  }) => {
    await page.goto("/library/vitamin-d");
    await expect(
      page.getByRole("heading", { name: "Relevant biomarkers" }),
    ).toBeVisible();
    // vitamin D legitimately has two 25-OH-D rules (low→support, high→caution),
    // so scope to the first occurrence.
    await expect(
      page.getByRole("heading", { name: "25-OH Vitamin D" }).first(),
    ).toBeVisible();
  });

  test("a supplement with no biomarker rules shows the honest empty state", async ({
    page,
  }) => {
    // L-theanine has no curated biomarker rules in the seed dataset.
    await page.goto("/library/l-theanine");
    await expect(
      page.getByRole("heading", { name: "Relevant biomarkers" }),
    ).toBeVisible();
    await expect(
      page.getByText(/No biomarkers are linked to this supplement/i),
    ).toBeVisible();
  });
});

test.describe("[LIVE] L3: labs → evaluate → lab-relevance flag", () => {
  test.skip(!LIVE, "requires live Supabase (set E2E_LIVE=1)");

  test("a low vitamin D lab + vitamin D in stack surfaces a lab-relevance note", async ({
    page,
  }) => {
    await login(page);

    // 1. Add a low 25-OH vitamin D lab marker (autocomplete fills unit + range).
    await page.goto("/profile");
    await page.getByPlaceholder(/Marker/i).fill("25-OH Vitamin D");
    await page.getByPlaceholder(/^Value$/i).fill("18");
    // unit auto-fills to ng/mL via the catalog; submit, and require the save.
    const saved = page.waitForResponse(
      (r) => r.url().endsWith("/api/lab-markers") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /^Add$/i }).click();
    expect((await saved).ok()).toBe(true);

    // 2. Build a stack with vitamin D, evaluate, expect a lab-relevance finding.
    //    Before U27 this step only visited /stack-lab, which shows the stack list
    //    and never an evaluation, so the note could not appear.
    const stackId = await buildAndEvaluateStack(page, "Lab relevance", [
      { supplementId: "vitamin-d", dose: 2000, unit: "IU" },
    ]);
    try {
      await expect(
        page.getByRole("heading", { name: "Could be relevant to your labs", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(/Your 25-OH Vitamin D is below the reference range/i),
      ).toBeVisible();
    } finally {
      await page.request.delete(`/api/stacks/${stackId}`);
    }
  });
});
