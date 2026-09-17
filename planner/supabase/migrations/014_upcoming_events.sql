-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Backs the dashboard's "Upcoming" card — venue tours, quote deadlines,
-- calls, payment deadlines, family planning meetings. Shared between both
-- of you, same as venues and guests.

create table if not exists upcoming_events (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New event',
  event_date date not null default current_date,
  type text not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table upcoming_events enable row level security;

drop policy if exists "shared all access" on upcoming_events;
create policy "shared all access" on upcoming_events
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists upcoming_events_set_updated_at on upcoming_events;
create trigger upcoming_events_set_updated_at
  before update on upcoming_events
  for each row execute function set_updated_at();
