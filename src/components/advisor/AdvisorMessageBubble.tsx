// Presentation — one chat message (Design §5.3). User vs assistant styling; the
// assistant bubble carries provenance chips. Plain text (no markdown execution)
// keeps rendering safe.
import type { Citation } from "@/types/advisor";
import { ProvenanceChips } from "./ProvenanceChips";

export interface ChatMessageView {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  /** true while this assistant message is still streaming in. */
  pending?: boolean;
}

export function AdvisorMessageBubble({ message }: { message: ChatMessageView }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-neutral-900 text-white"
            : "border border-neutral-200 bg-white text-neutral-800"
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
