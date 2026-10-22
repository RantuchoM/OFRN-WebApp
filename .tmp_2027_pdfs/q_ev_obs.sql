select column_name from information_schema.columns
where table_schema='public' and table_name='eventos'
and column_name ilike '%obs%';
