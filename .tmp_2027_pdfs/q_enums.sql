select t.typname, e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname in (
  select udt_name from information_schema.columns
  where table_schema='public' and table_name='programas'
    and column_name in ('tipo','estado')
)
order by t.typname, e.enumsortorder;

select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='programas'
order by ordinal_position;
