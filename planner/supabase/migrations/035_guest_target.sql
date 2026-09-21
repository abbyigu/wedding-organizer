-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Makes the adult guest target something you can change on the Guests pages
-- instead of a number baked into the code. Shared, like the rest of the budget settings.
alter table budget_settings add column if not exists guest_target int not null default 80;
