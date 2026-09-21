-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Extra room on each venue for the redesigned venue page: type, season notes,
-- optional amenity/policy answers, plus saved links and uploaded files.
alter table venues add column if not exists venue_type text not null default '';
alter table venues add column if not exists season_notes text not null default '';
alter table venues add column if not exists amenities jsonb not null default '{}'::jsonb;
alter table venues add column if not exists links jsonb not null default '[]'::jsonb;
alter table venues add column if not exists files jsonb not null default '[]'::jsonb;
