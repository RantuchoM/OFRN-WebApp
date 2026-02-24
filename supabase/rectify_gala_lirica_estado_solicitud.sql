-- Rectifica las 14 obras del bloque "Gala Lírica" (gira id = 12) para que tengan estado "Solicitud".
-- Ejecutar después de seed_gala_lirica_gira_12.sql si se desea que figuren como solicitudes.

UPDATE obras
SET estado = 'Solicitud'
WHERE id IN (
  SELECT ro.id_obra
  FROM repertorio_obras ro
  JOIN programas_repertorios pr ON pr.id = ro.id_repertorio
  WHERE pr.id_programa = 12
    AND pr.nombre = 'Gala Lírica'
);
