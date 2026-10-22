select e.id, e.id_gira, e.titulo, e.fecha::text, e.hora_inicio, e.hora_fin, e.id_tipo_evento, e.id_locacion, loc.nombre as locacion, loc.id_localidad, l.localidad
from eventos e
left join locaciones loc on loc.id = e.id_locacion
left join localidades l on l.id = loc.id_localidad
where e.id_gira in (4, 2, 15)
  and e.id_tipo_evento = 1
  and coalesce(e.is_deleted,false)=false
order by e.id_gira, e.fecha
limit 30;
