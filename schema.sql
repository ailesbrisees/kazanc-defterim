-- Kazanç Defterim database schema. Run once in Supabase SQL Editor.
create table if not exists public.work_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique(user_id, name)
);
create table if not exists public.tariffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_type_id uuid not null references public.work_types(id) on delete cascade,
  package_quantity numeric(12,2) not null check(package_quantity > 0),
  package_price numeric(12,2) not null check(package_price > 0),
  effective_from date not null,
  created_at timestamptz not null default now()
);
create index if not exists tariffs_lookup_idx on public.tariffs(user_id, work_type_id, effective_from desc);
create table if not exists public.earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_type_id uuid not null references public.work_types(id) on delete restrict,
  tariff_id uuid references public.tariffs(id) on delete set null,
  quantity numeric(12,2) not null check(quantity > 0),
  unit_rate numeric(14,6) not null check(unit_rate >= 0),
  total_amount numeric(14,2) not null check(total_amount >= 0),
  work_date date not null,
  note text check(note is null or char_length(note) <= 160),
  created_at timestamptz not null default now()
);
create index if not exists earnings_user_date_idx on public.earnings(user_id, work_date desc);

alter table public.work_types enable row level security;
alter table public.tariffs enable row level security;
alter table public.earnings enable row level security;

drop policy if exists "Users manage own work types" on public.work_types;
create policy "Users manage own work types" on public.work_types for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own tariffs" on public.tariffs;
create policy "Users manage own tariffs" on public.tariffs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists(select 1 from public.work_types w where w.id = work_type_id and w.user_id = auth.uid()));
drop policy if exists "Users manage own earnings" on public.earnings;
create policy "Users manage own earnings" on public.earnings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists(select 1 from public.work_types w where w.id = work_type_id and w.user_id = auth.uid()));
