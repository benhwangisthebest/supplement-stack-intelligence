-- ===========================================================================
-- A TEST DOUBLE FOR SUPABASE'S `auth` SCHEMA. THIS IS NOT THE REAL THING.
-- Phase 2 U15. Ruled Option B, 2026-08-12.
-- ===========================================================================
--
-- WHY THIS FILE EXISTS.
-- The Phase 2 exit criterion says CI must prove the migration set coherent by
-- applying every file in `supabase/migrations/` in order to a throwaway
-- Postgres. Measured before designing anything: THE MIGRATION SET CANNOT APPLY
-- TO A BARE POSTGRES. It fails at `0001_init.sql` line 7, because it depends on
-- objects Supabase's GoTrue creates and stock Postgres has never heard of:
--
--     10 foreign keys      references auth.users(id)
--     43 policy clauses    auth.uid()
--     10 grant/role refs   authenticated (9), anon (1)
--
-- So the criterion needed an instrument that did not exist. This is it.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS IS NOT — read this before trusting a green run (§2.2 rule 7)
-- ---------------------------------------------------------------------------
-- Supabase's real `auth` schema has MANY more columns on `auth.users` (email,
-- encrypted_password, confirmation timestamps, app/user metadata, and more),
-- many more functions (`auth.jwt()`, `auth.role()`, …), its own triggers, and
-- its own grants. This file reproduces ONLY the four things the migration set
-- actually references. It is deliberately minimal, and
-- `src/architecture/migration-tooling.test.ts` asserts it stays that way: a
-- non-auth object added here is a red build, so application tables can never
-- migrate into the double and be "proven" against themselves.
--
-- WHAT A GREEN CI RUN THEREFORE PROVES:
--   the migration set is INTERNALLY coherent — 13 tables, their constraints,
--   13 policies and 4 functions apply in order, on a real Postgres, with no
--   error, and the counter tables end up SELECT-only.
--
-- WHAT IT DOES NOT PROVE:
--   that the DEPLOYED Supabase `auth` schema conforms to this double. Nothing
--   in CI can prove that — CI holds no credentials, by design (P-03, this
--   repository is public). That residue is discharged the same way the
--   criterion already discharges the live-database residue: by a DATED MANUAL
--   RECORD, owner-run. See `docs/05-qa/2026-08-12-deployed-schema-record.md`,
--   whose §2 anchors these assumptions against the real database — that
--   `auth.users` exists with a `uuid` id, that `auth.uid()` is present, and
--   that the three roles exist. The double is anchored to reality once, on
--   record, rather than being assumed to match forever.
--
-- THIS FILE IS NOT A MIGRATION AND MUST NEVER MOVE INTO `supabase/migrations/`.
-- It is CI scaffolding. It is never applied to any real database, and the
-- guard asserts its path, because a test double that ships to production is
-- worse than no double at all.

create schema if not exists auth;

-- Only the column the migration set references: the FK target.
create table if not exists auth.users (
  id uuid primary key
);

-- The real implementation reads the request's JWT claims. Reproduced in shape
-- rather than simplified to `select null::uuid`, so a policy that depends on
-- the claim plumbing parses and behaves the same way here as in production.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

-- Grant targets and policy roles. `nologin`: nothing authenticates as these in
-- CI — they exist so `grant … to authenticated` resolves.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end
$$;
