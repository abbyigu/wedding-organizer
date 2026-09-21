-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- DIY becomes a real making workspace: a structured materials list per project
-- (quantity x unit price, need to buy / purchased / already owned), quantity
-- progress, hours, start date, favourites and a finished date. The Budget reads
-- the totals from here, so a cost is only ever entered once.

alter table diy_projects add column if not exists description text not null default '';
alter table diy_projects add column if not exists qty_done int not null default 0;
alter table diy_projects add column if not exists hours_estimate numeric;
alter table diy_projects add column if not exists start_date date;
alter table diy_projects add column if not exists is_favourite boolean not null default false;
alter table diy_projects add column if not exists finished_at timestamptz;

create table if not exists diy_materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references diy_projects(id) on delete cascade,
  name text not null default 'New material',
  qty numeric not null default 1,
  unit text not null default '',
  unit_price numeric not null default 0,
  status text not null default 'need',   -- need | purchased | owned
  source text not null default '',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table diy_materials enable row level security;

drop policy if exists "shared all access" on diy_materials;
create policy "shared all access" on diy_materials
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Projects that are already Finished get a finished date so the gallery can show it.
update diy_projects set finished_at = updated_at where status = 'finished' and finished_at is null;
