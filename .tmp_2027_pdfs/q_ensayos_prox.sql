-- Semana que viene: lun–dom a partir del próximo lunes
with bounds as (
  select
    (current_date + ((8 - extract(dow from current_date)::int) % 7))::date as lun,
    (current_date + ((8 - extract(dow from current_date)::int) % 7) + 6)::date as dom
)
select b.lun::text, b.dom::text from bounds b;

select e.id, e.fecha::text, e.hora_inicio::text, e.hora_fin::text,
       e.descripcion, e.id_tipo_evento, te.nombre as tipo,
       (select string_agg(en.ensamble, ', ' order by en.ensamble)
        from eventos_ensambles ee
        join ensambles en on en.id = ee.id_ensamble
        where ee.id_evento = e.id) as ensambles
from eventos e
left join tipos_evento te on te.id = e.id_tipo_evento
cross join (
  select
    (current_date + ((8 - extract(dow from current_date)::int) % 7))::date as lun,
    (current_date + ((8 - extract(dow from current_date)::int) % 7) + 6)::date as dom
) b
where coalesce(e.is_deleted,false)=false
  and coalesce(e.tecnica,false)=false
  and e.fecha between b.lun and b.dom
  and e.id_tipo_evento in (2, 3, 13)
order by e.fecha, e.hora_inicio;
