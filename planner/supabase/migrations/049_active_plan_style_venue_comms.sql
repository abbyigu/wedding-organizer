alter table wedding_scenarios add column if not exists is_active boolean not null default false;
create unique index if not exists wedding_scenarios_one_active on wedding_scenarios (is_active) where is_active;
alter table wedding_style add column if not exists feeling jsonb not null default '[]'::jsonb;
alter table wedding_style add column if not exists tables_style jsonb not null default '[]'::jsonb;
alter table wedding_style add column if not exists flowers_style jsonb not null default '[]'::jsonb;
alter table wedding_style add column if not exists lighting_style jsonb not null default '[]'::jsonb;
alter table wedding_style add column if not exists attire_palette jsonb not null default '[]'::jsonb;
alter table wedding_style add column if not exists signature_details jsonb not null default '[]'::jsonb;
alter table wedding_style add column if not exists notes text not null default '';
create table if not exists venue_communications (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  occurred_on date not null default current_date,
  kind text not null default 'note',
  contact text not null default '',
  notes text not null default '',
  follow_up_date date,
  follow_up_done boolean not null default false,
  link text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists venue_communications_venue_idx on venue_communications (venue_id);
alter table venue_communications enable row level security;
drop policy if exists "shared all access" on venue_communications;
create policy "shared all access" on venue_communications for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
insert into wedding_style (id) values (true) on conflict (id) do nothing;
