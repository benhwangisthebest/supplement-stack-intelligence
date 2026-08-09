// Application — POST /api/advisor (Design §4.2/§2.2). Auth-guarded + Zod-validated.
// Thin orchestration over the pure agent loop: auth → budget → context → run →
// persist → STREAM. v8 advisor-experience: LIVE progress events stream DURING the
// slow tool loop (via the agent's onProgress sink), then the FINAL answer — already
// through the grounding + lib/safety gate — is token-streamed. The gate still runs
// BEFORE any answer token leaves the server, so the client never sees an unsafe or
// ungrounded token (the invariant is layered AROUND streaming, never through it).
// Plan SC-1/2/3/4/6/7.
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
  reserveAdvisorTokens,
  settleAdvisorUsage,
} from "@/lib/advisor/repo";
import { advisorRequestSchema } from "@/lib/advisor/schema";
import {
  INTERNAL_ERROR_MESSAGE,
  fail,
  reportInternalError,
  unauthorized,
  validationError,
} from "@/lib/api/respond";
import type { AdapterMessage, ProgressEvent } from "@/types/advisor";
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

  // Pre-flight the live-LLM key BEFORE committing to a 200 SSE response, so a
  // missing key still returns a proper 503 (preserves the v7 contract). The route
  // always uses the real adapter, which reads this env var.
  if (!process.env.API_ANTHROPIC_KEY) {
    return fail("NOT_CONFIGURED", "API_ANTHROPIC_KEY not configured", 503);
  }

  const supabase = await createClient();

  // Phase 2 U4: RESERVE before spending, never read-then-write.
  //
  // `reserveAdvisorTokens` takes this turn's upper bound off the ledger in one
  // atomic statement and returns what it granted — 0 when the day's budget
  // cannot cover another turn. Passing that straight through as
  // `budgetRemaining` preserves the existing contract exactly: the loop's SC-8
  // guard already refuses on `<= 0` with REFUSAL_BUDGET, so an exhausted budget
  // produces the same SSE bytes it did before this change.
  //
  // It is no longer strictly "read-only", so the parallel load now mixes one
  // write with two reads. That is deliberate: the reservation must happen
  // before the model call, and doing it here keeps it on the same await.
  const [budgetRemaining, ctx, history] = await Promise.all([
    reserveAdvisorTokens(supabase),
    loadAdvisorContext(supabase, user.id),
    body.conversationId
      ? getMessages(supabase, body.conversationId).then(
          (msgs): AdapterMessage[] =>
            msgs.map((m) => ({ role: m.role, content: m.content })),
        )
      : Promise.resolve([] as AdapterMessage[]),
  ]);

  const message = body.message;
  const requestedConversationId = body.conversationId ?? null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const onProgress = (e: ProgressEvent) =>
        controller.enqueue(sse("progress", e));

      // One adapter instance per turn (it threads the tool-use transcript internally).
      const adapter = new AdvisorClaudeAdapter();
      try {
        const result = await runAdvisorTurn({
          adapter,
          ctx,
          userMessage: message,
          history,
          budgetRemaining,
          onProgress,
          // Phase 2 U2: the loop hands a failed tool's exception here whole and
          // gets back only a correlation id. The route owns this because
          // `reportInternalError` lives behind `next/server`, and the agent loop
          // is a pure-engine module that must not acquire that edge.
          onInternalError: reportInternalError,
        });

        // Persist the turn + meter usage. A new conversation is created lazily.
        const conversationId =
          requestedConversationId ??
          (await createConversation(supabase, user.id, deriveTitle(message))).id;
        await appendMessages(supabase, conversationId, [
          { role: "user", content: message, citations: [] },
          { role: "assistant", content: result.answer, citations: result.citations },
        ]);
        // Settle the reservation against what was actually spent. Called even
        // when usage is zero — a refused or empty turn still has a reservation
        // held against it, and skipping the settle would leave it charged for
        // the rest of the day.
        if (budgetRemaining > 0) {
          await settleAdvisorUsage(supabase, budgetRemaining, result.usage);
        }

        // Token-stream the FINAL, already-gated answer (SC-2/SC-3).
        for (const delta of chunkAnswer(result.answer)) {
          controller.enqueue(sse("token", { delta }));
        }
        controller.enqueue(sse("citations", { citations: result.citations }));

        // v8: when the loop halted on proposal(s), ship the (possibly batched)
        // structured proposals + cumulative pre-apply safety flags for the confirm
        // card. proposals[] always carries the full set (length ≥ 1).
        if (result.status === "proposed") {
          const proposals =
            result.proposals ?? (result.proposal ? [result.proposal] : []);
          controller.enqueue(
            sse("proposals", {
              proposals,
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
      } catch (err) {
        // We're already committed to the SSE response → surface a typed error
        // event. The status code is long gone, but the disclosure rule is not:
        // the raw message used to be streamed straight into a role="alert" in
        // AdvisorPanel. Generic text + a correlation id, same as every 500.
        // NOT settled here, deliberately. A turn that threw may already have
        // made a paid call, so releasing the reservation would hand back budget
        // that was really spent. Leaving it charged over-charges by at most one
        // reservation and never under-charges — the safe direction. Refining
        // this (and the disconnect case, which is not an exception at all) is
        // U6's subject.
        const correlationId = reportInternalError(err, "ADVISOR_ERROR");
        controller.enqueue(
          sse("error", { message: INTERNAL_ERROR_MESSAGE, correlationId }),
        );
      } finally {
        controller.close();
      }
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

// ---- SSE helpers --------------------------------------------------------------

const encoder = new TextEncoder();
function sse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Split into word-ish chunks for a typing effect (whitespace preserved). */
function chunkAnswer(answer: string): string[] {
  return answer.match(/\S+\s*/g) ?? [answer];
}
