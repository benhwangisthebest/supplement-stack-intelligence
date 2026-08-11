# Middleware activation smoke — Phase 2 U27 — 2026-08-11

**STATUS: PROCEDURE ONLY. NOT YET RUN.** U27 does not merge until the Results section below is filled in
and dated by the repository owner.

| | |
|---|---|
| **Unit** | Phase 2 **U27** — the middleware has never run (finding **N-34**) |
| **Run by** | repository owner (owner-run: it needs real credentials and a live Supabase project) |
| **Instance** | local production build (`npm run build && npm start`) against the owner's Supabase project |
| **Repo state** | `feat/u27-middleware` @ *(fill in SHA)* |
| **Why owner-run** | the change activates auth machinery. The 64 non-live E2E specs exercise **none** of the auth paths it switches on, and the live half of the suite is `BLOCKED(env)` per `phase-1-live-e2e-baseline.md`. No automated check in this repository can verify it |

---

## 0. What this smoke is for, and what it is not

U27 moves `middleware.ts` to `src/middleware.ts`, the only path Next compiles in a project with a `src/`
directory. That **activates** `updateSession` — the Supabase session refresh of Design §7 — which has never
executed since `910d773` (2026-06-12).

**It verifies one activation and one non-regression, and the two must not be confused:**

- **ACTIVATION (new behaviour):** a refreshed auth cookie is now persisted on plain navigation.
- **REGRESSION (must not change):** everything else — page loads, the anonymous redirect, sign-out.

**Step 6's anonymous redirect is a REGRESSION check, not an activation check.** Measured, not assumed:
`/profile`, `/stack-lab` and `/advisor` each call `requireUser()` in the page itself;
`src/lib/supabase/middleware.ts` contains no redirect and has never gated anything; and the E2E specs
asserting that redirect **pass on `main` today, where the middleware is inert.** The redirect is page-level
protection that predates this unit. This record must not claim the smoke verified middleware-based auth
gating, because there is none.

---

## 1. Preconditions

1. Working tree on `feat/u27-middleware`. Record the SHA.
2. `.env.local` populated with the real Supabase project.
3. A signed-up, email-confirmed account you can log in with.
4. Browser devtools open, **Network** tab, **Preserve log ON**, before step 2.
5. **The cookie name:** `sb-<ref>-auth-token`, where `<ref>` is the subdomain of
   `NEXT_PUBLIC_SUPABASE_URL`. It may be **chunked** — `sb-<ref>-auth-token.0`, `.1`. Any chunk counts.

### 1.1 The forcing step — REQUIRED, and the ordering is load-bearing

Supabase access tokens default to **1 hour**, and a refresh only fires when the token is near expiry. Sign
in and navigate ten minutes later and an absent `Set-Cookie` is the *expected* result — the smoke would end
inconclusive by design. So:

> **Supabase dashboard → Authentication → Sessions/Tokens → JWT expiry: set to `120` seconds.**

**Soundness — checked, and the answer changes the order of operations.** Lowering this setting does **not**
invalidate the current session, and does **not** revoke refresh tokens: it governs **newly issued** access
tokens only, and any token already issued stays valid until its own `exp`.

**That is precisely why the expiry must be lowered BEFORE step 2's sign-in.** Lower it afterwards and the
session you are testing still carries a 1-hour token, steps 4–5 observe nothing, and the smoke is
inconclusive anyway — the failure mode the forcing step exists to remove.

Two cautions:

- **This is a project-wide setting on a live instance.** Every session issued during the window is
  short-lived. Run it when no one else is using the project, and keep the window short.
- **The dashboard may enforce a minimum** above 120s (300s is a commonly enforced floor). If `120` is
  rejected, use the lowest value it accepts and extend step 4's navigation window to just over that value.
  Record the value you actually used.

**Restore the original value immediately after step 7, and record both the temporary value and the
restoration below.** An unrestored 120s expiry is a live-instance change left behind by a test.

---

## 2. Procedure

| # | Step | What to look for | Pass condition |
|---|---|---|---|
| **0** | `npm run build` | A `ƒ Middleware` line in the build output, then `npm run verify:middleware` | Both present; script exits 0 |
| **1** | `npm start`, load `/library/creatine` **signed out** | Page renders, no redirect loop | 200, renders |
| **2** | Sign in | Redirect to `/stack-lab`; `Set-Cookie` for `sb-<ref>-auth-token` on the action response | Cookie set |
| **3** | Copy the cookie value, decode the JWT, record `exp` | Access-token expiry as epoch seconds. With a 120s expiry this should be ~2 min out — **if it is ~1 hour out, the forcing step did not take effect: stop, fix §1.1's ordering, restart from step 2** | `exp − now ≈` the configured expiry |
| **4** | **Navigate only** for **~3 minutes** (or just over the configured expiry): Library → Profile → Stack Lab → Advisor → Library. **No forms, no saves, no actions** | On each *document* response, does `Set-Cookie` for the auth cookie appear? Record yes/no per navigation | **At least one navigation carries `Set-Cookie`** |
| **5** | Re-read the cookie, decode `exp` again | Has the access token been replaced with a later `exp`? | **`exp` has advanced** |
| **6** | Private window → `/profile`, then `/stack-lab` | Redirect to `/auth/login`, exactly once, no loop | Redirect, no loop |
| **7** | Sign out | Auth cookie cleared; `/profile` redirects again | Cleared |
| **8** | **Restore the JWT expiry** to its original value | Dashboard shows the original value | Restored |

**Steps 4 and 5 are the discriminating pair.** Middleware is the only thing that can persist a refreshed
auth cookie on a plain navigation response — in a Server Component the cookie write throws and is swallowed
by `src/lib/supabase/server.ts`. Before U27 this never happened. With a 120s expiry it must happen within
step 4's window, or the middleware is not doing its job.

### Redlines — stop, do not merge, report

- Any **redirect loop** on any route (the classic middleware failure mode).
- Any **500** on a page that rendered before.
- **Sign-out does not clear** the cookie.
- Anonymous access **reaches** `/profile` or `/stack-lab` content.
- Step 4 produces **no** `Set-Cookie` **and** step 5 shows **no** `exp` advance, with the forcing step
  confirmed active at step 3 → the activation did not work. That is a failed unit, not a failed test.

---

## 3. Results — *to be completed by the owner*

| Field | Value |
|---|---|
| Date run | |
| Run by | |
| Repo SHA | |
| JWT expiry set to | *(temporary value)* |
| JWT expiry restored to | *(original value; confirm restored)* |

| Step | Observed | Pass/Fail |
|---|---|---|
| 0 build + `verify:middleware` | | |
| 1 signed-out page load | | |
| 2 sign-in `Set-Cookie` | | |
| 3 `exp` at sign-in (`exp − now`) | | |
| 4 navigations carrying `Set-Cookie` (n of n) | | |
| 5 `exp` after navigation (advanced?) | | |
| 6 anonymous redirect *(regression check)* | | |
| 7 sign-out clears cookie | | |
| 8 expiry restored | | |

**Redlines hit:** *(list, or "none")*

**Verdict:** *(ACTIVATION CONFIRMED / NOT CONFIRMED / INCONCLUSIVE — and why)*

---

## 4. Redaction

Per the posture `2026-08-10-rate-limit-policy-verification.md` established: **do not paste** the project
ref, the user's `sub`, or any full JWT into this document. Record only whether values changed and the `exp`
deltas in seconds. A cookie value is a bearer credential; §2.3 rule 15 applies to this file as much as to
application logs.
