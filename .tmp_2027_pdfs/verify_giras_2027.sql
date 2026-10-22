SELECT p.id, p.nombre_gira, p.tipo::text, p.zona, p.fecha_desde::text, p.fecha_hasta::text, p.estado::text,
    (SELECT count(*) FROM giras_fuentes gf WHERE gf.id_gira = p.id) AS n_fuentes,
    (SELECT count(*) FROM giras_localidades gl WHERE gl.id_gira = p.id) AS n_localias,
    (SELECT count(*) FROM eventos e WHERE e.id_gira = p.id AND e.id_tipo_evento = 1 AND coalesce(e.is_deleted,false)=false) AS n_conciertos
  FROM public.programas p
  WHERE coalesce(p.subtitulo, '') LIKE '%[seed:giras2027-sinf-cf]%'
  ORDER BY p.fecha_desde, p.id;