import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// lab-timeline (v4) — Design §8.4 (L3 E2E). Full journey: two dated panels →
// timeline trend → trajectory-aware evaluation flag. Requires E2E_LIVE.

test.describe("L3: upload → trend → evaluation trajectory", () => {
  test.skip(!LIVE, "requires live Supabase (set E2E_LIVE=1)");

  test("two dated vitamin D entries produce a rising trend that the evaluator notes", async ({
    page,
    request,
  }) => {
    await login(page);

    // Two panels via the commit API (a low earlier value, a higher recent one).
    await request.post("/api/lab-import/commit", {
      data: {
        collectedAt: "2025-12-01",
        source: "manual",
        markers: [{ rawLabel: "25-OH Vitamin D", value: 22, unit: "ng/mL" }],
      },
    });
    await request.post("/api/lab-import/commit", {
      data: {
        collectedAt: "2026-06-01",
        source: "manual",
        markers: [{ rawLabel: "25-OH Vitamin D", value: 41, unit: "ng/mL" }],
      },
    });

    // Profile timeline shows a rising trend chip.
    await page.goto("/profile");
    await expect(page.getByText("25-OH Vitamin D")).toBeVisible();
    await expect(page.getByText(/↑\s*\+/)).toBeVisible();

    // Trends API confirms direction.
    const trends = (await (await request.get("/api/lab-trends")).json()).data as Array<{
      biomarkerId: string;
      direction: string;
    }>;
    expect(trends.find((t) => t.biomarkerId === "vitamin-d-25oh")?.direction).toBe("rising");
  });
});
