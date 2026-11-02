-- Preview only: upcoming Sinfónico / Camerata Filarmónica
select
  p.id as gira_id,
  p.nombre_gira,
  p.tipo::text as tipo,
  p.fecha_desde,
  p.fecha_hasta,
  p.estado::text as estado,
  count(distinct gi.id_integrante) filter (
    where lower(trim(i.condicion::text)) <> 'estable'
      and coalesce(i.es_simulacion, false) = false
  ) as no_estables_en_roster,
  count(distinct gi.id_integrante) filter (
    where lower(trim(i.condicion::text)) <> 'estable'
      and coalesce(i.es_simulacion, false) = false
      and nullif(trim(coalesce(i.alimentacion, '')), '') is not null
  ) as no_estables_con_alimentacion
from programas p
join giras_integrantes gi on gi.id_gira = p.id
join integrantes i on i.id = gi.id_integrante
where p.tipo::text in ('Sinfónico', 'Camerata Filarmónica')
  and p.fecha_hasta >= current_date
group by p.id, p.nombre_gira, p.tipo, p.fecha_desde, p.fecha_hasta, p.estado
order by p.fecha_desde nulls last, p.nombre_gira;
