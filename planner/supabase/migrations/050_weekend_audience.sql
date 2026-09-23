do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'timeline_moments' and column_name = 'audience') then
    alter table timeline_moments add column audience text not null default 'private' check (audience in ('all', 'party', 'vendors', 'private'));
    update timeline_moments set audience = 'all' where kind in ('free', 'checkin', 'transport', 'shuttle', 'after-party');
    update timeline_moments set audience = 'party' where kind in ('getting-ready', 'photos');
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'wedding_day_events' and column_name = 'audience') then
    alter table wedding_day_events add column audience text not null default 'private' check (audience in ('all', 'party', 'vendors', 'private'));
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'wedding_events' and column_name = 'audience') then
    alter table wedding_events add column audience text not null default 'all' check (audience in ('all', 'party', 'vendors', 'private'));
    update wedding_events set audience = 'party' where key = 'rehearsal-dinner';
  end if;
end $$;
