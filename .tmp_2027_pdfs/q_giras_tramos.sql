select p.id, p.nombre_gira, p.tipo::text, p.zona,
  p.fecha_desde::text, p.fecha_hasta::text, p.estado::text,
  coalesce((
    select json_agg(json_build_object('id', l.id, 'localidad', l.localidad) order by l.localidad)
    from giras_localidades gl join localidades l on l.id = gl.id_localidad
    where gl.id_gira = p.id
  ), '[]'::json) as localias,
  coalesce((
    select json_agg(json_build_object(
      'tipo', gf.tipo, 'valor_id', gf.valor_id, 'valor_texto', gf.valor_texto
    ))
    from giras_fuentes gf where gf.id_gira = p.id
  ), '[]'::json) as fuentes,
  coalesce((
    select json_agg(json_build_object(
      'indice', s.indice,
      'fecha_desde', s.fecha_desde::text,
      'fecha_hasta', s.fecha_hasta::text,
      'localidad_ids', coalesce((
        select json_agg(tl.id_localidad order by tl.id_localidad)
        from giras_tramo_localidades tl where tl.id_segmento = s.id
      ), '[]'::json)
    ) order by s.indice)
    from giras_tramo_segmentos s where s.id_gira = p.id
  ), '[]'::json) as tramos
from programas p
where coalesce(p.subtitulo,'') like '%[seed:giras2027-sinf-cf]%'
order by p.fecha_desde;
