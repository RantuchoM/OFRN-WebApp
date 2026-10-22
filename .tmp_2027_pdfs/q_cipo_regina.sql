select p.id, p.nombre_gira, p.fecha_desde::text, p.fecha_hasta::text, p.zona,
  (select string_agg(l.localidad || '(' || l.id || ')', ' · ' order by l.id)
   from giras_localidades gl join localidades l on l.id = gl.id_localidad
   where gl.id_gira = p.id) as localias,
  (select count(*) from giras_tramo_segmentos s where s.id_gira = p.id) as n_tramos,
  (select json_agg(json_build_object(
      'indice', s.indice,
      'fecha_desde', s.fecha_desde,
      'fecha_hasta', s.fecha_hasta,
      'locs', (select string_agg(l.localidad, ',')
               from giras_tramo_localidades tl
               join localidades l on l.id = tl.id_localidad
               where tl.id_segmento = s.id)
    ) order by s.indice)
   from giras_tramo_segmentos s where s.id_gira = p.id) as tramos,
  (select json_agg(json_build_object('fecha', e.fecha, 'hora', e.hora_inicio, 'desc', e.descripcion)
                   order by e.fecha, e.hora_inicio)
   from eventos e
   where e.id_gira = p.id and e.id_tipo_evento = 1 and coalesce(e.is_deleted,false)=false) as conciertos
from programas p
where coalesce(p.subtitulo,'') like '%[seed:giras2027-sinf-cf]%'
  and exists (
    select 1 from giras_localidades gl where gl.id_gira = p.id and gl.id_localidad = 16
  )
  and exists (
    select 1 from giras_localidades gl where gl.id_gira = p.id and gl.id_localidad = 60
  )
order by p.fecha_desde;
