select t.typname, e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname in ('tipo_programa', 'estado_gira')
order by t.typname, e.enumsortorder;
