create table if not exists reminder_prefs (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  frequency text not null default 'weekly' check (frequency in ('off', 'weekly', 'daily')),
  updated_at timestamptz not null default now()
);
alter table reminder_prefs enable row level security;
drop policy if exists "own prefs" on reminder_prefs;
create policy "own prefs" on reminder_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists app_secrets (
  name text primary key,
  value text not null
);
alter table app_secrets enable row level security;
revoke all on app_secrets from anon, authenticated;

create or replace function rd_plural(n bigint, w text) returns text
language sql immutable as $$ select n || ' ' || w || case when n = 1 then '' else 's' end $$;

create or replace function reminder_digest(p_secret text)
returns table (user_id uuid, email text, frequency text, items jsonb)
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'America/Toronto')::date;
  plan_venue uuid;
  chosen_venue uuid;
begin
  if p_secret is null or encode(sha256(convert_to(p_secret, 'UTF8')), 'hex') is distinct from (select a.value from app_secrets a where a.name = 'cron_secret_sha256') then
    raise exception 'not allowed';
  end if;
  select s.venue_id into plan_venue from wedding_scenarios s where s.is_active limit 1;
  chosen_venue := coalesce(plan_venue, (select v.id from venues v where v.is_final limit 1));

  return query
  with pay as (
    select coalesce(nullif(p.vendor, ''), p.label) as payee, p.amount, p.due_date as due, (p.status = 'paid') as paid from payments p
    union all
    select v.name, v.deposit_amount, v.deposit_due, v.deposit_paid from venues v
      where v.id = chosen_venue and v.contracted_total is not null and v.deposit_amount > 0
    union all
    select v.name, v.contracted_total - v.deposit_amount, v.balance_due, v.balance_paid from venues v
      where v.id = chosen_venue and v.contracted_total is not null and v.contracted_total - v.deposit_amount > 0
  ),
  shared as (
    select 'urgent'::text as tone, (rd_plural(x.n, 'payment') || ' overdue: ' || x.names) as msg, '/budget/payments'::text as path
      from (select count(*) as n, array_to_string((array_agg(pay.payee order by pay.due))[1:2], ', ') as names from pay where not pay.paid and pay.due < today) x where x.n > 0
    union all
    select 'soon', rd_plural(x.n, 'payment') || ' due in the next 7 days', '/budget/payments'
      from (select count(*) as n from pay where not pay.paid and pay.due >= today and pay.due <= today + 7) x where x.n > 0
    union all
    select 'info', rd_plural(x.n, 'payment') || ' due in the next 30 days', '/budget/payments'
      from (select count(*) as n from pay where not pay.paid and pay.due > today + 7 and pay.due <= today + 30) x where x.n > 0
    union all
    select 'urgent', 'Follow up with ' || v.name, '/vendors/' || v.id || '?tab=communication'
      from vendors v where exists (select 1 from vendor_communications c where c.vendor_id = v.id and c.follow_up_date <= today and not c.follow_up_done)
    union all
    select 'urgent', 'Follow up with ' || v.name, '/venues/' || v.id || '?tab=contact'
      from venues v where exists (select 1 from venue_communications c where c.venue_id = v.id and c.follow_up_date <= today and not c.follow_up_done)
    union all
    select 'soon', rd_plural(x.n, 'vendor quote') || case when x.n = 1 then ' needs' else ' need' end || ' reviewing', '/vendors'
      from (select count(*) as n from vendors v where v.communication_status = 'quote_received' and v.status not in ('booked', 'confirmed') and v.decision_status <> 'rejected') x where x.n > 0
    union all
    select 'soon', v.name || '''s quote expires ' || to_char(v.quote_expiry, 'Mon FMDD'), '/vendors/' || v.id || '?tab=pricing'
      from vendors v where v.quote_expiry between today and today + 14 and v.status not in ('booked', 'confirmed')
    union all
    select case when d.start_date <= today then 'soon' else 'info' end, d.title || ' should start ' || case when d.start_date <= today then 'now' else 'this month' end, '/diy/' || d.id
      from diy_projects d where d.status in ('idea', 'materials_needed') and d.start_date is not null and d.start_date <= today + 30
    union all
    select 'info', x.n || ' guests have not responded', '/guests/rsvp'
      from (select coalesce(sum(g.party_size + g.kids_count), 0) as n from guests g where g.rsvp_status = 'pending') x where x.n > 0
    union all
    select case when x.late > 0 then 'urgent' else 'soon' end, 'Honeymoon: ' || rd_plural(x.n, 'payment') || case when x.late > 0 then ' overdue or due soon' else ' due in the next 30 days' end, '/honeymoon'
      from (select count(*) as n, count(*) filter (where h.due_date < today) as late from honeymoon_items h
            where h.kind not in ('document', 'packing') and not h.paid and h.amount > 0 and h.due_date is not null and h.due_date <= today + 30) x where x.n > 0
  ),
  mine as (
    select u.id as uid, 'soon'::text as tone, (rd_plural(count(*), 'decision') || ' waiting for your vote') as msg, '/decide'::text as path
      from auth.users u
      join decisions d on not d.is_final and d.link_href is distinct from '/decide/venue'
     where (select count(*) from decision_options o where o.decision_id = d.id and o.status <> 'out') > 0
       and (select count(*) from decision_votes dv where dv.decision_id = d.id and dv.voter_id = u.id)
         < (select count(*) from decision_options o where o.decision_id = d.id and o.status <> 'out')
     group by u.id
  )
  select u.id, u.email::text, coalesce(rp.frequency, 'weekly')::text,
         coalesce((select jsonb_agg(jsonb_build_object('tone', i.tone, 'text', i.msg, 'path', i.path)
                          order by case i.tone when 'urgent' then 0 when 'soon' then 1 else 2 end)
                     from (select s.tone, s.msg, s.path from shared s
                           union all
                           select m.tone, m.msg, m.path from mine m where m.uid = u.id) i), '[]'::jsonb)
    from auth.users u
    left join reminder_prefs rp on rp.user_id = u.id
   where u.email is not null and coalesce(rp.frequency, 'weekly') <> 'off';
end;
$$;

revoke all on function reminder_digest(text) from public;
grant execute on function reminder_digest(text) to anon, authenticated;
