select column_name from information_schema.columns
where table_name='programas' and table_schema='public'
and column_name in ('is_deleted','deleted_at','estado','activo','papelera')
order by 1;
