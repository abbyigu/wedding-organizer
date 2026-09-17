-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Turns the idea board into a scrapbook: a shared decision status per idea,
-- a favourite heart, and collaborative editing on shared ideas (previously
-- only the person who added an idea could touch it at all).

alter table idea_pins
  add column if not exists decision_status text
    check (decision_status is null or decision_status in ('match', 'needs_vote', 'discuss', 'diy'));

alter table idea_pins
  add column if not exists is_favourite boolean not null default false;

-- One-time typo fix: an existing category got named "Nicknacks" — folding
-- it into the new "Little Details" collection.
update idea_pins set category = 'Little Details' where category ilike 'nicknacks';

-- The owner can already do anything with their own idea (shared or
-- private) via the existing "owner all access" policy. This adds the
-- other half: once an idea is shared, either of you can edit it (favourite
-- it, move it to another collection, set its decision status) — but only
-- the owner can delete it or flip it back to private, since DELETE isn't
-- granted here and neither is changing visibility away from 'shared' by
-- checking the *new* row stays shared.
drop policy if exists "collaborative edit shared ideas" on idea_pins;
create policy "collaborative edit shared ideas" on idea_pins
  for update using (auth.role() = 'authenticated' and visibility = 'shared')
  with check (auth.role() = 'authenticated' and visibility = 'shared');
