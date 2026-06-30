"use client";

// Presentation — lab intake entry point (Design §5.3). Upload a CSV/PDF or paste
// a table; on extract, hands off to the LabReviewConfirm gate. Refreshes the
// timeline (router.refresh) after a successful commit.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLabImport } from "./useLabImport";
import { LabReviewConfirm } from "./LabReviewConfirm";

export function LabUpload() {
  const router = useRouter();
  const imp = useLabImport(() => router.refresh());
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  if (imp.phase === "review" || imp.phase === "committing") {
    return (
      <LabReviewConfirm
        rows={imp.rows}
        approvedCount={imp.approvedCount}
        committing={imp.phase === "committing"}
        error={imp.error}
        onSetRow={imp.setRow}
        onConfirm={imp.commit}
        onCancel={imp.reset}
      />
    );
  }

  const busy = imp.phase === "extracting";

  return (
    <div className="rounded-lg border border-dashed border-hairline p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.pdf,text/csv,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) imp.extractFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded bg-ink px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          {busy ? "Reading…" : "Upload report"}
        </button>
        <button
          type="button"
          onClick={() => setShowPaste((s) => !s)}
          className="text-sm text-body hover:text-ink"
        >
          Paste table
        </button>
        <span className="text-xs text-muted-soft">CSV or PDF, up to 5 MB</span>
      </div>

      {showPaste && (
        <div className="mt-3">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"One marker per line: name, value, unit\nVitamin D, 41, ng/mL"}
            rows={4}
            className="w-full rounded border border-hairline p-2 text-sm"
          />
          <button
            type="button"
            disabled={busy || paste.trim() === ""}
            onClick={() => imp.extractPaste(paste)}
            className="mt-2 rounded bg-surface-dark-elevated px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Parse pasted table
          </button>
        </div>
      )}

      {imp.error && <p className="mt-2 text-xs text-error">{imp.error}</p>}
    </div>
  );
}
