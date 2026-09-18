-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Three additions: a Wedding Party roster, a gift Registry list, and more
-- room on wedding_events (menu, a linked vendor, a budget estimate) plus a
-- stable "key" so Rehearsal Dinner / Welcome Party / Brunch can each get
-- their own dedicated page instead of only living in the generic Events
-- list under Guests.

create table if not exists wedding_party (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'New member',
  role text not null default '',
  side text not null default 'Ariel',
  email text not null default '',
  phone text not null default '',
  attire text not null default '',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wedding_party enable row level security;

drop policy if exists "shared all access" on wedding_party;
create policy "shared all access" on wedding_party
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop trigger if exists wedding_party_set_updated_at on wedding_party;
create trigger wedding_party_set_updated_at before update on wedding_party
  for each row execute function set_updated_at();

create table if not exists registries (
  id uuid primary key default gen_random_uuid(),
  store_name text not null default 'New registry',
  url text not null default '',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table registries enable row level security;

drop policy if exists "shared all access" on registries;
create policy "shared all access" on registries
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop trigger if exists registries_set_updated_at on registries;
create trigger registries_set_updated_at before update on registries
  for each row execute function set_updated_at();

alter table wedding_events add column if not exists key text;
alter table wedding_events add column if not exists menu text not null default '';
alter table wedding_events add column if not exists vendor_id uuid references vendors(id) on delete set null;
alter table wedding_events add column if not exists budget_estimate numeric;
alter table wedding_events add column if not exists budget_notes text not null default '';

create unique index if not exists wedding_events_key_idx on wedding_events(key) where key is not null;

insert into wedding_events (key, title, sort_order)
select seed.key, seed.title, seed.sort_order
from (values
  ('rehearsal-dinner', 'Rehearsal Dinner', 100),
  ('welcome-party', 'Welcome Party', 101),
  ('brunch', 'Day-After Brunch', 102)
) as seed(key, title, sort_order)
where not exists (select 1 from wedding_events e where e.key = seed.key);
