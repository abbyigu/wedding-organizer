-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Three new sections: the day-of run-of-show, a vendor tracker (beyond just
-- the venue), and a DIY projects list. Shared between both of you, same as
-- everything else.

create table if not exists wedding_day_events (
  id uuid primary key default gen_random_uuid(),
  time text not null default '',
  title text not null default 'New moment',
  location text not null default '',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wedding_day_events enable row level security;

drop policy if exists "shared all access" on wedding_day_events;
create policy "shared all access" on wedding_day_events
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists wedding_day_events_set_updated_at on wedding_day_events;
create trigger wedding_day_events_set_updated_at
  before update on wedding_day_events
  for each row execute function set_updated_at();

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'New vendor',
  category text not null default 'Other',
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  status text not null default 'researching',
  cost numeric,
  deposit_paid boolean not null default false,
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vendors enable row level security;

drop policy if exists "shared all access" on vendors;
create policy "shared all access" on vendors
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists vendors_set_updated_at on vendors;
create trigger vendors_set_updated_at
  before update on vendors
  for each row execute function set_updated_at();

create table if not exists diy_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New project',
  category text not null default 'Other',
  status text not null default 'idea',
  materials text not null default '',
  cost_estimate numeric,
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table diy_projects enable row level security;

drop policy if exists "shared all access" on diy_projects;
create policy "shared all access" on diy_projects
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists diy_projects_set_updated_at on diy_projects;
create trigger diy_projects_set_updated_at
  before update on diy_projects
  for each row execute function set_updated_at();
