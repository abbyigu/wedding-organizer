-- Vendors become ONE record from first idea to signed contract.
-- Until now a shortlisted vendor lived in potential_vendors and "Move to Booked" copied it into
-- vendors. From here on the vendors table holds everyone; booking just changes status.
-- potential_vendors is left in place, untouched, as a backup. The app stops reading it.

-- 1. Everything a potential vendor had, plus the new pricing / services / booking fields.
alter table vendors add column if not exists social text not null default '';
alter table vendors add column if not exists tagline text not null default '';
alter table vendors add column if not exists photos jsonb not null default '[]'::jsonb;
alter table vendors add column if not exists price_low numeric;
alter table vendors add column if not exists price_high numeric;
alter table vendors add column if not exists price_unit text not null default 'package';
alter table vendors add column if not exists starting_price numeric;
alter table vendors add column if not exists quoted_total numeric;
alter table vendors add column if not exists contracted_total numeric;
alter table vendors add column if not exists estimate_source text not null default 'rough_estimate';
alter table vendors add column if not exists line_items jsonb not null default '[]'::jsonb;
alter table vendors add column if not exists tax_included boolean not null default false;
alter table vendors add column if not exists service_charge_pct numeric;
alter table vendors add column if not exists travel_fee numeric;
alter table vendors add column if not exists deposit_required text not null default '';
alter table vendors add column if not exists deposit_amount numeric;
alter table vendors add column if not exists availability text not null default 'unknown';
alter table vendors add column if not exists availability_response_date date;
alter table vendors add column if not exists city text not null default '';
alter table vendors add column if not exists address text not null default '';
alter table vendors add column if not exists distance_km numeric;
alter table vendors add column if not exists travel_included boolean not null default false;
alter table vendors add column if not exists travel_radius text not null default '';
alter table vendors add column if not exists package_details text not null default '';
alter table vendors add column if not exists whats_included text not null default '';
alter table vendors add column if not exists add_ons text not null default '';
alter table vendors add column if not exists exclusions text not null default '';
alter table vendors add column if not exists minimum_spend numeric;
alter table vendors add column if not exists setup_notes text not null default '';
alter table vendors add column if not exists teardown_notes text not null default '';
alter table vendors add column if not exists restrictions text not null default '';
alter table vendors add column if not exists ariel_reaction text;
alter table vendors add column if not exists fred_reaction text;
alter table vendors add column if not exists pros text not null default '';
alter table vendors add column if not exists concerns text not null default '';
alter table vendors add column if not exists communication_status text not null default 'not_contacted';
alter table vendors add column if not exists date_discovered date;
alter table vendors add column if not exists date_contacted date;
alter table vendors add column if not exists follow_up_date date;
alter table vendors add column if not exists quote_expiry date;
alter table vendors add column if not exists source text not null default '';
alter table vendors add column if not exists decision_status text not null default 'researching';
alter table vendors add column if not exists works_with_venue text not null default 'need_to_ask';
alter table vendors add column if not exists booked_on date;
alter table vendors add column if not exists arrival_time text not null default '';
alter table vendors add column if not exists day_of_notes text not null default '';

-- 2. Files, communication and price history belong to the vendor record.
create table if not exists vendor_files (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  kind text not null default 'other',
  name text not null default '',
  url text not null default '',
  storage_path text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists vendor_communications (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  occurred_on date not null default current_date,
  kind text not null default 'note',
  contact text not null default '',
  notes text not null default '',
  follow_up_date date,
  follow_up_done boolean not null default false,
  file_id uuid references vendor_files(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists vendor_prices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  source text not null default 'estimate',
  amount numeric not null default 0,
  note text not null default '',
  recorded_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- A vendor "added to a scenario" is a link to a venue scenario, never a copy of its price.
create table if not exists vendor_scenarios (
  vendor_id uuid not null references vendors(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete cascade,
  primary key (vendor_id, venue_id)
);

-- Payments point at the vendor instead of repeating its name.
alter table payments add column if not exists vendor_id uuid references vendors(id) on delete set null;

-- 3. Bring the shortlist across, keeping every id so Decide Together options still resolve.
insert into vendors (
  id, name, category, contact_name, phone, email, website, status, notes, sort_order, created_at,
  social, photos, price_low, price_high, price_unit, tax_included, service_charge_pct, travel_fee, deposit_required,
  availability, availability_response_date, city, address, distance_km, travel_included, travel_radius,
  package_details, whats_included, add_ons, exclusions, minimum_spend,
  ariel_reaction, fred_reaction, pros, concerns, communication_status,
  date_discovered, date_contacted, follow_up_date, quote_expiry, source, decision_status, works_with_venue
)
select
  p.id, p.name, p.category, p.contact_name, p.phone, p.email, p.website, 'researching', p.notes, p.sort_order + 1000, p.created_at,
  p.social,
  case when p.cover_photo <> '' then jsonb_build_array(p.cover_photo) || p.photos else p.photos end,
  p.price_low, p.price_high, p.price_unit, p.tax_included, p.service_charge_pct, p.travel_fee, p.deposit_required,
  p.availability, p.availability_response_date, p.city, p.address, p.distance_km, p.travel_included, p.travel_radius,
  p.package_details, p.whats_included, p.add_ons, p.exclusions, p.minimum_spend,
  p.ariel_reaction, p.fred_reaction, p.pros, p.concerns, p.communication_status,
  p.date_discovered, p.date_contacted, p.follow_up_date, p.quote_expiry, p.source, p.decision_status, p.works_with_venue
from potential_vendors p
where true
on conflict (id) do nothing;

-- Old quote / brochure / contract links become proper files on the vendor.
insert into vendor_files (vendor_id, kind, name, url)
select id, 'quote', 'Quote', quote_url from potential_vendors where quote_url <> ''
union all select id, 'portfolio', 'Brochure', brochure_url from potential_vendors where brochure_url <> ''
union all select id, 'contract', 'Contract sample', contract_url from potential_vendors where contract_url <> '';

-- A quote link on a shortlisted vendor means a quote arrived: record it as price history when we know the number.
insert into vendor_prices (vendor_id, source, amount, note)
select id, 'estimate', coalesce(price_high, price_low), 'Carried over from the shortlist'
from vendors where coalesce(price_high, price_low) is not null and id in (select id from potential_vendors);

-- Already-booked vendors: their single "cost" is the contracted total.
update vendors set contracted_total = cost, booked_on = coalesce(booked_on, created_at::date)
where status in ('booked', 'confirmed') and cost is not null and contracted_total is null;
insert into vendor_prices (vendor_id, source, amount, note)
select id, 'contracted', contracted_total, 'Carried over from Booked Vendors' from vendors
where contracted_total is not null and status in ('booked', 'confirmed');
update vendors set booked_on = created_at::date where status in ('booked', 'confirmed') and booked_on is null;

-- Contact dates and follow-ups move into the communication log so there is one place for them.
insert into vendor_communications (vendor_id, occurred_on, kind, notes)
select id, date_contacted, 'inquiry', 'Carried over from the shortlist' from vendors where date_contacted is not null and id in (select id from potential_vendors);
insert into vendor_communications (vendor_id, occurred_on, kind, notes, follow_up_date)
select id, coalesce(date_contacted, current_date), 'note', 'Follow up', follow_up_date from vendors where follow_up_date is not null and id in (select id from potential_vendors);

-- 4. One spelling per category.
update vendors set category = 'Hair & Makeup' where lower(category) = 'hair & makeup';
update vendors set category = 'Cake & Desserts' where lower(category) = 'cake & desserts';

-- 5. Decide Together options now reference the unified table.
alter table decision_options drop constraint if exists decision_options_vendor_id_fkey;
alter table decision_options add constraint decision_options_vendor_id_fkey foreign key (vendor_id) references vendors(id) on delete set null;

-- 6. Payments already typed with a vendor name attach to that vendor.
update payments p set vendor_id = v.id from vendors v where p.vendor_id is null and p.vendor <> '' and lower(p.vendor) = lower(v.name);

-- 7. Access + storage. Photos are public (portfolio shots); files are private (contracts, invoices).
alter table vendor_files enable row level security;
alter table vendor_communications enable row level security;
alter table vendor_prices enable row level security;
alter table vendor_scenarios enable row level security;

drop policy if exists "shared all access" on vendor_files;
create policy "shared all access" on vendor_files for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "shared all access" on vendor_communications;
create policy "shared all access" on vendor_communications for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "shared all access" on vendor_prices;
create policy "shared all access" on vendor_prices for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "shared all access" on vendor_scenarios;
create policy "shared all access" on vendor_scenarios for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public) values ('vendor-photos', 'vendor-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('vendor-files', 'vendor-files', false) on conflict (id) do nothing;
drop policy if exists "vendor photos write" on storage.objects;
create policy "vendor photos write" on storage.objects for all to authenticated using (bucket_id = 'vendor-photos') with check (bucket_id = 'vendor-photos');
drop policy if exists "vendor files access" on storage.objects;
create policy "vendor files access" on storage.objects for all to authenticated using (bucket_id = 'vendor-files') with check (bucket_id = 'vendor-files');
