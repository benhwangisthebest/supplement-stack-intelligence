// Domain layer — PURE orchestration (the ONE external call is injected, not imported).
// Design Ref: §2.1, §3.2, §9.4 — bounded tool-calling loop: turn cap + budget guard
// + strict grounding + honest refusal. Depends only on the ClaudeAdapter interface,
// so the "cannot fabricate" guarantee is unit-testable against a mock adapter.
// Plan SC-2 (bounded), SC-3 (grounding/refusal), SC-4 (safety), SC-8 (budget), SC-9 (isolation).
import { containsBannedLanguage, DISCLAIMERS } from "@/lib/safety";
import { buildCitations, hasNoGrounding } from "./citations";
import {
  ADVISOR_SYSTEM_PROMPT,
  REFUSAL_BUDGET,
  REFUSAL_NO_DATA,
  TURN_CAP_NOTE,
} from "./prompt";
import { ADVISOR_TOOLS, toolByName } from "./tools";
import type {
  AdapterMessage,
  AdapterToolResult,
  AdvisorContext,
  AdvisorTurnResult,
  Citation,
  ClaudeAdapter,
  ToolResult,
} from "@/types/advisor";

/** Hard cap on model↔tool round-trips per turn (Design §6). */
export const MAX_TURNS = 5;

export interface RunAdvisorTurnArgs {
  adapter: ClaudeAdapter;
  ctx: AdvisorContext;
  /** The new user message for this turn. */
  userMessage: string;
  /** Prior conversation turns (neutral shape), oldest first. */
  history?: AdapterMessage[];
  /** Remaining token budget for this user this window (input+output). SC-8. */
  budgetRemaining: number;
  /** Override the turn cap (tests). */
  maxTurns?: number;
}

/**
 * Run one advisor turn. Returns a safety-reviewed answer with provenance, OR an
 * honest refusal. NEVER emits a claim absent from tool results, and NEVER emits
 * banned/diagnostic language.
 */
export async function runAdvisorTurn(
  args: RunAdvisorTurnArgs,
): Promise<AdvisorTurnResult> {
  const { adapter, ctx, userMessage, budgetRemaining } = args;
  const maxTurns = args.maxTurns ?? MAX_TURNS;

  // SC-8: budget guard — short-circuit before any model call.
  if (budgetRemaining <= 0) {
    return {
      status: "refused-budget",
      answer: REFUSAL_BUDGET,
      citations: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      toolsUsed: [],
    };
  }

  const messages: AdapterMessage[] = [
    ...(args.history ?? []),
    { role: "user", content: userMessage },
  ];

  const allResults: ToolResult[] = [];
  const toolsUsed: string[] = [];
  let pendingToolResults: AdapterToolResult[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let turn = 0; turn < maxTurns; turn++) {
    const step = await adapter.next({
      system: ADVISOR_SYSTEM_PROMPT,
      messages,
      tools: ADVISOR_TOOLS,
      toolResults: pendingToolResults,
    });
    inputTokens += step.usage.inputTokens;
    outputTokens += step.usage.outputTokens;

    // Model produced a final answer (no further tools requested).
    if (step.toolCalls.length === 0) {
      return finalize(step.text, allResults, {
        inputTokens,
        outputTokens,
      }, toolsUsed);
    }

    // Dispatch each requested tool through its pure handler (Design §6: never throws out).
    pendingToolResults = step.toolCalls.map((call) => {
      const tool = toolByName(call.name);
      let result: ToolResult;
      if (!tool) {
        result = {
          ok: false,
          data: null,
          emptyReason: `Unknown tool "${call.name}".`,
          citations: [],
        };
      } else {
        try {
          result = tool.handler(call.input, ctx);
        } catch (err) {
          result = {
            ok: false,
            data: null,
            emptyReason: `Tool "${call.name}" failed: ${(err as Error).message}`,
            citations: [],
          };
        }
        toolsUsed.push(call.name);
      }
      allResults.push(result);
      return {
        toolCallId: call.id,
        content: JSON.stringify({
          ok: result.ok,
          data: result.data,
          emptyReason: result.emptyReason,
        }),
      };
    });

    // Budget exhausted mid-loop → stop here and finalize from what we have.
    if (inputTokens + outputTokens >= budgetRemaining) {
      return finalizeCapped(allResults, { inputTokens, outputTokens }, toolsUsed);
    }
  }

  // Hit the turn cap without a final answer.
  return finalizeCapped(allResults, { inputTokens, outputTokens }, toolsUsed);
}

/** Finalize a model-produced answer under the strict-grounding + safety contract. */
function finalize(
  modelText: string,
  results: ToolResult[],
  usage: { inputTokens: number; outputTokens: number },
  toolsUsed: string[],
): AdvisorTurnResult {
  // SC-3: no grounding → fixed honest refusal, never the model's improvised text.
  if (hasNoGrounding(results)) {
    return {
      status: "refused-no-data",
      answer: REFUSAL_NO_DATA,
      citations: [],
      usage,
      toolsUsed,
    };
  }

  const citations = buildCitations(results);
  // SC-4: the emitted answer must never contain banned/diagnostic language. If the
  // model violated it, fall back to a deterministic, grounded, hedged summary.
  const answer = containsBannedLanguage(modelText)
    ? groundedFallback(citations)
    : modelText;

  return { status: "answered", answer, citations, usage, toolsUsed };
}

/** Finalize when the loop stopped on the turn cap / budget mid-flight. */
function finalizeCapped(
  results: ToolResult[],
  usage: { inputTokens: number; outputTokens: number },
  toolsUsed: string[],
): AdvisorTurnResult {
  if (hasNoGrounding(results)) {
    return {
      status: "refused-no-data",
      answer: REFUSAL_NO_DATA,
      citations: [],
      usage,
      toolsUsed,
    };
  }
  const citations = buildCitations(results);
  return {
    status: "refused-turn-cap",
    answer: groundedFallback(citations) + TURN_CAP_NOTE,
    citations,
    usage,
    toolsUsed,
  };
}

/**
 * A deterministic, non-diagnostic answer composed only from engine-produced
 * citation labels. Used when the model's own text is unusable (banned language)
 * or the loop was cut short. Labels come from the engines, so they are inherently
 * hedged/factual — but we still guard the composed string.
 */
function groundedFallback(citations: Citation[]): string {
  const lines = citations.slice(0, 8).map((c) => `• ${c.label}`);
  const body =
    "Here is what the platform's evidence base shows for your question:\n" +
    lines.join("\n");
  const composed = `${body}\n\n${DISCLAIMERS.general}`;
  // Defensive: citation labels are engine-sourced and safe, but never ship banned text.
  return containsBannedLanguage(composed)
    ? `${DISCLAIMERS.general}`
    : composed;
}
