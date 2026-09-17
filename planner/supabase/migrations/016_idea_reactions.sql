-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Replaces the single shared decision_status field (015) with real private
-- voting, same blind-reveal pattern as venue_ratings: neither of you sees
-- the other's reaction to an idea until you've both reacted to it.

alter table idea_pins drop column if exists decision_status;

create table if not exists idea_reactions (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references idea_pins(id) on delete cascade,
  rater_id uuid not null default auth.uid(),
  reaction text not null check (reaction in ('love_it', 'maybe', 'not_for_us', 'needs_discussion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idea_id, rater_id)
);

alter table idea_reactions enable row level security;

-- You can always see your own reaction.
create policy "read own reaction" on idea_reactions
  for select using (auth.role() = 'authenticated' and rater_id = auth.uid());

-- Your partner's reaction to an idea only becomes visible once you've cast
-- your own reaction to that same idea — this is what keeps voting blind.
create policy "read partner reaction after voting" on idea_reactions
  for select using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from idea_reactions mine
      where mine.idea_id = idea_reactions.idea_id and mine.rater_id = auth.uid()
    )
  );

create policy "write own reaction" on idea_reactions
  for insert with check (auth.role() = 'authenticated' and rater_id = auth.uid());
create policy "update own reaction" on idea_reactions
  for update using (auth.role() = 'authenticated' and rater_id = auth.uid())
  with check (rater_id = auth.uid());
create policy "delete own reaction" on idea_reactions
  for delete using (auth.role() = 'authenticated' and rater_id = auth.uid());

create trigger idea_reactions_set_updated_at
  before update on idea_reactions
  for each row execute function set_updated_at();
