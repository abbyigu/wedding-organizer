-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Adds a "by hour" rate unit to custom budget expenses (e.g. an open bar or
-- DJ billed per hour under Venue & catering) — qty holds the hour count
-- since, unlike per-adult/per-child, hours aren't derived from guest counts.

alter table budget_expenses add column if not exists qty numeric not null default 1;
