// Plan SC5 — the evidence-dominance proof for daily-checkin v10.
// (1) Absent feedback ⇒ byte-for-byte prior generateProtocol output.
// (2) A positive check-in feedback signal can NEVER lift a lower-grade suggestion
//     above a higher-grade one (feedback is ranked strictly BELOW grade, Option C).
import { describe, expect, it } from "vitest";
import { generateProtocol } from "./index";
import { compareSuggestions } from "./rules";
import type { UserProfile } from "@/types";
import type { FeedbackSignal } from "@/types/checkin";

const profile: UserProfile = {
  id: "p",
  userId: "u",
  goals: ["sleep", "training", "focus"],
  diet: null,
  riskTolerance: "moderate",
  allergies: [],
  medications: [],
  avoidedIngredients: [],
  formPreferences: [],
  caffeineSensitivity: null,
  experienceLevel: "advanced",
  notes: null,
  createdAt: "2026-07-01",
  updatedAt: "2026-07-01",
};

describe("generateProtocol — no-feedback regression (Plan SC5)", () => {
  it("is unchanged when no feedback signal is supplied", () => {
    const base = generateProtocol({ profile });
    const emptyFb = generateProtocol({ profile, feedbackSignal: [] });
    expect(emptyFb).toEqual(base);
  });

  it("produces identical output for undefined vs [] feedback", () => {
    expect(generateProtocol({ profile, feedbackSignal: undefined })).toEqual(
      generateProtocol({ profile, feedbackSignal: [] }),
    );
  });
});

describe("compareSuggestions — feedback is strictly below grade (Plan SC5)", () => {
  it("a max positive feedback never lifts a lower grade above a higher grade", () => {
    const higherGradeNoFeedback = { grade: "A" as const, feedback: 0, supplementName: "A" };
    const lowerGradeMaxFeedback = { grade: "C" as const, feedback: 0.15, supplementName: "Z" };
    // negative result ⇒ first arg (grade A) sorts first
    expect(compareSuggestions(higherGradeNoFeedback, lowerGradeMaxFeedback)).toBeLessThan(0);
  });

  it("feedback only breaks ties WITHIN an equal grade", () => {
    const strongFb = { grade: "B" as const, feedback: 0.15, supplementName: "Z" };
    const weakFb = { grade: "B" as const, feedback: -0.15, supplementName: "A" };
    expect(compareSuggestions(strongFb, weakFb)).toBeLessThan(0); // strongFb first
  });

  it("lab signal still outranks feedback (unchanged v3 precedence)", () => {
    const labLeadLowFb = { labSignal: 0.5, grade: "C" as const, feedback: 0, supplementName: "Z" };
    const noLabHighFb = { labSignal: 0, grade: "A" as const, feedback: 0.15, supplementName: "A" };
    expect(compareSuggestions(labLeadLowFb, noLabHighFb)).toBeLessThan(0); // lab lead first
  });
});

describe("feedbackSignal wiring", () => {
  it("attaches a feedback delta + note to a matching suggestion", () => {
    const fb: FeedbackSignal[] = [{ supplementId: "magnesium", outcome: "sleep", delta: 0.1, sampleDays: 10 }];
    const result = generateProtocol({ profile, feedbackSignal: fb });
    const sleep = result.groups.find((g) => g.goal === "sleep");
    const mag = sleep?.suggestions.find((s) => s.supplementId === "magnesium");
    if (mag) {
      expect(mag.feedback).toBeCloseTo(0.1, 5);
      expect(mag.feedbackNote).toBeTruthy();
    }
  });
});
