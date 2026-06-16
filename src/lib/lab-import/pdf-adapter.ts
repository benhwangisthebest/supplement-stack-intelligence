// Infrastructure layer — the ONLY non-deterministic module (Design §9.4).
// Plan SC-3: messy lab PDFs → structured candidates via a Claude extraction
// adapter. SAFETY: transcription ONLY — the model never judges ranges, never
// diagnoses. Its JSON output MUST pass adapterOutputSchema or we throw
// EXTRACTION_FAILED (never coerce, never persist). Imported only by the
// `extract` route; no domain code depends on this.
import { normalizeMarker } from "@/lib/biomarkers";
import type { ParsedMarkerCandidate } from "@/types/lab";
import { adapterOutputSchema } from "./schema";

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly code: "UNREADABLE_DOCUMENT" | "EXTRACTION_FAILED",
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

/** Injectable transcriber: lab-report text → raw JSON string from the model. */
export type Transcribe = (documentText: string) => Promise<string>;

export interface ExtractDeps {
  transcribe?: Transcribe;
  apiKey?: string;
  model?: string;
}

// Tight, transcription-only instruction. Kept here so tests assert against it.
export const EXTRACTION_SYSTEM_PROMPT =
  "You transcribe blood/lab test reports into structured data. " +
  "Extract ONLY values literally present in the document. Do NOT interpret, " +
  "diagnose, judge whether a value is high or low, or invent reference ranges. " +
  'Respond with JSON only: {"markers":[{"rawLabel","value","unit","referenceLow","referenceHigh"}]}. ' +
  "Use null for any reference bound not printed. Omit rows without a numeric value.";

/**
 * Validate a model/transcript JSON string → review candidates. PURE: no network.
 * This is the unit-tested core (canned transcript in CI). biomarkerId is a
 * normalize() PREVIEW only; the server recomputes it on commit.
 * @throws ExtractionError("EXTRACTION_FAILED") on unparseable/invalid JSON.
 */
export function candidatesFromTranscript(rawJson: string): ParsedMarkerCandidate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
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
 * transcriber (tests) or the default Claude transcriber (runtime).
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
  const transcribe = deps.transcribe ?? makeClaudeTranscriber(deps);
  let rawJson: string;
  try {
    rawJson = await transcribe(text);
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    throw new ExtractionError(
      `Transcription failed: ${(e as Error).message}`,
      "EXTRACTION_FAILED",
    );
  }
  return candidatesFromTranscript(rawJson);
}

/**
 * Extract candidates from a base64-encoded PDF. The PDF is sent NATIVELY to
 * Claude as a document block (no PDF-text-extraction library needed). The pure
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
  const transcribe = deps.transcribe ?? makeClaudePdfTranscriber(deps);
  let rawJson: string;
  try {
    rawJson = await transcribe(base64Pdf);
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    throw new ExtractionError(
      `Transcription failed: ${(e as Error).message}`,
      "EXTRACTION_FAILED",
    );
  }
  return candidatesFromTranscript(rawJson);
}

// Minimal structural type for the SDK client we use — avoids a build-time dep.
type AnthropicLike = {
  messages: {
    create: (req: unknown) => Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };
};

async function loadAnthropic(apiKey: string): Promise<AnthropicLike> {
  // Lazily imported so the SDK loads only on the live extraction path (server).
  const mod = await import("@anthropic-ai/sdk");
  return new mod.default({ apiKey }) as unknown as AnthropicLike;
}

function requireKey(deps: ExtractDeps): string {
  const apiKey = deps.apiKey ?? process.env.API_ANTHROPIC_KEY;
  if (!apiKey) {
    throw new ExtractionError(
      "API_ANTHROPIC_KEY not configured",
      "EXTRACTION_FAILED",
    );
  }
  return apiKey;
}

function firstText(resp: { content: Array<{ type: string; text?: string }> }): string {
  return resp.content.find((c) => c.type === "text")?.text ?? "";
}

/** Runtime text transcriber (plain lab-report text → JSON). Server-only. */
export function makeClaudeTranscriber(deps: ExtractDeps = {}): Transcribe {
  return async (documentText: string) => {
    const client = await loadAnthropic(requireKey(deps));
    const resp = await client.messages.create({
      model: deps.model ?? "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: documentText }],
    });
    return firstText(resp);
  };
}

/** Runtime PDF transcriber — sends the PDF natively as a document block. */
export function makeClaudePdfTranscriber(deps: ExtractDeps = {}): Transcribe {
  return async (base64Pdf: string) => {
    const client = await loadAnthropic(requireKey(deps));
    const resp = await client.messages.create({
      model: deps.model ?? "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64Pdf },
            },
            { type: "text", text: "Transcribe this lab report." },
          ],
        },
      ],
    });
    return firstText(resp);
  };
}
