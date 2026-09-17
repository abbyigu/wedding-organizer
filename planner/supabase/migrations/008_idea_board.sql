-- Run this once in Supabase Dashboard → SQL Editor → New query
-- A private idea board (dresses, decor, flowers, etc.) — you paste a
-- Pinterest pin link (and optionally its image URL, for a preview
-- thumbnail), same owner-only visibility as private_notes.

create table if not exists idea_pins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  category text not null default 'Other',
  title text not null default '',
  pin_url text not null default '',
  image_url text not null default '',
  note text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table idea_pins enable row level security;

drop policy if exists "owner all access" on idea_pins;
create policy "owner all access" on idea_pins
  for all using (auth.role() = 'authenticated' and owner_id = auth.uid())
  with check (auth.role() = 'authenticated' and owner_id = auth.uid());

drop trigger if exists idea_pins_set_updated_at on idea_pins;
create trigger idea_pins_set_updated_at
  before update on idea_pins
  for each row execute function set_updated_at();
