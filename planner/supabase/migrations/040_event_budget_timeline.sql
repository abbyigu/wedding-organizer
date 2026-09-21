-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- 1) Each event gets its own mini-budget (venue, food, drinks, décor, tips…). The total
--    feeds the main Budget under "Wedding weekend", so it's only entered once.
-- 2) Lightweight Wedding Weekend timeline moments (guest free time, hotel check-in,
--    shuttle, getting ready…) that don't need a full event page.

create table if not exists event_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references wedding_events(id) on delete cascade,
  category text not null default 'Other',
  label text not null default 'New expense',
  amount numeric not null default 0,
  paid boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists timeline_moments (
  id uuid primary key default gen_random_uuid(),
  moment_date date not null,
  time text not null default '',
  title text not null default 'New moment',
  note text not null default '',
  kind text not null default 'other',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table event_expenses enable row level security;
alter table timeline_moments enable row level security;

drop policy if exists "shared all access" on event_expenses;
create policy "shared all access" on event_expenses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "shared all access" on timeline_moments;
create policy "shared all access" on timeline_moments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
