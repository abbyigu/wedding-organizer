-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Custom "Venue & catering" expenses had no link to a specific venue, so
-- adding one while comparing Venue A showed it under every other venue in
-- the "Based on" dropdown too. Other categories (Photography, Flowers,
-- Attire, Travel, Other) genuinely aren't tied to a venue and stay global;
-- only Venue & catering gets scoped. Existing rows get venue_id = null,
-- which keeps showing them everywhere (unchanged behaviour) rather than
-- guessing which venue they were meant for.

alter table budget_expenses add column if not exists venue_id uuid references venues(id) on delete set null;
