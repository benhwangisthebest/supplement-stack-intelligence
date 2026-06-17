// Test support — a scripted ClaudeAdapter double + an AdvisorContext fixture.
// Lets the pure agent loop be exercised with NO network and NO DB (Design §8.1).
// Lives in src/ (not a *.test.ts) so multiple test files can share it without
// re-running their describe blocks.
import type {
  AdapterStep,
  AdapterToolResult,
  AdvisorContext,
  ClaudeAdapter,
} from "@/types/advisor";

/** A ClaudeAdapter that replays scripted steps; records what it was given. */
export class ScriptedAdapter implements ClaudeAdapter {
  calls = 0;
  received: { messageCount: number; toolResults: AdapterToolResult[] }[] = [];

  constructor(private readonly steps: AdapterStep[]) {}

  async next(args: {
    messages: { role: string }[];
    toolResults: AdapterToolResult[];
  }): Promise<AdapterStep> {
    this.received.push({
      messageCount: args.messages.length,
      toolResults: args.toolResults,
    });
    // Replay scripted steps; repeat the last one if the loop runs longer
    // (useful for turn-cap tests that script a tool call indefinitely).
    const step = this.steps[Math.min(this.calls, this.steps.length - 1)];
    this.calls++;
    return step;
  }
}

const noUsage = { inputTokens: 0, outputTokens: 0 };

/** Build a step where the model requests one tool call. */
export function toolStep(
  name: string,
  input: Record<string, unknown> = {},
  opts: { id?: string; usage?: { inputTokens: number; outputTokens: number } } = {},
): AdapterStep {
  return {
    text: "",
    toolCalls: [{ id: opts.id ?? `call_${name}`, name, input }],
    usage: opts.usage ?? noUsage,
  };
}

/** Build a step where the model produces a final answer (no tools). */
export function finalStep(
  text: string,
  usage: { inputTokens: number; outputTokens: number } = noUsage,
): AdapterStep {
  return { text, toolCalls: [], usage };
}

/**
 * A realistic AdvisorContext keyed to actual seed ids so the engines produce
 * non-trivial output:
 *  - stack: fish-oil + vitamin-d + magnesium
 *  - medications: warfarin (anticoagulant) → triggers fish-oil↔anticoagulant
 *  - 25-OH Vitamin D = 20 ng/mL (below refLow 30) → biomarker support finding
 *  - two vitamin-D timeline points (15 → 20 ng/mL) → a rising trend
 */
export function makeContext(overrides: Partial<AdvisorContext> = {}): AdvisorContext {
  const userId = "user-1";
  const stackId = "stack-1";
  const base: AdvisorContext = {
    userId,
    profile: {
      id: "profile-1",
      userId,
      goals: ["longevity"],
      diet: null,
      riskTolerance: "moderate",
      allergies: [],
      medications: ["warfarin"],
      avoidedIngredients: [],
      formPreferences: [],
      caffeineSensitivity: null,
      experienceLevel: "intermediate",
      notes: null,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    stack: {
      id: stackId,
      userId,
      name: "Daily",
      intent: "longevity",
      mode: "current",
      description: null,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    stackItems: [
      item("si-1", stackId, "fish-oil", 2, "g"),
      item("si-2", stackId, "vitamin-d", 2000, "IU"),
      item("si-3", stackId, "magnesium", 300, "mg"),
    ],
    labMarkers: [
      {
        id: "lm-1",
        userId,
        marker: "25-OH Vitamin D",
        value: 20,
        unit: "ng/mL",
        referenceLow: 30,
        referenceHigh: 100,
        date: "2026-03-01",
        notes: null,
      },
    ],
    timelinePoints: [
      {
        biomarkerId: "vitamin-d-25oh",
        canonicalValue: 15,
        canonicalUnit: "ng/mL",
        collectedAt: "2026-01-01",
      },
      {
        biomarkerId: "vitamin-d-25oh",
        canonicalValue: 20,
        canonicalUnit: "ng/mL",
        collectedAt: "2026-03-01",
      },
    ],
  };
  return { ...base, ...overrides };
}

function item(
  id: string,
  stackId: string,
  supplementId: string,
  dose: number,
  unit: string,
) {
  return {
    id,
    stackId,
    supplementId,
    customName: null,
    dose,
    unit,
    timing: null,
    frequency: null,
    reason: null,
    notes: null,
  };
}
