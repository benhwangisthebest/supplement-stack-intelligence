-- mvp-core-loop initial schema (Design §3.3)
-- RLS enabled on every table; policy: user_id = auth.uid() (Design §7)

-- ===== user_profiles =====
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  goals text[] not null default '{}',
  diet text,
  risk_tolerance text,
  allergies text[] not null default '{}',
  medications text[] not null default '{}',
  avoided_ingredients text[] not null default '{}',
  form_preferences text[] not null default '{}',
  caffeine_sensitivity boolean,
  experience_level text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== lab_markers =====
create table if not exists public.lab_markers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marker text not null,
  value numeric not null,
  unit text not null,
  reference_low numeric,
  reference_high numeric,
  date date,
  notes text
);

-- ===== stacks =====
create table if not exists public.stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  intent text not null,
  mode text not null default 'current',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== stack_items =====
-- supplement_id is a SOFT reference to seed data (no FK) (Design §3.3).
create table if not exists public.stack_items (
  id uuid primary key default gen_random_uuid(),
  stack_id uuid not null references public.stacks(id) on delete cascade,
  supplement_id text,
  custom_name text,
  dose numeric not null,
  unit text not null,
  timing text,
  frequency text,
  reason text,
  notes text
);

-- ===== evaluation_flags =====
create table if not exists public.evaluation_flags (
  id uuid primary key default gen_random_uuid(),
  stack_id uuid not null references public.stacks(id) on delete cascade,
  stack_item_id uuid references public.stack_items(id) on delete cascade,
  severity text not null,
  category text not null,
  title text not null,
  explanation text not null,
  recommendation text not null,
  evidence_level text not null default 'n/a',
  created_at timestamptz not null default now()
);

create index if not exists idx_lab_markers_user on public.lab_markers(user_id);
create index if not exists idx_stacks_user on public.stacks(user_id);
create index if not exists idx_stack_items_stack on public.stack_items(stack_id);
create index if not exists idx_evaluation_flags_stack on public.evaluation_flags(stack_id);

-- ===== Row Level Security =====
alter table public.user_profiles enable row level security;
alter table public.lab_markers enable row level security;
alter table public.stacks enable row level security;
alter table public.stack_items enable row level security;
alter table public.evaluation_flags enable row level security;

-- Direct ownership tables: user_id = auth.uid()
create policy "own_profiles" on public.user_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_lab_markers" on public.lab_markers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_stacks" on public.stacks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Child tables: ownership derived from the parent stack.
create policy "own_stack_items" on public.stack_items
  for all
  using (exists (
    select 1 from public.stacks s
    where s.id = stack_items.stack_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.stacks s
    where s.id = stack_items.stack_id and s.user_id = auth.uid()
  ));

create policy "own_evaluation_flags" on public.evaluation_flags
  for all
  using (exists (
    select 1 from public.stacks s
    where s.id = evaluation_flags.stack_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.stacks s
    where s.id = evaluation_flags.stack_id and s.user_id = auth.uid()
  ));

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_touch before update on public.user_profiles
  for each row execute function public.touch_updated_at();
create trigger trg_stacks_touch before update on public.stacks
  for each row execute function public.touch_updated_at();
