import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { LIVE, login } from "./helpers";

// lab-timeline (v4) — Design §8.3 (L2 UI actions). Authed; requires E2E_LIVE.
// Fixture resolved from cwd (project root) to avoid import.meta under CJS.

const SAMPLE_CSV = path.join(process.cwd(), "tests/fixtures/labs-sample.csv");
const VITAMIN_D = "25-OH Vitamin D";
const MAGNESIUM = "Magnesium (serum)";

/** Timeline points per biomarker name, from GET /api/lab-trends. */
async function readingsByMarker(page: Page): Promise<Map<string, number>> {
  const res = await page.request.get("/api/lab-trends");
  expect(res.ok()).toBe(true);
  const trends = (await res.json()).data as Array<{ biomarkerName: string; points: number }>;
  return new Map(trends.map((t) => [t.biomarkerName, t.points]));
}

test.describe("[LIVE] L2: lab upload → review confirm gate", () => {
  test.skip(!LIVE, "requires live Supabase (set E2E_LIVE=1)");

  test("uploading a CSV shows a review table, and commit is gated on approval", async ({
    page,
  }) => {
    await login(page);
    // Timeline readings per marker before the upload. The demo account keeps its
    // data across runs, so the claim is a delta, not an absolute count.
    const before = await readingsByMarker(page);
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

    // Re-approve one row, named, and confirm.
    await page.getByRole("checkbox", { name: "Approve 25-OH Vitamin D" }).check();
    const committed = page.waitForResponse(
      (r) => r.url().endsWith("/api/lab-import/commit") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /confirm & save/i }).click();
    expect((await committed).ok()).toBe(true);

    // Only the approved row was saved: one more 25-OH Vitamin D reading, and no
    // new reading for the unapproved Magnesium row (it resolves to "Magnesium
    // (serum)"; Ferritin is not a curated biomarker, so it never reaches the
    // timeline and cannot be checked here).
    const expected = (before.get(VITAMIN_D) ?? 0) + 1;
    await expect.poll(async () => (await readingsByMarker(page)).get(VITAMIN_D)).toBe(expected);
    const after = await readingsByMarker(page);
    expect(after.get(MAGNESIUM) ?? 0).toBe(before.get(MAGNESIUM) ?? 0);

    // After save, the timeline reflects the marker. The section is "Current
    // markers & trends" (the "Lab timeline" heading this asserted no longer
    // exists), and the marker's row shows the new reading count once there is
    // more than one.
    await expect(page.getByRole("heading", { name: "Current markers & trends" })).toBeVisible();
    const row = page.getByRole("button", { name: `View ${VITAMIN_D} history` });
    await expect(row).toBeVisible();
    if (expected > 1) await expect(row).toContainText(`${expected} readings`);
  });
});
