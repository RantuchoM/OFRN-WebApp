-- Detail: non-Estable on upcoming Sinfónico / Camerata with alimentacion set
with target_giras as (
  select p.id, p.nombre_gira, p.tipo::text as tipo, p.fecha_desde, p.fecha_hasta
  from programas p
  where p.tipo::text in ('Sinfónico', 'Camerata Filarmónica')
    and p.fecha_hasta >= current_date
)
select
  i.id as integrante_id,
  i.apellido,
  i.nombre,
  i.condicion::text as condicion,
  i.alimentacion,
  string_agg(
    tg.nombre_gira || ' [' || tg.tipo || ' · ' || tg.fecha_desde::text || ']',
    ' | '
    order by tg.fecha_desde, tg.nombre_gira
  ) as giras,
  count(distinct tg.id) as n_giras
from target_giras tg
join giras_integrantes gi on gi.id_gira = tg.id
join integrantes i on i.id = gi.id_integrante
where lower(trim(i.condicion::text)) <> 'estable'
  and coalesce(i.es_simulacion, false) = false
  and nullif(trim(coalesce(i.alimentacion, '')), '') is not null
group by i.id, i.apellido, i.nombre, i.condicion, i.alimentacion
order by i.apellido, i.nombre;
