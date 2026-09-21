-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- A shared list of budget notes: reminders, decisions and ideas.
create table if not exists budget_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_at timestamptz not null default now()
);

alter table budget_notes enable row level security;

drop policy if exists "shared all access" on budget_notes;
create policy "shared all access" on budget_notes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
