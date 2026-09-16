-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Expands venue status into the full pipeline, adds a favourite flag and a
-- quote-completion checklist.

alter table venues drop constraint venues_status_check;

update venues set status = case status
  when 'finalist' then 'finalist'
  when 'keep' then 'contacted'
  when 'hold' then 'researching'
  when 'new' then 'researching'
  when 'out' then 'out'
  else 'researching'
end;

alter table venues alter column status set default 'researching';
alter table venues add constraint venues_status_check
  check (status in ('researching','contacted','tour_booked','quote_received','finalist','out'));

alter table venues add column if not exists is_favourite boolean not null default false;
alter table venues add column if not exists quote_checklist jsonb not null default '{}'::jsonb;
