-- Breakdown by condicion among candidates
with target_giras as (
  select p.id
  from programas p
  where p.tipo::text in ('Sinfónico', 'Camerata Filarmónica')
    and p.fecha_hasta >= current_date
),
candidates as (
  select distinct i.id, i.condicion::text as condicion, i.alimentacion
  from target_giras tg
  join giras_integrantes gi on gi.id_gira = tg.id
  join integrantes i on i.id = gi.id_integrante
  where lower(trim(i.condicion::text)) <> 'estable'
    and coalesce(i.es_simulacion, false) = false
    and nullif(trim(coalesce(i.alimentacion, '')), '') is not null
)
select condicion, count(*) as personas, string_agg(distinct alimentacion, ', ' order by alimentacion) as dietas
from candidates
group by condicion
order by personas desc, condicion;
