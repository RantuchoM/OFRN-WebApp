-- Actualiza quién hizo el encargo (id_usuario_carga) de las 5 obras "Para arreglar"
-- del bloque "Con Coro" en la gira (programa) 15.
UPDATE obras o
SET id_usuario_carga = 1767967586872
FROM repertorio_obras ro
JOIN programas_repertorios pr ON pr.id = ro.id_repertorio
WHERE o.id = ro.id_obra
  AND pr.id_programa = 15
  AND pr.nombre ILIKE 'Con Coro'
  AND o.estado = 'Para arreglar';

-- Verificación
SELECT o.id, o.titulo, o.id_usuario_carga, i.apellido, i.nombre
FROM obras o
JOIN repertorio_obras ro ON ro.id_obra = o.id
JOIN programas_repertorios pr ON pr.id = ro.id_repertorio
LEFT JOIN integrantes i ON i.id = o.id_usuario_carga
WHERE pr.id_programa = 15 AND pr.nombre ILIKE 'Con Coro' AND o.estado = 'Para arreglar'
ORDER BY ro.orden, ro.id;
