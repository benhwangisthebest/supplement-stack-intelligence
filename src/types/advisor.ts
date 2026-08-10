// Domain layer — ai-advisor entities (v6). PURE types, no I/O.
// Design Ref: §3.1 — read-only, strictly tool-grounded advisor.
// Plan SC: engines are the source of truth; the LLM only orchestrates + narrates.
import type { Stack, StackItem } from "./stack";
import type { LabMarker, UserProfile } from "./profile";
import type { LabMarkerTimelinePoint } from "./lab";

/** Chat roles the advisor persists/renders. */
export type AdvisorRole = "user" | "assistant";

/**
 * Provenance for a single grounded claim — traces back to the engine's OWN
 * identifier (effectId / ruleId / paperId / markerId). The advisor must attach
 * one of these for every assertion; user messages carry none. Design §3.1.
 */
export type CitationKind =
  | "effect-grade"
  | "interaction-rule"
  | "biomarker-rule"
  | "lab-trend"
  | "paper"
  | "stack-eval"
  | "side-effect"; // side-effect-engine v11 — curated commonly-reported effect

export interface Citation {
  kind: CitationKind;
  refId: string; // the engine's own id (effect.id, rule.ruleId, paper.id, biomarkerId…)
  label: string; // human-readable ("Creatine → strength, Grade A")
  detail?: string; // optional one-line provenance note
}

export interface AdvisorMessage {
  id: string;
  conversationId: string;
  role: AdvisorRole;
  content: string; // safety-reviewed text
  citations: Citation[]; // [] for user messages
  createdAt: string;
}

export interface AdvisorConversation {
  id: string;
  userId: string;
  title: string; // derived from the first user message (truncated)
  createdAt: string;
  updatedAt: string;
}

/**
 * Read-only context pre-loaded once per turn (Design §3.2): profile + active
 * stack + recent lab timeline. Pre-loaded rather than exposed as a tool because
 * most turns need it — avoids an extra round-trip. The server builds this; the
 * client can never inject it.
 */
export interface AdvisorContext {
  userId: string;
  profile: UserProfile | null;
  stack: Stack | null;
  stackItems: StackItem[];
  labMarkers: LabMarker[];
  /** Canonicalized timeline points for lab-trends (already recomputed server-side). */
  timelinePoints: LabMarkerTimelinePoint[];
}

/**
 * What a tool handler returns. `ok=false` means the engine produced NO grounding
 * for this turn (no match / missing context) — it drives the honest-refusal path.
 * `data` is structured engine output the model narrates; `citations` is its
 * provenance. Tool handlers add NO business logic of their own. Design §3.2.
 */
export interface ToolResult<O = unknown> {
  ok: boolean;
  data: O | null;
  /** Why grounding was absent (only when ok=false) — surfaced to the model honestly. */
  emptyReason?: string;
  citations: Citation[];
}

/** A tool the model may call. `handler` wraps an existing pure engine. Design §3.2. */
export interface AdvisorTool<I = Record<string, unknown>, O = unknown> {
  name: string;
  description: string;
  /** JSON schema describing `input` for the model's tool-use API. */
  inputSchema: Record<string, unknown>;
  handler: (input: I, ctx: AdvisorContext) => ToolResult<O>;
}

// ---- Claude adapter port (Infrastructure boundary) ---------------------------
// The Domain agent loop depends ONLY on this interface, never on @anthropic-ai/sdk
// directly — so grounding/refusal logic is unit-testable against a mock adapter.
// The real implementation lives in lib/advisor/model-adapter (module-2). §9.4.
// (Phase 2 U25 renamed that file with the provider swap; this PORT is unchanged
//  — including its name, deliberately: renaming the type would touch agent.ts.)

/** A turn in the model conversation, in the adapter's neutral shape. */
export interface AdapterMessage {
  role: "user" | "assistant";
  content: string;
}

/** A tool the model decided to call this step. */
export interface AdapterToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * One model step. Either the model wants to call tools (`toolCalls` non-empty)
 * or it produced a final answer (`text`). `usage` meters the bounded budget.
 */
export interface AdapterStep {
  text: string;
  toolCalls: AdapterToolCall[];
  usage: { inputTokens: number; outputTokens: number };
}

/** The result the adapter feeds back after tools ran, keyed by tool-call id. */
export interface AdapterToolResult {
  toolCallId: string;
  content: string; // JSON-stringified ToolResult payload the model reads
}

export interface ClaudeAdapter {
  /**
   * Advance the model one step given the running transcript, the available
   * tools, and any tool results from the previous step. Pure transport — no
   * grounding logic. The agent loop owns turn caps, budgets, and refusal.
   */
  next(args: {
    system: string;
    messages: AdapterMessage[];
    tools: AdvisorTool[];
    toolResults: AdapterToolResult[];
  }): Promise<AdapterStep>;
}

// ---- Progress events (v8 advisor-experience) ---------------------------------
// Emitted by the agent loop through an injected onProgress sink as it advances,
// so the route can stream LIVE feedback during the slow tool phase. Carries NO
// model prose — only lifecycle markers + tool names — so it can never leak an
// ungrounded/unsafe token (the gate still runs on the final answer). Design §2.2.

export type ProgressEvent =
  | { type: "turn-start" }
  | { type: "tool-call"; name: string }
  | { type: "composing" };

// ---- Agent loop result -------------------------------------------------------

export type AdvisorTurnStatus =
  | "answered" // grounded answer produced
  | "refused-no-data" // every tool returned ok=false → honest refusal
  | "refused-budget" // per-user budget exhausted before any model call
  | "refused-turn-cap" // hit MAX_TURNS without a final answer → grounded summary
  | "proposed" // v7 advisor-actions: the loop halted on a write-proposal to confirm
  | "aborted"; // Phase 2 U6: the client disconnected; the loop stopped before the next paid call

export interface AdvisorTurnResult {
  status: AdvisorTurnStatus;
  /** Final, safety-reviewed assistant text (a human summary when status="proposed"). */
  answer: string;
  citations: Citation[];
  usage: { inputTokens: number; outputTokens: number };
  /** Tool names invoked this turn, in order — for audit/tests. */
  toolsUsed: string[];
  /** v7: present only when status="proposed" — the FIRST change awaiting confirmation.
   *  Retained for back-compat; v8 callers prefer `proposals` (this == proposals[0]). */
  proposal?: import("./advisor-action").ActionProposal;
  /** v8 advisor-experience: ALL grounded proposals collected this turn (≤ cap), in
   *  order. Present only when status="proposed". A single proposal yields length 1. */
  proposals?: import("./advisor-action").ActionProposal[];
  /** v7/v8: flags the proposal(s) WOULD newly introduce. For a batch this is the
   *  CUMULATIVE set over the projected combined stack (pre-apply re-check, SC-4). */
  newSafetyFlags?: import("./evaluation").DraftFlag[];
}

/** Per-turn budget snapshot the agent consults before/while running. Design §3.3. */
export interface BudgetState {
  /** Remaining tokens (input+output) this user may still spend this window. */
  remaining: number;
}
