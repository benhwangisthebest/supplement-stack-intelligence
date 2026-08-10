// Ownership pins for `stack-repo` (Phase 2 U9). See `__testing__/query-spy.ts`
// for why application-side scoping is pinned even though RLS also enforces it.
import { describe, expect, it } from "vitest";
import { ownerBinding, querySpy } from "./__testing__/query-spy";
import {
  createStack,
  deleteStack,
  getStack,
  listStacks,
  updateStack,
} from "./stack-repo";

const stackRow = {
  id: "st1",
  user_id: "u1",
  name: "Sleep",
  intent: "sleep",
  mode: "current",
  description: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const input = {
  name: "Sleep",
  intent: "sleep" as const,
  mode: "current" as const,
  description: null,
};

describe("stack-repo — every function binds the owner", () => {
  it("listStacks filters by user_id", async () => {
    const spy = querySpy({ data: [stackRow] });
    await listStacks(spy.client, "u1");
    expect(spy.tables).toEqual(["stacks"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("getStack filters by user_id as well as id", async () => {
    // THE canonical case. `.eq("id", id)` alone looks complete and returns
    // another user's stack anywhere RLS is not in force.
    const spy = querySpy({ data: stackRow });
    await getStack(spy.client, "u1", "st1");
    expect(spy.filters()).toContainEqual(["id", "st1"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("createStack writes user_id into the row", async () => {
    const spy = querySpy({ data: stackRow });
    await createStack(spy.client, "u1", input);
    expect(ownerBinding(spy, "u1")).toBe("payload");
  });

  it("updateStack filters by user_id, so it cannot rewrite another user's stack", async () => {
    const spy = querySpy({ data: stackRow });
    await updateStack(spy.client, "u1", "st1", input);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
    // and does not try to move ownership
    expect(spy.payloads.some((r) => "user_id" in r)).toBe(false);
  });

  it("deleteStack filters by user_id — an unscoped delete is the worst case", async () => {
    const spy = querySpy({ data: null });
    await deleteStack(spy.client, "u1", "st1");
    expect(spy.calls.some((c) => c.method === "delete")).toBe(true);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });
});

describe("stack-repo — errors surface rather than resolving empty", () => {
  it("listStacks throws the database error", async () => {
    const spy = querySpy({ error: { message: "boom" } });
    await expect(listStacks(spy.client, "u1")).rejects.toBeTruthy();
  });

  it("getStack returns null for a miss rather than throwing", async () => {
    const spy = querySpy({ data: null });
    expect(await getStack(spy.client, "u1", "nope")).toBeNull();
  });
});
