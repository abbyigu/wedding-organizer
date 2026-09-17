-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Refines migration 010: the idea board is shared by default, but any
-- single idea (e.g. the dress) can be flagged private — visible only to
-- whoever added it, same enforcement style as venue_ratings' blind voting.

alter table idea_pins
  add column if not exists visibility text not null default 'shared'
    check (visibility in ('shared', 'private'));

drop policy if exists "authenticated read idea_pins" on idea_pins;
drop policy if exists "authenticated write idea_pins" on idea_pins;

-- You can always see and manage your own idea, shared or private.
create policy "owner all access" on idea_pins
  for all using (auth.role() = 'authenticated' and owner_id = auth.uid())
  with check (auth.role() = 'authenticated' and owner_id = auth.uid());

-- Your partner's idea is visible to you only when they've marked it shared.
create policy "read shared ideas" on idea_pins
  for select using (auth.role() = 'authenticated' and visibility = 'shared');
