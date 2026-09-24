alter table private_notes add column if not exists category text not null default 'Thoughts';
alter table private_notes add column if not exists kind text not null default 'note' check (kind in ('note', 'writing'));
alter table private_notes add column if not exists pinned boolean not null default false;
alter table private_notes add column if not exists cover_path text;
alter table private_notes add column if not exists linked_area text not null default '';

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'surprises' and column_name = 'reveal_method') then
    alter table surprises add column reveal_method text not null default 'manual' check (reveal_method in ('manual', 'date', 'event'));
    update surprises set reveal_method = 'date' where reveal_on is not null;
  end if;
end $$;
alter table surprises add column if not exists recipient_name text not null default '';
alter table surprises add column if not exists cover_path text;
alter table surprises add column if not exists reveal_time time;
alter table surprises add column if not exists reveal_event text not null default '';
alter table surprises add column if not exists teaser boolean not null default false;
alter table surprises add column if not exists revealed_at timestamptz;
alter table surprises add column if not exists budget numeric;
alter table surprises add column if not exists budget_mode text not null default 'hidden' check (budget_mode in ('hidden', 'amount', 'after_reveal'));
alter table surprises add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table surprises add column if not exists notes text not null default '';
alter table surprises add column if not exists day_time text not null default '';
alter table surprises add column if not exists day_mode text not null default 'private' check (day_mode in ('private', 'anonymized', 'reveal'));
alter table surprises add column if not exists linked_area text not null default '';
alter table surprises drop constraint if exists surprises_status_check;
update surprises set status = case when revealed then 'revealed' else 'ready' end where status = 'done';
alter table surprises add constraint surprises_status_check check (status in ('idea', 'planning', 'ready', 'revealed'));

drop policy if exists "read revealed surprise" on surprises;

create or replace function surprise_is_revealed(s surprises) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    s.revealed
    or (s.reveal_method = 'date' and s.reveal_on is not null
        and (s.reveal_on + coalesce(s.reveal_time, time '00:00')) <= (now() at time zone 'America/Toronto'))
    or (s.reveal_method = 'event' and s.reveal_event <> ''
        and (case when s.reveal_event = 'wedding-day'
                  then (select wedding_date from budget_settings limit 1)
                  else (select event_date from wedding_events where id::text = s.reveal_event limit 1) end) <= (now() at time zone 'America/Toronto')::date),
    false);
$$;

create or replace function surprise_teasers() returns table (id uuid, owner_name text, opens_on date)
language sql stable security definer set search_path = public as $$
  select s.id, s.owner_name,
         case when s.reveal_method = 'date' then s.reveal_on
              when s.reveal_method = 'event' and s.reveal_event = 'wedding-day' then (select wedding_date from budget_settings limit 1)
              when s.reveal_method = 'event' then (select event_date from wedding_events where id::text = s.reveal_event limit 1)
              else null end
  from surprises s
  where s.owner_id <> auth.uid() and s.teaser and not surprise_is_revealed(s);
$$;

create or replace function revealed_surprises() returns table (id uuid, owner_name text, title text, message text, cover_path text, revealed_on timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.owner_name, s.title, s.details, s.cover_path,
         coalesce(s.revealed_at, (s.reveal_on::timestamp at time zone 'America/Toronto'), s.created_at)
  from surprises s
  where s.owner_id <> auth.uid() and surprise_is_revealed(s);
$$;

create or replace function private_expense_lines() returns table (id uuid, label text, amount numeric, mine boolean)
language sql stable security definer set search_path = public as $$
  select case when s.owner_id = auth.uid() then s.id end,
         case when s.owner_id = auth.uid() then s.title
              when s.budget_mode = 'after_reveal' and surprise_is_revealed(s) then s.title
              else 'Private expense' end,
         s.budget,
         s.owner_id = auth.uid()
  from surprises s
  where s.budget is not null and s.budget > 0 and (s.owner_id = auth.uid() or s.budget_mode in ('amount', 'after_reveal'));
$$;

create or replace function surprise_day_items() returns table (id uuid, day_time text, title text, mine boolean)
language sql stable security definer set search_path = public as $$
  select case when s.owner_id = auth.uid() then s.id end,
         s.day_time,
         case when s.owner_id = auth.uid() then s.title
              when s.day_mode = 'reveal' and surprise_is_revealed(s) then s.title
              else 'Private item' end,
         s.owner_id = auth.uid()
  from surprises s
  where s.day_time <> '' and (s.owner_id = auth.uid() or s.day_mode in ('anonymized', 'reveal'));
$$;

create or replace function can_view_private_object(obj text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from surprises s where s.cover_path = obj and s.owner_id <> auth.uid() and surprise_is_revealed(s));
$$;

revoke all on function surprise_is_revealed(surprises) from public, anon;
revoke all on function surprise_teasers() from public, anon;
revoke all on function revealed_surprises() from public, anon;
revoke all on function private_expense_lines() from public, anon;
revoke all on function surprise_day_items() from public, anon;
revoke all on function can_view_private_object(text) from public, anon;
grant execute on function surprise_is_revealed(surprises) to authenticated;
grant execute on function surprise_teasers() to authenticated;
grant execute on function revealed_surprises() to authenticated;
grant execute on function private_expense_lines() to authenticated;
grant execute on function surprise_day_items() to authenticated;
grant execute on function can_view_private_object(text) to authenticated;

create table if not exists private_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  note_id uuid references private_notes(id) on delete cascade,
  surprise_id uuid references surprises(id) on delete cascade,
  name text not null default '',
  path text not null,
  kind text not null default 'other',
  created_at timestamptz not null default now()
);
alter table private_attachments enable row level security;
drop policy if exists "owner all access" on private_attachments;
create policy "owner all access" on private_attachments for all using (auth.role() = 'authenticated' and owner_id = auth.uid()) with check (auth.role() = 'authenticated' and owner_id = auth.uid());

insert into storage.buckets (id, name, public) values ('private-files', 'private-files', false) on conflict (id) do nothing;
drop policy if exists "private files owner" on storage.objects;
create policy "private files owner" on storage.objects for all to authenticated
  using (bucket_id = 'private-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'private-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "private files recipient" on storage.objects;
create policy "private files recipient" on storage.objects for select to authenticated
  using (bucket_id = 'private-files' and public.can_view_private_object(name));

alter table planning_tasks add column if not exists private_owner_id uuid;
alter table planning_tasks add column if not exists surprise_id uuid references surprises(id) on delete cascade;
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'planning_tasks' loop
    execute format('drop policy %I on planning_tasks', r.policyname);
  end loop;
end $$;
create policy "shared or own private" on planning_tasks for all
  using (auth.role() = 'authenticated' and (private_owner_id is null or private_owner_id = auth.uid()))
  with check (auth.role() = 'authenticated' and (private_owner_id is null or private_owner_id = auth.uid()));
