import { expect, test } from "@playwright/test";

// L1 — API endpoint tests (Design §8.2).
// Auth-guard + envelope-shape tests run without a configured DB
// (unauthenticated requests are rejected before any DB access).

test.describe("L1: API auth guards & envelope", () => {
  test("GET /api/profile blocks unauthenticated", async ({ request }) => {
    const res = await request.get("/api/profile");
    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json.error?.code).toBe("UNAUTHORIZED");
    expect(json.data).toBeNull();
  });

  test("GET /api/stacks blocks unauthenticated", async ({ request }) => {
    const res = await request.get("/api/stacks");
    expect(res.status()).toBe(401);
    expect((await res.json()).error?.code).toBe("UNAUTHORIZED");
  });

  test("POST /api/stacks blocks unauthenticated", async ({ request }) => {
    const res = await request.post("/api/stacks", {
      data: { name: "x", intent: "sleep", mode: "current" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/stacks/:id/evaluate blocks unauthenticated", async ({ request }) => {
    const res = await request.post("/api/stacks/00000000-0000-0000-0000-000000000000/evaluate");
    expect(res.status()).toBe(401);
  });

  test("GET /api/lab-markers blocks unauthenticated", async ({ request }) => {
    const res = await request.get("/api/lab-markers");
    expect(res.status()).toBe(401);
  });

  test("every error response uses the {data,error} envelope", async ({ request }) => {
    const res = await request.get("/api/stacks");
    const json = await res.json();
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("error");
    expect(json.error).toHaveProperty("code");
    expect(json.error).toHaveProperty("message");
  });
});
