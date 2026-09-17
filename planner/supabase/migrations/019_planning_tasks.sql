-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Replaces the venue-only status board with a general wedding-planning
-- task board: every kind of to-do (not just venues) moves through the
-- same Ideas → To do → In progress → Waiting → Decision needed → Done
-- pipeline. Shared between both of you, same as venues and guests.

create table if not exists planning_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New task',
  category text not null default 'Other',
  notes text not null default '',
  assigned_to text not null default 'together',
  status text not null default 'ideas',
  priority text not null default 'normal',
  due_date date,
  effort text not null default '',
  estimated_cost numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table planning_tasks enable row level security;

drop policy if exists "shared all access" on planning_tasks;
create policy "shared all access" on planning_tasks
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists planning_tasks_set_updated_at on planning_tasks;
create trigger planning_tasks_set_updated_at
  before update on planning_tasks
  for each row execute function set_updated_at();
