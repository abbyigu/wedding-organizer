-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- Turns the Planning Board's tasks into the single source for a real Wedding
-- Planning Timeline: the same rows show up on the Board (WHAT) and the
-- Timeline (WHEN). Nothing is duplicated.

alter table planning_tasks add column if not exists start_date date;                       -- DIY start (due_date is the target / "finish by")
alter table planning_tasks add column if not exists period text;                           -- timeline period key for tasks with no date yet
alter table planning_tasks add column if not exists template_key text;                     -- set on tasks created from the suggested plan
alter table planning_tasks add column if not exists date_manual boolean not null default false; -- true once the couple picks a date themselves
alter table planning_tasks add column if not exists suggested_for date;                    -- the wedding date a suggested date was calculated for
alter table planning_tasks add column if not exists tags text[] not null default '{}';     -- Real / Faux / Mixed / DIY / Rental / Vendor / Venue Included
alter table planning_tasks add column if not exists actual_cost numeric;
alter table planning_tasks add column if not exists vendor_id uuid references vendors(id) on delete set null;
alter table planning_tasks add column if not exists wedding_day jsonb not null default '{}'::jsonb; -- {location, setup, person, vendor, ready_by}

create unique index if not exists planning_tasks_template_key_key on planning_tasks(template_key);

-- Planning categories now match the wedding's areas.
update planning_tasks set category = 'Décor & Florals' where category = 'Décor';
update planning_tasks set category = 'Food & Drink' where category = 'Food';
update planning_tasks set category = 'Travel & Stay' where category in ('Travel', 'Lodging');
update diy_projects set related_area = 'Décor & Florals' where related_area = 'Décor';
update diy_projects set related_area = 'Food & Drink' where related_area = 'Food';
update diy_projects set related_area = 'Travel & Stay' where related_area in ('Travel', 'Lodging');

-- DIY projects already mirror into planning_tasks (one row each, migration 024).
-- Completing or rescheduling that task from the Board or Timeline now flows back
-- to the DIY project too. It only fires when a value actually changes, so the two
-- triggers can't loop.
create or replace function planning_task_sync_diy()
returns trigger as $$
declare
  mapped text := case new.status
    when 'ideas' then 'idea'
    when 'todo' then 'materials_needed'
    when 'in_progress' then 'making'
    when 'done' then 'finished'
    else null
  end;
begin
  -- Only touch the DIY row if something really differs (an UPDATE that changes nothing
  -- would still fire the DIY -> task trigger and undo a Waiting / Decision needed status).
  update diy_projects set
    status = coalesce(mapped, status),
    deadline = new.due_date
  where id = new.diy_project_id
    and (status is distinct from coalesce(mapped, status) or deadline is distinct from new.due_date);
  return new;
end;
$$ language plpgsql;

drop trigger if exists planning_tasks_sync_diy on planning_tasks;
create trigger planning_tasks_sync_diy
  after update on planning_tasks
  for each row
  when (new.diy_project_id is not null and (old.status is distinct from new.status or old.due_date is distinct from new.due_date))
  execute function planning_task_sync_diy();
