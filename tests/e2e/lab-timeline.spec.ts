import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// lab-timeline (v4) — Design §8.2 (L1 API). The auth-guard tests run anywhere;
// the persist/extract-no-write/trend flow requires E2E_LIVE (live Supabase).
// Fixture resolved from the project root (Playwright runs from cwd) — avoids
// import.meta, which this project's TS/Playwright transform compiles to CJS.

const SAMPLE_CSV = readFileSync(
  path.join(process.cwd(), "tests/fixtures/labs-sample.csv"),
  "utf-8",
);

test.describe("L1: lab-import auth guards (no auth)", () => {
  test("extract rejects unauthenticated", async ({ request }) => {
    const res = await request.post("/api/lab-import/extract", {
      multipart: {
        file: { name: "labs.csv", mimeType: "text/csv", buffer: Buffer.from(SAMPLE_CSV) },
      },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  test("commit rejects unauthenticated", async ({ request }) => {
    const res = await request.post("/api/lab-import/commit", {
      data: {
        collectedAt: "2026-06-01",
        source: "csv",
        markers: [{ rawLabel: "Ferritin", value: 35, unit: "ng/mL" }],
      },
    });
    expect(res.status()).toBe(401);
  });

  test("lab-panels and lab-trends reject unauthenticated", async ({ request }) => {
    expect((await request.get("/api/lab-panels")).status()).toBe(401);
    expect((await request.get("/api/lab-trends")).status()).toBe(401);
  });
});

test.describe("L1: lab-import authed flow", () => {
  test.skip(!LIVE, "requires live Supabase (set E2E_LIVE=1)");

  test("extract returns CSV candidates WITHOUT writing a panel", async ({ page, request }) => {
    await login(page);

    const before = (await (await request.get("/api/lab-panels")).json()).data.length;

    const res = await request.post("/api/lab-import/extract", {
      multipart: {
        file: { name: "labs.csv", mimeType: "text/csv", buffer: Buffer.from(SAMPLE_CSV) },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.candidates.length).toBe(3);
    expect(body.data.candidates[0]).toMatchObject({ biomarkerId: "vitamin-d-25oh" });

    // The confirm gate: extract must NOT have persisted anything.
    const after = (await (await request.get("/api/lab-panels")).json()).data.length;
    expect(after).toBe(before);
  });

  test("commit rejects an empty marker list (confirm gate)", async ({ page, request }) => {
    await login(page);
    const res = await request.post("/api/lab-import/commit", {
      data: { collectedAt: "2026-06-01", source: "csv", markers: [] },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  test("commit persists a dated panel and trends reflect it", async ({ page, request }) => {
    await login(page);

    await request.post("/api/lab-import/commit", {
      data: {
        collectedAt: "2025-12-01",
        source: "manual",
        markers: [{ rawLabel: "25-OH Vitamin D", value: 28, unit: "ng/mL" }],
      },
    });
    const commit = await request.post("/api/lab-import/commit", {
      data: {
        collectedAt: "2026-06-01",
        source: "csv",
        markers: [{ rawLabel: "25-OH Vitamin D", value: 41, unit: "ng/mL" }],
      },
    });
    expect(commit.status()).toBe(201);
    expect((await commit.json()).data.markerCount).toBe(1);

    const trends = (await (await request.get("/api/lab-trends")).json()).data as Array<{
      biomarkerId: string;
      direction: string;
    }>;
    const vitD = trends.find((t) => t.biomarkerId === "vitamin-d-25oh");
    expect(vitD?.direction).toBe("rising");
  });
});
