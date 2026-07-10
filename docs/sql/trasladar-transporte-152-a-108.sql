-- Traslado: transporte + eventos + viático
-- Origen:  Comisión 152 "Luciana Hernandez con BRAT"
-- Destino: Gira 142 (corrección: inicialmente se envió por error a 108)
--
-- IDs confirmados en producción (2026-07-07):
--   giras_transportes.id = 218  (Transporte público, detalle "Lula")
--   eventos.id IN (3529, 3530)  (Salida / Llegada Lula)
--   giras_viaticos_detalle.id = 361  (integrante 8603763 Luciana Hernandez)

-- =============================================================================
-- 0) PREFLIGHT — ejecutar primero y revisar resultados
-- =============================================================================

SELECT id, nombre_gira, tipo, nomenclador, fecha_desde, fecha_hasta
FROM programas
WHERE id IN (108, 152);

SELECT gt.id, gt.id_gira, gt.detalle, t.nombre AS tipo_transporte
FROM giras_transportes gt
JOIN transportes t ON t.id = gt.id_transporte
WHERE gt.id_gira = 152;

SELECT e.id, e.id_gira, e.id_gira_transporte, e.fecha, e.hora_inicio, e.descripcion
FROM eventos e
WHERE e.id_gira_transporte = 218
  AND COALESCE(e.is_deleted, false) = false
ORDER BY e.fecha, e.hora_inicio;

SELECT vd.id, vd.id_gira, vd.id_integrante, i.apellido, i.nombre,
       vd.id_evento_parada_inicio, vd.id_evento_parada_fin,
       vd.backup_fecha_salida, vd.backup_fecha_llegada
FROM giras_viaticos_detalle vd
JOIN integrantes i ON i.id = vd.id_integrante
WHERE vd.id_gira = 152;

-- Conflicto potencial: misma persona ya cargada en viáticos de la gira 108
SELECT vd.id, vd.id_integrante, i.apellido, i.nombre
FROM giras_viaticos_detalle vd
JOIN integrantes i ON i.id = vd.id_integrante
WHERE vd.id_gira = 108
  AND vd.id_integrante = 8603763
  AND vd.id_evento_parada_inicio IS NULL
  AND vd.id_evento_parada_fin IS NULL;

-- =============================================================================
-- 1) TRASLADO (transacción)
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM giras_transportes WHERE id = 218 AND id_gira = 152) THEN
    RAISE EXCEPTION 'Transporte 218 no pertenece a la gira 152 (¿ya trasladado?)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM giras_viaticos_detalle
    WHERE id_gira = 108
      AND id_integrante = 8603763
      AND id_evento_parada_inicio IS NULL
      AND id_evento_parada_fin IS NULL
      AND id <> 361
  ) THEN
    RAISE EXCEPTION 'Conflicto: ya hay viático de integrante 8603763 en gira 108';
  END IF;
END $$;

-- Transporte físico de la gira
UPDATE giras_transportes
SET id_gira = 108
WHERE id = 218
  AND id_gira = 152;

-- Eventos de traslado (paradas)
UPDATE eventos
SET id_gira = 108
WHERE id IN (3529, 3530)
  AND id_gira = 152
  AND id_gira_transporte = 218;

-- Rutas / admisión vinculadas al bus (si existieran)
UPDATE giras_logistica_rutas
SET id_gira = 108
WHERE id_transporte_fisico = 218
  AND id_gira = 152;

UPDATE giras_logistica_admision
SET id_gira = 108
WHERE id_transporte_fisico = 218
  AND id_gira = 152;

-- Fila de viático individual
UPDATE giras_viaticos_detalle
SET id_gira = 108
WHERE id = 361
  AND id_gira = 152;

-- Resumen agregado (solo si existiera en la comisión)
UPDATE giras_viaticos
SET id_gira = 108
WHERE id_gira = 152
  AND id_integrante = 8603763;

-- Opcional: enlazar paradas del viático a los eventos de traslado
-- (hoy usa backup_fecha_*; esto activa cálculo por paradas reales)
-- UPDATE giras_viaticos_detalle
-- SET id_evento_parada_inicio = 3529,
--     id_evento_parada_fin = 3530
-- WHERE id = 361
--   AND id_gira = 108;

COMMIT;

-- =============================================================================
-- 2) VERIFICACIÓN POST-TRASLADO
-- =============================================================================

SELECT 'transportes_108' AS check_name, count(*) AS n
FROM giras_transportes WHERE id_gira = 108 AND id = 218
UNION ALL
SELECT 'eventos_108', count(*) FROM eventos WHERE id_gira = 108 AND id IN (3529, 3530)
UNION ALL
SELECT 'viatico_108', count(*) FROM giras_viaticos_detalle WHERE id_gira = 108 AND id = 361
UNION ALL
SELECT 'transportes_152', count(*) FROM giras_transportes WHERE id_gira = 152
UNION ALL
SELECT 'eventos_traslado_152', count(*) FROM eventos WHERE id_gira = 152 AND id_gira_transporte = 218
UNION ALL
SELECT 'viatico_152', count(*) FROM giras_viaticos_detalle WHERE id_gira = 152;
