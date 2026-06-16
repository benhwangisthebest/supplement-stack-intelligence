"use client";

// Presentation hook — drives extract → review → commit (Design §5.3).
// The confirm gate lives in the UI: extracted candidates are held in local state
// and only POSTed to /commit after the user approves them.
import { useState } from "react";
import type { ParsedMarkerCandidate } from "@/types/lab";

export interface ReviewRow extends ParsedMarkerCandidate {
  approved: boolean;
}

type Phase = "idle" | "extracting" | "review" | "committing";

export function useLabImport(onCommitted?: () => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [source, setSource] = useState<string>("csv");
  const [error, setError] = useState<string | null>(null);

  function toRows(candidates: ParsedMarkerCandidate[]): ReviewRow[] {
    // Pre-approve confidently parsed markers; leave low-confidence ones unchecked.
    return candidates.map((c) => ({ ...c, approved: c.confidence === "high" }));
  }

  async function extractFile(file: File) {
    setError(null);
    setPhase("extracting");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/lab-import/extract", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Couldn't read this file.");
        setPhase("idle");
        return;
      }
      setSource(json.data.source);
      setRows(toRows(json.data.candidates));
      setPhase("review");
    } catch {
      setError("Upload failed. Try CSV or paste.");
      setPhase("idle");
    }
  }

  // Paste path: rows are "marker, value, unit" (the default column map).
  async function extractPaste(text: string) {
    setError(null);
    setPhase("extracting");
    try {
      const res = await fetch("/api/lab-import/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "paste",
          text,
          columnMap: { marker: 0, value: 1, unit: 2 },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Couldn't parse the pasted text.");
        setPhase("idle");
        return;
      }
      setSource("paste");
      setRows(toRows(json.data.candidates));
      setPhase("review");
    } catch {
      setError("Paste failed.");
      setPhase("idle");
    }
  }

  function setRow(i: number, patch: Partial<ReviewRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function reset() {
    setRows([]);
    setError(null);
    setPhase("idle");
  }

  async function commit(collectedAt: string) {
    const approved = rows.filter((r) => r.approved);
    if (approved.length === 0) return;
    setPhase("committing");
    setError(null);
    try {
      const res = await fetch("/api/lab-import/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          collectedAt,
          source,
          markers: approved.map((r) => ({
            rawLabel: r.rawLabel,
            value: r.value,
            unit: r.unit,
            referenceLow: r.referenceLow,
            referenceHigh: r.referenceHigh,
          })),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "Couldn't save.");
        setPhase("review");
        return;
      }
      reset();
      onCommitted?.();
    } catch {
      setError("Save failed.");
      setPhase("review");
    }
  }

  return {
    phase,
    rows,
    error,
    approvedCount: rows.filter((r) => r.approved).length,
    extractFile,
    extractPaste,
    setRow,
    commit,
    reset,
  };
}
