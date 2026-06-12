import { expect, test } from "@playwright/test";

// L1 — /api/products/match API tests (Design §8.3). Auth runs without a session.

test.describe("L1: product match API", () => {
  test("blocks unauthenticated", async ({ request }) => {
    const res = await request.post("/api/products/match", {
      data: { stackId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error?.code).toBe("UNAUTHORIZED");
  });

  test("uses the {data,error} envelope", async ({ request }) => {
    const res = await request.post("/api/products/match", {
      data: { stackId: "00000000-0000-0000-0000-000000000000" },
    });
    const json = await res.json();
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("error");
  });
});
