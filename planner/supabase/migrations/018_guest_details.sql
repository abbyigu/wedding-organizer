-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Adds the household detail fields needed for the guest list's side panel
-- (dietary, accessibility, accommodation, travel, meal/table/gift
-- tracking) — all additive, nothing existing is touched or renamed.

alter table guests
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists address text not null default '',
  add column if not exists dietary text not null default '',
  add column if not exists accessibility text not null default '',
  add column if not exists accommodation_needed boolean not null default false,
  add column if not exists transportation_needed boolean not null default false,
  add column if not exists invitation_sent boolean not null default false,
  add column if not exists meal_selection text not null default '',
  add column if not exists table_assignment text not null default '',
  add column if not exists gift_received boolean not null default false,
  add column if not exists thank_you_sent boolean not null default false;
