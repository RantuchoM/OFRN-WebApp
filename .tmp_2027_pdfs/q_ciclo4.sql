SELECT p.nombre_gira, p.subtitulo, p.fecha_desde, p.fecha_hasta,
  l.localidad,
  (SELECT string_agg(e.fecha::text || ' ' || e.hora_inicio::text, ', ' ORDER BY e.fecha)
   FROM eventos e
   WHERE e.id_gira = p.id AND coalesce(e.is_deleted, false) = false) AS conciertos
FROM programas p
LEFT JOIN giras_localidades gl ON gl.id_gira = p.id
LEFT JOIN localidades l ON l.id = gl.id_localidad
WHERE coalesce(p.subtitulo, '') LIKE '%[seed:ciclos2027-ensamble]%'
  AND p.nombre_gira LIKE 'Ciclo de Cámara IV%'
ORDER BY p.nombre_gira;
