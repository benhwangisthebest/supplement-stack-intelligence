// The advisor probe's step-3 tool result, built by production code (Phase 4 U4, N-26).
//
// ---------------------------------------------------------------------------
// WHAT N-26 WAS
// ---------------------------------------------------------------------------
// Step 3 used to answer every tool call with `{ ok: true, data: { note: "probe
// fixture" }, citations: [] }`, under a system prompt that forbids answering from
// anything but tool results. An empty second step was then ambiguous by
// construction: a model obeying the prompt and a broken round trip read the
// same. A model-viability verdict was published from that reading and later
// withdrawn (docs/05-qa/2026-08-10-deployed-migration-record.md §4).
//
// ---------------------------------------------------------------------------
// WHAT "ANSWERABLE" MEANS HERE
// ---------------------------------------------------------------------------
// N-26's remedy: the fixture must carry "a plausible interaction finding with a
// citation", so that an empty answer means something. This result is the REAL
// `checkInteractions` handler, run over the synthetic `makeContext()` user with
// zinc added to its stack. It carries the seeded `magnesium--zinc` rule, which
// answers TOOL_BAIT directly, and that rule's own citation. Nothing in it is
// written here, so no provenance is authored (§2.2 rule 8).
//
// It is sent for EVERY tool call, whatever the model chose, as the old fixture
// was: step 3 probes transport and protocol, not tool choice. What changed is
// that an obedient model now has something to say.
//
// It is PURE and makes no call, so `first-party-base-url.test.ts` checks it
// without network. It is health-shaped synthetic data; the probe never prints it.
import { makeContext } from "@/lib/advisor/mock-adapter";
import { checkInteractions } from "@/lib/advisor/tools";
import type { ToolResult } from "@/types/advisor";

/** A question that should make a grounded advisor reach for a tool. */
export const TOOL_BAIT = "Is there an interaction between magnesium and zinc?";

/** The two supplement ids TOOL_BAIT asks about; an answerable result names both. */
export const BAIT_SUPPLEMENTS = ["magnesium", "zinc"] as const;

/** The synthetic user, with zinc added beside the magnesium already in its stack. */
function probeContext() {
  const ctx = makeContext();
  const magnesium = ctx.stackItems.find((i) => i.supplementId === "magnesium");
  if (!magnesium) throw new Error("makeContext() no longer carries magnesium; see N-26.");
  const zinc = { ...magnesium, id: "si-probe-zinc", supplementId: "zinc", dose: 15, unit: "mg" };
  return { ...ctx, stackItems: [...ctx.stackItems, zinc] };
}

/** The result step 3 sends back for every tool call. */
export function probeToolResult(): ToolResult {
  return checkInteractions.handler({}, probeContext()) as ToolResult;
}
