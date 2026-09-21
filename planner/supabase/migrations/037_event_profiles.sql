-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Gives each event a friendly description, a formality tag (Informal, Semi-formal…)
-- and its own photo for the Events overview.
alter table wedding_events add column if not exists description text not null default '';
alter table wedding_events add column if not exists tag text not null default '';
alter table wedding_events add column if not exists photo_url text not null default '';
