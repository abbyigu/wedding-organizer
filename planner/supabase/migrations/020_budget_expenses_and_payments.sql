-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Two additions for the redesigned Budget section:
-- 1) budget_expenses — custom line items you add yourself, on top of the
--    venue's own line items and the fixed shared-cost list, grouped into
--    one of the same display categories as the rest of the breakdown.
-- 2) payments — a standalone cash-flow tracker (deposits, balances, any
--    vendor payment) with a due date and a paid/unpaid state. It does not
--    read from or write to a venue's own deposit/balance fields — those
--    stay on the venue profile as before; this is a separate list for
--    tracking payments across every vendor in one place.

create table if not exists budget_expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Other',
  label text not null default 'New expense',
  rate numeric not null default 0,
  unit text not null default 'flat',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table budget_expenses enable row level security;

drop policy if exists "shared all access" on budget_expenses;
create policy "shared all access" on budget_expenses
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists budget_expenses_set_updated_at on budget_expenses;
create trigger budget_expenses_set_updated_at
  before update on budget_expenses
  for each row execute function set_updated_at();

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'New payment',
  vendor text not null default '',
  category text not null default 'Other',
  amount numeric not null default 0,
  due_date date,
  status text not null default 'upcoming',
  method text not null default '',
  confirmation_number text not null default '',
  notes text not null default '',
  link text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table payments enable row level security;

drop policy if exists "shared all access" on payments;
create policy "shared all access" on payments
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();
