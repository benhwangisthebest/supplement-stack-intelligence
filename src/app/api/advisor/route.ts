// Application — POST /api/advisor (Design §4.2). Auth-guarded + Zod-validated.
// Thin orchestration over the pure agent loop: auth → budget → context → run →
// persist → STREAM. The grounding + lib/safety gate run BEFORE any token is
// streamed, so the client never sees an unsafe/ungrounded token. Plan SC-3/4/6/7.
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { runAdvisorTurn } from "@/lib/advisor/agent";
import { AdvisorClaudeAdapter } from "@/lib/advisor/claude-adapter";
import { loadAdvisorContext } from "@/lib/advisor/context-loader";
import {
  appendMessages,
  createConversation,
  deriveTitle,
  getMessages,
  getRemainingBudget,
  recordUsage,
} from "@/lib/advisor/repo";
import { advisorRequestSchema } from "@/lib/advisor/schema";
import { fail, unauthorized, validationError } from "@/lib/api/respond";
import type { AdapterMessage, AdvisorTurnResult } from "@/types/advisor";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  let body;
  try {
    body = advisorRequestSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return fail("BAD_REQUEST", "Invalid request body.", 400);
  }

  const supabase = await createClient();

  // Load budget + context + prior turns in parallel (all read-only).
  const [budgetRemaining, ctx, history] = await Promise.all([
    getRemainingBudget(supabase, user.id),
    loadAdvisorContext(supabase, user.id),
    body.conversationId
      ? getMessages(supabase, body.conversationId).then(
          (msgs): AdapterMessage[] =>
            msgs.map((m) => ({ role: m.role, content: m.content })),
        )
      : Promise.resolve([] as AdapterMessage[]),
  ]);

  // One adapter instance per turn (it threads the tool-use transcript internally).
  const adapter = new AdvisorClaudeAdapter();
  let result: AdvisorTurnResult;
  try {
    result = await runAdvisorTurn({
      adapter,
      ctx,
      userMessage: body.message,
      history,
      budgetRemaining,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Advisor failed.";
    // 'not configured' → the live LLM key is missing (503), else 500.
    return message.includes("not configured")
      ? fail("NOT_CONFIGURED", message, 503)
      : fail("ADVISOR_ERROR", message, 500);
  }

  // Persist the turn (user + assistant) and meter usage. A new conversation is
  // created lazily on the first message.
  const conversationId =
    body.conversationId ??
    (await createConversation(supabase, user.id, deriveTitle(body.message))).id;

  await appendMessages(supabase, conversationId, [
    { role: "user", content: body.message, citations: [] },
    { role: "assistant", content: result.answer, citations: result.citations },
  ]);
  if (result.usage.inputTokens + result.usage.outputTokens > 0) {
    await recordUsage(supabase, user.id, result.usage);
  }

  return streamResult(result, conversationId);
}

// ---- SSE streaming of the finalized, safety-gated answer ----------------------

const encoder = new TextEncoder();
function sse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Split into word-ish chunks for a typing effect (whitespace preserved). */
function chunkAnswer(answer: string): string[] {
  return answer.match(/\S+\s*/g) ?? [answer];
}

function streamResult(
  result: AdvisorTurnResult,
  conversationId: string,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const delta of chunkAnswer(result.answer)) {
        controller.enqueue(sse("token", { delta }));
      }
      controller.enqueue(sse("citations", { citations: result.citations }));
      // v7 advisor-actions: when the loop halted on a proposal, ship the structured
      // proposal + pre-apply safety flags so the client can render the confirm card.
      if (result.status === "proposed" && result.proposal) {
        controller.enqueue(
          sse("proposal", {
            proposal: result.proposal,
            safetyFlags: result.newSafetyFlags ?? [],
          }),
        );
      }
      controller.enqueue(
        sse("done", {
          conversationId,
          status: result.status,
          toolsUsed: result.toolsUsed,
        }),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
