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

  // Phase 3 U4 (owner ruling 2026-09-23): this test used l-theanine as its
  // "legacy (unprofiled)" example. U4 profiled every seed effect (G4 forbids a grade
  // without a profile), so l-theanine now shows a breakdown for each of its two
  // effects. The no-profile fallback is guarded in SupplementDetail.test.tsx with
  // made-up effects until evidenceProfile becomes required (FU-63).
  test("a supplement profiled by U4 (l-theanine) shows a breakdown for each effect", async ({
    page,
  }) => {
    await page.goto("/library/l-theanine");
    await page.getByRole("tab", { name: "Effects" }).click();

    await expect(page.getByRole("heading", { name: /Calm focus/i })).toBeVisible();
    await expect(page.getByText("Evidence breakdown")).toHaveCount(2);
  });
});
