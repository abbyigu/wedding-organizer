-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Audit fix: making a registry primary used to be two separate client round-trips
-- (un-primary everyone, then set the new one), which isn't atomic. If both partners
-- hit "Make primary" on different registries at nearly the same moment, the two
-- writes can interleave and leave zero or two registries marked primary. A trigger
-- makes it atomic: setting is_primary on one row clears it on the rest inside the
-- same transaction, so the client only ever needs to write to the one row it means.

create or replace function registry_single_primary()
returns trigger as $$
begin
  if new.is_primary then
    update registries set is_primary = false where id <> new.id and is_primary;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists registries_single_primary on registries;
create trigger registries_single_primary
  before insert or update of is_primary on registries
  for each row
  when (new.is_primary)
  execute function registry_single_primary();
