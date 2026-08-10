# OP-4 — Omniroute live probe record (TEMPLATE)

> **This is a template. Copy it to `docs/05-qa/omniroute-probe-<YYYY-MM-DD>.md` and fill it in from a
> real run.** An unfilled template is not evidence, and a filled one is the only thing that may close
> decision 7B.
>
> **Why this is owner-run and not CI.** Ruling 3 (2026-08-08) refuses live credentials in a public
> repository, so nothing in CI can call the gateway. Same footing as **OP-2** and **OP-3**: a claim about
> a live system is established by a dated record a person produced, never by a green build.
>
> **NEVER PASTE A KEY.** Record variable *names*, hosts, statuses, and field names — never a value. The
> probes are written so that no key appears in their output; do not defeat that by pasting a shell line
> that contains one.

| | |
|---|---|
| **Date (UTC)** | |
| **Run by** | |
| **Commit** | `git rev-parse --short HEAD` |
| **Gateway host** | *(host only, no path, no key)* |
| **`OMNIROUTE_MODEL`** | *(the effective id requested — the probe prints it, and whether it came from the variable or the probe default)* |
| **Model the gateway echoed** | *(the id actually routed to — these can differ, and the difference is the finding)* |

---

## 1. OP-4(a) — does the routed model report `usage`?

**Command** (key supplied from the environment, not written here):

```bash
npm run probe:advisor
```

**Raw output — paste verbatim, do not summarise:**

```
(paste STEP 1 here)
```

| Question | Answer |
|---|---|
| `usage` object present on the response? | |
| Field names it carried | |
| `prompt_tokens` type and value | |
| `completion_tokens` type and value | |
| Did our `readUsage` agree with the raw body? (STEP 2) | |

**What each answer obliges:**

- **Usage reported on every response** → `usageReported` stays true, the ledger settles normally, and the
  advisor's budget behaves as it did under Anthropic. Record this and nothing changes.
- **Usage sometimes or never reported** → `usageReported` goes false and the route **keeps the whole
  reservation** rather than settling against zeros. That is the deliberate safe direction (over-charge,
  never under-charge), but if it is the *common* case then the daily budget over-charges on every turn,
  which is an operational problem even though it is not a correctness one. **Record it and raise it** —
  it is the strongest evidence yet for **N-18** (should the budget be cost-denominated rather than
  token-denominated?), and that question belongs to a future unit, not to a silent workaround here.

---

## 2. OP-4(c) — does the tool round trip work against the real gateway?

**Raw output:**

```
(paste STEP 3 here)
```

| Question | Answer |
|---|---|
| Tools offered | |
| Tool calls returned on step 1 | |
| Tool names | |
| Arguments parsed to objects (not left as strings)? | |
| Second step produced grounded text? | |

**Why this cannot be inferred from the unit tests.** `model-adapter.test.ts` and its scripted client were
written together, from one reading of the OpenAI-compatible protocol. If that reading is wrong they agree
with each other and the suite is green. This is the only check that is not self-referential.

**If no tool call comes back**, that is not automatically a failure — a model may legitimately answer
directly. Re-run, and try a different model id, before concluding the round trip is broken. Record what
was tried.

---

## 3. OP-4(b) — decision 7B: how does a PDF reach an OpenAI-compatible endpoint?

**Command:**

```bash
npm run probe:labimport -- --text-pdf ./text.pdf --scanned-pdf ./scan.pdf
```

**No PDF is committed to this repository.** A real lab report is health data (§2.3 rule 15) and a
synthetic one cannot answer the scanned case. Use your own files and record only their *nature* — "a
2-page text-layer panel", "a phone photo of a printed panel" — never their contents.

| | Text PDF | Scanned PDF |
|---|---|---|
| **Option (a)** `file` content part — HTTP status | | |
| **Option (a)** passed `adapterOutputSchema`? | | |
| **Option (a)** candidates parsed / markers recognised | | |
| **Option (b)** `/v1/ocr` — HTTP status | | |
| **Option (b)** OCR response keys | | |
| **Option (b)** transcription passed `adapterOutputSchema`? | | |

**Raw output:**

```
(paste the full lab-import probe output here)
```

**If only a text PDF was run, say so explicitly here:** _______________________
A record covering the easier half reads as though it answered both unless it states otherwise.

### The ruling this section feeds

| Outcome | What it means for decision 7B |
|---|---|
| (a) works on **both** PDFs | Rule **option (a)**. Closest to today's behaviour, one call, no new dependency, scanned PDFs still work |
| (a) works on the **text** PDF only | Neither option is clean. (a) loses scanned reports — a real capability regression that must be **declared**, not discovered by a user. Weigh against (b) |
| (a) rejected, (b) works | Rule **option (b)**. Costs a second endpoint and puts OCR quality inside a transcription-only safety path — state that in the ruling |
| **Neither** works | **Stop.** Every PDF that transcribes today would become a 502. That is a functional regression, not the prose change U25 declared as behaviour change #6, and it needs an explicit product decision — not an implementation |

**Nothing in `src/lib/lab-import/**` may be written until this section is filled in and ruled on.**

---

## 4. Sign-off

- [ ] No key, token, or credential value appears anywhere in this document.
- [ ] Every figure is pasted from a real run, not typed from memory.
- [ ] Sections left unrun are marked **NOT RUN**, not left blank.
- [ ] The 7B ruling (if this record settles it) is recorded in
      `docs/01-plan/phase-2-operational-dependability.plan.md` §7 decision 7, dated, beside the options.
