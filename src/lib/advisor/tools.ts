// Domain layer — PURE. The 6 advisor tools: thin wrappers over existing engines.
// Design Ref: §3.2 — tool handlers add NO business logic; they call v1–v5 pure
// engines and shape the result + provenance. Engines remain the source of truth.
// Plan SC-1: 6-tool registry. SC-5: every result carries Citation[].
import {
  defaultLibrary,
  effectComposite,
  getEffectsForSupplement,
  getPapersForEffect,
  getSupplementBySlug,
  searchSupplements,
} from "@/lib/evidence";
import { evaluateStack } from "@/lib/stack-evaluator";
import { findInteractions } from "@/lib/interactions";
import { assessLabMarkers } from "@/lib/biomarkers";
import { computeTrends } from "@/lib/lab-trends";
import { curatedWatchList } from "@/lib/side-effects";
import { sideEffectLabel } from "@/lib/side-effects/vocab";
import type { SideEffectFinding } from "@/types/side-effect";
import type {
  AdvisorContext,
  AdvisorTool,
  Citation,
  ToolResult,
} from "@/types/advisor";
import type { Effect, Supplement } from "@/types";
import type { InteractionFinding } from "@/types/interaction";
import type { LabFinding } from "@/types/biomarker";
import type { TrendSignal } from "@/types/lab";

// Helper: ok result with provenance.
function ok<O>(data: O, citations: Citation[]): ToolResult<O> {
  return { ok: true, data, citations };
}
// Helper: grounding-absent result — drives the honest refusal path (SC-3).
function empty<O>(emptyReason: string): ToolResult<O> {
  return { ok: false, data: null, emptyReason, citations: [] };
}

// ---- supplement name lookup (for labelling stack supplements in citations) ----
function supplementName(id: string): string {
  return (
    defaultLibrary.supplements.find((s) => s.id === id)?.name ?? id
  );
}

// 1) searchLibrary — find supplements/effects by free-text. Wraps lib/evidence.
interface SearchInput {
  query: string;
}
interface EffectView {
  effectId: string;
  name: string;
  outcomeCategory: string;
  grade: string;
  composite: number | null;
  summary: string;
  relevantPopulation: string;
}
interface SearchHit {
  supplementId: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  effects: EffectView[];
}

function effectView(e: Effect): EffectView {
  return {
    effectId: e.id,
    name: e.name,
    outcomeCategory: e.outcomeCategory,
    grade: e.grade,
    composite: effectComposite(e),
    summary: e.summary,
    relevantPopulation: e.relevantPopulation,
  };
}

function hitFor(s: Supplement): SearchHit {
  const effects = getEffectsForSupplement(s.id);
  return {
    supplementId: s.id,
    slug: s.slug,
    name: s.name,
    category: s.category,
    description: s.description,
    effects: effects.map(effectView),
  };
}

export const searchLibrary: AdvisorTool<SearchInput, SearchHit[]> = {
  name: "searchLibrary",
  description:
    "Search the supplement Library by name or alias. Returns matched supplements with their effect-level evidence grades and summaries. Use for 'what is X', 'what's the evidence for X', 'which supplements help with Y'.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Supplement name, alias, or keyword." },
    },
    required: ["query"],
  },
  handler: (input) => {
    const matches = searchSupplements(input.query ?? "");
    if (matches.length === 0) {
      return empty(`No Library supplement matched "${input.query}".`);
    }
    // Cap to keep the model focused; Library search is ranked by the engine order.
    const top = matches.slice(0, 5).map(hitFor);
    const citations: Citation[] = top.flatMap((h) =>
      h.effects.map((e) => ({
        kind: "effect-grade" as const,
        refId: e.effectId,
        label: `${h.name} → ${e.name}, Grade ${e.grade}`,
        detail: e.relevantPopulation,
      })),
    );
    return ok(top, citations);
  },
};

// 2) getSupplement — full detail for one supplement by slug. Wraps lib/evidence.
interface GetSupplementInput {
  slug: string;
}
interface SupplementDetail extends SearchHit {
  aliases: string[];
  mechanismSummary: string;
  sideEffects: string[];
  contraindications: string[];
  allergenTags: string[];
  papers: { id: string; title: string }[];
}

export const getSupplement: AdvisorTool<GetSupplementInput, SupplementDetail> = {
  name: "getSupplement",
  description:
    "Get the full detail page for one supplement by its slug: effects + grades, mechanism, side effects, contraindications, allergens, and the papers behind its effects.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "The supplement slug, e.g. 'creatine'." },
    },
    required: ["slug"],
  },
  handler: (input) => {
    const supp = getSupplementBySlug(input.slug ?? "");
    if (!supp) return empty(`No supplement with slug "${input.slug}".`);
    const effects = getEffectsForSupplement(supp.id);
    const papers = effects
      .flatMap((e) => getPapersForEffect(e))
      .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
      // v13 (evidence-disclosure): year/studyType removed. A grounded tool's output is
      // restated by the model as sourced fact, so recalled citation metadata was the
      // most damaging place fabricated provenance could surface. Plan SC: SC-5
      .map((p) => ({ id: p.id, title: p.title }));
    const detail: SupplementDetail = {
      ...hitFor(supp),
      aliases: supp.aliases,
      mechanismSummary: supp.mechanismSummary,
      sideEffects: supp.sideEffects,
      contraindications: supp.contraindications,
      allergenTags: supp.allergenTags,
      papers,
    };
    const citations: Citation[] = [
      ...detail.effects.map((e) => ({
        kind: "effect-grade" as const,
        refId: e.effectId,
        label: `${supp.name} → ${e.name}, Grade ${e.grade}`,
      })),
      ...papers.map((p) => ({
        kind: "paper" as const,
        refId: p.id,
        label: p.title,
        detail: "Illustrative evidence summary",
      })),
    ];
    return ok(detail, citations);
  },
};

// 3) evaluateStack — run the evaluator on the user's active stack. Wraps lib/stack-evaluator.
type EvaluateInput = Record<string, never>;
export const evaluateStackTool: AdvisorTool<EvaluateInput, ReturnType<typeof evaluateStack>> = {
  name: "evaluateStack",
  description:
    "Evaluate the user's CURRENT stack against their profile and labs. Returns flags (evidence-fit, dose, redundancy, interactions, lab-relevance, goal alignment) with a severity summary. Use for 'review my stack', 'is my stack sensible'.",
  inputSchema: { type: "object", properties: {} },
  handler: (_input, ctx) => {
    if (!ctx.stack || ctx.stackItems.length === 0) {
      return empty("The user has no active stack with items to evaluate.");
    }
    const result = evaluateStack({
      stack: ctx.stack,
      items: ctx.stackItems,
      profile: ctx.profile,
      labMarkers: ctx.labMarkers,
    });
    const citations: Citation[] = result.flags.map((f) => ({
      kind: "stack-eval" as const,
      refId: `${f.category}:${f.stackItemId ?? "stack"}`,
      label: f.title,
      detail: f.category,
    }));
    return ok(result, citations);
  },
};

// 4) checkInteractions — meds × stack. Wraps lib/interactions.
type InteractionsInput = Record<string, never>;
export const checkInteractions: AdvisorTool<InteractionsInput, InteractionFinding[]> = {
  name: "checkInteractions",
  description:
    "Check interactions between the user's medications and the supplements in their stack (and supplement↔supplement pairs). Returns findings with severity. Use for 'is my stack safe with my meds'. Absence of a finding never means safe.",
  inputSchema: { type: "object", properties: {} },
  handler: (_input, ctx) => {
    const medications = ctx.profile?.medications ?? [];
    if (ctx.stackItems.length === 0) {
      return empty("The user has no stack items to check interactions for.");
    }
    if (medications.length === 0) {
      return empty("The user's profile lists no medications to check against.");
    }
    const findings = findInteractions({ medications, stackItems: ctx.stackItems });
    if (findings.length === 0) {
      return empty(
        "No interactions matched between the listed medications and stack — but the dataset is limited, so this does not imply the combination is safe.",
      );
    }
    const citations: Citation[] = findings.map((f) => ({
      kind: "interaction-rule" as const,
      refId: f.ruleId,
      label: `${supplementName(f.supplementId)} ↔ ${f.counterpart} (${f.severity})`,
      detail: f.mechanism,
    }));
    return ok(findings, citations);
  },
};

// 5) biomarkerFindings — labs × stack relevance. Wraps lib/biomarkers.
type BiomarkerInput = Record<string, never>;
export const biomarkerFindings: AdvisorTool<BiomarkerInput, LabFinding[]> = {
  name: "biomarkerFindings",
  description:
    "Find where the user's out-of-range lab markers are relevant (support or caution) to supplements in their stack. Use for 'do my labs support my stack', 'any lab concerns'.",
  inputSchema: { type: "object", properties: {} },
  handler: (_input, ctx) => {
    if (ctx.stackItems.length === 0) {
      return empty("The user has no stack items to assess against labs.");
    }
    if (ctx.labMarkers.length === 0) {
      return empty("The user has no lab markers on file.");
    }
    const findings = assessLabMarkers({
      labMarkers: ctx.labMarkers,
      stackItems: ctx.stackItems,
    });
    if (findings.length === 0) {
      return empty(
        "No out-of-range markers matched a relevance rule for the current stack.",
      );
    }
    const citations: Citation[] = findings.map((f) => ({
      kind: "biomarker-rule" as const,
      refId: f.ruleId,
      label: `${f.biomarkerName} (${f.status}) → ${supplementName(f.supplementId)} [${f.relation}]`,
      detail: f.rationale,
    }));
    return ok(findings, citations);
  },
};

// 6) labTrends — per-marker trajectory across panels. Wraps lib/lab-trends.
type LabTrendsInput = Record<string, never>;
export const labTrends: AdvisorTool<LabTrendsInput, TrendSignal[]> = {
  name: "labTrends",
  description:
    "Compute the trajectory (rising/falling/stable) of the user's lab markers over time, in canonical units. Use for 'how are my labs trending', 'is my vitamin D improving'.",
  inputSchema: { type: "object", properties: {} },
  handler: (_input, ctx) => {
    if (ctx.timelinePoints.length === 0) {
      return empty("The user has no canonicalized lab timeline points.");
    }
    const trends = computeTrends(ctx.timelinePoints);
    // A trend with only one point is "insufficient" — keep it (it's honest data),
    // but if EVERY marker is insufficient, treat as no usable trend grounding.
    const usable = trends.filter((t) => t.direction !== "insufficient");
    if (usable.length === 0) {
      return empty(
        "There isn't enough lab history yet to compute a trend (need at least two dated panels per marker).",
      );
    }
    const citations: Citation[] = trends.map((t) => ({
      kind: "lab-trend" as const,
      refId: t.biomarkerId,
      label: `${t.biomarkerName}: ${t.direction}${t.pctChange !== null ? ` (${Math.round(t.pctChange)}%)` : ""}`,
      detail: t.windowDays !== null ? `over ${t.windowDays} days` : undefined,
    }));
    return ok(trends, citations);
  },
};

// 7) sideEffectWatch — curated commonly-reported effects for the user's stack.
// side-effect-engine v11. Read-only, correlational, grounded in stackItems only.
type SideEffectInput = Record<string, never>;
export const sideEffectWatch: AdvisorTool<SideEffectInput, SideEffectFinding[]> = {
  name: "sideEffectWatch",
  description:
    "List the commonly-reported side-effects to watch for the supplements in the user's stack, with how frequently they're reported. Use for 'what side effects should I watch for', 'any common side effects in my stack'. Educational + correlational — never a prediction or diagnosis.",
  inputSchema: { type: "object", properties: {} },
  handler: (_input, ctx) => {
    if (ctx.stackItems.length === 0) {
      return empty("The user has no stack items to check for reported side-effects.");
    }
    const findings = curatedWatchList(ctx.stackItems);
    if (findings.length === 0) {
      return empty(
        "No curated side-effect profile matched the supplements in the current stack.",
      );
    }
    const citations: Citation[] = findings.map((f) => ({
      kind: "side-effect" as const,
      refId: `${f.supplementId}:${f.label}`,
      label: `${supplementName(f.supplementId)}: ${sideEffectLabel(f.label)} (${f.frequencyTier})`,
    }));
    return ok(findings, citations);
  },
};

/** The model's callable surface (Design §3.2). Read-only profile/stack/labs are
 *  pre-loaded into AdvisorContext, NOT exposed here. */
export const ADVISOR_TOOLS: AdvisorTool[] = [
  // Each tool keeps a precise input type for call-site ergonomics + tests; the
  // registry erases it (the model supplies an untyped record the handler reads).
  searchLibrary as unknown as AdvisorTool,
  getSupplement as unknown as AdvisorTool,
  evaluateStackTool as unknown as AdvisorTool,
  checkInteractions as unknown as AdvisorTool,
  biomarkerFindings as unknown as AdvisorTool,
  labTrends as unknown as AdvisorTool,
  sideEffectWatch as unknown as AdvisorTool,
];

/** Lookup a tool by name (used by the agent loop to dispatch model tool calls). */
export function toolByName(name: string): AdvisorTool | undefined {
  return ADVISOR_TOOLS.find((t) => t.name === name);
}
