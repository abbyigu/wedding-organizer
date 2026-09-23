create table if not exists wedding_scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'New scenario',
  description text not null default '',
  season text not null default '',
  wedding_date date,
  venue_id uuid references venues(id) on delete set null,
  invited integer,
  expected integer,
  adults integer,
  kids integer,
  target_budget numeric,
  contingency_pct numeric,
  archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists scenario_choices (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references wedding_scenarios(id) on delete cascade,
  category text not null,
  role text not null default 'selected' check (role in ('selected', 'alternative', 'not_needed', 'tbd')),
  ref_type text check (ref_type in ('vendor', 'diy', 'event', 'party', 'expense')),
  ref_id uuid,
  label text not null default '',
  amount numeric,
  unit text not null default 'flat',
  quantity numeric,
  cost_state text check (cost_state in ('included', 'na', 'unknown', 'zero')),
  plus_tax boolean not null default false,
  extra_confirmed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists scenario_choices_scenario_idx on scenario_choices (scenario_id);
alter table wedding_scenarios enable row level security;
alter table scenario_choices enable row level security;
drop policy if exists "shared all access" on wedding_scenarios;
create policy "shared all access" on wedding_scenarios for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "shared all access" on scenario_choices;
create policy "shared all access" on scenario_choices for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop trigger if exists wedding_scenarios_set_updated_at on wedding_scenarios;
create trigger wedding_scenarios_set_updated_at before update on wedding_scenarios for each row execute function set_updated_at();
