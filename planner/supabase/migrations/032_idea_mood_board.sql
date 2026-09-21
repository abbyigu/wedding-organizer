-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Lets an inspiration idea be added to the Mood Board on purpose, separate
-- from the heart (which now means "shortlisted for the wedding").
alter table idea_pins add column if not exists on_mood_board boolean not null default false;
