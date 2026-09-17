-- Run this once in Supabase Dashboard → SQL Editor → New query
-- The idea board's "Pinterest link" field was redundant with "Image URL" —
-- one field now does both (preview and outbound link).

alter table idea_pins drop column if exists pin_url;
