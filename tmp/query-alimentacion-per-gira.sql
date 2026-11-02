-- Per-gira person list
with target_giras as (
  select p.id, p.nombre_gira, p.tipo::text as tipo, p.fecha_desde, p.fecha_hasta, p.estado::text as estado
  from programas p
  where p.tipo::text in ('Sinfónico', 'Camerata Filarmónica')
    and p.fecha_hasta >= current_date
)
select
  tg.id as gira_id,
  tg.nombre_gira,
  tg.tipo,
  tg.fecha_desde,
  tg.fecha_hasta,
  tg.estado,
  i.id as integrante_id,
  i.apellido,
  i.nombre,
  i.condicion::text as condicion,
  i.alimentacion,
  gi.estado as estado_gira
from target_giras tg
join giras_integrantes gi on gi.id_gira = tg.id
join integrantes i on i.id = gi.id_integrante
where lower(trim(i.condicion::text)) <> 'estable'
  and coalesce(i.es_simulacion, false) = false
  and nullif(trim(coalesce(i.alimentacion, '')), '') is not null
order by tg.fecha_desde, tg.nombre_gira, i.apellido, i.nombre;
