-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Release 6: private notes and surprises. Every other table in this app is
-- shared between both of you (RLS just checks auth.role() = 'authenticated');
-- these two are the first that are scoped to a single owner.

create table if not exists private_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private_notes enable row level security;

-- No other policy exists for this table — a private note is visible to
-- nobody but the person who wrote it, permanently, including its owner.
create policy "owner all access" on private_notes
  for all using (auth.role() = 'authenticated' and owner_id = auth.uid())
  with check (auth.role() = 'authenticated' and owner_id = auth.uid());

create trigger private_notes_set_updated_at
  before update on private_notes
  for each row execute function set_updated_at();

create table if not exists surprises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  owner_name text not null default '',
  title text not null default '',
  details text not null default '',
  reveal_on date,
  revealed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table surprises enable row level security;

-- You can always see and manage your own surprise, revealed or not.
create policy "owner all access" on surprises
  for all using (auth.role() = 'authenticated' and owner_id = auth.uid())
  with check (auth.role() = 'authenticated' and owner_id = auth.uid());

-- Your partner's surprise only becomes visible once they've revealed it, or
-- its reveal date has arrived — whichever comes first. No app-code check
-- decides this; it's enforced at the row level.
create policy "read revealed surprise" on surprises
  for select using (
    auth.role() = 'authenticated'
    and (revealed = true or (reveal_on is not null and reveal_on <= current_date))
  );

create trigger surprises_set_updated_at
  before update on surprises
  for each row execute function set_updated_at();
