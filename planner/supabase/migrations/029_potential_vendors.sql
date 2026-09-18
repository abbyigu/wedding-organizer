-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Potential Vendors: a visual shortlist/CRM for vendors you're still
-- researching, separate from the simple Booked Vendors list (the existing
-- vendors table). Moving one to Booked Vendors copies a row over there and
-- removes it from here -- once booked, the vendors table is the record of
-- truth, same as a venue's is_final flips it out of active shortlisting.

create table if not exists potential_vendors (
  id uuid primary key default gen_random_uuid(),

  -- Basics
  name text not null default 'New vendor',
  category text not null default 'Other',
  contact_name text not null default '',
  website text not null default '',
  email text not null default '',
  phone text not null default '',
  social text not null default '',

  -- Visuals
  cover_photo text not null default '',
  photos jsonb not null default '[]'::jsonb,

  -- Pricing
  price_low numeric,
  price_high numeric,
  price_unit text not null default 'package',
  tax_included boolean not null default false,
  service_charge_pct numeric,
  travel_fee numeric,
  deposit_required text not null default '',

  -- Availability
  availability text not null default 'unknown',
  availability_response_date date,

  -- Location
  city text not null default '',
  address text not null default '',
  distance_km numeric,
  travel_included boolean not null default false,
  travel_radius text not null default '',

  -- What they offer
  package_details text not null default '',
  whats_included text not null default '',
  add_ons text not null default '',
  exclusions text not null default '',
  minimum_spend numeric,

  -- Reactions
  ariel_reaction text,
  fred_reaction text,
  notes text not null default '',
  pros text not null default '',
  concerns text not null default '',

  -- Communication
  communication_status text not null default 'not_contacted',

  -- Files (links, not uploads -- see note below)
  quote_url text not null default '',
  brochure_url text not null default '',
  contract_url text not null default '',

  -- Dates
  date_discovered date,
  date_contacted date,
  follow_up_date date,
  quote_expiry date,

  -- Source
  source text not null default '',

  -- Decision
  decision_status text not null default 'researching',
  works_with_venue text not null default 'need_to_ask',

  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table potential_vendors enable row level security;

drop policy if exists "shared all access" on potential_vendors;
create policy "shared all access" on potential_vendors
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists potential_vendors_set_updated_at on potential_vendors;
create trigger potential_vendors_set_updated_at
  before update on potential_vendors
  for each row execute function set_updated_at();
