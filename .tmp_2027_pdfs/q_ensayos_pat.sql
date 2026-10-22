-- Ultimas 4 semanas de ensayos tipo 13 por ensamble (patron)
select date_trunc('week', e.fecha)::date::text as semana,
       en.ensamble,
       count(*) as n,
       round(avg(extract(epoch from (e.hora_fin - e.hora_inicio))/3600.0)::numeric, 2) as horas_prom
from eventos e
join eventos_ensambles ee on ee.id_evento = e.id
join ensambles en on en.id = ee.id_ensamble
where e.id_tipo_evento = 13
  and coalesce(e.is_deleted,false)=false
  and coalesce(e.tecnica,false)=false
  and e.fecha >= current_date - 28
  and e.fecha < current_date + 14
  and en.ensamble not ilike 'CF%'
  and en.ensamble not ilike 'Jazz%'
  and en.ensamble not ilike 'Prod%'
  and en.ensamble not ilike 'Prueba%'
group by 1, 2
order by 1, 2;