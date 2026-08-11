# Middleware activation smoke — Phase 2 U27 — 2026-08-11

**VERDICT: ACTIVATION CONFIRMED.** Every scripted step passed, including the step that reproduces the
observation which aborted the first run. No redline was hit.

| | |
|---|---|
| **Unit** | Phase 2 **U27** — the middleware has never run (finding **N-34**) |
| **Run by** | repository owner |
| **Date** | 2026-08-11 |
| **Instance** | local production build (`npm run build && npm start`) against the owner's Supabase project |
| **Repo state** | `feat/u27-middleware` @ `c514f50` |
| **JWT expiry** | **3600 → 120** for the run, **restored to 3600 and confirmed** after R9 |
| **Instrument** | temporary uncommitted probe in `src/lib/supabase/middleware.ts`, logging one `[U27-PROBE]` line per request. **Removed before commit 2**; `git diff --quiet HEAD` verified clean |
| **Runs** | **two** — run 1 aborted as inconclusive (§4), run 2 conclusive (§2) |

> **Redaction.** The project ref and the full auth-cookie name appear in the raw trace and in the owner's
> report; both are reduced to `sb-<ref>-auth-token` here. No token value, cookie value, user id or email is
> recorded, and the probe was written not to log them. §2.3 rule 15 applies to this file as much as to
> application logs.
>
> **Provenance of the figures below.** §2 was written first, from the **owner's reported readings** of the
> live trace, transcribed step by step. **The raw trace arrived afterwards and is reproduced in full as
> Appendix A**, which is the primary source; every figure in §2 was checked against it and none changed.
> The distinction is kept rather than smoothed over, because §2.2 rule 8 is about knowing which of your
> numbers came from the instrument and which came from a person reading it — here the answer is
> "transcribed first, corroborated after", and that is worth being able to see.

---

## 1. What this verifies, and what it does not

U27 moves `middleware.ts` to `src/middleware.ts` — the only path Next compiles in a project with a `src/`
directory — which **activates** `updateSession`, the Supabase session refresh of Design §7, dormant since
`910d773` (2026-06-12).

- **ACTIVATION (new behaviour, verified here):** a refreshed auth cookie is now persisted on plain
  navigation.
- **REGRESSION (unchanged, verified here):** page loads, the anonymous redirect, sign-out.

**R8's anonymous redirect is a REGRESSION check, not an activation check.** `/profile`, `/stack-lab` and
`/advisor` each call `requireUser()` in the page; `src/lib/supabase/middleware.ts` contains no redirect; and
the E2E specs asserting that redirect pass on `main` with the middleware inert. This record does not claim
middleware-based auth gating was verified, because there is none.

---

## 2. Run 2 — results

Waits were 150s (expiry 120 + 30 margin), browser parked on `about:blank` during each.

| # | Step | Observed | |
|---|---|---|---|
| **R1** | `/library` signed out | `hadSession:false`; probe fired on **all** paths | **PASS** |
| **R2** | Sign in | `hadSession:true` on subsequent requests | **PASS** |
| **R3** | **CONTROL** — `/stack-lab` within ~20s | `expiresInSeconds:120`, `refreshOccurred:false` | **PASS** |
| **R5** | **DECISIVE** — `/stack-lab` after 150s | `expiresInSeconds:−37` → `refreshOccurred:true`, `setAllFired:true`, cookie written; **`Set-Cookie` on the Doc response** | **PASS** |
| **R6** | `/advisor` after 150s | `expiresInSeconds:−246` → refresh, cookie written; `Set-Cookie` | **PASS** |
| **R7** | **RUN-1 REPLAY** — Cmd+R on `/stack-lab` after 150s | `expiresInSeconds:−125` → refresh, cookie written; `Set-Cookie` | **PASS** |
| **R7b** | Reload seconds later | `expiresInSeconds:111` then `106`, `refreshOccurred:false`, no `Set-Cookie` | **PASS — correct no-refresh-due** |
| **R8** | Private window → `/profile` *(regression)* | redirected once to login, no loop | **PASS** |
| **R9** | Sign out | `sb-<ref>-auth-token` gone from Application → Cookies | **PASS** |

**Redlines hit: none.**

**R3 against R5 is the whole point of run 2.** R3 establishes what a legitimate *no refresh due* looks like
— `refreshOccurred:false`, no `Set-Cookie` — and R5 shows the opposite under an expired token on the **same
route**. Run 1 had no control, so its `/stack-lab: NO` was unreadable: correct behaviour and broken
behaviour produce byte-identical Doc rows. **The control is what converted an ambiguous observation into a
decidable one**, and its absence was the first procedure's real defect.

**R7 is the one that closes the case.** It reproduces run 1's exact action — Cmd+R on `/stack-lab` with an
expired token — and it refreshed and set a cookie. **R7b then reproduces run 1's symptom** on the very next
reload, and shows it is correct: a fresh token, no refresh due, no `Set-Cookie`.

### 2.1 Unscripted confirmation, before the procedure began

The **first trace line of the sitting** showed the leftover run-1 session at `expiresInSeconds:−946` being
refreshed and persisted on `/`. That is independent of every scripted step and arrived before any of them —
a nine-hundred-second-expired token, refreshed and written on a plain navigation, which is precisely the
behaviour that did not exist before U27.

### 2.2 Deviations, recorded rather than tidied away

- **Extra page loads between R5 and R7.** Their trace lines are present and all show correct
  no-refresh-due behaviour. They do not affect R5/R6/R7, each of which was preceded by its own full wait.
- **S2 showed an extra untracked file**, `.claude/launch.json` — pre-existing, unchanged, unrelated.

---

## 3. Two findings from the trace

### 3.1 Run 1's "path-dependence" was a refresh margin, and the margin is visible

Supabase refreshes when the access token is **within 90 seconds** of expiry. The full trace pins this from
both sides — **no refresh at `expiresInSeconds:91`, every refresh at `88` or below** (Appendix A.1) — which
is `EXPIRY_MARGIN_MS` (3 × 30 s) observed rather than read off a constant. With a 120-second token that
leaves a **30-second window** in which a page load does *not* refresh. So the first pages loaded in run 1
refreshed, and the next ones correctly did not.

*(This section originally said "~90 seconds" from a single observation; the appendix arrived later and
made it exact. Recorded as a sharpening, not a correction — the original claim was not wrong, it was
imprecise, and the difference between those two is worth keeping visible.)*

**The pattern tracked visit order, not route identity** — which is exactly what the U27 diagnosis predicted
from the code (`getUser()` → `_useSession` → `__loadSession`, gated on `EXPIRY_MARGIN_MS`) and what three
eliminated hypotheses had already implied: the matcher matched all four routes, the middleware demonstrably
executed on all four, and `/profile` and `/stack-lab` are structurally identical files that behaved
differently.

### 3.2 The invisible consumer was real, and it has a name

`/.well-known/appspecific/com.chrome.devtools.json` — **DevTools' own background requests** — passed
through the middleware and consumed refreshes, appearing in the trace as `refreshOccurred:true` lines the
Network tab's Doc filter never showed.

This is not a curiosity. It means **the act of observing consumed the thing being observed**: a refresh
spent on a DevTools probe is a refresh the next document load correctly does not perform, and the observer
then records a `NO` in the Doc column. Run 1's method could not have detected this; only a server-side
trace over *every* request could. Registered as **N-36**, because the matcher's breadth has consequences
beyond this smoke.

---

## 4. Run 1 — aborted, and why it is recorded rather than deleted

Run 1 stopped on what looked like path-dependent cookie persistence: `Set-Cookie` on `/library` and
`/profile`, none on `/stack-lab` and `/advisor`, and a Cmd+R of `/stack-lab` that rendered authenticated
without rotating the cookie. **Every one of those observations was accurate.** The inference drawn from
them was not, and neither was the diagnosis offered in response.

**Two defects, both worth keeping:**

1. **The first procedure had no control step.** It asked "did a cookie appear?" without ever establishing
   what its absence means. Absence is the *correct* result whenever no refresh is due, so the procedure
   could not distinguish success from failure on its central question. Run 2's R3 is the fix, and it cost
   one step.

2. **The diagnosis wrongly called the instrument miscalibrated.** Run 1's step 3 read `exp − now ≈ −34`,
   and the diagnosis treated a negative value as an impossible reading from a freshly minted token —
   proposing a bad decode of the chunked, base64-JSON cookie. **That was wrong.** The owner reported ~2–3
   minutes of elapsed time between sign-in and the decode while learning the devtools workflow; against a
   120-second expiry, `120 − 154 ≈ −34` is what a **correct** decode reports. The later `−360` is likewise
   consistent with further elapsed time and no intervening page loads. **Both run-1 decodes were right.**
   The error was reading elapsed time as measurement error — and it was only caught because the owner
   supplied the timing context the trace could not.

   The procedure contributed: its step-3 stop condition named only the `~1 hour` case, so a negative
   reading had no stated meaning and the run continued past a step nobody could interpret.

**The lesson, and the reason this section exists:** a measurement procedure needs a control and a stated
meaning for *every* outcome, not just the expected one. Run 2's steps each carry a stop condition covering
negative, near-expiry and ~1h readings, and the owner decodes nothing at all — the trace does it, so the
class of error that produced run 1's ambiguity is designed out rather than warned about.

---

## 5. What remains unverified

- **CI does not run any of this.** `verify:middleware` is developer-run and no E2E stage exists yet —
  **N-29**'s shape at a second site. U14's `Content-Security-Policy-Report-Only` header is the liveness
  predicate that makes it CI-enforced, since that header cannot appear unless the middleware executed.
- **This is one local production build against one project**, exercised by hand. It is evidence the
  activation works, not a regression guard that it keeps working.
- **The 30 `E2E_LIVE`-gated specs remain unrun** (`BLOCKED(env)`), so the authed flows this activation
  touches are still not covered by anything automated.

---

## Appendix A — the raw trace

Complete `grep U27-PROBE /tmp/u27-trace.log` output from run 2, added after the record was first written.
**The figures in §2 were transcribed from the owner's step-by-step report before this arrived; this
appendix is the primary source they were transcribed from, and it corroborates each of them.**

**Redactions**, consistent with §0: the project ref is reduced to `<ref>`, and two stack UUIDs — identifiers
of the owner's own rows — to `<stack-id-1>` / `<stack-id-2>`. Nothing else is altered; no token or cookie
value was ever logged.

```
{"path":"/","method":"GET","hadSession":true,"expiresInSeconds":-946,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}
{"path":"/advisor","method":"GET","hadSession":true,"expiresInSeconds":119,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library","method":"GET","hadSession":true,"expiresInSeconds":119,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":true,"expiresInSeconds":119,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/","method":"POST","hadSession":true,"expiresInSeconds":105,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/auth/login","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/profile","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/magnesium","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/creatine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/vitamin-d","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/fish-oil","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/l-theanine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/melatonin","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/ashwagandha","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/glycine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/berberine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/zinc","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/vitamin-b12","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/caffeine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/profile","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/auth/login","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/magnesium","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/vitamin-d","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/creatine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/fish-oil","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/l-theanine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/glycine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/melatonin","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/ashwagandha","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/berberine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/zinc","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/vitamin-b12","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library/caffeine","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/auth/login","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/auth/signup","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/auth/login","method":"POST","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":true,"expiresInSeconds":120,"refreshOccurred":false,"cookiesWritten":[]}     <-- R3 CONTROL
{"path":"/stack-lab/<stack-id-1>","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/advisor","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab/<stack-id-2>","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":true,"expiresInSeconds":97,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/profile","method":"GET","hadSession":true,"expiresInSeconds":91,"refreshOccurred":false,"cookiesWritten":[]}        <-- 91: NO refresh
{"path":"/.well-known/appspecific/com.chrome.devtools.json","method":"GET","hadSession":true,"expiresInSeconds":43,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}   <-- N-36
{"path":"/stack-lab","method":"GET","hadSession":true,"expiresInSeconds":93,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/.well-known/appspecific/com.chrome.devtools.json","method":"GET","hadSession":true,"expiresInSeconds":88,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}   <-- N-36
{"path":"/advisor","method":"GET","hadSession":true,"expiresInSeconds":88,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}                                            <-- 88: refresh
{"path":"/","method":"GET","hadSession":true,"expiresInSeconds":88,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}
{"path":"/stack-lab/<stack-id-1>","method":"GET","hadSession":true,"expiresInSeconds":88,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}
{"path":"/stack-lab/<stack-id-2>","method":"GET","hadSession":true,"expiresInSeconds":88,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}
{"path":"/library","method":"GET","hadSession":true,"expiresInSeconds":-79,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}
{"path":"/profile","method":"GET","hadSession":true,"expiresInSeconds":-79,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}
{"path":"/stack-lab","method":"GET","hadSession":true,"expiresInSeconds":-37,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}   <-- R5 DECISIVE
{"path":"/stack-lab/<stack-id-1>","method":"GET","hadSession":true,"expiresInSeconds":112,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/advisor","method":"GET","hadSession":true,"expiresInSeconds":112,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/","method":"GET","hadSession":true,"expiresInSeconds":112,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab/<stack-id-2>","method":"GET","hadSession":true,"expiresInSeconds":112,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/profile","method":"GET","hadSession":true,"expiresInSeconds":97,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library","method":"GET","hadSession":true,"expiresInSeconds":97,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/.well-known/appspecific/com.chrome.devtools.json","method":"GET","hadSession":true,"expiresInSeconds":96,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":true,"expiresInSeconds":88,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}
{"path":"/.well-known/appspecific/com.chrome.devtools.json","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/advisor","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab/<stack-id-1>","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab/<stack-id-2>","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":true,"expiresInSeconds":115,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/advisor","method":"GET","hadSession":true,"expiresInSeconds":-246,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}    <-- R6
{"path":"/.well-known/appspecific/com.chrome.devtools.json","method":"GET","hadSession":true,"expiresInSeconds":117,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/","method":"GET","hadSession":true,"expiresInSeconds":117,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":true,"expiresInSeconds":-125,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}  <-- R7 RUN-1 REPLAY
{"path":"/.well-known/appspecific/com.chrome.devtools.json","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/advisor","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab/<stack-id-2>","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab/<stack-id-1>","method":"GET","hadSession":true,"expiresInSeconds":116,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":true,"expiresInSeconds":111,"refreshOccurred":false,"cookiesWritten":[]}   <-- R7b: run-1's SYMPTOM, correct
{"path":"/.well-known/appspecific/com.chrome.devtools.json","method":"GET","hadSession":true,"expiresInSeconds":106,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/advisor","method":"GET","hadSession":true,"expiresInSeconds":106,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/","method":"GET","hadSession":true,"expiresInSeconds":106,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab/<stack-id-1>","method":"GET","hadSession":true,"expiresInSeconds":106,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab/<stack-id-2>","method":"GET","hadSession":true,"expiresInSeconds":106,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/profile","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}   <-- R8 anonymous
{"path":"/auth/login","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/profile","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/auth/signup","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"POST","hadSession":true,"expiresInSeconds":-120,"refreshOccurred":true,"cookiesWritten":["sb-<ref>-auth-token"]}  <-- R9 sign-out POST
{"path":"/","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/auth/login","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/library","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
{"path":"/stack-lab","method":"GET","hadSession":false,"expiresInSeconds":null,"refreshOccurred":false,"cookiesWritten":[]}
```

### A.1 The margin is exactly 90 seconds, not approximately

§3.1 said "~90 seconds" from a single observation. The full trace pins it, because it contains the
boundary from both sides:

| `expiresInSeconds` | `refreshOccurred` |
|---|---|
| 120, 119, 117, 116, 115, 112, 111, 106, 105, 97, 96, 93, **91** | **false** — every time |
| **88**, 43, −37, −79, −120, −125, −246, −946 | **true** — every time |

**No refresh at 91; every refresh at 88 or below.** That is `EXPIRY_MARGIN_MS` in `@supabase/auth-js`
(`AUTO_REFRESH_TICK_THRESHOLD × AUTO_REFRESH_TICK_DURATION_MS` = 3 × 30 s = **90 s**), observed rather than
read off a constant. With a 120-second token that leaves a **30-second window** in which a page load does
not refresh — and run 1's entire "path-dependent" pattern fits inside it.

### A.2 What the appendix adds that the transcription did not

- **The `-946` line is the first in the file**, confirming §2.1's unscripted observation arrived before any
  scripted step.
- **The N-36 consumer is not a one-off.** `/.well-known/appspecific/com.chrome.devtools.json` appears
  **eight** times, and refreshed on two of them — at 43 and at 88. The 43 line is the sharpest: the very
  next `/stack-lab` load reads 93 and correctly does not refresh. **That is run 1's failure mode captured
  in two adjacent lines** — a refresh consumed by a request the Doc filter never showed, followed by a
  document load that legitimately shows no `Set-Cookie`.
- **Sign-out itself refreshed** (`/stack-lab` POST at −120), which no step predicted and nothing depends
  on; recorded because it is in the evidence.
- **Deviation confirmed:** extra loads between R5 and R7 are present, all `refreshOccurred:false` with
  fresh tokens, none affecting the decisive steps.
