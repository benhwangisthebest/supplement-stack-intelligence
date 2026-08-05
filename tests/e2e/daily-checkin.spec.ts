import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// daily-checkin (v10) — Design §8.2 (L1/API) + §8.4 (L3/E2E).
// Auth-guard + validation checks run anywhere; the authed upsert/round-trip
// requires E2E_LIVE (a configured Supabase project + 0006 migration applied).

test.describe("L1: checkins API auth guard (no auth)", () => {
  test("GET /api/checkins returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.get("/api/checkins");
    expect(res.status()).toBe(401);
    expect((await res.json()).error?.code).toBe("UNAUTHORIZED");
  });

  test("POST /api/checkins returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.post("/api/checkins", {
      data: { date: "2026-07-02", ratings: { sleep: 4 }, taken: [], scheduled: [] },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("L2: Stack Lab check-in section requires auth", () => {
  test("anonymous visitor to /stack-lab is redirected to login", async ({ page }) => {
    await page.goto("/stack-lab");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("[LIVE] L3: authed check-in round-trip", () => {
  test.skip(!LIVE, "requires live Supabase with migration 0006 applied (set E2E_LIVE=1)");

  test("renders the Daily check-in section on Stack Lab", async ({ page }) => {
    await login(page);
    await page.goto("/stack-lab");
    await expect(page.getByRole("heading", { name: /daily check-in/i })).toBeVisible();
  });

  test("upserts today's check-in idempotently and lists it back", async ({ page }) => {
    await login(page);
    const date = new Date().toISOString().slice(0, 10);
    const body = { date, ratings: { sleep: 4 }, taken: ["magnesium"], scheduled: ["magnesium"] };

    const first = await page.request.post("/api/checkins", { data: body });
    expect(first.status()).toBe(200);
    // Idempotent: a second POST for the same day updates, not duplicates.
    const second = await page.request.post("/api/checkins", { data: { ...body, ratings: { sleep: 5 } } });
    expect(second.status()).toBe(200);

    const list = await page.request.get("/api/checkins");
    const data = (await list.json()).data;
    expect(data.checkins.filter((c: { date: string }) => c.date === date)).toHaveLength(1);
    expect(data.consistency).toBeTruthy();
  });

  test("rejects an out-of-range rating with 400", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/checkins", {
      data: { date: "2026-07-02", ratings: { sleep: 9 }, taken: [], scheduled: [] },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error?.code).toBe("VALIDATION_ERROR");
  });
});
