import path from "node:path";
import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// lab-timeline (v4) — Design §8.3 (L2 UI actions). Authed; requires E2E_LIVE.
// Fixture resolved from cwd (project root) to avoid import.meta under CJS.

const SAMPLE_CSV = path.join(process.cwd(), "tests/fixtures/labs-sample.csv");

test.describe("[LIVE] L2: lab upload → review confirm gate", () => {
  test.skip(!LIVE, "requires live Supabase (set E2E_LIVE=1)");

  test("uploading a CSV shows a review table, and commit is gated on approval", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/profile");

    // Upload the sample CSV.
    await page.getByRole("button", { name: /upload report/i }).click();
    await page.setInputFiles('input[type="file"]', SAMPLE_CSV);

    // Review table appears with parsed markers. Assert via the review-row approve
    // checkbox (precise) — the page's Lab Timeline may also render the marker name.
    await expect(page.getByRole("heading", { name: /review parsed markers/i })).toBeVisible();
    // Scope to the review-row checkboxes (aria-label "Approve …") — the page also
    // has ProfileForm checkboxes that must NOT be matched.
    const approveBoxes = page.getByRole("checkbox", { name: /^Approve / });
    await expect(approveBoxes.first()).toBeVisible();

    // Uncheck every approved row → confirm button disables (the gate).
    for (const cb of await approveBoxes.all()) {
      if (await cb.isChecked()) await cb.uncheck();
    }
    await expect(page.getByRole("button", { name: /confirm & save/i })).toBeDisabled();

    // Re-approve one and confirm.
    await approveBoxes.first().check();
    await page.getByRole("button", { name: /confirm & save/i }).click();

    // After save, the timeline reflects the marker.
    await expect(page.getByRole("heading", { name: /lab timeline/i })).toBeVisible();
  });
});
