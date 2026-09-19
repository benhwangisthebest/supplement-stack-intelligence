# OP-5 — provider record: where the advisor's health context goes, and on whose terms

> **Status: OP-5 remains OPEN.** This record does not discharge it. It exists so that the question stops
> being answered from memory, and so the three facts that *would* discharge it are written down as facts
> rather than as a feeling about a vendor.
>
> **Date**: 2026-09-18 — the date the sources below were read.
> **Owner**: repository owner. **Unit that occasioned it**: Phase 2 **U32** (`104a111`).
> **Standing constraint, unchanged by this record**: *any deployed advisor is development-only, with no
> real user health data, until OP-5 is discharged.*

---

## 0. Why this record exists at all

The advisor's prompts carry the user's medications, conditions and lab values (`CLAUDE.md` §2.3 rule 15),
and lab-import sends whole PDFs. Before U32, the only thing making the provider "first-party" was a
sentence in `.env.example` — that was **N-63**. U32 turned the sentence into a check. A check is not a
contract, so the remaining question is not *"where does the code dial"* but *"what may the party at that
address do with what it receives"*, and the answer is not in this repository.

---

## 1. The primary-source half — fetched, not recalled

**Source**: *Data controls in the OpenAI platform* —
`https://developers.openai.com/api/docs/guides/your-data`
(reached via a 301 from `https://platform.openai.com/docs/guides/your-data`).
**Read**: 2026-09-18. **No "last updated" date is shown on the page** — recorded because its absence is
itself a fact about how durable this citation is.

| Question | What the page says |
|---|---|
| Is API data used for training? | *"As of March 1, 2023, data sent to the OpenAI API is not used to train or improve OpenAI models (unless you explicitly opt in to share data with us)."* |
| Default retention | Abuse-monitoring logs are *"retained for up to 30 days, unless longer retention is required by law"* or needed to protect the service. |
| What is in those logs | *"prompts and responses, as well as metadata derived from that customer content"* — generated *"for all API feature usage"* by default. |
| Zero Data Retention | Excludes customer content from abuse-monitoring logs. Requires *"prior approval by OpenAI and acceptance of additional requirements"*, arranged through sales. Under ZDR the `store` parameter *"will always be treated as `false`"* on the affected endpoints. |
| DPA | **Not covered by this page.** It references a *"Business Associate and Healthcare Addendum"* for eligible customers and does not state standard DPA terms. |

**What could not be read, stated rather than filled in:** a fetch of
`https://openai.com/policies/data-processing-addendum/` on 2026-09-18 returned **HTTP 403**. No DPA terms
are quoted here, because none were retrieved. A future reader should not infer from this record that a
DPA was reviewed.

**The load-bearing consequence, spelled out:** on default API terms, prompts containing health data are
retained for up to 30 days in abuse-monitoring logs. That is a retention window, not an absence of one,
and it applies to every request this application makes unless ZDR is in force on the account.

---

## 2. The code half — what U32 established, and what it did not

U32 (`104a111`) pins the paid client's base URL to `api.openai.com`: parsed, `https:` only, exact
hostname, no non-default port, no userinfo. Enforced at four sites in `src/` and in both probe scripts,
with `FIRST_PARTY_BASE_URL` asserting every module that resolves the variable also validates it, and
`SOLE_PAID_CLIENT`'s address ratchet pinning the reader set so a new reader is a red build. An override,
`OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL=1`, permits another host and logs once per server process naming
that host.

**N-63 is MITIGATED, not CLOSED** — the owner's ruling of 2026-09-18, and the code's own position.
U32 closes the *silent-drift* failure mode. It does not close the *hostile-operator* or *network-layer*
mode. The full enumeration is the eight-item non-coverage paragraph in
`docs/01-plan/phase-2-operational-dependability.plan.md` §4.6, produced by `ecc:security-reviewer`. Its
two load-bearing items: **the override is not a security boundary** (whoever can set the address can set
the permission), and **there is no certificate pinning** — a proxy, DNS answer or TLS-terminating
middlebox can make the permitted hostname resolve to something the code cannot see.

**A host pin is not a data-processing term.** Reaching the right address on terms that retain health
prompts for 30 days is still a fact this record has to state, and U32 does not change it.

---

## 3. The account-fact half — every item UNKNOWN

These are facts about **this owner's OpenAI account and this deployment**. Nothing in the repository can
establish them, and CI holds no credentials by design (ruling 3 / P-03). They are recorded as UNKNOWN
rather than assumed, because an assumed answer here is exactly the class of claim `CLAUDE.md` §2.2 rule 7
forbids.

| # | Fact | Status | What would establish it |
|---|---|---|---|
| **A** | **The base URL as actually deployed** — is `OPENAI_BASE_URL` set to `https://api.openai.com` in the deployment environment, and is `OPENAI_ALLOW_NON_FIRST_PARTY_BASE_URL` unset? | **UNKNOWN** | The deployment's environment listing, dated, plus a log check for the override line. U32 makes the override *visible*; nobody has yet *looked*. |
| **B** | **A DPA executed with OpenAI, and its date** | **UNKNOWN** | The executed agreement's identifier and date. Note §1: the DPA page could not be read from here, so even the terms on offer are unverified. |
| **C** | **Zero Data Retention in force on the account** | **UNKNOWN** | OpenAI's written confirmation that ZDR applies to the API key this deployment uses. Without it, §1's 30-day abuse-monitoring retention is the operative term. |

---

## 4. Verdict

**OP-5 is OPEN.** The development-only constraint remains in force: no real user health data through a
deployed advisor.

**This record discharges OP-5 when, and only when, A, B and C above are answered with dated evidence** —
the deployed base URL and override state, an executed DPA with its date, and ZDR confirmed in writing for
the key in use. Two of the three are procurement facts, not engineering ones, which is why no amount of
further work in this repository can close this item.

**What this record does discharge:** the excuse that nobody had looked. The provider's current public
terms are quoted above with their URL and the date they were read, and the three missing facts are named
individually rather than gestured at.
