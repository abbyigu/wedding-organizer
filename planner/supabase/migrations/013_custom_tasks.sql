-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Lets either of you add your own item to the dashboard's "What to do next"
-- list, alongside the ones the app derives automatically. Shared between
-- both of you, same as venues and guests.

create table if not exists custom_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New task',
  description text not null default '',
  person text not null default '',
  effort text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table custom_tasks enable row level security;

drop policy if exists "shared all access" on custom_tasks;
create policy "shared all access" on custom_tasks
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists custom_tasks_set_updated_at on custom_tasks;
create trigger custom_tasks_set_updated_at
  before update on custom_tasks
  for each row execute function set_updated_at();
