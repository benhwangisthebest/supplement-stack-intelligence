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
  /** v7 advisor-actions: a write-proposal awaiting confirmation (assistant only). */
  proposal?: ActionProposal;
  /** v7: pre-apply safety flags the proposal would introduce. */
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
        <p className="whitespace-pre-wrap">
          {message.content}
          {message.pending && (
            <span className="ml-0.5 inline-block animate-pulse">▋</span>
          )}
        </p>
        {!isUser && <ProvenanceChips citations={message.citations} />}
      </div>
    </div>
  );
}
