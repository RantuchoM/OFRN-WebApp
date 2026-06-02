-- Tramos de viático por parada de inicio/fin (desdoble ocasional por persona en una gira).

ALTER TABLE public.giras_viaticos_detalle
  ADD COLUMN IF NOT EXISTS id_evento_parada_inicio bigint,
  ADD COLUMN IF NOT EXISTS id_evento_parada_fin bigint,
  ADD COLUMN IF NOT EXISTS tramo_orden smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS etiqueta_tramo text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'giras_viaticos_detalle_parada_inicio_fkey'
  ) THEN
    ALTER TABLE public.giras_viaticos_detalle
      ADD CONSTRAINT giras_viaticos_detalle_parada_inicio_fkey
      FOREIGN KEY (id_evento_parada_inicio) REFERENCES public.eventos(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'giras_viaticos_detalle_parada_fin_fkey'
  ) THEN
    ALTER TABLE public.giras_viaticos_detalle
      ADD CONSTRAINT giras_viaticos_detalle_parada_fin_fkey
      FOREIGN KEY (id_evento_parada_fin) REFERENCES public.eventos(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.giras_viaticos_detalle.id_evento_parada_inicio IS
  'Parada (evento) de inicio del tramo; define salida para cálculo de días.';
COMMENT ON COLUMN public.giras_viaticos_detalle.id_evento_parada_fin IS
  'Parada (evento) de fin del tramo; define llegada para cálculo de días.';
COMMENT ON COLUMN public.giras_viaticos_detalle.tramo_orden IS
  'Orden del tramo cuando una persona tiene varias filas de viático en la misma gira.';
COMMENT ON COLUMN public.giras_viaticos_detalle.etiqueta_tramo IS
  'Etiqueta opcional (ej. Tramo 1) para exportación y tabla.';

CREATE INDEX IF NOT EXISTS giras_viaticos_detalle_gira_integrante_tramo_idx
  ON public.giras_viaticos_detalle (id_gira, id_integrante, tramo_orden);
