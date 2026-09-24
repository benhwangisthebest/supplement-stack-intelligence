// SERVER-SIDE props builder for DailyCheckinForm (Phase 3 U9 (b), CLAUDE.md §4
// rule 7). The Stack Lab page calls it and passes the result as a prop, so the
// client form imports nothing from src/lib at runtime. Client modules may import
// this file's TYPES only; a runtime import is a CLIENT_TAKES_PROPS failure.
import { checkinCopy } from "@/lib/safety";
import { sideEffectLabel } from "@/lib/side-effects/vocab";
import { SIDE_EFFECT_VOCAB, type CanonicalSideEffect } from "@/types/side-effect";

export interface CheckinFormCopy {
  sideEffectDisclaimer: string;
  /** Display label per canonical effect — total over SIDE_EFFECT_VOCAB. */
  sideEffectLabels: Readonly<Record<CanonicalSideEffect, string>>;
}

export function checkinFormCopy(): CheckinFormCopy {
  return {
    sideEffectDisclaimer: checkinCopy.sideEffectDisclaimer,
    sideEffectLabels: Object.fromEntries(
      SIDE_EFFECT_VOCAB.map((v) => [v, sideEffectLabel(v)]),
    ) as Record<CanonicalSideEffect, string>,
  };
}
