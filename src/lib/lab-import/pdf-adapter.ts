// Infrastructure layer — the ONLY non-deterministic module (Design §9.4).
// Plan SC-3: messy lab PDFs → structured candidates via a gateway extraction
// adapter (OpenAI since U31; Omniroute U25–U31, decision 7B option (a)). SAFETY: transcription ONLY — the model never judges ranges, never
// diagnoses. Its JSON output MUST pass adapterOutputSchema or we throw
// EXTRACTION_FAILED (never coerce, never persist). Imported only by the
// `extract` route; no domain code depends on this.
import { AI_SERVICE_NOT_CONFIGURED, NotConfiguredError } from "@/lib/api/errors";
import { normalizeMarker } from "@/lib/biomarkers";
import type { ParsedMarkerCandidate } from "@/types/lab";
import {
  baseUrlPermitted,
  createCompletion,
  type CompletionRequest,
  type OpenAIContentPart,
} from "@/lib/openai/client";
import { adapterOutputSchema } from "./schema";

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly code: "UNREADABLE_DOCUMENT" | "EXTRACTION_FAILED",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ExtractionError";
  }
}

/** Injectable transcriber: lab-report text → raw JSON string from the model. */
export type Transcribe = (documentText: string) => Promise<string>;

export interface ExtractDeps {
  transcribe?: Transcribe;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  reasoningEffort?: string;
}

// Tight, transcription-only instruction. Kept here so tests assert against it.
export const EXTRACTION_SYSTEM_PROMPT =
  "You transcribe blood/lab test reports into structured data. " +
  "Extract ONLY values literally present in the document. Do NOT interpret, " +
  "diagnose, judge whether a value is high or low, or invent reference ranges. " +
  'Respond with JSON only: {"markers":[{"rawLabel","value","unit","referenceLow","referenceHigh"}]}. ' +
  "Use null for any reference bound not printed. Omit rows without a numeric value.";

/**
 * Strip a Markdown code fence around a JSON body. PURE.
 *
 * FINDING N-23, from the OP-4 live probe. The routed model returns a *correct*
 * transcription wrapped in ` ```json … ``` `, and the bare `JSON.parse` below
 * rejected it — so a perfectly good extraction answered **502
 * EXTRACTION_FAILED**. That is the most misleading failure this swap could have
 * shipped: the model working correctly, reported to the user as the model
 * failing. Both live paths feed the transcriber's raw output straight into this
 * function, so the probe's failure was production's failure, not a probe
 * artifact — verified before the fix was written.
 *
 * Deliberately narrow. It removes a fence and nothing else: no brace-hunting,
 * no "find the first `{`", no repair of malformed JSON. A parser that salvages
 * arbitrary prose would let a chatty or refusing model's output be read as
 * data, and this module's whole contract is that output either passes
 * `adapterOutputSchema` or is thrown away (§2.2 rule 7 — never assert a value
 * the system did not compute). Unfenced input is returned untouched.
 */
export function stripJsonFence(raw: string): string {
  const text = raw.trim();
  if (!text.startsWith("```")) return raw;
  // Drop the opening fence line (```json, ```JSON, or a bare ```) and, if the
  // block is closed, everything from the final fence onward.
  const afterOpen = text.slice(text.indexOf("\n") + 1);
  const close = afterOpen.lastIndexOf("```");
  return close === -1 ? afterOpen : afterOpen.slice(0, close);
}

/**
 * Validate a model/transcript JSON string → review candidates. PURE: no network.
 * This is the unit-tested core (canned transcript in CI). biomarkerId is a
 * normalize() PREVIEW only; the server recomputes it on commit.
 * @throws ExtractionError("EXTRACTION_FAILED") on unparseable/invalid JSON.
 */
export function candidatesFromTranscript(rawJson: string): ParsedMarkerCandidate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(rawJson));
  } catch {
    throw new ExtractionError("Adapter returned non-JSON output", "EXTRACTION_FAILED");
  }
  const result = adapterOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new ExtractionError("Adapter output failed schema", "EXTRACTION_FAILED");
  }
  return result.data.markers.map((m) => {
    const biomarkerId = normalizeMarker(m.rawLabel);
    return {
      rawLabel: m.rawLabel,
      value: m.value,
      unit: m.unit,
      referenceLow: m.referenceLow ?? null,
      referenceHigh: m.referenceHigh ?? null,
      biomarkerId,
      // PDF transcription is inherently lower-trust than CSV; only mark "high"
      // when we also recognized the marker, to steer review attention.
      confidence: biomarkerId ? "high" : "low",
    } satisfies ParsedMarkerCandidate;
  });
}

/**
 * Extract candidates from already-extracted lab-report text. Uses the injected
 * transcriber (tests) or the default gateway transcriber (runtime).
 * @throws ExtractionError UNREADABLE_DOCUMENT (empty text) / EXTRACTION_FAILED.
 */
export async function extractFromText(
  documentText: string,
  deps: ExtractDeps = {},
): Promise<ParsedMarkerCandidate[]> {
  const text = documentText.trim();
  if (!text) {
    throw new ExtractionError("No text layer in document", "UNREADABLE_DOCUMENT");
  }
  const transcribe = deps.transcribe ?? makeGatewayTranscriber(deps);
  let rawJson: string;
  try {
    rawJson = await transcribe(text);
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    // Phase 2 U6, ruling on finding N-9. A missing server key is NOT a failed
    // extraction: wrapping it as one told the user "try CSV or paste", advice
    // that cannot work — paste routes through the same absent key, so only the
    // CSV third of it was ever true. Rethrown unchanged, it reaches `handle()`
    // and answers 503 NOT_CONFIGURED with operational copy.
    if (e instanceof NotConfiguredError) throw e;
    // Phase 2 U2 (FU-7): the underlying text used to be interpolated into this
    // message. It travels as `cause` instead — preserved for the log, absent
    // from any value a caller might forward. The route's client text is a canned
    // string either way, so no response byte moves.
    throw new ExtractionError("Transcription failed", "EXTRACTION_FAILED", {
      cause: e,
    });
  }
  return candidatesFromTranscript(rawJson);
}

/**
 * Extract candidates from a base64-encoded PDF. The PDF is sent to the gateway
 * as a `file` content part (no PDF-text-extraction library needed). The pure
 * `candidatesFromTranscript` core still validates the result.
 * @throws ExtractionError on empty input / transcription / schema failure.
 */
export async function extractFromPdf(
  base64Pdf: string,
  deps: ExtractDeps = {},
): Promise<ParsedMarkerCandidate[]> {
  if (!base64Pdf.trim()) {
    throw new ExtractionError("Empty PDF payload", "UNREADABLE_DOCUMENT");
  }
  const transcribe = deps.transcribe ?? makeGatewayPdfTranscriber(deps);
  let rawJson: string;
  try {
    rawJson = await transcribe(base64Pdf);
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    // Phase 2 U6, ruling on finding N-9. A missing server key is NOT a failed
    // extraction: wrapping it as one told the user "try CSV or paste", advice
    // that cannot work — paste routes through the same absent key, so only the
    // CSV third of it was ever true. Rethrown unchanged, it reaches `handle()`
    // and answers 503 NOT_CONFIGURED with operational copy.
    if (e instanceof NotConfiguredError) throw e;
    // Phase 2 U2 (FU-7): the underlying text used to be interpolated into this
    // message. It travels as `cause` instead — preserved for the log, absent
    // from any value a caller might forward. The route's client text is a canned
    // string either way, so no response byte moves.
    throw new ExtractionError("Transcription failed", "EXTRACTION_FAILED", {
      cause: e,
    });
  }
  return candidatesFromTranscript(rawJson);
}

// ---------------------------------------------------------------------------
// The live path — OpenAI's API (U31); Omniroute U25–U31; the Anthropic SDK before that
// ---------------------------------------------------------------------------
// Decision 7B, ruled 2026-08-10 from the OP-4 record: a PDF reaches the
// OpenAI-compatible surface as a `file` content part carrying a base64 data
// URL. Verified against BOTH a text PDF and an image-only one (0 fonts, 0 text
// operators, a single /DCTDecode JPEG), so the model really reads the page
// rather than a text layer. `/v1/ocr` — option (b) — answered 400 and is not a
// fallback that exists on that gateway.
//
// With this file's last `@anthropic-ai/sdk` import gone, the package leaves
// `package.json` in the SAME commit (amendment constraint 8), the
// `PAID_API_BUDGET` marker union collapses to the single client module, and
// `RETIRED_PACKAGE` widens from `src/lib/advisor` to all of `src/`.

/**
 * Phase 2 U1 — typed, and deliberately NOT response-affecting.
 *
 * This throw never reached `handle()`'s "not configured" dispatch and still does
 * not. `requireKey` runs inside the transcriber, which runs inside
 * `extractFromText`/`extractFromPdf`'s `try`, whose `catch` wraps any
 * non-`ExtractionError` into `ExtractionError("Transcription failed",
 * "EXTRACTION_FAILED", { cause })` — U2 moved the underlying text from that
 * message onto `cause`. The route then answers **502 EXTRACTION_FAILED** with
 * its own canned client text. Swapping `ExtractionError` for
 * `NotConfiguredError` therefore leaves the wire bytes identical — it takes the
 * *other* branch of that same wrapper and lands on the same class and code.
 * `lab-import.test.ts` pins that, so the preservation is asserted, not assumed.
 *
 * FINDING, recorded not absorbed (§8.1): a missing server key is an operational
 * 503, and this path reports it to the user as a failed extraction with "try CSV
 * or paste" — advice that cannot work, since CSV needs no key but paste and PDF
 * both route through the same absent one. Changing it is a response-byte change
 * U1 did not pre-declare, so it is a follow-up, not a silent fix here.
 */
interface GatewayConfig {
  baseUrl: string;
  apiKey: string;
  /** [U32] The resolved override, carried so the client sees the same decision. */
  allowNonFirstPartyBaseUrl: boolean;
  model: string;
  /** Optional (U31). Absent means "use the model's own default effort". */
  reasoningEffort?: string;
}

/**
 * Resolve every setting the live path needs, or refuse. Server-only.
 *
 * **The model id has NO default (N-21), and this file is where that finding was
 * found a second time.** It shipped with `deps.model ?? "claude-haiku-4-5-20251001"`
 * — correct while it spoke to Anthropic directly, where the id namespace IS the
 * protocol's, and wrong the moment the call goes through a gateway whose ids are
 * instance-specific. `NO_PINNED_MODEL_ID` registered it in a shrink-only ratchet
 * rather than let the advisor half silently reach into a blocked file; this unit
 * removes it, and the ratchet row goes with it.
 *
 * All three settings are required for the same reason the advisor requires them:
 * half-configured is not configured, and guessing any one of them means asserting
 * something about a system this code has not contacted.
 *
 * The `NotConfiguredError` throw is unchanged in kind and in text, so the
 * behaviour U1/U6 pinned still holds — see the note above `NOT_CONFIGURED`
 * handling in `extractFromText`.
 */
function requireGatewayConfig(deps: ExtractDeps): GatewayConfig {
  const baseUrl = deps.baseUrl ?? process.env.OPENAI_BASE_URL;
  const apiKey = deps.apiKey ?? process.env.OPENAI_API_KEY;
  const model = deps.model ?? process.env.OPENAI_MODEL;
  // [U32, N-63] Same shape as the advisor adapter: the pin is checked at the
  // sanctioned `NotConfiguredError` site, on the value actually used, so an
  // injected `deps.baseUrl` cannot route around it. A PDF is the single
  // largest piece of health data this product sends anywhere (§2.3 rule 15).
  const allowNonFirstPartyBaseUrl =
    process.env.OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL === "1";
  if (
    !baseUrl ||
    !apiKey ||
    !model ||
    !baseUrlPermitted(baseUrl, allowNonFirstPartyBaseUrl)
  ) {
    throw new NotConfiguredError(AI_SERVICE_NOT_CONFIGURED);
  }
  // [U31] NOT part of the required triple, deliberately. An unset reasoning
  // effort is a WORKING call at the model's own default — unlike a missing key,
  // base URL or model id, each of which makes the call impossible. Adding it to
  // the `if` above would turn an optional tuning knob into a fourth way to get
  // a 503, and `NOT_CONFIGURED_TOTALITY`'s sanctioned-throw list would then be
  // asserting something this unit never intended.
  const reasoningEffort =
    deps.reasoningEffort ?? process.env.OPENAI_REASONING_EFFORT;
  return { baseUrl, apiKey, allowNonFirstPartyBaseUrl, model, reasoningEffort };
}

/** One transcription call. The system prompt is unchanged across the swap. */
/**
 * The transcription request, as a PURE exported core.
 *
 * ---------------------------------------------------------------------------
 * [2026-09-18, U31] EXTRACTED AND EXPORTED SO THE PROBE CANNOT DRIFT FROM IT.
 * ---------------------------------------------------------------------------
 * `scripts/probes/openai-labimport-probe.ts` used to hand-roll its own request
 * body. It was written before U31 and kept `max_tokens`, which this unit
 * replaced with `max_completion_tokens` — so on 2026-09-18 the probe 400'd and
 * then printed a confident verdict about the PDF `file` content part, a
 * component the failing request never got far enough to exercise
 * (findings N-58, N-59; record `docs/05-qa/2026-09-18-u31-openai-probe-record.md`).
 *
 * An instrument that re-authors the thing it measures can only ever be as
 * current as the last person who remembered to update it. This function and
 * `pdfContentParts` below exist so the probe IMPORTS the production body
 * instead — same shape as `buildCompletionBody` / `completionsUrl` /
 * `parseCompletion` in the client, and the same reason.
 */
export function buildTranscriptionRequest(args: {
  model: string;
  reasoningEffort?: string;
  userContent: string | OpenAIContentPart[];
}): CompletionRequest {
  return {
    model: args.model,
    maxTokens: 2048,
    // Omitted from the wire entirely when unset — see the client's
    // `reasoningEffort` contract.
    ...(args.reasoningEffort ? { reasoningEffort: args.reasoningEffort } : {}),
    messages: [
      // The Anthropic surface took `system` as a top-level string; the
      // OpenAI-compatible one takes a leading system MESSAGE. Same prompt
      // text, different envelope — the protocol change U25 is about.
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: args.userContent },
    ],
  };
}

/**
 * The PDF `file` content part — decision 7B option (a), as a pure exported
 * core. Extracted with `buildTranscriptionRequest` and for the same reason:
 * the probe that tests this shape must send THIS shape, not a copy of it.
 */
export function pdfContentParts(base64Pdf: string): OpenAIContentPart[] {
  return [
    {
      type: "file",
      file: {
        filename: "lab-report.pdf",
        file_data: `data:application/pdf;base64,${base64Pdf}`,
      },
    },
    { type: "text", text: "Transcribe this lab report." },
  ];
}

async function transcribeVia(
  cfg: GatewayConfig,
  userContent: string | OpenAIContentPart[],
): Promise<string> {
  const result = await createCompletion(
    {
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      allowNonFirstPartyBaseUrl: cfg.allowNonFirstPartyBaseUrl,
    },
    buildTranscriptionRequest({
      model: cfg.model,
      reasoningEffort: cfg.reasoningEffort,
      userContent,
    }),
  );
  return result.text;
}

/** Runtime text transcriber (plain lab-report text → JSON). Server-only. */
export function makeGatewayTranscriber(deps: ExtractDeps = {}): Transcribe {
  return async (documentText: string) =>
    transcribeVia(requireGatewayConfig(deps), documentText);
}

/**
 * Runtime PDF transcriber — the PDF travels as a `file` content part.
 *
 * The data URL prefix is required: the OP-4 probe sent exactly this shape and
 * got a correct transcription of an image-only PDF back. No PDF-text-extraction
 * library is involved, which is the property the Anthropic `document` block used
 * to provide and decision 7B had to re-establish.
 */
export function makeGatewayPdfTranscriber(deps: ExtractDeps = {}): Transcribe {
  return async (base64Pdf: string) =>
    transcribeVia(requireGatewayConfig(deps), pdfContentParts(base64Pdf));
}
