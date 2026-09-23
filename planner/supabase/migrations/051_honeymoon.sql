create table if not exists honeymoon_settings (
  id boolean primary key default true check (id),
  start_date date,
  end_date date,
  budget_target numeric,
  fund_offsets boolean not null default false,
  notes text not null default '',
  updated_at timestamptz not null default now()
);
insert into honeymoon_settings (id) values (true) on conflict (id) do nothing;
create table if not exists honeymoon_destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'New destination',
  country text not null default '',
  photo text not null default '',
  est_cost numeric,
  best_season text not null default '',
  travel_time text not null default '',
  pros text not null default '',
  considerations text not null default '',
  ariel_reaction text,
  fred_reaction text,
  is_selected boolean not null default false,
  decision_option_id uuid references decision_options(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists honeymoon_one_selected on honeymoon_destinations (is_selected) where is_selected;
create table if not exists honeymoon_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'other' check (kind in ('flight', 'stay', 'activity', 'transport', 'reservation', 'insurance', 'document', 'packing', 'other')),
  title text not null default '',
  detail text not null default '',
  item_date date,
  time text not null default '',
  amount numeric,
  paid boolean not null default false,
  due_date date,
  confirmation text not null default '',
  link text not null default '',
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table honeymoon_settings enable row level security;
alter table honeymoon_destinations enable row level security;
alter table honeymoon_items enable row level security;
drop policy if exists "shared all access" on honeymoon_settings;
create policy "shared all access" on honeymoon_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "shared all access" on honeymoon_destinations;
create policy "shared all access" on honeymoon_destinations for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "shared all access" on honeymoon_items;
create policy "shared all access" on honeymoon_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter table guests add column if not exists gift_amount numeric;
