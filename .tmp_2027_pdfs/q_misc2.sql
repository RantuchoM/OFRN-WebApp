select id, localidad from localidades where localidad ilike '%frutillar%' or localidad ilike '%chile%';

select distinct zona from programas where zona is not null order by 1;

select distinct tipo from giras_fuentes order by 1;

select e.id, e.id_gira, e.descripcion, e.fecha::text, e.hora_inicio::text, e.hora_fin::text,
       e.id_tipo_evento, e.id_locacion, loc.nombre as locacion, loc.id_localidad, l.localidad
from eventos e
left join locaciones loc on loc.id = e.id_locacion
left join localidades l on l.id = loc.id_localidad
where e.id_gira = 4
  and e.id_tipo_evento = 1
  and coalesce(e.is_deleted, false) = false
order by e.fecha
limit 20;
