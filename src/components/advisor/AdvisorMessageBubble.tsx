// Presentation — one chat message (Design §5.3). User vs assistant styling; the
// assistant bubble carries provenance chips. Plain text (no markdown execution)
// keeps rendering safe.
import type { Citation } from "@/types/advisor";
import type { ActionProposal } from "@/types/advisor-action";
import type { DraftFlag } from "@/types/evaluation";
import { ProvenanceChips } from "./ProvenanceChips";

export interface ChatMessageView {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  /** true while this assistant message is still streaming in. */
  pending?: boolean;
  /** v8: live progress label shown while the tool loop runs (before tokens). */
  progress?: string | null;
  /** v8 advisor-experience: write-proposal(s) awaiting confirmation (assistant only).
   *  Generalizes v7's single proposal — a batch carries length ≥ 1. */
  proposals?: ActionProposal[];
  /** v7/v8: CUMULATIVE pre-apply safety flags the proposal(s) would introduce. */
  safetyFlags?: DraftFlag[];
  /** v7: set once the proposal is applied — drives the UndoToast. */
  applied?: { actionId: string; summary: string } | null;
  /** v7: set when the user rejects the proposal (card dismissed). */
  rejected?: boolean;
}

export function AdvisorMessageBubble({ message }: { message: ChatMessageView }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-ink text-white"
            : "border border-hairline bg-white text-ink"
        }`}
      >
        {/* v8: while the tool loop runs (no answer tokens yet), show the live
            progress label instead of an empty bubble. */}
        {!isUser && message.pending && message.content.length === 0 && message.progress ? (
          <p className="flex items-center gap-1.5 text-muted">
            <span className="inline-block animate-pulse">●</span>
            <span className="italic">{message.progress}</span>
          </p>
        ) : (
          <p className="whitespace-pre-wrap">
            {message.content}
            {message.pending && (
              <span className="ml-0.5 inline-block animate-pulse">▋</span>
            )}
          </p>
        )}
        {!isUser && <ProvenanceChips citations={message.citations} />}
      </div>
    </div>
  );
}
