// Presentation — the advisor chat orchestrator (Design §5.1, §5.3). Sends a
// message to POST /api/advisor, consumes the SSE stream (token/citations/done),
// renders bubbles + provenance chips + a conversation rail. Streaming shows the
// finalized, safety-gated answer token-by-token (the server gates before the
// first token). Plan SC-5/6/7.
"use client";

import { useRef, useState } from "react";
import type { AdvisorConversation, Citation } from "@/types/advisor";
import type { ActionProposal } from "@/types/advisor-action";
import type { DraftFlag } from "@/types/evaluation";
import { AdvisorMessageBubble, type ChatMessageView } from "./AdvisorMessageBubble";
import { ActionProposalCard, type ConfirmResult } from "./ActionProposalCard";
import { UndoToast } from "./UndoToast";
import { ConversationRail } from "./ConversationRail";

interface ApiMessage {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
}

export function AdvisorPanel({
  initialConversations,
}: {
  initialConversations: AdvisorConversation[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  function updateAt(index: number, fn: (m: ChatMessageView) => ChatMessageView) {
    setMessages((prev) => prev.map((m, i) => (i === index ? fn(m) : m)));
  }

  function onProposalConfirmed(index: number, result: ConfirmResult, summary: string) {
    updateAt(index, (m) => ({ ...m, applied: { actionId: result.actionId, summary } }));
    scrollToBottom();
  }

  async function refreshConversations() {
    const res = await fetch("/api/advisor/conversations");
    if (res.ok) {
      const json = await res.json();
      setConversations(json.data ?? []);
    }
  }

  function startNew() {
    setActiveId(null);
    setMessages([]);
    setError(null);
  }

  async function selectConversation(id: string) {
    setActiveId(id);
    setError(null);
    const res = await fetch(`/api/advisor/conversations/${id}`);
    if (res.ok) {
      const json = await res.json();
      setMessages(
        (json.data as ApiMessage[]).map((m) => ({
          role: m.role,
          content: m.content,
          citations: m.citations ?? [],
        })),
      );
      scrollToBottom();
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setInput("");

    // Optimistic user bubble + a pending assistant bubble we stream into.
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, citations: [] },
      { role: "assistant", content: "", citations: [], pending: true },
    ]);
    scrollToBottom();

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, message: text }),
      });

      if (!res.ok || !res.body) {
        const msg = await safeErrorMessage(res);
        failPendingMessage(setMessages, msg);
        setError(msg);
        return;
      }

      await consumeStream(res.body, {
        onToken: (delta) =>
          setMessages((prev) => updateLast(prev, (m) => ({ ...m, content: m.content + delta }))),
        onCitations: (citations) =>
          setMessages((prev) => updateLast(prev, (m) => ({ ...m, citations }))),
        onProposal: ({ proposal, safetyFlags }) =>
          setMessages((prev) =>
            updateLast(prev, (m) => ({ ...m, proposal, safetyFlags, applied: null, rejected: false })),
          ),
        onDone: async ({ conversationId }) => {
          setMessages((prev) => updateLast(prev, (m) => ({ ...m, pending: false })));
          if (!activeId) {
            setActiveId(conversationId);
            await refreshConversations();
          }
        },
      });
    } catch {
      const msg = "Something went wrong reaching the advisor. Please try again.";
      failPendingMessage(setMessages, msg);
      setError(msg);
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  }

  return (
    <div className="flex gap-6">
      <ConversationRail
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={startNew}
      />

      <div className="flex min-h-[28rem] flex-1 flex-col">
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-hairline bg-surface-soft/50 p-4"
        >
          {messages.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-soft">
              Ask about your stack, your labs, interactions with your meds, or the
              evidence for a supplement. Answers come only from the platform&apos;s data.
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i}>
                <AdvisorMessageBubble message={m} />
                {m.proposal && !m.applied && !m.rejected && (
                  <ActionProposalCard
                    proposal={m.proposal}
                    safetyFlags={m.safetyFlags ?? []}
                    conversationId={activeId}
                    onConfirmed={(result, summary) => onProposalConfirmed(i, result, summary)}
                    onRejected={() => updateAt(i, (msg) => ({ ...msg, rejected: true }))}
                  />
                )}
                {m.applied && (
                  <UndoToast actionId={m.applied.actionId} summary={m.applied.summary} />
                )}
              </div>
            ))
          )}
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            maxLength={2000}
            placeholder="Is creatine safe with my meds, and do my labs support it?"
            aria-label="Ask the advisor"
            className="flex-1 rounded-md border border-hairline px-3 py-2 text-sm focus:border-muted focus:outline-none disabled:bg-surface-card"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-surface-dark-elevated disabled:opacity-40"
          >
            {busy ? "Thinking…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---- helpers -----------------------------------------------------------------

function updateLast(
  list: ChatMessageView[],
  fn: (m: ChatMessageView) => ChatMessageView,
): ChatMessageView[] {
  if (list.length === 0) return list;
  const copy = list.slice();
  copy[copy.length - 1] = fn(copy[copy.length - 1]);
  return copy;
}

function failPendingMessage(
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageView[]>>,
  message: string,
) {
  setMessages((prev) =>
    updateLast(prev, (m) => ({ ...m, content: message, pending: false })),
  );
}

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const json = await res.json();
    if (res.status === 401) return "Please sign in to use the advisor.";
    if (res.status === 503) return "The advisor isn't configured on this server yet.";
    return json?.error?.message ?? "The advisor couldn't answer that request.";
  } catch {
    return "The advisor couldn't answer that request.";
  }
}

interface StreamHandlers {
  onToken: (delta: string) => void;
  onCitations: (citations: Citation[]) => void;
  onProposal: (payload: { proposal: ActionProposal; safetyFlags: DraftFlag[] }) => void;
  onDone: (payload: { conversationId: string; status: string }) => void | Promise<void>;
}

/** Parse the text/event-stream body into token/citations/done callbacks. */
async function consumeStream(body: ReadableStream<Uint8Array>, h: StreamHandlers) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const event = /^event: (.*)$/m.exec(raw)?.[1];
      const dataLine = /^data: (.*)$/m.exec(raw)?.[1];
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine);
      if (event === "token") h.onToken(data.delta);
      else if (event === "citations") h.onCitations(data.citations);
      else if (event === "proposal") h.onProposal(data);
      else if (event === "done") await h.onDone(data);
    }
  }
}
