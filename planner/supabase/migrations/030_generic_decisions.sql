-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Generic decision framework: any wedding decision (not just venues) gets
-- the same guided flow -- criteria, options, private voting, reveal, final
-- choice. The existing Venue decision (venues / venue_ratings /
-- decision_settings / decision_events) stays exactly as it is; a "decisions"
-- row with link_href set just points the dashboard card at its own page
-- instead of the generic one, so real venue rating data never has to move.

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Other',
  title text not null default 'New decision',
  description text not null default '',
  criteria jsonb not null default '[{"key":"preference","label":"Overall preference","weight":3}]'::jsonb,
  link_href text,
  is_final boolean not null default false,
  final_option_id uuid,
  final_reason text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists decision_options (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  label text not null default 'New option',
  image_url text not null default '',
  notes text not null default '',
  status text not null default 'active',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table decisions
  drop constraint if exists decisions_final_option_id_fkey,
  add constraint decisions_final_option_id_fkey
    foreign key (final_option_id) references decision_options(id) on delete set null;

create table if not exists decision_votes (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  option_id uuid not null references decision_options(id) on delete cascade,
  voter_id uuid not null,
  voter_name text not null default '',
  scores jsonb not null default '{}'::jsonb,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_id, voter_id)
);

alter table decisions enable row level security;
alter table decision_options enable row level security;
alter table decision_votes enable row level security;

drop policy if exists "shared all access" on decisions;
create policy "shared all access" on decisions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "shared all access" on decision_options;
create policy "shared all access" on decision_options
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "shared all access" on decision_votes;
create policy "shared all access" on decision_votes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop trigger if exists decisions_set_updated_at on decisions;
create trigger decisions_set_updated_at before update on decisions
  for each row execute function set_updated_at();

drop trigger if exists decision_options_set_updated_at on decision_options;
create trigger decision_options_set_updated_at before update on decision_options
  for each row execute function set_updated_at();

drop trigger if exists decision_votes_set_updated_at on decision_votes;
create trigger decision_votes_set_updated_at before update on decision_votes
  for each row execute function set_updated_at();

-- The Venue decision keeps using its own existing tables; this row is only
-- a dashboard shortcut that links straight to /decide/venue.
insert into decisions (category, title, description, link_href, sort_order)
select 'Venue', 'Choose our wedding venue', 'Compare venues on location, budget, food and atmosphere.', '/decide/venue', 0
where not exists (select 1 from decisions where link_href = '/decide/venue');

-- A real second decision to try the generic flow on.
with d as (
  insert into decisions (category, title, description, sort_order)
  select 'Guests', 'Will children be invited?', 'Decide whether children are welcome at the wedding.', 1
  where not exists (select 1 from decisions where title = 'Will children be invited?')
  returning id
)
insert into decision_options (decision_id, label, sort_order)
select d.id, opt.label, opt.ord
from d, (values ('Yes, children welcome', 0), ('No, adults-only', 1)) as opt(label, ord);
