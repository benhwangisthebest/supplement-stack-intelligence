// Application — POST /api/lab-import/extract (Design §4.2).
// SAFETY-CRITICAL: this handler NEVER writes to the database. It imports no repo
// and only parses/transcribes the upload into review candidates. The confirm
// gate lives between this and /commit. (L1 test asserts row counts are unchanged.)
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { parseCsv } from "@/lib/lab-import/csv";
import { parsePaste } from "@/lib/lab-import/paste";
import { extractFromPdf, ExtractionError } from "@/lib/lab-import/pdf-adapter";
import { columnMapSchema } from "@/lib/lab-import/schema";
import type { ParsedMarkerCandidate } from "@/types/lab";
import { fail, handle, ok, unauthorized } from "@/lib/api/respond";
import { enforceRateLimit } from "@/lib/api/rate-limit-guard";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB cap (Design §7)

/**
 * Phase 2 U7 (§4 rule 9). PAID_API_BUDGET found this missing the moment it was
 * written: the route had U5's rate limit but no ceiling on a single request.
 * A native-PDF transcription is the slowest paid call in the product, and an
 * unbounded one runs until the platform's default kills it — billable the whole
 * way. Unlike the advisor there is no token ledger to reserve against (one
 * upload, one call), so wall-clock IS the budget control here.
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();

    // Phase 2 U5, closing half of finding N-1: this route calls a paid external
    // API (now Omniroute via pdf-adapter; `@anthropic-ai/sdk` until U25's
    // lab-import half) and had NEITHER of §4 rule 9's
    // two required controls. The limit is counted before the upload is even
    // read, so a refused request costs no parsing and no transcription.
    const limited = await enforceRateLimit("lab-import-extract", user.id, request);
    if (limited) return limited;

    const contentType = request.headers.get("content-type") ?? "";

    // --- Paste path: JSON { kind:"paste", text, columnMap } ---
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        kind?: string;
        text?: string;
        columnMap?: unknown;
      };
      if (body.kind !== "paste" || typeof body.text !== "string") {
        return fail("VALIDATION_ERROR", "Expected { kind:'paste', text, columnMap }.", 400);
      }
      const columnMap = columnMapSchema.parse(body.columnMap);
      const candidates = parsePaste(body.text, columnMap);
      return ok({ source: "paste", candidates, unreadable: false });
    }

    // --- File path: multipart with a CSV or PDF ---
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("VALIDATION_ERROR", "No file provided.", 400);
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return fail("VALIDATION_ERROR", "File is empty or exceeds the 5 MB limit.", 400);
    }

    const name = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isCsv =
      file.type === "text/csv" || name.endsWith(".csv") || file.type === "text/plain";

    try {
      let candidates: ParsedMarkerCandidate[];
      let source: "csv" | "pdf";
      if (isCsv) {
        candidates = parseCsv(await file.text());
        source = "csv";
      } else if (isPdf) {
        const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
        candidates = await extractFromPdf(base64);
        source = "pdf";
      } else {
        return fail("VALIDATION_ERROR", "Unsupported file type (use CSV or PDF).", 400);
      }
      return ok({ source, candidates, unreadable: false });
    } catch (e) {
      if (e instanceof ExtractionError) {
        if (e.code === "UNREADABLE_DOCUMENT") {
          return fail("UNREADABLE_DOCUMENT", "Couldn't read this file — try CSV or paste.", 422);
        }
        return fail("EXTRACTION_FAILED", "Extraction failed — try CSV or paste.", 502);
      }
      throw e;
    }
  });
}
