# OP-4 — Omniroute live probe record — 2026-08-10

**Status: COMPLETE. Decision 7B is ruled from this record — option (a).**

This is the dated artifact OP-4 owes. Ruling 3 (2026-08-08) refuses live credentials in a public
repository, so every claim about the live gateway has to come from a record a person produced against a
real key. This is that record. Nothing here was inferred from documentation.

**No secret appears in this file.** The gateway host is recorded without a path; the key is never printed
by the probes and is not reproduced here. The probes read `OMNIROUTE_*` from a gitignored `.env.local`
through an allowlisting loader, so the Supabase service-role key in the same file never entered the probe
process (verified separately: `SUPABASE_SERVICE_ROLE_KEY` unset after load).

| | |
|---|---|
| **Date (UTC)** | 2026-08-10 |
| **Run by** | repository owner (runs 1–2), and the agent under the owner's explicit authorization (runs 3–5) |
| **Commit** | `95f2ed2` (`feat/u25-omniroute-advisor`) |
| **Gateway host** | `localhost:20128` — a **local, self-hosted** OmniRoute instance |
| **Probe scripts** | `scripts/probes/omniroute-advisor-probe.ts`, `scripts/probes/omniroute-labimport-probe.ts` |

> **The gateway is a local developer instance.** Every conclusion below is a property of THAT instance's
> routing table at THAT moment. Model ids, alias behaviour, and `/v1/ocr` availability are all
> instance-specific — see **N-21** for the defect this exact confusion already caused, and **OP-5** for the
> production-provider condition that is NOT settled by this record.

---

## 0. Runs in this record

| # | Requested id | Source | Echoed by gateway | Verdict |
|---|---|---|---|---|
| 1 | `cc/claude-haiku-4-5-20251001` | probe default | `claude-haiku-4-5-20251001` | **PASS — all clauses** (owner) |
| 2 | `auto/best-chat` | `OMNIROUTE_MODEL` | `claude-opus-4-6-thinking` | **NOT ADOPTED** — empty second-step text (owner) |
| 3 | `cc/claude-haiku-4-5-20251001` | probe default | `claude-haiku-4-5-20251001` | **PASS — all clauses** (agent, reproduces run 1) |
| 4 | `auto/best-free` | `OMNIROUTE_MODEL` | `gemini-3.6-flash-high` | **NOT VIABLE** — empty second-step text |
| 5 | `cc/claude-haiku-4-5-20251001` | probe default | *(lab-import; not echoed by this probe)* | **Option (a) PASS on both PDFs** |

**The requested id and the echoed id differ in every single run.** `cc/…` echoes back unprefixed;
`auto/…` echoes an entirely different vendor. This is not cosmetic — it is the concrete form of N-21's
general fact, that a model id belongs to the gateway instance rather than to the protocol, and it is why
`src/` now carries no default at all.

---

## 1. OP-4(a) — does the routed model report `usage`?

**YES, on every response, in every run.** This settles **M16's absent-usage semantics against reality
rather than against a README.**

| | Run 3 (`cc/claude-haiku…`) | Run 4 (`auto/best-free`) |
|---|---|---|
| HTTP status | 200 | 200 |
| Top-level keys | `choices, created, id, model, object, usage` | `choices, created, id, model, object, usage` |
| `usage` present | **YES** | **YES** |
| `usage` keys | `completion_tokens, prompt_tokens, total_tokens` | `completion_tokens, prompt_tokens, total_tokens` |
| `prompt_tokens` | `number 28` | `number 84` |
| `completion_tokens` | `number 4` | `number 1` |
| Through `readUsage` | `{"inputTokens":28,"outputTokens":4}` | `{"inputTokens":84,"outputTokens":1}` |
| `usageReported` after both tool steps | **true** | **true** |

`readUsage` agreed with the raw body in both runs — it is not stricter than the gateway.

### What this does and does NOT license

**It does not license removing the `| null` handling.** The measured fact is "this instance, these two
routes, on this date". `usage` being absent remains possible behind a router that can serve a turn from
any provider — run 4 proves a single alias reaches an entirely different vendor — and the cost of being
wrong is asymmetric: absent-as-zero releases a reservation for a turn that really spent money, and the
daily budget silently stops binding while every test stays green. The `null` path stays, now with a
recorded reason rather than a hypothesis.

The same prompt cost **28** input tokens on one route and **84** on another. Tokenisers differ per
provider, so a token-denominated budget means different things per route — this is **N-18**, already
registered, and this record is the first measurement supporting it.

---

## 2. OP-4(c) — does the tool round trip work against the real gateway?

**YES on `cc/claude-haiku-4-5-20251001`. NO on both `auto/*` aliases tested.**

| | Run 3 `cc/claude-haiku…` | Run 4 `auto/best-free` | Run 2 `auto/best-chat` (owner) |
|---|---|---|---|
| Echoed model | `claude-haiku-4-5-20251001` | `gemini-3.6-flash-high` | `claude-opus-4-6-thinking` |
| Tools offered | 7 | 7 | 7 |
| Tool calls returned | **2** | **2** | ≥1 |
| Tool names | `searchLibrary, searchLibrary` | `searchLibrary, searchLibrary` | — |
| Arguments parsed to objects | `[{"query":"magnesium"},{"query":"zinc"}]` | `[{"query":"magnesium"},{"query":"zinc"}]` | — |
| **Second step produced text** | **YES** | **NO** | **NO** |
| `usageReported` after step 2 | true | true | — |

**Run 3 is the whole of OP-4(c) passing.** A non-empty second-step answer proves the gateway accepted the
protocol migration end to end: an `assistant` message carrying `tool_calls`, followed by one
`{role:"tool", tool_call_id}` message per call. That is the exact rewrite U25 performed, verified against
the real gateway rather than against a mock written from the same reading of the spec as the code.

The multi-call shape is worth noting: the model issued **two parallel `searchLibrary` calls** in one step,
and `buildToolResultMessages` produced one `tool` message per call. The aggregate-into-one-message form
(mutation M17) would have been accepted by no test fixture as convincingly as this.

### Finding — empty second-step text on `auto/*` aliases (both tested)

Two different aliases, routed to two different vendors — `claude-opus-4-6-thinking` and
`gemini-3.6-flash-high` — produced tool calls with correctly parsed arguments and then **an empty second
step**. The initial hypothesis from run 2 was that this is specific to *thinking* routes; run 4 weakens
that, since a Gemini "flash-high" route did the same. **Unresolved, and deliberately not chased here**
— it is an alias/routing behaviour of a gateway instance, not application code.

**Registered as N-22. Not absorbed, and not worked around in `src/`.** An empty answer after a successful
tool loop is the worst possible failure shape for this product: the safety and grounding gates all pass on
an empty string, so it would surface as a confident blank rather than an error.

---

## 3. Model policy — what this record adopts

**Nothing is adopted into `src/`.** Per N-21's fix, the routed id is env-only and `src/` carries no
default; that property is guarded by `NO_PINNED_MODEL_ID` and is not relaxed by this record.

| Id | Verdict |
|---|---|
| **`cc/claude-haiku-4-5-20251001`** | **The pinned production/env default.** Passes every clause: usage on both steps, tool round trip with non-empty second-step text, tool-capable echoed model |
| `auto/best-free` | **NOT viable, not even for dev.** Fails the second-step-text clause of the item-3 test. Recorded here so the question is not re-asked from documentation |
| `auto/best-chat` | **NOT adopted** (owner, run 2). Same failure |

---

## 4. OP-4(b) — decision 7B: how does a PDF reach an OpenAI-compatible endpoint?

### Fixtures — synthetic, and how they were built

**No real health data was used.** `CLAUDE.md` §2.3 rule 15. Both fixtures were generated for this record,
live outside the repository, and are **not committed**.

| | `text.pdf` | `scan.pdf` |
|---|---|---|
| Built by | `cupsfilter` from a synthetic report | that PNG → JPEG → hand-assembled single-image PDF |
| Size | 20,952 B | 221,023 B |
| Font objects | present | **0** |
| Text-showing operators (`Tj`/`TJ`) | **62** | **0** |
| Image | none | one `/DCTDecode` JPEG, 1313×1700 |
| Text extractable | **YES** — `SYNTHETIC`, `Ferritin`, `Vitamin D`, `22.4`, `ng/mL`, `TSH` all recovered from the decompressed streams | **NO — impossible by construction** |

The document is a fictional panel marked `*** SYNTHETIC TEST DOCUMENT - NOT A REAL LAB REPORT ***` with a
fabricated patient and fabricated values (Vitamin D 22.4, Ferritin 18, B12 642, TSH 2.15, and a duplicate
Ferritin row to exercise de-duplication).

> **Stated limitation — REGISTERED AS N-25.** `scan.pdf` is a *clean synthetic render* — no skew, no
> noise, no photographic artefacts, no compression damage from a real scanner. It proves the model reads
> an image-only PDF; it does **not** establish accuracy on a photographed or faxed report. That remains
> unmeasured.
>
> This limitation now carries a **numbered register row** rather than living only here. A limitation
> stated once inside a record does not travel with the claim: the next summary reads "verified against a
> scanned PDF" and means more than the evidence supports. N-25 closes on a dated run against a real
> scanned report appended below — no synthetic substitute counts, because the artefacts are the point.

### Results

| | text PDF | scanned PDF |
|---|---|---|
| **(a)** `file` content part — HTTP status | **200** | **200** |
| **(a)** base64 payload | 27,936 chars | 294,700 chars |
| **(a)** response text length | 1,185 | 1,185 |
| **(a)** transcription correct? | **YES** — returned the synthetic values verbatim | **YES** — same values, from the image alone |
| **(a)** passed `adapterOutputSchema`? | **NO — see the fenced-output finding** | **NO — same** |
| **(b)** `/v1/ocr` — HTTP status | **400** | **400** |
| **(b)** usable? | **NO** | **NO** |

Both option-(a) responses began:

```
```json
{
  "markers": [
    {
      "rawLabel": "Vitamin D, 25-OH",
      "value": 22.4,
      "unit": "ng/mL",
      "referenceLow": 30.0,
      "referenceHigh": 100.0
    },
    {
      "rawLabel":
```

The values are the fixture's own. The model genuinely read both documents — and read the **image-only**
one, which no text-extraction path could have done.

### THE RULING — decision 7B: **option (a)**

The owner's decision tree: *"file-part works on BOTH PDFs → ruled (a). Proceed."* It returned 200 with a
correct transcription on both, including the image-only fixture. **7B is ruled (a).** Option (b) is
**unavailable on this instance** — `/v1/ocr` answered 400 to both — so it is not a fallback that exists.

This **closes N-19**, which recorded that the OpenAI-compatible surface has no equivalent of the Anthropic
`document` block and that native PDF transcription therefore had no like-for-like replacement. It has one:
the `file` content part, verified rather than assumed.

### Finding that the ruling does NOT dispose of — fenced JSON

**`adapterOutputSchema` failed on a perfectly correct transcription, in both runs.** The routed model
wraps its JSON in a ` ```json ` fence, and `candidatesFromTranscript` does a bare `JSON.parse` with no
fence handling:

```ts
// src/lib/lab-import/pdf-adapter.ts:46-52
export function candidatesFromTranscript(rawJson: string): ParsedMarkerCandidate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new ExtractionError("Adapter returned non-JSON output", "EXTRACTION_FAILED");
  }
```

**Checked before recording:** both live paths (`extractFromText`, `extractFromPdf`) pass the transcriber's
raw output straight into that function, so the probe called it exactly as production does. This is a real
defect, not a probe artifact.

Left unhandled, **every PDF upload would answer 502 `EXTRACTION_FAILED`** while the model was transcribing
correctly — a functional regression wearing the mask of a model failure, and the single most misleading
shape this swap could ship. **Registered as N-23** and fixed by U25's lab-import half, which owns this file.

> **A premise of the plan is corrected here, per the measurement-wins rule.** §6 declared behaviour change
> #6 as "provider changes, so answer prose changes; no status or envelope change expected". For
> lab-import that was **wrong**: without a fence-tolerant parse the status changes from 200 to 502 on the
> happy path. Recorded rather than smoothed over.

---

## 5. Sign-off

| Clause | Verdict |
|---|---|
| **OP-4(a)** usage fields reported | **PASS** — `prompt_tokens`/`completion_tokens` present on every response, every run. `\| null` handling retained deliberately |
| **OP-4(c)** tool round trip end to end | **PASS** on the pinned id — 2 parallel tool calls, arguments parsed, non-empty grounded second step |
| **OP-4(b)** PDF acceptance | **PASS for option (a)** on both a text and an image-only PDF. Option (b) `/v1/ocr` unavailable (400) |
| **Decision 7B** | **RULED — option (a).** Closes N-19 |
| Entry condition for U25's advisor half | **MET** (a + c) |
| Entry condition for U25's lab-import half | **MET** (b), with N-23 to fix inside it |

### Registered by this record, not fixed by it

| Id | What |
|---|---|
| **N-22** | Empty second-step text on `auto/*` aliases — two aliases, two vendors, same shape. Unresolved; a gateway routing behaviour, not application code. Worst-case surface: a confident blank answer that passes every safety gate |
| **N-23** | Fenced JSON breaks `candidatesFromTranscript`. Owned by U25's lab-import half |
| **N-18** | Token- vs cost-denominated budget. First measurement: 28 vs 84 input tokens for the same prompt on two routes |
| **N-25** | PDF transcription accuracy is measured on **clean renders only**. Owner condition: closes on a dated run against a real photographed/scanned report, appended to this record |
| **OP-5** | The production gateway's provider set must be restricted to API-keyed providers before any real user health data flows. **Not settled by this record** — every run above was against a local instance |
