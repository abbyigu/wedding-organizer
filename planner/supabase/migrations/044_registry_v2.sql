-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Registry v2: richer registry cards, a public guest page, and gift / thank-you
-- tracking on the Guest List (households). Nothing is duplicated.

-- 1. Registry cards
alter table registries add column if not exists type text not null default 'store';       -- store | honeymoon | cash | charity | experience | other
alter table registries add column if not exists description text not null default '';
alter table registries add column if not exists image_path text;                          -- uploaded cover (public bucket registry-covers)
alter table registries add column if not exists idea_id uuid references idea_pins(id) on delete set null; -- OR an Inspiration pin (referenced, not copied)
alter table registries add column if not exists visible boolean not null default true;    -- shown on the guest page
alter table registries add column if not exists is_primary boolean not null default false;
alter table registries add column if not exists summary text not null default '';        -- optional, typed by hand, e.g. "24 items · 8 purchased"

-- 2. The guest page settings (one row): the link, the couple's names and the note
create table if not exists registry_settings (
  id boolean primary key default true check (id),
  slug text not null default 'ariel-and-fred' check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  couple text not null default 'Ariel & Fred',
  guest_note text not null default 'Your presence means the most, but if you''d like to give a gift, here are a few ways to help us start our next chapter together.',
  updated_at timestamptz not null default now()
);
insert into registry_settings (id) values (true) on conflict (id) do nothing;
alter table registry_settings enable row level security;
drop policy if exists "shared all access" on registry_settings;
create policy "shared all access" on registry_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 3. The ONLY thing a stranger can read: the visible registries, with public fields only.
-- (A security-definer function, not an open table policy, so notes, budget and guests stay private.)
create or replace function public_registry(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'couple', s.couple,
    'note', s.guest_note,
    'registries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.store_name, 'type', r.type, 'url', r.url, 'description', r.description,
        'image_path', r.image_path, 'image_url', p.image_url, 'primary', r.is_primary
      ) order by r.is_primary desc, r.sort_order, r.created_at)
      from registries r left join idea_pins p on p.id = r.idea_id
      where r.visible and r.url <> ''
    ), '[]'::jsonb)
  )
  from registry_settings s
  where s.slug = lower(p_slug);
$$;
revoke all on function public_registry(text) from public;
grant execute on function public_registry(text) to anon, authenticated;

-- 4. Cover uploads: a public bucket (covers are meant for guests to see)
insert into storage.buckets (id, name, public) values ('registry-covers', 'registry-covers', true) on conflict (id) do nothing;
drop policy if exists "registry covers write" on storage.objects;
create policy "registry covers write" on storage.objects
  for all to authenticated using (bucket_id = 'registry-covers') with check (bucket_id = 'registry-covers');

-- 5. Gifts + thank-yous live on the Guest List (household). gift_received and thank_you_sent already exist.
alter table guests add column if not exists gift_description text not null default '';
alter table guests add column if not exists gift_source text not null default '';          -- a registry name or "In person"
alter table guests add column if not exists gift_date date;
alter table guests add column if not exists thank_you_required boolean not null default true;
alter table guests add column if not exists thank_you_date date;
alter table guests add column if not exists gift_notes text not null default '';
