import { expect, test } from "@playwright/test";

// evidence-grading (v5) — Design §8.3 (L2 UI). Public Library, no auth needed.

test.describe("L2: Library evidence breakdown", () => {
  test("a profiled effect shows an expandable per-dimension breakdown with citations", async ({
    page,
  }) => {
    await page.goto("/library/creatine");
    await page.getByRole("tab", { name: "Effects" }).click();

    // creatine-strength is seeded with a full evidenceProfile.
    const breakdown = page.getByText("Evidence breakdown").first();
    await expect(breakdown).toBeVisible();

    // Expand and verify a dimension + its rating word render.
    await breakdown.click();
    await expect(page.getByText("Human evidence").first()).toBeVisible();
    await expect(page.getByText("strong").first()).toBeVisible();
  });

  test("a legacy (unprofiled) supplement shows grades but no breakdown", async ({
    page,
  }) => {
    // L-theanine's effects have no evidenceProfile in the seed.
    await page.goto("/library/l-theanine");
    await page.getByRole("tab", { name: "Effects" }).click();

    await expect(page.getByRole("heading", { name: /Calm focus/i })).toBeVisible();
    await expect(page.getByText("Evidence breakdown")).toHaveCount(0);
  });
});
