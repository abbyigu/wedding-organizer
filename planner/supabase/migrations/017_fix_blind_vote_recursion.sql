-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Fixes "infinite recursion detected in policy for relation idea_reactions":
-- a SELECT policy whose USING clause queries its own table (to check
-- "have I already voted on this row?") makes Postgres re-evaluate that same
-- policy while evaluating the subquery, forming a real cycle.
--
-- The fix is a SECURITY DEFINER helper function: it runs with the
-- privileges of its owner, so its internal query bypasses RLS instead of
-- re-triggering the policy that's calling it.
--
-- venue_ratings' "read partner rating after voting" policy has the exact
-- same self-referencing shape. It happens not to have been exercised yet
-- (the dashboard only ever queries a user's own ratings), but it would hit
-- this identical error the first time both of you rate the same venue —
-- fixing it here too, same pattern, before that surprises anyone.

create or replace function has_cast_idea_reaction(p_idea_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from idea_reactions
    where idea_id = p_idea_id and rater_id = p_user_id
  );
$$;

drop policy if exists "read partner reaction after voting" on idea_reactions;
create policy "read partner reaction after voting" on idea_reactions
  for select using (
    auth.role() = 'authenticated' and has_cast_idea_reaction(idea_id, auth.uid())
  );

create or replace function has_cast_venue_rating(p_venue_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from venue_ratings
    where venue_id = p_venue_id and rater_id = p_user_id
  );
$$;

drop policy if exists "read partner rating after voting" on venue_ratings;
create policy "read partner rating after voting" on venue_ratings
  for select using (
    auth.role() = 'authenticated' and has_cast_venue_rating(venue_id, auth.uid())
  );
