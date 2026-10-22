select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='eventos'
and (column_name ilike '%loc%' or column_name ilike '%hora%' or column_name in ('id','id_gira','titulo','descripcion','fecha','id_tipo_evento','is_deleted','tecnica'))
order by ordinal_position;
