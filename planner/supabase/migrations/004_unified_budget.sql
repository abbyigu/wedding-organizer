-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Release 4: unified budget. Adds contract/payment fields to venues and a
-- single shared budget_settings row so the guest count, service charge,
-- contingency, tax and shared-cost lines are the same everywhere instead of
-- reset on every page load.

alter table venues
  add column if not exists quoted_total numeric,
  add column if not exists contracted_total numeric,
  add column if not exists deposit_amount numeric not null default 0,
  add column if not exists deposit_due date,
  add column if not exists deposit_paid boolean not null default false,
  add column if not exists balance_due date,
  add column if not exists balance_paid boolean not null default false;

create table if not exists budget_settings (
  id boolean primary key default true check (id),
  svc_pct integer not null default 15,
  cont_pct integer not null default 8,
  apply_tax boolean not null default true,
  guest_scenario text not null default 'all' check (guest_scenario in ('all', 'confirmed', 'custom')),
  custom_adults integer not null default 80,
  custom_kids integer not null default 15,
  shared_line_amounts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into budget_settings (id) values (true) on conflict (id) do nothing;

alter table budget_settings enable row level security;

create policy "authenticated read budget_settings" on budget_settings
  for select using (auth.role() = 'authenticated');
create policy "authenticated write budget_settings" on budget_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Reuses the set_updated_at() function created by migration 001 (schema.sql).
create trigger budget_settings_set_updated_at
  before update on budget_settings
  for each row execute function set_updated_at();
