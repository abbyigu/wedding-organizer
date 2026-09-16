-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Release 5: couple decision tools. Ratings are enforced blind at the
-- database level — a row policy, not app code, is what hides your partner's
-- rating until you've cast your own for that venue.

alter table venues
  add column if not exists is_final boolean not null default false,
  add column if not exists final_reason text not null default '';

create table if not exists venue_ratings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  rater_id uuid not null default auth.uid(),
  rater_name text not null default '',
  scores jsonb not null default '{}'::jsonb,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, rater_id)
);

alter table venue_ratings enable row level security;

-- You can always see your own rating.
create policy "read own rating" on venue_ratings
  for select using (auth.role() = 'authenticated' and rater_id = auth.uid());

-- Your partner's rating on a venue only becomes visible once you've cast
-- your own rating for that same venue — this is what keeps voting blind.
create policy "read partner rating after voting" on venue_ratings
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from venue_ratings mine
      where mine.venue_id = venue_ratings.venue_id and mine.rater_id = auth.uid()
    )
  );

create policy "write own rating" on venue_ratings
  for insert with check (auth.role() = 'authenticated' and rater_id = auth.uid());
create policy "update own rating" on venue_ratings
  for update using (auth.role() = 'authenticated' and rater_id = auth.uid())
  with check (rater_id = auth.uid());
create policy "delete own rating" on venue_ratings
  for delete using (auth.role() = 'authenticated' and rater_id = auth.uid());

-- Reuses the set_updated_at() function created by migration 001 (schema.sql).
create trigger venue_ratings_set_updated_at
  before update on venue_ratings
  for each row execute function set_updated_at();

create table if not exists decision_settings (
  id boolean primary key default true check (id),
  criteria jsonb not null default '[
    {"key":"location","label":"Location & travel","weight":3},
    {"key":"budget","label":"Budget fit","weight":3},
    {"key":"food","label":"Food & bar","weight":3},
    {"key":"character","label":"Character & atmosphere","weight":3},
    {"key":"logistics","label":"Capacity & logistics","weight":3},
    {"key":"gut","label":"Overall gut feeling","weight":3}
  ]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into decision_settings (id) values (true) on conflict (id) do nothing;

alter table decision_settings enable row level security;
create policy "authenticated read decision_settings" on decision_settings
  for select using (auth.role() = 'authenticated');
create policy "authenticated write decision_settings" on decision_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create trigger decision_settings_set_updated_at
  before update on decision_settings
  for each row execute function set_updated_at();

-- Append-only log: a rating being cast/changed, or the final decision being
-- set/changed. No update/delete policy on purpose — it's a history.
create table if not exists decision_events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete set null,
  venue_name text not null default '',
  event_type text not null check (event_type in ('rating', 'final')),
  actor_name text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now()
);

alter table decision_events enable row level security;
create policy "authenticated read decision_events" on decision_events
  for select using (auth.role() = 'authenticated');
create policy "authenticated insert decision_events" on decision_events
  for insert with check (auth.role() = 'authenticated');
