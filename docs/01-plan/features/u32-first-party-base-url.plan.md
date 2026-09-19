# u32-first-party-base-url — PDCA cycle artifact for Phase 2 unit U32

> **THIS DOCUMENT IS SUBORDINATE.** It is the bkit PDCA cycle artifact for unit **U32** of the
> **approved** Phase 2 plan, `docs/01-plan/phase-2-operational-dependability.plan.md` (rank 5 in
> `CLAUDE.md` §6). That plan's U32 entry is the authoritative record. This file carries **no approval
> status of its own**. If the two disagree, the Phase 2 entry wins.
>
> **This artifact MIRRORS the register; it does not replace it.** Every finding this unit raises is
> registered in the Phase 2 plan's §4.5 in this unit's own commit — the standing rule from the owner's
> ruling of 2026-09-18, written after U31 registered eleven findings in its artifact alone.
>
> **Project**: Supplement Stack Intelligence Platform
> **Unit**: U32 · N-63 (host pin + logged override) · N-64 (`.gitignore`) · N-65 (template + pointers)
> **Date**: 2026-09-18
> **Status**: cycle artifact — subordinate to the approved Phase 2 plan (no status of its own).
> The plan block itself is **AWAITING OWNER APPROVAL**; nothing here authorises implementation.
> **Method**: bkit PDCA (plan → design → do → check → report), driven from the Phase 2 entry

---

## Executive Summary

| Perspective | Content |
|---|---|
| **Problem** | N-63: `OPENAI_BASE_URL` is documented as first-party and validated as nothing. Any host the environment names receives the advisor's prompts — which carry health context — and the lab-import PDF. The only thing making the provider "first-party" today is a sentence in `.env.example`, and OP-5 cannot be discharged against a sentence. |
| **Solution** | A pure `assertFirstPartyBaseUrl` in the paid client, called at the one chokepoint both paid paths already pass through, plus the pre-flight that keeps the failure a 503. An escape hatch (`OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL=1`) stays, logged once per server process with the host. N-64 and N-65 fold in. |
| **Function/UX Effect** | **Declared behaviour change:** a deployment whose `OPENAI_BASE_URL` host is not `api.openai.com`, and which sets no override, answers **503 `AI_SERVICE_NOT_CONFIGURED`** on both paid routes instead of dialling that host. With the override set, behaviour is unchanged plus one log line. |
| **Core Value** | The claim "first-party" becomes a property of the code rather than of a comment. It is **not** a network control and **not** a defence against a hostile deployer — see the stated non-coverage in the Phase 2 entry. |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | N-63 (`ecc:security-reviewer` on the U31 diff) and **OP-5's precondition**. |
| **WHO** | Both paid routes, both probe scripts, and whoever writes the OP-5 record. |
| **RISK** | A host check that reads like taint analysis and is not; and a failure that moves from pre-flight to mid-call if only the client is guarded. |
| **SUCCESS** | Six mutations shown red; four gate commands green; the refusal observable at pre-flight, not mid-stream. |
| **SCOPE** | `src/lib/openai/client.ts`, `src/app/api/advisor/route.ts` (pre-flight), both probes, `.gitignore`, `.env.example`, the probe-record template, one new architecture spec. |

## 1–7. See the Phase 2 plan's U32 entry (grep `U32 PLAN`). Everything here restates it and adds nothing.
