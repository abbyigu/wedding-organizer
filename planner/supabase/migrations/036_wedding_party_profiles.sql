-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Gives each wedding-party member a photo, an attire colour and flowers/accessories,
-- and adds a Responsibilities list (jobs assigned to a person, grouped by moment).

alter table wedding_party add column if not exists photo_url text not null default '';
alter table wedding_party add column if not exists attire_colour text not null default '';
alter table wedding_party add column if not exists attire_hex text not null default '';
alter table wedding_party add column if not exists flowers text not null default '';
alter table wedding_party add column if not exists accessories text not null default '';

create table if not exists wedding_party_tasks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references wedding_party(id) on delete set null,
  phase text not null default 'before',   -- before | morning | ceremony | reception
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table wedding_party_tasks enable row level security;

drop policy if exists "shared all access" on wedding_party_tasks;
create policy "shared all access" on wedding_party_tasks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
