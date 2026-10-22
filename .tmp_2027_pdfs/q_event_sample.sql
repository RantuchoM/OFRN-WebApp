select e.id, e.id_gira, e.titulo, e.fecha::text, e.hora_desde, e.hora_hasta, e.id_tipo_evento, e.id_localidad, l.localidad
from eventos e
left join localidades l on l.id = e.id_localidad
where e.id_gira in (4, 15, 12)
  and e.id_tipo_evento = 1
order by e.id_gira, e.fecha
limit 40;

select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='eventos'
and column_name in ('id','id_gira','titulo','fecha','hora_desde','hora_hasta','id_tipo_evento','id_localidad','descripcion','is_deleted','tecnica','visible_agenda')
order by 1;

select column_name from information_schema.columns
where table_schema='public' and table_name='programas'
and column_name ilike '%local%';
