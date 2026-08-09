-- Migration 0008 — the token ledger leaves the user's reach (Phase 2 U3).
--
-- ===========================================================================
-- WHAT WAS WRONG
-- ===========================================================================
-- 0003 shipped `advisor_usage` with the same policy shape as every other
-- user-owned table:
--
--   create policy "own_advisor_usage" on public.advisor_usage
--     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
--
-- `for all` covers SELECT, INSERT, UPDATE **and DELETE**. `advisor_usage` is
-- not content — it is a COUNTER THAT EXISTS TO CONSTRAIN THE USER IT BELONGS
-- TO. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ships to the browser by construction and
-- PostgREST is reachable directly, so any authenticated user could
--
--   DELETE FROM advisor_usage WHERE user_id = <their own id>
--
-- and reset their daily token budget to full, repeatedly, against a paid API.
-- RLS was working exactly as written; what was wrong was the policy.
--
-- THE GENERALISABLE RULE, which is the reason this file exists rather than a
-- one-line patch: `for all using (user_id = auth.uid())` is CORRECT for
-- user-owned CONTENT — a user may delete their own stacks, profile, check-ins.
-- It is WRONG for a counter that constrains that same user. Of the tables in
-- this schema exactly one is such a counter today. Any rate-limit table added
-- later is the second, and must follow this file, not 0003.
--
-- Severity, stated honestly: a cost/abuse vector, not a confidentiality breach.
-- RLS still confined each user to their own row, so no other user's data was
-- ever reachable.
--
-- ===========================================================================
-- TARGET STATE — exactly which operations remain, and why the app still works
-- ===========================================================================
-- For the END USER (the `authenticated` role, holding the anon key + their JWT):
--   SELECT  on their own row      → ALLOWED. `getRemainingBudget` reads it, and
--                                   a user learning their own token usage is
--                                   not a risk.
--   INSERT / UPDATE / DELETE      → NO POLICY AT ALL. Under RLS an operation
--                                   with no permissive policy is denied, so all
--                                   three are refused. There is deliberately no
--                                   "deny" policy: absence IS the denial, and a
--                                   written deny would imply the others were
--                                   granted somewhere.
--
-- The application's write path still works because it stops writing the table
-- directly and calls the two SECURITY DEFINER functions below, which run as
-- their owner and therefore bypass RLS. The user can still only affect their
-- OWN ledger, because neither function accepts a user id: both derive it from
-- `auth.uid()` internally. A `p_user_id` parameter here would hand every user
-- the ability to charge someone else's budget — which is why
-- `src/architecture/sql-function-registry.test.ts` fails on one.
--
-- ---------------------------------------------------------------------------
-- DEPLOYMENT ORDER — READ BEFORE APPLYING
-- ---------------------------------------------------------------------------
-- This migration and the application change that calls the new functions (U4)
-- are one deployment. Applying 0008 to a database whose deployed code still
-- calls `.from("advisor_usage").upsert(...)` will make every advisor turn fail
-- to record usage — the write is denied, `recordUsage` raises, and the turn
-- 500s AFTER the paid call has already been made. Deploy the code first, or
-- both together; never this file alone.
--
-- ---------------------------------------------------------------------------
-- OWNER-RUN VERIFICATION (nothing below is proven by CI)
-- ---------------------------------------------------------------------------
-- Every guard in this repository checks this file as TEXT. Three properties can
-- only be established against a live Postgres, and are NOT claimed anywhere in
-- the test suite. Run these after applying, as the *authenticated* role — a
-- psql superuser session bypasses RLS and will report a false pass:
--
--   -- 1. the hole is closed (expect: 0 rows deleted / "new row violates" style
--   --    denial, NOT a silent success)
--   delete from public.advisor_usage where user_id = auth.uid();
--   update public.advisor_usage set input_tokens = 0 where user_id = auth.uid();
--
--   -- 2. the read still works
--   select * from public.advisor_usage where user_id = auth.uid();
--
--   -- 3. the writer works and is capped
--   select public.reserve_advisor_tokens(1000, 200000);   -- expect 1000
--   select public.reserve_advisor_tokens(1000, 500);      -- expect 0 (refused)
--
-- Record the output in `docs/05-qa/` with a date, per the U17 pattern. Until
-- that record exists, "the ledger is user-writable" is closed IN THE MIGRATION
-- SET and unverified AGAINST THE DEPLOYED DATABASE. Those are different claims.

-- ===== 1. Replace the over-broad policy ======================================
-- Dropped and replaced in the SAME migration, so the table is never left with
-- RLS enabled and zero policies (which would deny even the read).
drop policy if exists "own_advisor_usage" on public.advisor_usage;

create policy "read_own_advisor_usage" on public.advisor_usage
  for select using (user_id = auth.uid());

-- ===== 2. The only sanctioned write path =====================================

-- Reserve up to `p_amount` tokens against today's budget.
-- Returns the amount granted: `p_amount` on success, 0 if the reservation would
-- breach `p_daily_budget`. The caller must treat 0 as a refusal.
--
-- ATOMICITY: the UPDATE is a compare-and-set. Its WHERE clause re-reads
-- `input_tokens + output_tokens` inside the same statement that writes them, so
-- two concurrent reservations serialise on the row lock and the second sees the
-- first's result. There is no read-then-write window for a caller to lose.
create or replace function public.reserve_advisor_tokens(
  p_amount integer,
  p_daily_budget integer
)
returns integer
language plpgsql
security definer
-- An empty search_path is not decoration: without it a caller can prepend a
-- schema they control and shadow any unqualified name this body resolves,
-- executing their own code with the definer's privileges. Every identifier
-- below is therefore schema-qualified.
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'reserve_advisor_tokens requires an authenticated caller'
      using errcode = '28000';
  end if;
  if p_amount is null or p_amount <= 0 then
    return 0;
  end if;

  insert into public.advisor_usage (user_id, usage_date, input_tokens, output_tokens)
  values (v_user, current_date, 0, 0)
  on conflict (user_id, usage_date) do nothing;

  update public.advisor_usage
     set input_tokens = public.advisor_usage.input_tokens + p_amount
   where public.advisor_usage.user_id = v_user
     and public.advisor_usage.usage_date = current_date
     and public.advisor_usage.input_tokens
       + public.advisor_usage.output_tokens
       + p_amount <= p_daily_budget;

  if not found then
    return 0;
  end if;
  return p_amount;
end;
$$;

-- Settle a reservation against what was actually spent.
-- `p_reserved` is released and the real usage charged, in one statement, so a
-- crash between the two cannot leave the reservation held forever *and* the
-- usage uncharged.
create or replace function public.settle_advisor_tokens(
  p_reserved integer,
  p_input_tokens integer,
  p_output_tokens integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'settle_advisor_tokens requires an authenticated caller'
      using errcode = '28000';
  end if;

  update public.advisor_usage
     set input_tokens = greatest(
           0,
           public.advisor_usage.input_tokens
             - coalesce(p_reserved, 0)
             + coalesce(p_input_tokens, 0)
         ),
         output_tokens = public.advisor_usage.output_tokens
           + coalesce(p_output_tokens, 0)
   where public.advisor_usage.user_id = v_user
     and public.advisor_usage.usage_date = current_date;
end;
$$;

-- ===== 3. Who may call them ==================================================
-- Default EXECUTE on a function is granted to PUBLIC, which for a SECURITY
-- DEFINER function means anonymous callers run it with the owner's rights. Both
-- bodies refuse a null `auth.uid()`, so this is defence in depth rather than
-- the only barrier — but relying on the body alone is how the next function
-- gets it wrong.
revoke all on function public.reserve_advisor_tokens(integer, integer) from public;
revoke all on function public.settle_advisor_tokens(integer, integer, integer) from public;

grant execute on function public.reserve_advisor_tokens(integer, integer) to authenticated;
grant execute on function public.settle_advisor_tokens(integer, integer, integer) to authenticated;
