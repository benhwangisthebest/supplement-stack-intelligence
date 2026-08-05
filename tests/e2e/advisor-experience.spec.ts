import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// advisor-experience (v8) — Design §8.2 (L1 API). Auth-guards run anywhere; the
// batch confirm + grouped undo round-trip requires E2E_LIVE (configured Supabase +
// migration 0005 applied + seeded demo user), same posture as the v7 advisor flow.

test.describe("L1: advisor-experience API auth guard (no auth)", () => {
  test("POST /api/advisor returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.post("/api/advisor", { data: { message: "hi" } });
    expect(res.status()).toBe(401);
    expect((await res.json()).error?.code).toBe("UNAUTHORIZED");
  });

  test("POST /api/advisor/actions (batch shape) returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.post("/api/advisor/actions", {
      data: {
        actions: [
          { proposal: { type: "add_item", stackId: "x", payload: { supplementId: "magnesium", dose: 300, unit: "mg" } } },
        ],
      },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error?.code).toBe("UNAUTHORIZED");
  });
});

test.describe("[LIVE] L1: advisor-experience batch confirm + grouped undo", () => {
  test.skip(!LIVE, "requires live Supabase + migration 0005 (set E2E_LIVE=1)");

  test("rejects an empty actions array with 400", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/advisor/actions", { data: { actions: [] } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error?.code).toBe("VALIDATION_ERROR");
  });

  test("applies a 2-action batch all-or-nothing, then a single undo reverses BOTH", async ({ page }) => {
    await login(page);

    // Build an owned stack with one item to edit, via the existing APIs.
    const stackRes = await page.request.post("/api/stacks", {
      data: { name: "v8 batch test", intent: "foundational", mode: "current" },
    });
    expect(stackRes.ok()).toBeTruthy();
    const stackId = (await stackRes.json()).data.id as string;

    const itemRes = await page.request.post(`/api/stacks/${stackId}/items`, {
      data: { supplementId: "vitamin-d", dose: 2000, unit: "IU" },
    });
    expect(itemRes.ok()).toBeTruthy();
    const itemId = (await itemRes.json()).data.id as string;

    // A batch: add magnesium + edit the vitamin-D dose — both against the owned stack.
    const confirm = await page.request.post("/api/advisor/actions", {
      data: {
        actions: [
          { proposal: { type: "add_item", stackId, payload: { supplementId: "magnesium", dose: 300, unit: "mg", timing: "bedtime", frequency: null, reason: null } } },
          { proposal: { type: "edit_item", stackId, payload: { stackItemId: itemId } }, edits: { dose: 4000 } },
        ],
      },
    });
    expect(confirm.status()).toBe(201);
    const cbody = (await confirm.json()).data;
    expect(cbody.applied).toBe(true);
    expect(cbody.batchId).toBeTruthy();
    expect(cbody.results).toHaveLength(2);

    // Grouped undo: reversing ANY batch member reverses the whole batch.
    const undo = await page.request.post(`/api/advisor/actions/${cbody.results[0].actionId}/undo`);
    expect(undo.status()).toBe(200);
    const ubody = (await undo.json()).data;
    expect(ubody.undone).toBe(true);
    expect(ubody.count).toBe(2);

    // The added magnesium item is gone and the edited item is back to 2000 IU.
    const items = await page.request.get(`/api/stacks/${stackId}/items`);
    const list = (await items.json()).data as { supplementId: string; dose: number }[];
    expect(list.some((i) => i.supplementId === "magnesium")).toBe(false);
    expect(list.find((i) => i.supplementId === "vitamin-d")?.dose).toBe(2000);
  });
});
