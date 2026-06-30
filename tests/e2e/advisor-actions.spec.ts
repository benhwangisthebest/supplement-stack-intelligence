import { expect, test } from "@playwright/test";
import { LIVE, login } from "./helpers";

// advisor-actions (v7) — Design §8.2 (L1 API). Auth-guard + validation checks run
// anywhere; the authed confirm/undo round-trip requires E2E_LIVE (a configured
// Supabase project + migration 0004 applied + seeded demo user).

test.describe("L1: advisor-actions API auth guard (no auth)", () => {
  test("POST /api/advisor/actions returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.post("/api/advisor/actions", {
      data: {
        proposal: { type: "add_item", stackId: "x", payload: { supplementId: "magnesium", dose: 300, unit: "mg" } },
      },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error?.code).toBe("UNAUTHORIZED");
  });

  test("POST /api/advisor/actions/:id/undo returns 401 for an anonymous request", async ({ request }) => {
    const res = await request.post("/api/advisor/actions/00000000-0000-0000-0000-000000000000/undo");
    expect(res.status()).toBe(401);
    expect((await res.json()).error?.code).toBe("UNAUTHORIZED");
  });
});

test.describe("L1: advisor-actions authed validation + lifecycle", () => {
  test.skip(!LIVE, "requires live Supabase + migration 0004 (set E2E_LIVE=1)");

  test("rejects a malformed proposal body with 400", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/advisor/actions", { data: { edits: { dose: 5 } } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error?.code).toBe("VALIDATION_ERROR");
  });

  test("rejects a proposal targeting a non-owned/unknown stack with 404", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/advisor/actions", {
      data: {
        proposal: {
          type: "add_item",
          stackId: "00000000-0000-0000-0000-000000000000",
          payload: { supplementId: "magnesium", dose: 300, unit: "mg" },
        },
      },
    });
    expect(res.status()).toBe(404);
    expect((await res.json()).error?.code).toBe("NOT_FOUND");
  });

  test("confirms an add_item against an owned stack, then undoes it", async ({ page }) => {
    await login(page);

    // Build an owned stack via the existing API (the advisor proposes against it).
    const stackRes = await page.request.post("/api/stacks", {
      data: { name: "v7 actions test", intent: "foundational", mode: "current" },
    });
    expect(stackRes.ok()).toBeTruthy();
    const stackId = (await stackRes.json()).data.id as string;

    // Confirm an add_item proposal (server re-validates + re-checks safety).
    const confirm = await page.request.post("/api/advisor/actions", {
      data: {
        conversationId: null,
        proposal: {
          type: "add_item",
          stackId,
          payload: { supplementId: "magnesium", dose: 300, unit: "mg", timing: "bedtime", frequency: "daily", reason: null },
          diff: [],
          editable: { dose: 300, unit: "mg", timing: "bedtime", frequency: "daily" },
          rationaleCitations: [],
        },
        edits: { dose: 350 }, // edit-before-confirm (SC-5)
      },
    });
    expect(confirm.status()).toBe(201);
    const applied = (await confirm.json()).data;
    expect(applied.applied).toBe(true);
    expect(applied.actionId).toBeTruthy();

    // The edited dose was the one written.
    const items = (await (await page.request.get(`/api/stacks/${stackId}/items`)).json()).data as Array<{
      id: string;
      dose: number;
    }>;
    expect(items.some((i) => i.dose === 350)).toBe(true);

    // Undo reverses it.
    const undo = await page.request.post(`/api/advisor/actions/${applied.actionId}/undo`);
    expect(undo.status()).toBe(200);
    expect((await undo.json()).data.undone).toBe(true);

    // Re-undo is blocked.
    const reUndo = await page.request.post(`/api/advisor/actions/${applied.actionId}/undo`);
    expect(reUndo.status()).toBe(409);
    expect((await reUndo.json()).error?.code).toBe("ALREADY_UNDONE");

    // Cleanup the test stack.
    await page.request.delete(`/api/stacks/${stackId}`);
  });
});
