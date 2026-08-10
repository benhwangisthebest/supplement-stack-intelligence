/**
 * OP-4(b) — the lab-import probe. OWNER-RUN, never CI.
 *
 * DECISION 7B IS OPEN, AND THIS SCRIPT EXISTS TO CLOSE IT WITH EVIDENCE.
 *
 * `src/lib/lab-import/pdf-adapter.ts` sends a PDF to Anthropic as a native
 * `{type:"document"}` content block. Omniroute publishes `/v1/*` as
 * OpenAI-compatible and no `/v1/messages`, so that block has no direct
 * equivalent (finding N-19). Two candidate replacements were identified and
 * NEITHER can be chosen from documentation, because accepting a PDF is a
 * property of the ROUTED MODEL rather than of the gateway:
 *
 *   option (a)  an OpenAI `file` content part carrying a base64 data URL
 *   option (b)  `/v1/ocr` first, then the existing text transcription path
 *
 * THIS SCRIPT WRITES NOTHING AND CHANGES NOTHING. It is deliberately NOT an
 * implementation of either option: it reads `EXTRACTION_SYSTEM_PROMPT` and
 * `candidatesFromTranscript` from the existing lab-import module so that it
 * probes the real prompt and the real validator, and it does not add a single
 * line to that module. Implementing the winner is the lab-import half of U25,
 * which is blocked until this record exists.
 *
 * BOTH a text PDF and a scanned PDF, because they fail differently: a text PDF
 * can succeed on text extraction alone, while a scanned one needs the model to
 * actually see the page. A record covering only the first would answer the
 * easier question and read as though it answered both.
 *
 * NO SECRETS. The key is read from the environment and never printed.
 *
 *   npm run probe:labimport -- --text-pdf ./text.pdf --scanned-pdf ./scan.pdf
 *
 * `OMNIROUTE_*` settings load from a gitignored `.env.local` — names only are
 * reported, never values, and nothing outside that prefix is exported (§2.3
 * rule 14). An explicit shell value still wins over the file.
 *
 * The PDF paths are yours and are NOT committed: a real lab report is health
 * data (§2.3 rule 15). Point them anywhere outside the repository.
 */
import fs from "node:fs";
import { loadProbeEnv, summarise } from "./load-env";
import { completionsUrl } from "@/lib/omniroute/client";
import {
  candidatesFromTranscript,
  EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/lab-import/pdf-adapter";

// See the advisor probe: first statement in the body, before any env read.
const LOADED_ENV = loadProbeEnv();

const BASE_URL = process.env.OMNIROUTE_BASE_URL;
const API_KEY = process.env.OMNIROUTE_API_KEY;
const MODEL = process.env.OMNIROUTE_EXTRACTION_MODEL ?? "claude-haiku-4-5";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function line(label: string, value: unknown): void {
  console.log(`${label.padEnd(30)} ${String(value)}`);
}

function requireConfig(): { baseUrl: string; apiKey: string } {
  if (!BASE_URL || !API_KEY) {
    console.error(
      "OMNIROUTE_BASE_URL and OMNIROUTE_API_KEY must both be set.\n" +
        `Looked in .env.local and the shell — ${summarise(LOADED_ENV)}`,
    );
    process.exit(1);
  }
  return { baseUrl: BASE_URL, apiKey: API_KEY };
}

function authHeaders(apiKey: string): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
}

/**
 * Did the model produce something the EXISTING validator accepts?
 *
 * This is the question that matters, and it is stricter than "did the call
 * return 200". A transcription the schema rejects is an EXTRACTION_FAILED for
 * the user, so a probe that only reported the HTTP status would overstate
 * success — the failure mode this repository keeps finding in its own guards.
 */
function reportTranscript(rawText: string): void {
  line("response text length", rawText.length);
  try {
    const candidates = candidatesFromTranscript(rawText);
    line("adapterOutputSchema", `PASS — ${candidates.length} candidate(s)`);
    line("recognised markers", candidates.filter((c) => c.biomarkerId).length);
  } catch {
    line("adapterOutputSchema", "FAIL — output would be EXTRACTION_FAILED today");
    console.log("  first 200 chars:", JSON.stringify(rawText.slice(0, 200)));
  }
}

/** OPTION (a): the OpenAI `file` content part with a base64 data URL. */
async function probeFilePart(
  cfg: { baseUrl: string; apiKey: string },
  label: string,
  pdfPath: string,
): Promise<void> {
  console.log(`\n── OPTION (a) · file content part · ${label} ──`);
  const base64 = fs.readFileSync(pdfPath).toString("base64");
  line("pdf", pdfPath);
  line("base64 length", base64.length);

  const response = await fetch(completionsUrl(cfg.baseUrl), {
    method: "POST",
    headers: authHeaders(cfg.apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      stream: false,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: "lab-report.pdf",
                file_data: `data:application/pdf;base64,${base64}`,
              },
            },
            { type: "text", text: "Transcribe this lab report." },
          ],
        },
      ],
    }),
  });

  line("http status", response.status);
  if (!response.ok) {
    line("RESULT", "REJECTED — option (a) does not work for this model");
    console.log(
      "  Status alone is the finding. If it is 400, the model or gateway does not accept\n" +
        "  the `file` part; if 413, the PDF is too large and the size limit is the finding.",
    );
    return;
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  reportTranscript(body.choices?.[0]?.message?.content ?? "");
}

/**
 * OPTION (b): `/v1/ocr`, then the existing text path.
 *
 * The request shape for `/v1/ocr` is NOT documented in anything consulted while
 * planning U25 — the endpoint is listed, its body is not. So this sends the
 * most plausible JSON shape and REPORTS WHAT COMES BACK, including a 404 or a
 * 400. "The probe could not determine the shape" is a valid outcome and a
 * useful one; guessing and reporting success would not be.
 */
async function probeOcr(
  cfg: { baseUrl: string; apiKey: string },
  label: string,
  pdfPath: string,
): Promise<void> {
  console.log(`\n── OPTION (b) · /v1/ocr · ${label} ──`);
  const base64 = fs.readFileSync(pdfPath).toString("base64");
  const url = `${cfg.baseUrl.replace(/\/+$/, "")}/v1/ocr`;

  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(cfg.apiKey),
    body: JSON.stringify({
      model: MODEL,
      file: `data:application/pdf;base64,${base64}`,
    }),
  });

  line("http status", response.status);
  if (!response.ok) {
    line("RESULT", "unavailable or a different request shape — record the status");
    return;
  }

  const body = (await response.json()) as Record<string, unknown>;
  line("top-level keys", Object.keys(body).sort().join(", "));
  const text =
    typeof body.text === "string"
      ? body.text
      : typeof body.content === "string"
        ? body.content
        : "";
  line("extracted text length", text.length);
  if (text.length === 0) {
    console.log("  → no text field recognised; record the key list above verbatim.");
    return;
  }

  // Second leg: OCR text through the transcription prompt, which is exactly the
  // existing `extractFromText` path and needs no new code to work.
  const second = await fetch(completionsUrl(cfg.baseUrl), {
    method: "POST",
    headers: authHeaders(cfg.apiKey),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      stream: false,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });
  line("transcription status", second.status);
  if (!second.ok) return;
  const body2 = (await second.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  reportTranscript(body2.choices?.[0]?.message?.content ?? "");
}

async function main(): Promise<void> {
  const cfg = requireConfig();
  const textPdf = arg("text-pdf");
  const scannedPdf = arg("scanned-pdf");

  if (!textPdf) {
    console.error(
      "Usage: npm run probe:labimport -- --text-pdf <path> [--scanned-pdf <path>]\n\n" +
        "No PDF is committed to this repository: a real lab report is health data\n" +
        "(§2.3 rule 15), and a synthetic one would not answer the scanned case.",
    );
    process.exit(1);
  }

  console.log("Omniroute lab-import probe — OP-4(b), decision 7B");
  line("settings", summarise(LOADED_ENV));
  line("base URL host", new URL(cfg.baseUrl).host);
  line("model requested", MODEL);

  const targets: [string, string][] = [["TEXT PDF", textPdf]];
  if (scannedPdf) targets.push(["SCANNED PDF", scannedPdf]);
  else
    console.log(
      "\nNOTE: no --scanned-pdf given. The record will cover the EASIER half only,\n" +
        "and must say so — a scanned report is the case that needs model vision.",
    );

  for (const [label, pdfPath] of targets) {
    await probeFilePart(cfg, label, pdfPath);
    await probeOcr(cfg, label, pdfPath);
  }

  console.log("\nDone. Record this output in a dated copy of");
  console.log("docs/05-qa/omniroute-probe-record.template.md — decision 7B follows from it.");
}

main().catch((error: unknown) => {
  console.error("\nPROBE FAILED:", error);
  process.exit(1);
});
