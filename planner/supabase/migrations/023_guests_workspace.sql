-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Two additions for the expanded Guests workspace: a hotel-block tracker
-- (Travel & Stay) and a wedding-related-events tracker with a per-guest
-- invite/RSVP join table (Events). Shared between both of you, same as
-- everything else.

create table if not exists hotel_blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'New hotel block',
  location text not null default '',
  rate numeric,
  booking_deadline date,
  rooms_reserved int not null default 0,
  rooms_available int not null default 0,
  min_nights int not null default 1,
  booking_link text not null default '',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hotel_blocks enable row level security;

drop policy if exists "shared all access" on hotel_blocks;
create policy "shared all access" on hotel_blocks
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists hotel_blocks_set_updated_at on hotel_blocks;
create trigger hotel_blocks_set_updated_at
  before update on hotel_blocks
  for each row execute function set_updated_at();

create table if not exists wedding_events (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New event',
  location text not null default '',
  event_date date,
  time text not null default '',
  dress_code text not null default '',
  capacity int,
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wedding_events enable row level security;

drop policy if exists "shared all access" on wedding_events;
create policy "shared all access" on wedding_events
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists wedding_events_set_updated_at on wedding_events;
create trigger wedding_events_set_updated_at
  before update on wedding_events
  for each row execute function set_updated_at();

create table if not exists event_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references wedding_events(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, guest_id)
);

alter table event_guests enable row level security;

drop policy if exists "shared all access" on event_guests;
create policy "shared all access" on event_guests
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists event_guests_set_updated_at on event_guests;
create trigger event_guests_set_updated_at
  before update on event_guests
  for each row execute function set_updated_at();
