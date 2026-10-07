alter table reminder_prefs add column if not exists send_to text;

create or replace function reminder_targets(p_secret text)
returns table (user_id uuid, send_to text)
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or encode(sha256(convert_to(p_secret, 'UTF8')), 'hex') is distinct from (select a.value from app_secrets a where a.name = 'cron_secret_sha256') then
    raise exception 'not allowed';
  end if;
  return query select rp.user_id, rp.send_to from reminder_prefs rp where rp.send_to is not null and rp.send_to <> '';
end;
$$;

revoke all on function reminder_targets(text) from public;
grant execute on function reminder_targets(text) to anon, authenticated;
