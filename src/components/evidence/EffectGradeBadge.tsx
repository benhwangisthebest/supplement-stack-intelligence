import type { Confidence, EvidenceGrade } from "@/types";

// Design §5.3 — renders an effect-level evidence grade (A–D) + confidence.
// Effect-level grading is the trust layer (Plan §3.1, Design §1.1).

const GRADE_STYLES: Record<EvidenceGrade, string> = {
  A: "bg-emerald-100 text-emerald-800 border-emerald-200",
  B: "bg-sky-100 text-sky-800 border-sky-200",
  C: "bg-amber-100 text-amber-800 border-amber-200",
  D: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

const GRADE_LABEL: Record<EvidenceGrade, string> = {
  A: "Strong",
  B: "Moderate",
  C: "Limited",
  D: "Preliminary",
};

export function EffectGradeBadge({
  grade,
  confidence,
}: {
  grade: EvidenceGrade;
  confidence?: Confidence;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${GRADE_STYLES[grade]}`}
      title={`Evidence grade ${grade} — ${GRADE_LABEL[grade]}${
        confidence ? ` · ${confidence} confidence` : ""
      }`}
    >
      <span className="font-semibold">{grade}</span>
      <span>{GRADE_LABEL[grade]}</span>
      {confidence && <span className="text-[10px] opacity-70">· {confidence}</span>}
    </span>
  );
}
