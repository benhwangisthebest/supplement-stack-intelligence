-- Migration 0009 — per-identity request rate limits (Phase 2 U5).
--
-- CLAUDE.md §4 rule 9: "any endpoint calling a paid external API needs an atomic
-- per-user budget reservation AND a request rate limit". 0008 + U4 delivered the
-- first half for the advisor. This is the second half, and it covers BOTH paid
-- routes — `/api/advisor` and `/api/lab-import/extract`, the latter of which had
-- neither control (finding N-1).
--
-- ===========================================================================
-- THIS TABLE IS A COUNTER, NOT CONTENT — it follows 0008, not 0003
-- ===========================================================================
-- 0008 established the rule: `for all using (user_id = auth.uid())` is correct
-- for user-owned CONTENT and wrong for a COUNTER THAT CONSTRAINS THAT SAME USER.
-- `api_rate_limits` is the second such counter in this schema, and it is born
-- with the corrected shape rather than acquiring it in a later migration:
--
--   SELECT on your own rows       → allowed (nothing sensitive, and it lets a
--                                    future UI say "try again in N seconds")
--   INSERT / UPDATE / DELETE      → no policy at all, therefore denied
--   writes                        → only through the SECURITY DEFINER function
--
-- A user who could DELETE from this table would have no rate limit, exactly as a
-- user who could DELETE from `advisor_usage` had no budget.
--
-- ===========================================================================
-- IDENTITY: why there is a `bucket_key` and not a `user_id`
-- ===========================================================================
-- A limit keyed only to `auth.uid()` cannot restrain an unauthenticated caller,
-- and both paid routes reject anonymous callers today — but the identity a limit
-- is keyed on must survive that changing. `bucket_key` therefore holds an opaque
-- string the application composes (`"user:<uuid>"` today), so a future per-IP or
-- per-key bucket needs no migration. `user_id` is kept ALONGSIDE it, nullable,
-- purely so RLS can grant the SELECT — it is not the key.
--
-- ---------------------------------------------------------------------------
-- OWNER-RUN VERIFICATION (plan §4.6 OP-2's sibling; CI proves none of this)
-- ---------------------------------------------------------------------------
-- As the *authenticated* role — a superuser session bypasses RLS and reports a
-- false pass:
--   delete from public.api_rate_limits;                    -- expect: denied
--   insert into public.api_rate_limits(bucket_key, window_start, request_count)
--     values ('user:me', now(), 0);                        -- expect: denied
--   select * from public.api_rate_limits;                  -- expect: own rows
--   select public.consume_rate_limit('user:me', 60, 5);    -- expect: 1..5 then 0

create table if not exists public.api_rate_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (bucket_key, window_start)
);

create index if not exists idx_api_rate_limits_window
  on public.api_rate_limits(window_start);

alter table public.api_rate_limits enable row level security;

create policy "read_own_api_rate_limits" on public.api_rate_limits
  for select using (user_id = auth.uid());

-- ===== The only sanctioned write path ========================================

-- Record one request against `p_bucket_key` and report the resulting count.
-- Returns the count AFTER this request when it is allowed, or 0 when the window
-- is already full. The caller must treat 0 as "refuse with 429".
--
-- ATOMICITY: the whole decision is one `insert … on conflict do update … where`
-- statement. The WHERE on the DO UPDATE branch is the compare-and-set: two
-- concurrent requests serialise on the row lock, and the second sees the first's
-- increment. `returning` reports what was actually written, so a caller cannot
-- act on a value it merely read.
--
-- The window is FIXED, not sliding: `window_start` is the current time floored to
-- `p_window_seconds`. A fixed window admits up to 2×limit across a boundary,
-- which is the standard, accepted cost of not keeping per-request timestamps.
-- Said here rather than discovered later.
create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_window_seconds integer,
  p_limit integer
)
returns integer
language plpgsql
security definer
-- See sql-function-registry.test.ts: an unpinned search_path lets a caller
-- shadow an unqualified name and run their own code with the definer's rights.
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_window timestamptz;
  v_count integer;
begin
  if p_bucket_key is null or p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'consume_rate_limit requires a bucket key and a positive window'
      using errcode = '22023';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits (bucket_key, window_start, request_count, user_id)
  values (p_bucket_key, v_window, 1, v_user)
  on conflict (bucket_key, window_start) do update
    set request_count = public.api_rate_limits.request_count + 1
    where public.api_rate_limits.request_count < p_limit
  returning public.api_rate_limits.request_count into v_count;

  -- No row returned means the DO UPDATE's WHERE refused: the window is full.
  if v_count is null then
    return 0;
  end if;
  return v_count;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;
