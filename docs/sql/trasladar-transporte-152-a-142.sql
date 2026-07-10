-- Traslado: transporte + eventos + viático
-- Origen:  Comisión 152 "Luciana Hernandez con BRAT"
-- Destino: Gira 142
--
-- IDs (producción, 2026-07-07):
--   giras_transportes.id = 218  (Transporte público, detalle "Lula")
--   eventos.id IN (3529, 3530)  (Salida / Llegada Lula)
--   giras_viaticos_detalle.id = 361  (integrante 8603763 Luciana Hernandez)
--
-- Historial: 152 → 108 (error) → 142 (corrección aplicada)

-- =============================================================================
-- TRASLADO 108 → 142 (corrección)
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM giras_transportes WHERE id = 218 AND id_gira = 108) THEN
    RAISE EXCEPTION 'Transporte 218 no está en gira 108 (¿ya corregido?)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM giras_viaticos_detalle
    WHERE id_gira = 142
      AND id_integrante = 8603763
      AND id_evento_parada_inicio IS NULL
      AND id_evento_parada_fin IS NULL
      AND id <> 361
  ) THEN
    RAISE EXCEPTION 'Conflicto: ya hay viático de integrante 8603763 en gira 142';
  END IF;
END $$;

UPDATE giras_transportes SET id_gira = 142 WHERE id = 218 AND id_gira = 108;
UPDATE eventos SET id_gira = 142 WHERE id IN (3529, 3530) AND id_gira = 108 AND id_gira_transporte = 218;
UPDATE giras_logistica_rutas SET id_gira = 142 WHERE id_transporte_fisico = 218 AND id_gira = 108;
UPDATE giras_logistica_admision SET id_gira = 142 WHERE id_transporte_fisico = 218 AND id_gira = 108;
UPDATE giras_viaticos_detalle SET id_gira = 142 WHERE id = 361 AND id_gira = 108;
UPDATE giras_viaticos SET id_gira = 142 WHERE id_gira = 108 AND id_integrante = 8603763;

COMMIT;

-- Verificación
SELECT 'transportes_142' AS check_name, count(*) AS n FROM giras_transportes WHERE id_gira = 142 AND id = 218
UNION ALL SELECT 'eventos_142', count(*) FROM eventos WHERE id_gira = 142 AND id IN (3529, 3530)
UNION ALL SELECT 'viatico_142', count(*) FROM giras_viaticos_detalle WHERE id_gira = 142 AND id = 361
UNION ALL SELECT 'restos_108', count(*) FROM giras_transportes WHERE id_gira = 108 AND id = 218;
