import { expect, test } from "@playwright/test";

// Design Ref: §8.2, §8.3 — G3: disclosure reachability + no fabricated links.
// Plan SC: SC-3, SC-4
//
// These run against the REAL rendered Library (public SSG — no auth, no DB), which is
// the whole point: v11 shipped a Critical because 385 unit tests exercised an engine
// that production never called. A disclosure asserted only in component isolation would
// repeat that exactly. Every assertion here goes through the production render path.

const PLACEHOLDER_HOST = ["example", "org"].join(".");

test.describe("G3: evidence disclosure is reachable in production", () => {
  test("the Effects tab renders the illustrative-dataset notice", async ({ page }) => {
    await page.goto("/library/creatine");
    await page.getByRole("tab", { name: /effects/i }).click();
    await expect(page.getByTestId("illustrative-dataset-notice").first()).toBeVisible();
    await expect(page.getByText(/not real studies/i).first()).toBeVisible();
  });

  test("the Evidence summaries tab renders the notice and is relabelled", async ({ page }) => {
    await page.goto("/library/creatine");
    await page.getByRole("tab", { name: /evidence summaries/i }).click();
    await expect(page.getByTestId("illustrative-dataset-notice").first()).toBeVisible();
  });

  test("no 'View source' affordance survives anywhere on a supplement page", async ({ page }) => {
    await page.goto("/library/creatine");
    await expect(page.getByText(/view source/i)).toHaveCount(0);
  });
});

test.describe("G3: no fabricated links reach the DOM", () => {
  // The whole catalog — a per-page audit, since the defect was per-record seed data.
  const slugs = [
    "creatine",
    "magnesium",
    "vitamin-d",
    "fish-oil",
    "l-theanine",
    "glycine",
    "melatonin",
    "ashwagandha",
    "berberine",
    "zinc",
    "vitamin-b12",
    "caffeine",
    "taurine",
    "nac",
    "protein-powder",
  ];

  for (const slug of slugs) {
    test(`/library/${slug} contains no placeholder-host anchor`, async ({ page }) => {
      const res = await page.goto(`/library/${slug}`);
      expect(res?.status()).toBe(200);
      // Every tab's content is server-rendered into the DOM, so one pass covers all.
      expect(await page.locator(`a[href*="${PLACEHOLDER_HOST}"]`).count()).toBe(0);
    });
  }
});
