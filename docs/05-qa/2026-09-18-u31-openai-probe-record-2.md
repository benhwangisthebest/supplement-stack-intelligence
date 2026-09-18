# U31 — OpenAI first-party live probe record **2** — 2026-09-18

**Status: PASS. Success criterion 6 is satisfied. Decision 7B — option (a) — HOLDS against `api.openai.com`.**

> **Read record 1 first: `docs/05-qa/2026-09-18-u31-openai-probe-record.md`.** It stays as written, as a
> FAIL record. **Nothing about the provider changed between these two records. The instrument changed.**
> Every 400 in record 1 was the probes sending a request production does not send.

This is the second dated artifact success criterion 6 owes, in the shape of
`docs/05-qa/2026-08-10-omniroute-probe-record.md`. Nothing here was inferred from documentation.

**No secret appears in this file.** The host is recorded without a path; neither probe prints the key.
`OPENAI_*` is read from a gitignored `.env.local` through an allowlisting loader, so the Supabase
service-role key in the same file never entered the probe process. The configured
`OPENAI_REASONING_EFFORT` value is not reproduced — only that it was sent and accepted.

| | |
|---|---|
| **Date (UTC)** | 2026-09-18, 19:08 |
| **Supersedes** | record 1's *verdicts*. Record 1's findings stand and are its permanent contribution |
| **Run by** | the agent, under the owner's explicit authorization of 2026-09-18 |
| **Commit** | **none — `f74fcb8` plus U31's uncommitted working tree**, now including the N-58/N-59 repair. Probe before commit, per the owner's sequence (N-21) |
| **Provider host** | `api.openai.com`, observed by the probe |
| **Model** | `gpt-5.6-luna`, source `OPENAI_MODEL`, no default anywhere |
| **`reasoning_effort`** | configured, sent on the step-3 and lab-import paths; value not printed |
| **Runtime** | node v24.16.0 |

---

## 1. What changed in the instrument between record 1 and record 2

**Nothing else changed.** Same provider, same account, same model id, same two fixtures, same key, same
day, six minutes apart (record 1 at 19:02 UTC, this one at 19:08).

| | Record 1 | Record 2 |
|---|---|---|
| Advisor step 1 body | hand-rolled in the probe, `max_tokens: 16` | **`buildCompletionBody({model, messages, maxTokens: 16})`**, imported from `src/lib/openai/client.ts` |
| Lab-import option (a) body | hand-rolled in the probe: `max_tokens: 2048` + an inline `file` content part | **`buildCompletionBody(buildTranscriptionRequest({model, reasoningEffort, userContent: pdfContentParts(base64)}))`**, all imported from `src/lib/lab-import/pdf-adapter.ts` and the client |
| Lab-import option (b), second leg | hand-rolled, `max_tokens: 2048` | same imported builders (still unreachable — `/v1/ocr` 404s) |
| Non-2xx verdict line | `REJECTED — option (a) does not work for this model` | `NOT ACCEPTED — HTTP <status>. Status recorded; no verdict inferred (N-59)` |

**Two pure cores were EXTRACTED AND EXPORTED from `pdf-adapter.ts`, not copied into the probe** —
`buildTranscriptionRequest` and `pdfContentParts`. `transcribeVia` and `makeGatewayPdfTranscriber` now
call them, so production and probe share one definition and cannot drift again. This follows the module's
established idiom: U31 extracted `buildCompletionBody` from the client for the same reason, matching
`completionsUrl` / `readUsage` / `parseCompletion`.

**No new export was needed for the advisor**: `buildCompletionBody` was already exported, and
`scripts/` is outside `src/`, so `boundaries.test.ts` — which partitions top-level `src/*` — is not
crossed. The probes already imported `@/lib/openai/client` and `@/lib/lab-import/pdf-adapter`.

### The red for this change was NOT re-run — it is cited

Per the owner's instruction, record 1 **is** the red evidence:

| | Hand-rolled body (record 1) | Production-built body (record 2) |
|---|---|---|
| Advisor step 1 | **400** | **200** |
| Option (a), text PDF | **400** | **200** |
| Option (a), image-only PDF | **400** | **200** |

Three paired observations, same provider, same day. A cleaner mutation result than a deliberately
constructed one, because nobody constructed it.

---

## 2. Advisor — verbatim

```
── STEP 1 · raw response shape (answers OP-4(a)) ──
http status                        200
top-level keys                     choices, created, id, model, object, service_tier, system_fingerprint, usage
model echoed by the gateway        gpt-5.6-luna
usage present?                     YES
usage keys                         completion_tokens, completion_tokens_details, prompt_tokens, prompt_tokens_details, total_tokens
prompt_tokens                      number 13
completion_tokens                  number 4
  → the ledger can settle: `readUsage` will map these and `usageReported` stays true.

── STEP 2 · through src/lib/openai/client.ts ──
text length                        2
usage parsed as                    {"inputTokens":13,"outputTokens":4}

── STEP 3 · tool round trip through the real adapter (OP-4(c)) ──
tools offered                      7
tool calls returned                2
tool names                         searchLibrary, searchLibrary
arguments parsed to objects        [{"query":"magnesium"},{"query":"zinc"}]
usageReported after step 1         true
second step produced text          YES
usageReported after step 2         true
```

| Step | Verdict |
|---|---|
| **1** — raw, parser bypassed | **PASS** — 200. `usage` present with `prompt_tokens` 13, `completion_tokens` 4 |
| **2** — through the client | **PASS** — `readUsage` maps to `{inputTokens:13, outputTokens:4}` |
| **3** — full tool round trip | **PASS** — 2 tool calls, arguments parsed, **non-empty grounded answer**, `usageReported` true on both legs |

**OP-4(a) is now genuinely answered, which record 1 could not do.** Step 1 bypasses `parseCompletion`
and reports the provider's own field names; step 2 reports what the parser made of the same call. They
**agree exactly** — 13/4 both ways. That is an independent check on `readUsage`, and it is the check
record 1 lost when step 1 400'd.

---

## 3. Lab import — decision 7B against the first-party API

### Fixtures

Unchanged from record 1 — same two files, same run. Reproduced here so this record stands alone:

| | `text.pdf` | `scan.pdf` |
|---|---|---|
| Built by | `cupsfilter` from a synthetic report | that render → JPEG → hand-assembled single-image PDF |
| Size | 21,550 B | 240,191 B |
| Font objects | 2 | **0** |
| Text-showing operators (`Tj`/`TJ`) | **62** | **0** |
| Image | none | one `/DCTDecode` JPEG, **1313×1700** |
| Text extractable | **YES** — `SYNTHETIC`, `Ferritin`, `Vitamin`, `22.4`, `ng/mL`, `TSH` recovered from the decompressed streams | **NO — impossible by construction** |

Fabricated patient, fabricated values, marked `*** SYNTHETIC TEST DOCUMENT - NOT A REAL LAB REPORT ***`,
7 analyte rows including a duplicate Ferritin row to exercise de-duplication. **No real health data**
(`CLAUDE.md` §2.3 rule 15). Not committed. Render inspected visually before use.

> **Stated limitation — N-25, UNCHANGED AND STILL OPEN.** `scan.pdf` is a *clean synthetic render* — no
> skew, no noise, no photographic artefacts, no compression damage from a real scanner. It proves the
> model reads an image-only PDF; it does **not** establish accuracy on a photographed or faxed report.
> That remains unmeasured. N-25 closes only on a dated run against a real scanned report — no synthetic
> substitute counts, because the artefacts are the point. **This record does not advance N-25.** A 200
> on a clean render is exactly the evidence N-25 already says is insufficient.

### Results — verbatim

```
── OPTION (a) · file content part · TEXT PDF ──
base64 length                  28736
http status                    200
response text length           676
adapterOutputSchema            PASS — 7 candidate(s)
recognised markers             4

── OPTION (b) · /v1/ocr · TEXT PDF ──
http status                    404

── OPTION (a) · file content part · SCANNED PDF ──
base64 length                  320256
http status                    200
response text length           676
adapterOutputSchema            PASS — 7 candidate(s)
recognised markers             4

── OPTION (b) · /v1/ocr · SCANNED PDF ──
http status                    404
```

### THE RULING — **decision 7B holds: option (a).**

The OpenAI `file` content part carrying a base64 data URL is **accepted by `api.openai.com` on
`gpt-5.6-luna`, for both a text PDF and an image-only PDF**, and the response parses through
`stripJsonFence` → `candidatesFromTranscript` → `adapterOutputSchema` without error.

- **7 candidates**, matching the fixture's 7 analyte rows.
- **4 recognised markers** — `normalizeMarker` mapped 4 of the 7 to known biomarker ids. The other 3 are
  a de-duplication case and two analytes the seed set does not name. This is the seed's coverage, not a
  provider result, and `CLAUDE.md` §2.2 rule 10 applies: absence is not a signal.
- **`/v1/ocr` 404s** on both fixtures. Option (b) is not a fallback at this provider. Unchanged from
  record 1, and the one result record 1 got right.

**Record 1's withdrawal of the "option (a) does not work" verdict was correct**, and this record shows
what it was hiding: option (a) works.

### The image-only result deserves its own sentence, and a caveat

`scan.pdf` has zero text-showing operators and zero fonts — there is no text in it to extract. It
returned **the same 676-character response, the same 7 candidates, and the same 4 recognised markers** as
the text version. The only path to that output is the model reading the rendered page.

**But see N-61 below.** The probe reports *counts*, never *values*. It establishes that the output is
schema-valid and correctly shaped; it does **not** verify the transcribed numbers are the fixture's own.
The matching response length across both fixtures is strong circumstantial evidence — a fabrication from
a text-free PDF would not coincidentally reproduce the text version's byte length — but it is an
inference drawn in this document, not a measurement the instrument made.

---

## 4. Sign-off

**Success criterion 6: SATISFIED.**

| Clause | Result |
|---|---|
| advisor tool-calling turn | **PASS** |
| grounded non-empty answer | **PASS** |
| `usage` reported | **PASS** — raw and parsed agree, 13/4 |
| configured model id resolves | **PASS** — `gpt-5.6-luna` |
| `reasoning_effort` accepted | **PASS** |
| lab-import PDF `file` part, text fixture | **PASS** — 200, schema PASS, 7 candidates |
| lab-import PDF `file` part, image-only fixture | **PASS** — 200, schema PASS, 7 candidates |

Gates on the repaired tree: `tsc` clean · `npm run lint` 360/360, 0 errors · `vitest` **1298/1298 across
106 files** · `npm run test:coverage` exit 0 · `next build` succeeds. **M5 re-run with its new literal**
(N-60): 1 failed / 46 passed, green 47/47 on revert.

### Registered by this record

| # | Finding | Disposition |
|---|---|---|
| **N-61** | **The lab-import probe verifies shape, never content.** `reportTranscript` prints the candidate count and the recognised-marker count; it does not print or check a single transcribed value. **A schema-valid hallucination and a correct transcription are indistinguishable in its output** — which is the same class as N-59 (an instrument reporting more confidence than its design supports), one level deeper: N-59 was an unearned verdict, N-61 is an unmeasured dimension. The 2026-08-10 record asserted "the values are the fixture's own"; on this instrument that claim could only have come from a human reading them | **OPEN, unassigned — NOT fixed in this unit.** Fixing it means printing transcribed values, and the values are health-shaped even when synthetic, so the change needs a rule-15 judgement rather than a quick patch. Flagged now because U31's closeout should not let "verified against a PDF" travel further than "verified schema-valid against a PDF" |

### What this record does NOT establish

- **That the transcribed values are correct.** See N-61.
- **N-25 is untouched.** No real scanned report; the clean-render limitation is unchanged.
- **That `auto/*` aliases work.** `gpt-5.6-luna` is a pinned id. **N-22 stays open.**
- **That the deployed application works.** These are scripts against the API; the app was not exercised.
- **Anything about OP-5.** Where health context may be sent, under what retention, is a separate dated
  record owed at closeout (§8 C2).
