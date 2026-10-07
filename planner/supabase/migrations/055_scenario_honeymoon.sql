alter table scenario_choices drop constraint if exists scenario_choices_ref_type_check;
alter table scenario_choices add constraint scenario_choices_ref_type_check check (ref_type in ('vendor', 'diy', 'event', 'party', 'expense', 'honeymoon'));
