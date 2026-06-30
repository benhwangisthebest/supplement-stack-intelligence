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
// v7 advisor-actions: proposal tools + proposal-halt + pre-apply safety re-check.
// Design Ref: §2.2 — the read loop gains a halt state; the model can now PROPOSE
// a write (returned for user confirmation) but still never writes. Plan SC-2/3/4.
import {
  ADVISOR_ACTION_TOOLS,
  PROPOSAL_TOOL_NAMES,
  actionToolByName,
} from "./actions/proposals";
import { cumulativeRecheck } from "./safety-recheck";
import type { ActionProposal } from "@/types/advisor-action";
import type { DraftFlag } from "@/types/evaluation";
import type {
  AdapterMessage,
  AdapterToolResult,
  AdvisorContext,
  AdvisorTool,
  AdvisorTurnResult,
  Citation,
  ClaudeAdapter,
  ProgressEvent,
  ToolResult,
} from "@/types/advisor";

/** The model's full callable surface: v6 read tools + v7 proposal tools. */
const ALL_TOOLS: AdvisorTool[] = [...ADVISOR_TOOLS, ...ADVISOR_ACTION_TOOLS];

/** Resolve a tool call against both registries (read + action). */
function lookupTool(name: string): AdvisorTool | undefined {
  return toolByName(name) ?? actionToolByName(name);
}

/** Hard cap on model↔tool round-trips per turn (Design §6). */
export const MAX_TURNS = 5;

/**
 * v8 advisor-experience — max grounded proposals collected into one batch per turn
 * (Design §10.4, Plan SC4 / YAGNI "configurable batch size"). A fixed small const;
 * over-cap proposals are dropped (not errored). Overridable via `maxBatch` in tests.
 */
export const MAX_BATCH_PROPOSALS = 4;

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
  /** v8: injected sink for LIVE progress events (tool-call / composing). The loop
   *  stays pure-ish — it emits markers, never model prose. Design §2.2. */
  onProgress?: (event: ProgressEvent) => void;
  /** v8: override the batch proposal cap (tests). Defaults to MAX_BATCH_PROPOSALS. */
  maxBatch?: number;
}

/**
 * Run one advisor turn. Returns a safety-reviewed answer with provenance, OR an
 * honest refusal. NEVER emits a claim absent from tool results, and NEVER emits
 * banned/diagnostic language.
 */
export async function runAdvisorTurn(
  args: RunAdvisorTurnArgs,
): Promise<AdvisorTurnResult> {
  const { adapter, ctx, userMessage, budgetRemaining, onProgress } = args;
  const maxTurns = args.maxTurns ?? MAX_TURNS;
  const maxBatch = args.maxBatch ?? MAX_BATCH_PROPOSALS;

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

  onProgress?.({ type: "turn-start" });

  for (let turn = 0; turn < maxTurns; turn++) {
    const step = await adapter.next({
      system: ADVISOR_SYSTEM_PROMPT,
      messages,
      tools: ALL_TOOLS,
      toolResults: pendingToolResults,
    });
    inputTokens += step.usage.inputTokens;
    outputTokens += step.usage.outputTokens;

    // Model produced a final answer (no further tools requested).
    if (step.toolCalls.length === 0) {
      onProgress?.({ type: "composing" });
      return finalize(step.text, allResults, {
        inputTokens,
        outputTokens,
      }, toolsUsed);
    }

    // v8: collect ALL grounded proposals produced this step (a batch), capped.
    // Generalizes v7's single proposal-halt (Design §2.2): the model may propose
    // several changes in one step; the loop halts once any are grounded.
    const stepProposals: ActionProposal[] = [];

    // Dispatch each requested tool through its pure handler (Design §6: never throws out).
    pendingToolResults = step.toolCalls.map((call) => {
      const tool = lookupTool(call.name);
      let result: ToolResult;
      if (!tool) {
        result = {
          ok: false,
          data: null,
          emptyReason: `Unknown tool "${call.name}".`,
          citations: [],
        };
      } else {
        // v8: live progress — name the tool as it runs (Plan SC1). No model prose.
        onProgress?.({ type: "tool-call", name: call.name });
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
      // Collect each grounded proposal in this step for the batch halt (SC-2/SC4).
      if (PROPOSAL_TOOL_NAMES.has(call.name) && result.ok && result.data) {
        stepProposals.push(result.data as ActionProposal);
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

    // One or more proposals produced → halt, attach cumulative pre-apply safety
    // flags, return the (capped) batch for confirmation. Over-cap proposals are
    // dropped, not errored (Plan SC4 / YAGNI).
    if (stepProposals.length > 0) {
      const batch = stepProposals.slice(0, maxBatch);
      return finalizeProposalBatch(batch, ctx, { inputTokens, outputTokens }, toolsUsed);
    }

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

/**
 * Halt on a BATCH of proposals (v8 advisor-experience, generalizes v7's single
 * halt). Runs the CUMULATIVE pre-apply safety re-check over the projected combined
 * stack (Plan SC-4, Design §3.2) and returns the proposals + the cumulative
 * newly-introduced flags for the user to confirm. The LLM has still written
 * nothing — the engines/repos remain the only writers (Plan SC-2). `proposal`
 * (singular) is kept as proposals[0] for v7 back-compat.
 */
function finalizeProposalBatch(
  proposals: ActionProposal[],
  ctx: AdvisorContext,
  usage: { inputTokens: number; outputTokens: number },
  toolsUsed: string[],
): AdvisorTurnResult {
  let newSafetyFlags: DraftFlag[];
  try {
    newSafetyFlags = cumulativeRecheck(
      ctx,
      proposals.map((proposal) => ({ proposal })),
    );
  } catch {
    // A re-check failure must never silently drop the safety gate — surface none
    // and let module-2's server-side re-check (the authoritative gate) decide.
    newSafetyFlags = [];
  }
  return {
    status: "proposed",
    answer: proposalBatchSummary(proposals, newSafetyFlags),
    citations: dedupeCitations(proposals.flatMap((p) => p.rationaleCitations)),
    usage,
    toolsUsed,
    proposal: proposals[0],
    proposals,
    newSafetyFlags,
  };
}

/** De-dupe citations across a batch by their engine identity. */
function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const id = `${c.kind}:${c.refId}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** A short, non-diagnostic human summary of one or more proposals for the chat
 *  transcript. Composed only from engine-grounded diff labels + fixed copy, then
 *  guarded against banned/diagnostic language. */
function proposalBatchSummary(
  proposals: ActionProposal[],
  flags: DraftFlag[],
): string {
  const lines = proposals.flatMap((p) =>
    p.diff.map((d) => {
      const tail = d.after ? `: ${d.after}` : d.before ? `: ${d.before}` : "";
      return `• ${d.label}${tail}`;
    }),
  );
  const flagNote =
    flags.length > 0
      ? `\n\nHeads up — these changes would surface ${flags.length} new flag${flags.length > 1 ? "s" : ""} to review before applying.`
      : "";
  const header =
    proposals.length > 1
      ? `I've prepared ${proposals.length} changes for you to review:\n`
      : "I've prepared a change for you to review:\n";
  const composed =
    header +
    lines.join("\n") +
    flagNote +
    "\n\nConfirm below to apply, or reject. Nothing has been saved yet.\n\n" +
    DISCLAIMERS.general;
  return containsBannedLanguage(composed) ? DISCLAIMERS.general : composed;
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
