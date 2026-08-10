import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// ai-advisor (v6) — Design §8.3 (L2/UI) + §8.4 (L3/E2E).
// Auth-guard checks run anywhere; the live authed chat flow requires E2E_LIVE
// (a configured Supabase project + OMNIROUTE_BASE_URL/OMNIROUTE_API_KEY + migration 0003 applied).

test.describe("L1: advisor API auth guard (no auth)", () => {
  test("POST /api/advisor returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.post("/api/advisor", {
      data: { message: "is my stack safe?" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  test("GET /api/advisor/conversations returns 401 for an anonymous request", async ({
    request,
  }) => {
    const res = await request.get("/api/advisor/conversations");
    expect(res.status()).toBe(401);
  });
});

test.describe("L2: /advisor page requires auth", () => {
  test("anonymous visitor is redirected to login", async ({ page }) => {
    await page.goto("/advisor");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("[LIVE] L3: authed grounded chat", () => {
  test.skip(!LIVE, "requires live Supabase + OMNIROUTE_BASE_URL/_API_KEY (set E2E_LIVE=1)");

  test("sends a question and renders a streamed, grounded answer", async ({ page }) => {
    await login(page);
    await page.goto("/advisor");

    await page
      .getByLabel("Ask the advisor")
      .fill("What is the evidence for creatine?");
    await page.getByRole("button", { name: /send/i }).click();

    // A user bubble appears immediately; an assistant answer streams in.
    await expect(page.getByText("What is the evidence for creatine?")).toBeVisible();
    // The assistant bubble eventually shows provenance chips (Sources).
    await expect(page.getByLabel("Sources").first()).toBeVisible({ timeout: 20_000 });
    // The new conversation now appears in the rail.
    await expect(
      page.getByRole("button", { name: /What is the evidence for creatine/i }),
    ).toBeVisible();
  });
});
