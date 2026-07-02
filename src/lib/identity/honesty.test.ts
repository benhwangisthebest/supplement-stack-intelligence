// Plan SC7 — identity copy must never leak diagnostic/directive language. Sweeps
// EVERY user-facing string this module can emit through lib/safety's banned-phrase
// guard. Mirrors the honesty sweeps of v2/v6/v7.
import { describe, expect, it } from "vitest";
import { getAllSupplements } from "@/lib/evidence";
import { containsBannedLanguage } from "@/lib/safety";
import type { IdentityContext } from "@/types/identity";
import {
  ARCHETYPES,
  ARCHETYPE_NAMES,
  EMERGING_DESCRIPTION,
  EMERGING_TAGLINE,
} from "./archetypes";
import { TRAIT_LABELS } from "./traits";
import { sharpenSuggestions } from "./confidence";
import { deriveStackArchetype, deriveSupplementArchetype, deriveUserIdentity } from "./index";

function ctx(partial: Partial<IdentityContext> = {}): IdentityContext {
  return { profile: null, stacks: [], hasLabs: false, ...partial };
}

const richCtx = ctx({
  profile: { goals: ["training", "sleep", "longevity"], riskTolerance: "moderate", experienceLevel: "advanced", filledFieldCount: 6 },
  stacks: [
    { stackId: "s1", name: "Training", intent: "training", itemSupplementIds: ["creatine", "magnesium"] },
    { stackId: "s2", name: "Sleep", intent: "sleep", itemSupplementIds: ["magnesium", "glycine"] },
    { stackId: "s3", name: "Experiments", intent: "experimental", itemSupplementIds: ["nac"] },
  ],
  hasLabs: true,
});

function collectAllCopy(): string[] {
  const out: string[] = [];

  // Taxonomy
  for (const a of ARCHETYPES) out.push(a.name, a.tagline, a.description);
  out.push(EMERGING_TAGLINE, EMERGING_DESCRIPTION, ...Object.values(ARCHETYPE_NAMES));
  out.push(...Object.values(TRAIT_LABELS));

  // Sharpen tips (empty + partial)
  out.push(...sharpenSuggestions(ctx()));
  out.push(...sharpenSuggestions(richCtx));

  // Supplement rationales (all seed)
  for (const s of getAllSupplements()) {
    const sa = deriveSupplementArchetype(s.id);
    out.push(sa.name, sa.rationale);
  }

  // User cards (emerging + rich)
  for (const c of [ctx(), richCtx]) {
    const card = deriveUserIdentity(c);
    out.push(card.name, card.tagline, card.disclaimer, ...card.sharpen);
    for (const t of card.traits) out.push(t.label, t.derivation);
    for (const sig of card.trail) {
      out.push(sig.label, sig.detail);
      if (sig.citation) out.push(sig.citation.label, sig.citation.detail ?? "");
    }
  }

  // Stack notes (real + empty)
  for (const stack of [...richCtx.stacks, { stackId: "e", name: "Empty", intent: "focus" as const, itemSupplementIds: [] }]) {
    out.push(deriveStackArchetype(stack, richCtx).note);
  }

  return out.filter((s) => s.length > 0);
}

describe("identity honesty sweep (Plan SC7)", () => {
  it("emits no banned/diagnostic language across all generated copy", () => {
    const offenders = collectAllCopy().filter((s) => containsBannedLanguage(s));
    expect(offenders).toEqual([]);
  });

  it("covers a non-trivial amount of copy", () => {
    expect(collectAllCopy().length).toBeGreaterThan(40);
  });
});
