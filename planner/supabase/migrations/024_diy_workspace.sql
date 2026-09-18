-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Turns DIY Projects from a bare idea list into a real build tracker, and
-- makes every DIY project show up on the Planning Board automatically
-- (one-way sync via trigger, so it works no matter where a project is
-- edited from — no app code has to remember to call it).

alter table diy_projects add column if not exists reference_image text not null default '';
alter table diy_projects add column if not exists owner text not null default 'together';
alter table diy_projects add column if not exists quantity int;
alter table diy_projects add column if not exists materials_checklist jsonb not null default '[]'::jsonb;
alter table diy_projects add column if not exists cost_actual numeric;
alter table diy_projects add column if not exists time_estimate text not null default '';
alter table diy_projects add column if not exists deadline date;
alter table diy_projects add column if not exists instructions_url text not null default '';
alter table diy_projects add column if not exists progress_photos jsonb not null default '[]'::jsonb;
alter table diy_projects add column if not exists related_area text not null default 'Other';

-- Old three-column status (idea/in_progress/done) becomes the four-column
-- board from the brief: Ideas → Materials needed → Making → Finished.
update diy_projects set status = 'making' where status = 'in_progress';
update diy_projects set status = 'finished' where status = 'done';
alter table diy_projects alter column status set default 'idea';

-- Link column on planning_tasks so a DIY project's mirrored task can be
-- found and kept in sync (one row per project).
alter table planning_tasks add column if not exists diy_project_id uuid references diy_projects(id) on delete cascade;
create unique index if not exists planning_tasks_diy_project_id_key on planning_tasks(diy_project_id) where diy_project_id is not null;

create or replace function diy_project_sync_task()
returns trigger as $$
begin
  if tg_op = 'DELETE' then
    delete from planning_tasks where diy_project_id = old.id;
    return old;
  end if;

  insert into planning_tasks (diy_project_id, title, category, notes, assigned_to, status, due_date, estimated_cost, sort_order)
  values (
    new.id,
    new.title,
    'DIY',
    new.notes,
    case when new.owner = 'helper' then 'together' else new.owner end,
    case new.status
      when 'idea' then 'ideas'
      when 'materials_needed' then 'todo'
      when 'making' then 'in_progress'
      when 'finished' then 'done'
      else 'ideas'
    end,
    new.deadline,
    coalesce(new.cost_actual, new.cost_estimate),
    0
  )
  on conflict (diy_project_id) do update set
    title = excluded.title,
    notes = excluded.notes,
    assigned_to = excluded.assigned_to,
    status = excluded.status,
    due_date = excluded.due_date,
    estimated_cost = excluded.estimated_cost;

  return new;
end;
$$ language plpgsql;

drop trigger if exists diy_projects_sync_task on diy_projects;
create trigger diy_projects_sync_task
  after insert or update or delete on diy_projects
  for each row execute function diy_project_sync_task();

-- Backfill: mirror any DIY projects that already existed before this trigger.
insert into planning_tasks (diy_project_id, title, category, notes, assigned_to, status, due_date, estimated_cost, sort_order)
select
  d.id, d.title, 'DIY', d.notes,
  case when d.owner = 'helper' then 'together' else d.owner end,
  case d.status
    when 'idea' then 'ideas'
    when 'materials_needed' then 'todo'
    when 'making' then 'in_progress'
    when 'finished' then 'done'
    else 'ideas'
  end,
  d.deadline, coalesce(d.cost_actual, d.cost_estimate), 0
from diy_projects d
where not exists (select 1 from planning_tasks t where t.diy_project_id = d.id);

-- "DIY" needs to be a valid category color lookup on the Planning Board;
-- categoryColor() in src/lib/planning-tasks.ts falls back to sage for any
-- unrecognized string, so no schema change is needed for that.
