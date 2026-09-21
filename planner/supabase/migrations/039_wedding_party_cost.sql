-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- What you're paying for each wedding-party member (attire, gifts, bouquet, accessories).
-- The Budget reads it, so it only needs entering here.
alter table wedding_party add column if not exists cost numeric;
