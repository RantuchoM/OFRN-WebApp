-- Quitar UNIQUE (id_gira, id_integrante): bloqueaba desdoble en varios tramos.
-- Reemplazar por índices que permiten múltiples filas con tramo_orden distinto.

ALTER TABLE public.giras_viaticos_detalle
  DROP CONSTRAINT IF EXISTS giras_viaticos_detalle_id_gira_id_integrante_key;

-- Fila única "simple" (sin paradas de tramo) por persona y gira.
DROP INDEX IF EXISTS public.giras_viaticos_detalle_gira_integrante_sin_tramo_uidx;
CREATE UNIQUE INDEX giras_viaticos_detalle_gira_integrante_sin_tramo_uidx
  ON public.giras_viaticos_detalle (id_gira, id_integrante)
  WHERE id_evento_parada_inicio IS NULL
    AND id_evento_parada_fin IS NULL;

-- Tramos desdoblados: mismo integrante, distinto tramo_orden.
DROP INDEX IF EXISTS public.giras_viaticos_detalle_gira_integrante_tramo_uidx;
CREATE UNIQUE INDEX giras_viaticos_detalle_gira_integrante_tramo_uidx
  ON public.giras_viaticos_detalle (id_gira, id_integrante, tramo_orden)
  WHERE id_evento_parada_inicio IS NOT NULL
     OR id_evento_parada_fin IS NOT NULL;
