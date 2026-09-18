-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Lets an idea pin carry an estimated price (e.g. from the shop it was
-- pinned from) — additive, nothing existing is touched.

alter table idea_pins
  add column if not exists price numeric;
