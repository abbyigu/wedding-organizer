-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Creates the guest list table and imports Wedding_Guest_List.xlsx.

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plus_one text not null default '',
  category text not null default '',
  group_label text not null default '',
  party_size integer not null default 1,
  kids_count integer not null default 0,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending','yes','no')),
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table guests enable row level security;

create policy "authenticated read guests" on guests
  for select using (auth.role() = 'authenticated');
create policy "authenticated write guests" on guests
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Reuses the set_updated_at() function created by migration 001 (schema.sql).
create trigger guests_set_updated_at
  before update on guests
  for each row execute function set_updated_at();

insert into guests (sort_order, name, plus_one, category, group_label, party_size, kids_count, rsvp_status, notes) values
  (1, 'Mom', 'Dad', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (2, 'Gaby', 'girlfriend', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (3, 'Caro', 'Alex', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (4, 'Raph', '', 'Core Family', 'Core Family', 1, 0, 'pending', ''),
  (5, 'Mass', 'girlfriend', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (6, 'Bernard', 'Michelle W', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (7, 'Julien', 'Wife Lex', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (8, 'Lilian', '', 'Core Family', 'Core Family', 1, 0, 'pending', ''),
  (9, 'Faith', 'Glenn', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (10, 'Logan', 'Wife Michelle U', 'Core Family', 'Core Family', 2, 2, 'pending', ''),
  (11, 'Ryan', 'Wife Sofia', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (12, 'Dawn', 'Husband', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (13, 'Mead', '', 'Core Family', 'Core Family', 1, 0, 'pending', ''),
  (14, 'Thomas', 'Wife Anninia', 'Core Family', 'Core Family', 2, 3, 'pending', ''),
  (15, 'Grandpa', '', 'Core Family', 'Core Family', 1, 0, 'pending', ''),
  (16, 'Natalie', 'Sylvain', 'Core Family', 'Core Family', 2, 0, 'pending', ''),
  (17, 'Junior', 'Jessie', 'Core Family', 'Core Family', 2, 3, 'pending', ''),
  (18, 'Marco', 'Marie-Elaine', 'Core Family', 'Core Family', 2, 4, 'pending', ''),
  (19, 'Maxime', 'Ann-Sophie', 'Core Family', 'Core Family', 2, 2, 'pending', ''),
  (20, 'Elisabeth', 'Will', 'Bride & Groom''s People', 'Bride & Groom''s People', 2, 1, 'pending', ''),
  (21, 'Kassie', 'Carl', 'Bride & Groom''s People', 'Bride & Groom''s People', 2, 0, 'pending', ''),
  (22, 'Fang', 'Fang''s Wife', 'Bride & Groom''s People', 'Bride & Groom''s People', 2, 1, 'pending', ''),
  (23, 'Gabriel', 'Ex-Wife', 'Bride & Groom''s People', 'Best Man', 2, 0, 'pending', ''),
  (24, 'Squirrel', 'Beau', 'Bride & Groom''s People', 'Maid of Honor', 2, 0, 'pending', ''),
  (25, 'Hilary', '', 'Bride & Groom''s People', 'Bride & Groom''s People', 1, 0, 'pending', ''),
  (26, 'Laurence', 'Steve', 'Bride & Groom''s People', 'Bride & Groom''s People', 2, 0, 'pending', ''),
  (27, 'Laurency', '', 'Bride & Groom''s People', 'Bride & Groom''s People', 1, 0, 'pending', ''),
  (28, 'Danna', 'Boyfriend', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (29, 'Nancy', 'Rich', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (30, 'Amy S', 'Steve', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (31, 'Hilary S', 'Mike', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (32, 'Zack', 'Wife', 'Family Guest', 'Family Guest', 2, 2, 'pending', ''),
  (33, 'Amy P', 'Ralph', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (34, 'Christopher', 'Wife', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (35, 'Addy''s Mom', '', 'Family Guest', 'Family Guest', 1, 0, 'pending', ''),
  (36, 'Addy', 'Husband', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (37, 'Maryland', '', 'Family Guest', 'Family Guest', 1, 0, 'pending', ''),
  (38, 'Isabel', 'Louis', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (39, 'Diane', 'Husband', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (40, 'Marie-Jo', '', 'Family Guest', 'Family Guest', 1, 0, 'pending', ''),
  (41, 'Mike T', '', 'Family Guest', 'Family Guest', 1, 0, 'pending', ''),
  (42, 'Bang', 'Wife', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (43, 'Jim', '', 'Family Guest', 'Family Guest', 1, 0, 'pending', ''),
  (44, 'Asheley', 'Nick', 'Family Guest', 'Family Guest', 2, 1, 'pending', ''),
  (45, 'William', 'girlfriend', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (46, 'Sylvie', 'Iness', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (47, 'Maude', 'Husband', 'Family Guest', 'Family Guest', 2, 2, 'pending', ''),
  (48, 'Erica', '', 'Family Guest', 'Family Guest', 1, 0, 'pending', ''),
  (49, 'Meggie', 'boyfriend', 'Family Guest', 'Family Guest', 2, 0, 'pending', ''),
  (50, 'Megan', '', 'Family Guest', 'Family Guest', 1, 0, 'pending', '');
