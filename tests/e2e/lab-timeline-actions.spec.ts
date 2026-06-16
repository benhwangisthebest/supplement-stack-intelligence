import path from "node:path";
import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// lab-timeline (v4) — Design §8.3 (L2 UI actions). Authed; requires E2E_LIVE.
// Fixture resolved from cwd (project root) to avoid import.meta under CJS.

const SAMPLE_CSV = path.join(process.cwd(), "tests/fixtures/labs-sample.csv");

test.describe("L2: lab upload → review confirm gate", () => {
  test.skip(!LIVE, "requires live Supabase (set E2E_LIVE=1)");

  test("uploading a CSV shows a review table, and commit is gated on approval", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/profile");

    // Upload the sample CSV.
    await page.getByRole("button", { name: /upload report/i }).click();
    await page.setInputFiles('input[type="file"]', SAMPLE_CSV);

    // Review table appears with parsed markers.
    await expect(page.getByRole("heading", { name: /review parsed markers/i })).toBeVisible();
    await expect(page.getByText("25-OH Vitamin D")).toBeVisible();

    // Uncheck every approved row → confirm button disables (the gate).
    for (const cb of await page.getByRole("checkbox").all()) {
      if (await cb.isChecked()) await cb.uncheck();
    }
    await expect(page.getByRole("button", { name: /confirm & save/i })).toBeDisabled();

    // Re-approve one and confirm.
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /confirm & save/i }).click();

    // After save, the timeline reflects the marker.
    await expect(page.getByRole("heading", { name: /lab timeline/i })).toBeVisible();
  });
});
