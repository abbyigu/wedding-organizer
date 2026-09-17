-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Stores the actual wedding date so the dashboard countdown is computed,
-- not hardcoded. Defaults to early September 2029, matching existing copy
-- across the app — update it once the real date is booked.

alter table budget_settings
  add column if not exists wedding_date date not null default '2029-09-08';
