-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Connects the Inspiration Board to DIY Projects for real: "Add to DIY
-- Projects" used to just relabel an idea's category to "DIY" (a plain
-- Inspiration Board collection tab, same as "Décor" or "Attire") without
-- creating anything in diy_projects. Now it creates a real linked project.

alter table diy_projects add column if not exists idea_pin_id uuid references idea_pins(id) on delete set null;
create unique index if not exists diy_projects_idea_pin_id_key on diy_projects(idea_pin_id);
