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
import { fail, handle, ok, reportInternalError, unauthorized } from "@/lib/api/respond";
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
    // API (now OpenAI via pdf-adapter — `@anthropic-ai/sdk` until U25, Omniroute
    // from U25 to U31) and had NEITHER of §4 rule 9's
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
        // [2026-09-22, P2-R1 / N-11] The REAL exception is reported here, and its
        // id is handed to `fail()`.
        //
        // `fail()` now logs every unexempt 5xx by construction, so this line is
        // not what makes the failure recorded — it is what makes the record
        // DIAGNOSTIC. Without it `fail()` synthesises a `DeclaredFailure` whose
        // message is a fixed string, and `pdf-adapter.ts` throws
        // `ExtractionError` for at least four distinct causes — non-JSON adapter
        // output, a schema failure, and two transcription paths, the last two
        // carrying a `cause`. All four would land as the same undistinguishable
        // line, which satisfies "one record was written" and defeats the reason
        // N-11 and Check finding P2-1 were raised: that a recorded 5xx can be
        // diagnosed afterwards.
        //
        // `reportInternalError` cannot be handed a client message — by
        // construction, so no call site can reopen the disclosure — and the
        // friendly text below is unchanged. §2.3 rule 13 holds: the client still
        // receives only the authored string plus an opaque id.
        return fail(
          "EXTRACTION_FAILED",
          "Extraction failed — try CSV or paste.",
          502,
          undefined,
          reportInternalError(e, "EXTRACTION_FAILED"),
        );
      }
      throw e;
    }
  });
}
