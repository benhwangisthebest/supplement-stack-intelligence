# U31 — OpenAI first-party live probe record — 2026-09-18

**Status: FAIL. Success criterion 6 is NOT satisfied.**

> **The advisor half passes. The lab-import half is UNDETERMINED, and its probe cannot currently
> determine it.** Both probe scripts still send the legacy `max_tokens` field in their hand-rolled
> request bodies — the exact field U31 replaced with `max_completion_tokens` because GPT-5-era models
> reject it. Every 400 in this record has that one known-sufficient cause, which is *not* the thing the
> failing steps claim to be measuring. **Nothing was tuned to make it agree (N-26).**

This is the dated artifact success criterion 6 owes, in the shape of
`docs/05-qa/2026-08-10-omniroute-probe-record.md`. Ruling 3 (2026-08-08) refuses live credentials in a
public repository, so every claim about the live provider comes from a record produced against a real key.
Nothing here was inferred from documentation.

**No secret appears in this file.** The host is recorded without a path; neither probe prints the key and
it is not reproduced here. The probes read `OPENAI_*` from a gitignored `.env.local` through an
allowlisting loader, so the Supabase service-role key in the same file never entered the probe process.
The configured `OPENAI_REASONING_EFFORT` value is likewise not reproduced — only that it was sent and
accepted.

| | |
|---|---|
| **Date (UTC)** | 2026-09-18, 19:02 |
| **Run by** | the agent, under the owner's explicit authorization of 2026-09-18 |
| **Commit** | **none — `f74fcb8` plus U31's uncommitted working tree.** The probe was run BEFORE the code commit, by the owner's sequence, because N-21 is the reason: an unset or unresolvable model id fails every turn from a green suite |
| **Branch / worktree** | `feat/u31-openai-first-party` in `../supplement-stack-intelligence-u31` |
| **Provider host** | `api.openai.com` — OpenAI's first-party API, recorded as **observed by the probe**, not assumed |
| **Model requested** | `gpt-5.6-luna`, source `OPENAI_MODEL`, **no default in `src/` or in either probe** (N-21, N-53) |
| **`reasoning_effort`** | configured and **sent on the step-3 path**; value not printed |
| **Probe scripts** | `scripts/probes/openai-advisor-probe.ts`, `scripts/probes/openai-labimport-probe.ts` |
| **Runtime** | node v24.16.0 |

---

## 0. Runs in this record

| # | Run | Verdict |
|---|---|---|
| 1 | Advisor probe, pre-flight with `OPENAI_BASE_URL` unresolvable | **guard fired correctly** — exit 1, no fallback |
| 2 | Advisor probe, full | step 1 **FAIL**, steps 2–3 **PASS** |
| 3 | Lab-import probe, text + image-only fixtures | **FAIL / UNDETERMINED** on option (a); option (b) 404 |

---

## 1. Configuration guards fired before any paid call

Two pre-flight failures happened before this record's paid runs, and both are the guards working.

```
OPENAI_MODEL is not set. There is deliberately no default (U31; see N-21).
Set it to an id from your account's /v1/models and re-run.
```

```
OPENAI_BASE_URL and OPENAI_API_KEY must both be set.
Looked in .env.local and the shell — env: .env.local → OPENAI_API_KEY, OPENAI_MODEL, OPENAI_REASONING_EFFORT
Neither value is ever printed by this script.
```

Exit 1 in both cases, no network call, no guessed default, no value printed. **N-21's deletion of the
probe fallback is doing exactly what it was deleted to do.** The second failure's cause is registered as
**N-57** (below) and is an environment defect, not a provider one.

---

## 2. Advisor — `usage`, and the tool round trip

Verbatim, `npm run probe:advisor`:

```
OpenAI advisor probe — U31 (shape inherited from OP-4(a)/(c))
settings                           env: .env.local → OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_REASONING_EFFORT
base URL host                      api.openai.com
model requested (effective)        gpt-5.6-luna
model source                       OPENAI_MODEL
api key                            read from env; not printed, not written

── STEP 1 · raw response shape (answers OP-4(a)) ──
http status                        400
RESULT                             FAILED — the gateway rejected the request
  Response body deliberately not printed: an upstream 401 body can echo a key.

── STEP 2 · through src/lib/openai/client.ts ──
text length                        2
usage parsed as                    {"inputTokens":13,"outputTokens":4}
agrees with step 1?                compare by eye — a disagreement means `readUsage` is stricter than the gateway

── STEP 3 · tool round trip through the real adapter (OP-4(c)) ──
tools offered                      7
tool calls returned                2
tool names                         searchLibrary, searchLibrary
arguments parsed to objects        [{"query":"magnesium"},{"query":"zinc"}]
usageReported after step 1         true
second step produced text          YES
usageReported after step 2         true
  → a non-empty second-step answer means assistant tool_calls + role:'tool' messages
    were accepted. That is the whole of OP-4(c).
```

| Step | Path | Verdict |
|---|---|---|
| **1** | raw `fetch`, hand-rolled body | **FAIL — HTTP 400.** See N-58; the body carries legacy `max_tokens` |
| **2** | `src/lib/openai/client.ts` | **PASS** — 200, text returned, **`usage` reported** and parsed to `{inputTokens:13, outputTokens:4}` |
| **3** | `AdvisorModelAdapter` + `ADVISOR_TOOLS` | **PASS** — 7 tools offered, **2 tool calls** (`searchLibrary` ×2), arguments parsed to objects, **non-empty second-step answer**, `usageReported` true on both legs |

### What this licenses, and what it does not

**Licensed.** On `gpt-5.6-luna` at `api.openai.com`:

- The **model id resolves.** N-21's question is answered for this account.
- **`usage` is reported.** `readUsage` maps it and `usageReported` stays true, so the ledger settles
  rather than keeping the reservation. This is OP-4(a)'s question and it is answered **through the
  client**, which is the path production uses.
- **The tool round trip works end to end** — assistant `tool_calls` followed by `role:"tool"` messages
  were accepted and produced a grounded, non-empty answer. That is OP-4(c).
- **`reasoning_effort` is accepted.** Step 3 constructs `new AdvisorModelAdapter({ model: MODEL })` with
  no explicit effort, and `resolveReasoningEffort` falls through to `process.env.OPENAI_REASONING_EFFORT`,
  which the loader had populated. The call succeeded, so the configured value is valid for this model.

**Not licensed.** Step 1 answered nothing. OP-4(a)'s *raw-shape* question — what field names the provider
itself returns, independent of `parseCompletion` — **remains unmeasured**, because the only step designed
to bypass the parser never got a 200. The substantive question is answered; the independent check on the
parser is not.

**A note on N-22, carried forward not closed.** The `auto/*` empty-answer finding is not re-tested here:
`gpt-5.6-luna` is a pinned id, not an alias. N-22 stays open against alias configurations.

---

## 3. Lab import — decision 7B against the first-party API

### Fixtures — synthetic, rebuilt for this record

**No real health data was used** (`CLAUDE.md` §2.3 rule 15). The 2026-08-10 fixtures were deliberately
never committed, so both were rebuilt for this record with the tools that record names, live outside the
repository, and are **not committed**.

| | `text.pdf` | `scan.pdf` |
|---|---|---|
| Built by | `cupsfilter` from a synthetic report | that render → JPEG → hand-assembled single-image PDF |
| Size | 21,550 B | 240,191 B |
| Font objects | 2 | **0** |
| Text-showing operators (`Tj`/`TJ`) | **62** | **0** |
| Image | none | one `/DCTDecode` JPEG, **1313×1700** |
| Text extractable | **YES** — `SYNTHETIC`, `Ferritin`, `Vitamin`, `22.4`, `ng/mL`, `TSH` all recovered from the decompressed streams | **NO — impossible by construction** |

The document is a fictional panel marked `*** SYNTHETIC TEST DOCUMENT - NOT A REAL LAB REPORT ***` with a
fabricated patient and fabricated values (Vitamin D 22.4, Ferritin 18, B12 642, TSH 2.15, Magnesium RBC
4.9, Zinc 78, and a duplicate Ferritin row to exercise de-duplication). The `Tj`/`TJ` count of **62** is
identical to the 2026-08-10 fixture's, which is the expected consequence of the same tool over the same
document shape. The render was inspected visually before use and is clean and legible — **so an extraction
failure here would be attributable to the provider, not to an unreadable fixture.**

> **Stated limitation — N-25, UNCHANGED AND STILL OPEN.** `scan.pdf` is a *clean synthetic render* — no
> skew, no noise, no photographic artefacts, no compression damage from a real scanner. It would prove
> the model reads an image-only PDF; it does **not** establish accuracy on a photographed or faxed
> report. That remains unmeasured. N-25 closes only on a dated run against a real scanned report — no
> synthetic substitute counts, because the artefacts are the point. **This record does not advance N-25
> in either direction**, since option (a) never returned a 200 here.

### Results — verbatim

```
── OPTION (a) · file content part · TEXT PDF ──
base64 length                  28736
http status                    400
RESULT                         REJECTED — option (a) does not work for this model

── OPTION (b) · /v1/ocr · TEXT PDF ──
http status                    404
RESULT                         unavailable or a different request shape — record the status

── OPTION (a) · file content part · SCANNED PDF ──
base64 length                  320256
http status                    400
RESULT                         REJECTED — option (a) does not work for this model

── OPTION (b) · /v1/ocr · SCANNED PDF ──
http status                    404
RESULT                         unavailable or a different request shape — record the status
```

### THE RULING — **decision 7B is NOT re-ruled. Its status against this provider is UNDETERMINED.**

**The probe's own printed verdict — "REJECTED — option (a) does not work for this model" — is withdrawn
by this record as an unsound inference**, on exactly the grounds that withdrew §2/§3 of the 2026-08-10
record. The request that produced the 400 was not controlled: alongside the `file` content part it
carried `max_tokens: 2048`, a field this same provider rejected in the advisor probe's step 1 in the same
session, minutes apart. **A 400 from a request with two candidate causes cannot be attributed to one of
them**, and the instrument printed a confident attribution anyway.

What *is* established:

- **`/v1/ocr` does not exist at `api.openai.com`** — 404 on both fixtures, consistent and unambiguous.
  Option (b) remains not a fallback. This is the one clean result in this section.
- **Option (a) is unmeasured against this provider**, not refuted.
- **The production path is not proven to work, and must not be described as working.** The lab-import
  adapter sends the identical `file` part shape (`pdf-adapter.ts:303-308`), but through
  `buildCompletionBody`, i.e. with `max_completion_tokens` — a body this probe never sent.

**Decision 7B's 2026-08-10 ruling stands on its own evidence, which was against OmniRoute.** It does not
transfer to `api.openai.com` and this record does not transfer it.

---

## 4. Sign-off

**Success criterion 6: NOT SATISFIED.** The record exists and is dated, but it does not cover the
lab-import PDF `file` part, which criterion 6 names explicitly.

| Criterion 6 clause | Result |
|---|---|
| advisor tool-calling turn | **PASS** |
| grounded non-empty answer | **PASS** |
| `usage` reported | **PASS** |
| configured model id resolves | **PASS** — `gpt-5.6-luna` |
| `reasoning_effort` accepted | **PASS** |
| lab-import PDF `file` part, text fixture | **NOT MEASURED** — 400 from an uncontrolled request |
| lab-import PDF `file` part, image-only fixture | **NOT MEASURED** — same |

**Nothing was tuned.** Per N-26 and the owner's instruction, neither probe was modified after a failure.
The instrument defect is reported as a finding; repairing it and re-running is the owner's call, and the
re-run must be a fresh dated record, not an edit to this one.

### Registered by this record, not fixed by it

| # | Finding | Disposition |
|---|---|---|
| **N-57** | **`.env.local` goes stale after a worktree split, silently.** The U31 worktree's file still held `OMNIROUTE_*` after the split; the loader filters to `OPENAI_` and reported "not configured" against a fully populated file — **N-52's failure mode from the opposite side** (N-52: loader prefix didn't match the file; N-57: file didn't match the loader). Compounded on repair: an append onto a file with no trailing newline **glued `OPENAI_BASE_URL=…` onto the end of the `OMNIROUTE_MODEL=` value**, where `parseEnvFile` silently absorbed it as part of that value. The loader reported three names and no error | **ACCEPTED by the owner 2026-09-18 → §8 C9** of the U31 plan. Remedy candidates ruled at closeout: *loader warns on a populated file with zero matching keys*, or *a documented split procedure*. **Note for that ruling: the first candidate would NOT have caught the glued-line case**, because three keys did match — a stronger check is a warning when a known setting name appears inside another setting's value |
| **N-58** | **Both probe scripts send legacy `max_tokens` in their hand-rolled bodies.** U31 changed the paid client to `max_completion_tokens` — the unit's own M2 mutation — but neither probe's raw `fetch` was updated: `openai-advisor-probe.ts` step 1 sends `max_tokens: 16`, `openai-labimport-probe.ts` option (a) sends `max_tokens: 2048`. Both 400. **The probes no longer mirror production on the one request field U31 changed**, which is the field most worth probing | **OPEN — owned by U31 before it lands.** The probes are U31's own files and are renamed by U31's diff; shipping them knowingly broken is not available. Fixing them is a **code change requiring a fresh probe run and a new dated record**, not an amendment to this one |
| **N-59** | **The lab-import probe prints a confident conclusion it has not earned.** On any non-2xx it prints `REJECTED — option (a) does not work for this model` — a verdict about the *content part* derived from a request whose failure it cannot attribute. Decision 7B, a ruling this repository relies on, rests on this script's output shape. **This is N-26 recurring**: the 2026-08-10 record had to withdraw its own §2/§3 verdicts for the same reason — an instrument asserting more than its request design supports | **OPEN — owned by U31 alongside N-58.** The two are one repair: a probe that cannot isolate a variable should report the status and decline the verdict. §8.3's rule applies — a confidently wrong output is worse than no output |
| **N-60** | **The configured model id `gpt-5.6-luna` is the same literal M5 uses as its mutation string.** M5 injects `?? "gpt-5.6-luna"` into `resolveModel` to prove `NO_PINNED_MODEL_ID` reddens. Using a genuinely-configured id as the synthetic mutation is weaker evidence than an obviously-fake one, and if that literal ever appears legitimately in `src/`, the guard's red becomes ambiguous | **OPEN, low severity.** Registered so the next reader of §4's red list does not mistake the coincidence for a copy-paste of live configuration into a test |

### What this record does NOT establish

- **That the lab-import path works.** It does not, on this evidence, and no document may say it does.
- **That option (a) fails.** It does not establish that either. Both statements are unsupported.
- **N-25's boundary is untouched** — no real scanned report was used, and no image-only extraction
  succeeded here to bound in the first place.
- **That the deployed application works.** Every run above is a script against the API. The app was not
  exercised.
