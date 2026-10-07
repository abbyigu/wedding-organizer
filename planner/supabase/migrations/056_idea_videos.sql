alter table idea_pins add column if not exists video_url text not null default '';
alter table idea_pins add column if not exists video_path text;
