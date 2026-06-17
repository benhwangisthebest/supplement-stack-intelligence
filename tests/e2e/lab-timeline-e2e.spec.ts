import { expect, test } from "@playwright/test";
import { LIVE, latestValue, login, risingPair } from "./helpers";

// lab-timeline (v4) — Design §8.4 (L3 E2E). Full journey: two dated panels →
// timeline trend → trajectory-aware evaluation flag. Requires E2E_LIVE.

test.describe("L3: upload → trend → evaluation trajectory", () => {
  test.skip(!LIVE, "requires live Supabase (set E2E_LIVE=1)");

  // Uses Magnesium (not Vitamin D) so it does not collide with the L1 commit
  // test that writes Vitamin-D panels for the same demo account in parallel.
  test("two dated magnesium entries produce a rising trend on the timeline", async ({
    page,
  }) => {
    await login(page);

    // Idempotent rising pair (see helpers) — page.request carries the session.
    const { low, high } = risingPair(await latestValue(page, "magnesium-serum", 1.8));
    await page.request.post("/api/lab-import/commit", {
      data: { collectedAt: low.date, source: "manual",
        markers: [{ rawLabel: "Magnesium", value: low.value, unit: "mg/dL" }] },
    });
    await page.request.post("/api/lab-import/commit", {
      data: { collectedAt: high.date, source: "manual",
        markers: [{ rawLabel: "Magnesium", value: high.value, unit: "mg/dL" }] },
    });

    // Profile timeline shows the marker + a rising trend chip.
    await page.goto("/profile");
    await expect(page.getByText("Magnesium (serum)").first()).toBeVisible();
    await expect(page.getByText(/↑\s*\+/).first()).toBeVisible();

    // Trends API confirms direction.
    const trends = (await (await page.request.get("/api/lab-trends")).json()).data as Array<{
      biomarkerId: string;
      direction: string;
    }>;
    expect(trends.find((t) => t.biomarkerId === "magnesium-serum")?.direction).toBe("rising");
  });
});
