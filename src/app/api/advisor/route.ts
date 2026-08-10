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
import { AdvisorModelAdapter } from "@/lib/advisor/model-adapter";
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
import { enforceRateLimit } from "@/lib/api/rate-limit-guard";
import { AI_SERVICE_NOT_CONFIGURED } from "@/lib/api/errors";
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

/**
 * Phase 2 U6 (§4 rule 9). A paid, tool-looping SSE route with no ceiling can run
 * until the platform's default kills it, and every second of that is billable.
 * The loop's own cap is MAX_TURNS; this is the wall-clock backstop for a step
 * that hangs rather than errors.
 */
export const maxDuration = 60;

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

  // Pre-flight the live-LLM configuration BEFORE committing to a 200 SSE
  // response, so a missing setting still returns a proper 503 (preserves the v7
  // contract). The route always uses the real adapter, which reads these env
  // vars. Phase 2 U25: both halves are required — a base URL without a key
  // cannot authenticate, and a key without a base URL has nowhere to go. The
  // client text is unchanged: `AI_SERVICE_NOT_CONFIGURED` names no environment
  // variable, so a provider swap moves no response byte on this path.
  if (!process.env.OMNIROUTE_API_KEY || !process.env.OMNIROUTE_BASE_URL) {
    return fail("NOT_CONFIGURED", AI_SERVICE_NOT_CONFIGURED, 503);
  }

  const supabase = await createClient();

  // Phase 2 U5 — §4 rule 9's second half. Counted BEFORE the reservation and
  // long before the model call: a refused request must cost nothing, so the
  // cheapest check goes first. Also before the SSE stream is opened, so the
  // refusal can still be a status code rather than an error event.
  const limited = await enforceRateLimit("advisor", user.id, request);
  if (limited) return limited;

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
      const adapter = new AdvisorModelAdapter();

      /**
       * Phase 2 U25 — the ledger settles only figures the provider REPORTED.
       *
       * `adapter.usageReported` is false when any completion this turn came
       * back without a `usage` object. Behind a routing gateway that is
       * possible, and settling anyway would mean settling against zeros: the
       * reservation would be released in full for a turn that really spent
       * money, and the daily budget would quietly stop binding while every
       * test stayed green.
       *
       * So an unreported turn leaves its reservation charged. That
       * over-charges by at most one reservation and never under-charges — the
       * same direction a *thrown* turn already takes (U6) — and it is the only
       * option that does not require estimating a figure the system did not
       * compute (`CLAUDE.md` §2.2 rule 7).
       *
       * `?? false` is load-bearing: an adapter without the property (a stale
       * test double, a future implementation that forgets it) fails CLOSED,
       * toward over-charging, rather than toward a free advisor.
       */
      const maySettle = () => budgetRemaining > 0 && (adapter.usageReported ?? false);
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
          // U6: the client's connection. `runAdvisorTurn` checks it at the top
          // of each iteration, so a disconnect stops the loop before the next
          // paid call instead of after the last one.
          signal: request.signal,
        });

        // U6: the client is gone. SETTLE FIRST — the reservation must be
        // reconciled against what the loop really spent, or a disconnect leaves
        // the full amount charged for the day — then stop. Nothing is persisted:
        // an aborted turn has no answer, and appending an empty assistant
        // message would put a blank turn in the user's history.
        if (result.status === "aborted") {
          if (maySettle()) {
            await settleAdvisorUsage(supabase, budgetRemaining, result.usage);
          }
          return;
        }

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
        //
        // U6: this runs for an ABORTED turn too, and that is the point. A
        // disconnect that skipped the settle would leave the full reservation
        // charged for the day, so a user with a flaky connection would lose
        // their budget to requests that produced nothing. `result.usage` carries
        // what the loop really spent before it stopped, so the charge is the
        // truth in both directions.
        if (maySettle()) {
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
