select
  e.id_gira,
  e.fecha::text as fecha,
  e.hora_inicio::text as hora_inicio,
  e.hora_fin::text as hora_fin,
  e.id_tipo_evento,
  te.nombre as tipo_evento,
  e.descripcion
from eventos e
join programas p on p.id = e.id_gira
left join tipos_evento te on te.id = e.id_tipo_evento
where coalesce(p.subtitulo, '') like '%[seed:giras2027-sinf-cf]%'
  and coalesce(e.is_deleted, false) = false
order by e.id_gira, e.fecha, e.hora_inicio;
