-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Fixes "there is no unique or exclusion constraint matching the ON
-- CONFLICT specification" from 024: a partial unique index (WHERE
-- diy_project_id is not null) can't be targeted by a plain
-- ON CONFLICT (diy_project_id) clause. A regular unique index already
-- allows unlimited NULLs, so the WHERE wasn't needed in the first place.

drop index if exists planning_tasks_diy_project_id_key;
create unique index if not exists planning_tasks_diy_project_id_key on planning_tasks(diy_project_id);
