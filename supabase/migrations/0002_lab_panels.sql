-- Migration 0002 — lab-timeline (Design §3.3). ADDITIVE ONLY.
-- Architecture Option C: legacy lab_markers rows (panel_id IS NULL) keep working
-- unchanged; no destructive change, no required data backfill.

-- ===== lab_panels (new) =====
create table if not exists public.lab_panels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'manual',          -- 'pdf' | 'csv' | 'paste' | 'manual'
  collected_at date not null,
  created_at timestamptz not null default now()
);

-- ===== lab_markers (additive columns only) =====
alter table public.lab_markers
  add column if not exists panel_id uuid references public.lab_panels(id) on delete cascade,
  add column if not exists biomarker_id text,        -- normalized canonical id (nullable)
  add column if not exists canonical_value numeric,  -- value in biomarker canonical unit
  add column if not exists canonical_unit text;

create index if not exists idx_lab_panels_user on public.lab_panels(user_id);
create index if not exists idx_lab_markers_panel on public.lab_markers(panel_id);
create index if not exists idx_lab_markers_user_biomarker
  on public.lab_markers(user_id, biomarker_id);

-- ===== Row Level Security =====
alter table public.lab_panels enable row level security;

-- Direct ownership: user_id = auth.uid() (mirrors own_lab_markers).
create policy "own_lab_panels" on public.lab_panels
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Note: lab_markers already has policy "own_lab_markers" (user_id = auth.uid()).
-- Panelled rows remain user-owned, so that policy already covers them — no change.
