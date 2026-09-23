create table if not exists scenario_snapshots (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references wedding_scenarios(id) on delete cascade,
  name text not null default 'Snapshot',
  note text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists scenario_snapshots_scenario_idx on scenario_snapshots (scenario_id);
alter table scenario_snapshots enable row level security;
drop policy if exists "shared all access" on scenario_snapshots;
create policy "shared all access" on scenario_snapshots for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
