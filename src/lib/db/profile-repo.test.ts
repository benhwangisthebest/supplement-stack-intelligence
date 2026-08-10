// Ownership pins for `profile-repo` (Phase 2 U9).
import { describe, expect, it } from "vitest";
import { ownerBinding, querySpy } from "./__testing__/query-spy";
import { getProfile, upsertProfile } from "./profile-repo";

const profileRow = {
  id: "p1",
  user_id: "u1",
  goals: [],
  diet: null,
  risk_tolerance: null,
  allergies: [],
  medications: [],
  avoided_ingredients: [],
  form_preferences: [],
  caffeine_sensitivity: null,
  experience_level: null,
  notes: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const input = {
  goals: [],
  diet: null,
  riskTolerance: null,
  allergies: [],
  medications: [],
  avoidedIngredients: [],
  formPreferences: [],
  caffeineSensitivity: null,
  experienceLevel: null,
  notes: null,
};

describe("profile-repo — every function binds the owner", () => {
  it("getProfile filters by user_id", async () => {
    const spy = querySpy({ data: profileRow });
    await getProfile(spy.client, "u1");
    expect(spy.tables).toEqual(["user_profiles"]);
    expect(spy.filters()).toContainEqual(["user_id", "u1"]);
  });

  it("upsertProfile writes user_id, and conflicts resolve on it", async () => {
    // The health profile is the most sensitive row in the schema (§2.3 rule 15).
    // An upsert whose conflict target omitted user_id could merge one user's
    // profile into another's on a shared unique key.
    const spy = querySpy({ data: profileRow });
    await upsertProfile(spy.client, "u1", input as never);
    expect(ownerBinding(spy, "u1")).toBe("payload");
    const upsert = spy.calls.find((c) => c.method === "upsert");
    expect(upsert?.args[1]).toMatchObject({ onConflict: "user_id" });
  });

  it("getProfile returns null when the user has no profile yet", async () => {
    const spy = querySpy({ data: null });
    expect(await getProfile(spy.client, "u1")).toBeNull();
  });
});
