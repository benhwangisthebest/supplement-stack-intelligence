import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// side-effect-engine (v11) — Design §8.2 (L1/API). Auth-guard + validation run
// anywhere; the authed capture round-trip requires E2E_LIVE (a configured
// Supabase project with migration 0007 applied).

test.describe("L1: side-effects API auth guard (no auth)", () => {
  test("GET /api/side-effects returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.get("/api/side-effects");
    expect(res.status()).toBe(401);
    expect((await res.json()).error?.code).toBe("UNAUTHORIZED");
  });

  test("POST /api/checkins with sideEffects returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.post("/api/checkins", {
      data: {
        date: "2026-07-14",
        ratings: {},
        taken: [],
        scheduled: [],
        sideEffects: [{ effectLabel: "nausea" }],
      },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("[LIVE] L3: authed side-effect capture round-trip", () => {
  test.skip(!LIVE, "requires live Supabase with migration 0007 applied (set E2E_LIVE=1)");

  test("captures canonical side-effects via check-in and lists them back", async ({ page }) => {
    await login(page);
    const date = new Date().toISOString().slice(0, 10);
    const body = {
      date,
      ratings: {},
      taken: ["magnesium"],
      scheduled: ["magnesium"],
      sideEffects: [{ effectLabel: "loose stools", severity: 2 }],
    };

    const post = await page.request.post("/api/checkins", { data: body });
    expect(post.status()).toBe(200);
    const posted = (await post.json()).data;
    // free text is normalized to the canonical vocabulary server-side.
    expect(posted.sideEffects[0].effectLabel).toBe("diarrhea");

    // Idempotent per day — re-submitting does not duplicate.
    const again = await page.request.post("/api/checkins", { data: body });
    expect(again.status()).toBe(200);

    const list = await page.request.get("/api/side-effects");
    expect(list.status()).toBe(200);
    const reports = (await list.json()).data.reports as { effectLabel: string; date: string }[];
    expect(reports.filter((r) => r.date === date && r.effectLabel === "diarrhea")).toHaveLength(1);
  });

  test("rejects an unrecognized side-effect label with 400", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/checkins", {
      data: {
        date: "2026-07-14",
        ratings: {},
        taken: [],
        scheduled: [],
        sideEffects: [{ effectLabel: "teleportation" }],
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error?.code).toBe("VALIDATION_ERROR");
  });
});
