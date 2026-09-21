-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Richer decision options: colour palettes, and options that point at an existing
-- Inspiration idea, Venue or potential Vendor (referenced, never copied).
-- Also a single "wedding style" row holding the official wedding palette.

alter table decisions add column if not exists option_type text not null default 'text'; -- text | visual | palette | venue | vendor

alter table decision_options add column if not exists swatches jsonb not null default '[]'::jsonb;
alter table decision_options add column if not exists idea_id uuid references idea_pins(id) on delete set null;
alter table decision_options add column if not exists venue_id uuid references venues(id) on delete set null;
alter table decision_options add column if not exists vendor_id uuid references potential_vendors(id) on delete set null;

create table if not exists wedding_style (
  id boolean primary key default true check (id = true),
  palette jsonb not null default '[]'::jsonb,
  palette_name text not null default '',
  source_decision_id uuid references decisions(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table wedding_style enable row level security;

drop policy if exists "shared all access" on wedding_style;
create policy "shared all access" on wedding_style
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
