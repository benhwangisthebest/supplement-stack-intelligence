-- ===========================================================================
-- 0010 — self-service data deletion (Phase 2 U17, roadmap item 8, write half)
-- ===========================================================================
--
-- WHY THIS FUNCTION EXISTS AT ALL, AND WHY THE ROUTE CANNOT JUST ISSUE DELETES.
--
-- `advisor_usage` is SELECT-only. Migration 0008 removed the end user's
-- INSERT/UPDATE/DELETE deliberately (Phase 2 U3): a user who can delete their
-- own `advisor_usage` row resets the daily token budget that exists to
-- constrain them. That decision was correct and stands.
--
-- But `advisor_usage` is also ONE OF THE TWELVE USER-OWNED TABLES the deletion
-- criterion covers. So an anon-key client looping DELETEs over the twelve would
-- delete eleven of them and, on the twelfth, be filtered to ZERO ROWS BY RLS —
-- silently. RLS denial of a DELETE is not an error; it is an empty result
-- (measured, OP-2). The route would report success while the user's usage
-- history survived.
--
-- A SECURITY DEFINER function is therefore not an optimisation here. It is the
-- only way one of the twelve can be deleted at all. It also makes the whole
-- deletion ATOMIC, which a client cannot: supabase-js has no transaction API,
-- so twelve separate DELETEs can half-complete.
--
-- ---------------------------------------------------------------------------
-- THE MOST DANGEROUS THING THAT COULD BE WRITTEN HERE — read before editing
-- ---------------------------------------------------------------------------
-- THIS FUNCTION TAKES NO USER ID, AND MUST NEVER TAKE ONE.
--
--     delete_all_user_data(p_user_id uuid)   -- CATASTROPHIC. Never do this.
--
-- A SECURITY DEFINER function runs with the definer's privileges and bypasses
-- RLS. Given a user-id parameter, ANY authenticated caller could delete ANY
-- other user's entire record, irreversibly, with one request. The owner is
-- derived internally from `auth.uid()` and from nowhere else — the same shape
-- `reserve_advisor_tokens` uses, for the same reason.
--
-- `src/architecture/sql-function-registry.test.ts` pins the zero-parameter
-- signature, and the pin is mutation-proven: adding a parameter turns it red.
--
-- `set search_path = ''` is not decoration either: without it a caller can
-- prepend a schema they control and shadow any unqualified name this body
-- resolves, executing their own code with the definer's privileges. Every
-- identifier below is schema-qualified.
--
-- ---------------------------------------------------------------------------
-- WHAT IT DELETES, AND WHAT SURVIVES
-- ---------------------------------------------------------------------------
-- NINE explicit deletes. The other three of the twelve go by CASCADE:
--   stack_items      <- stacks              (on delete cascade)
--   evaluation_flags <- stacks, stack_items (on delete cascade)
--   advisor_messages <- advisor_conversations (on delete cascade)
--
-- `advisor_actions` is NOT one of those three: its `conversation_id` is
-- ON DELETE SET NULL, not cascade, so deleting conversations would leave the
-- actions behind with a null link. It is directly owned and gets its own
-- delete. That distinction is easy to misread in the FK text, which is why
-- `npm run verify:migrations` EXECUTES the cascade proof against a real
-- Postgres rather than reading it.
--
-- SURVIVES, deliberately, and stated in the API response so no user has to
-- discover it:
--   * `auth.users` — the identity row. Deleting it needs the service-role key,
--     which CLAUDE.md §2.3 rule 14 confines to the dev seed script. "Delete my
--     data" is satisfiable; "delete my account" is not.
--   * `api_rate_limits` — the thirteenth table, excluded from the twelve
--     because it records a limiter's state against an opaque bucket key. Note
--     that `consume_rate_limit` DOES write `user_id` into it, so rows bearing
--     the user's id outlive this call. They are SELECT-only and cascade only
--     from `auth.users`, which cannot be deleted here.
--
-- ---------------------------------------------------------------------------
-- DEPLOYMENT ORDER — THE REVERSE OF OP-1's, AND THE REVERSAL IS THE POINT
-- ---------------------------------------------------------------------------
-- OP-1 (migration 0008) was CODE FIRST, never the migration alone.
-- THIS ONE IS MIGRATION FIRST, never the code alone:
--
--   * 0010 deployed with old code  -> a harmless unused function.
--   * U17 code deployed without 0010 -> the DELETE route's RPC does not exist.
--
-- The second case must fail HONESTLY rather than partially: the route reports
-- 500 with no deletion counts, and deletes nothing. That is pinned by test, not
-- left to the driver's behaviour.

create or replace function public.delete_all_user_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_counts jsonb := '{}'::jsonb;
  v_n integer;
begin
  if v_user is null then
    raise exception 'delete_all_user_data requires an authenticated caller'
      using errcode = '28000';
  end if;

  -- Parents before children is not required (the cascades handle order), but
  -- counting each delete separately is: the API reports per-table counts, and a
  -- single total could not distinguish "deleted nothing" from "had nothing".

  delete from public.evaluation_flags
   where public.evaluation_flags.stack_id in (
     select s.id from public.stacks s where s.user_id = v_user
   );
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('evaluation_flags', v_n);

  delete from public.stack_items
   where public.stack_items.stack_id in (
     select s.id from public.stacks s where s.user_id = v_user
   );
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('stack_items', v_n);

  delete from public.advisor_messages
   where public.advisor_messages.conversation_id in (
     select c.id from public.advisor_conversations c where c.user_id = v_user
   );
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('advisor_messages', v_n);

  -- The three above would also disappear by cascade when their parents go. They
  -- are deleted explicitly anyway, so the function can REPORT their counts —
  -- a cascade removes rows without telling anyone how many. The cascade remains
  -- the safety net, and `verify:migrations` proves it still works.

  delete from public.stacks where public.stacks.user_id = v_user;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('stacks', v_n);

  delete from public.advisor_actions where public.advisor_actions.user_id = v_user;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('advisor_actions', v_n);

  delete from public.advisor_conversations where public.advisor_conversations.user_id = v_user;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('advisor_conversations', v_n);

  delete from public.lab_markers where public.lab_markers.user_id = v_user;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('lab_markers', v_n);

  delete from public.lab_panels where public.lab_panels.user_id = v_user;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('lab_panels', v_n);

  delete from public.checkins where public.checkins.user_id = v_user;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('checkins', v_n);

  delete from public.side_effect_reports where public.side_effect_reports.user_id = v_user;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('side_effect_reports', v_n);

  -- The reason this function exists. SELECT-only for the user (0008); reachable
  -- only from here.
  delete from public.advisor_usage where public.advisor_usage.user_id = v_user;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('advisor_usage', v_n);

  delete from public.user_profiles where public.user_profiles.user_id = v_user;
  get diagnostics v_n = row_count;
  v_counts := v_counts || jsonb_build_object('user_profiles', v_n);

  return v_counts;
end;
$$;

-- Least privilege: only a signed-in caller may invoke it, and `public` never.
revoke all on function public.delete_all_user_data() from public;
grant execute on function public.delete_all_user_data() to authenticated;

-- ---------------------------------------------------------------------------
-- OWNER-RUN VERIFICATION (plan §4.6). SAFE PROBES ONLY — read-only plus one
-- null-claim call that touches no data. The cascade and emptiness proofs live
-- in CI against a throwaway Postgres (`npm run verify:migrations`), which is
-- exactly what U15 was built to make possible; NOTHING here deletes live rows.
--
--   -- 1. the function exists, returns jsonb, takes NO parameters
--   select p.proname, pg_get_function_identity_arguments(p.oid) as args,
--          pg_get_function_result(p.oid) as returns, p.prosecdef
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'delete_all_user_data';
--   -- expect: 1 row, args EMPTY, returns jsonb, prosecdef = t
--
--   -- 2. search_path is pinned
--   select proconfig from pg_proc where proname = 'delete_all_user_data';
--   -- expect: {search_path=""}
--
--   -- 3. it refuses an unauthenticated caller, and deletes nothing doing so
--   set local role authenticated;               -- no request.jwt.claims set
--   select public.delete_all_user_data();
--   -- expect: ERROR 28000 "requires an authenticated caller". auth.uid() is
--   -- NULL, the function raises before its first delete, and no row is touched.
-- ---------------------------------------------------------------------------
