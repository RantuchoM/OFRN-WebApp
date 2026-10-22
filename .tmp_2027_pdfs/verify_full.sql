SELECT count(*) AS n_programas,
  sum((SELECT count(*) FROM eventos e WHERE e.id_gira = p.id AND e.id_tipo_evento = 1 AND coalesce(e.is_deleted,false)=false)) AS n_conciertos
FROM programas p
WHERE coalesce(subtitulo,'') LIKE '%[seed:giras2027-sinf-cf]%';

SELECT p.id, p.nombre_gira, p.zona,
  (SELECT string_agg(gf.tipo || ':' || coalesce(gf.valor_texto, e.ensamble, gf.valor_id::text), ' | ' ORDER BY gf.tipo, coalesce(e.ensamble, gf.valor_texto))
   FROM giras_fuentes gf
   LEFT JOIN ensambles e ON e.id = gf.valor_id
   WHERE gf.id_gira = p.id) AS fuentes,
  (SELECT string_agg(i.apellido || ', ' || i.nombre, '; ')
   FROM giras_integrantes gi JOIN integrantes i ON i.id = gi.id_integrante
   WHERE gi.id_gira = p.id) AS personas,
  (SELECT string_agg(l.localidad, ' · ' ORDER BY l.localidad)
   FROM giras_localidades gl JOIN localidades l ON l.id = gl.id_localidad
   WHERE gl.id_gira = p.id) AS localias
FROM programas p
WHERE coalesce(subtitulo,'') LIKE '%[seed:giras2027-sinf-cf]%'
ORDER BY p.fecha_desde;
