-- Run this once in Supabase Dashboard → SQL Editor → New query
-- The idea board moves from private (owner-only) to shared between both of
-- you, same visibility as venues and guests.

drop policy if exists "owner all access" on idea_pins;

create policy "authenticated read idea_pins" on idea_pins
  for select using (auth.role() = 'authenticated');
create policy "authenticated write idea_pins" on idea_pins
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
