-- Run this once in Supabase Dashboard → SQL Editor → New query

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  key text,
  name text not null default 'New place',
  location text not null default '',
  status text not null default 'new' check (status in ('finalist','keep','hold','new','out')),
  website text not null default '',
  capacity text not null default '',
  contact text not null default '',
  notes text not null default '',
  pros text not null default '',
  cons text not null default '',
  questions text not null default '',
  period text not null default '',
  turnkey text not null default '',
  diy text not null default '',
  team text not null default '',
  themes text not null default '',
  colors text not null default '',
  quote_received boolean not null default false,
  budget_note text not null default '',
  budget_lines jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table venues enable row level security;

-- Any signed-in user (just the two of you, since sign-up is invite-only) can
-- read and write. Tighten this later if you add guest/planner-team roles.
create policy "authenticated read" on venues
  for select using (auth.role() = 'authenticated');
create policy "authenticated write" on venues
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger venues_set_updated_at
  before update on venues
  for each row execute function set_updated_at();

-- Storage bucket for venue photos (private — only signed-in users can read/write).
insert into storage.buckets (id, name, public)
values ('venue-photos', 'venue-photos', false)
on conflict (id) do nothing;

create policy "authenticated read photos" on storage.objects
  for select using (bucket_id = 'venue-photos' and auth.role() = 'authenticated');
create policy "authenticated write photos" on storage.objects
  for insert with check (bucket_id = 'venue-photos' and auth.role() = 'authenticated');
create policy "authenticated delete photos" on storage.objects
  for delete using (bucket_id = 'venue-photos' and auth.role() = 'authenticated');
