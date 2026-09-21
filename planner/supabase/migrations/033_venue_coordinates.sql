-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Latitude / longitude for each venue, so the Venues page can show them on a map.
alter table venues add column if not exists lat double precision;
alter table venues add column if not exists lng double precision;
