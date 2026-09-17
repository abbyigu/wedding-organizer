-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Adds a planning-status pipeline to surprises (idea → planning → ready → done),
-- same shape as the venue status pipeline in migration 002.

alter table surprises
  add column if not exists status text not null default 'idea'
    check (status in ('idea', 'planning', 'ready', 'done'));
