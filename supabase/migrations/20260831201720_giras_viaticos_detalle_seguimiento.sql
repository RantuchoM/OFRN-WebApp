-- Seguimiento de viáticos (Gestión): tipo de liquidación y marca de color por fila.
ALTER TABLE public.giras_viaticos_detalle
  ADD COLUMN IF NOT EXISTS seguimiento_tipo text,
  ADD COLUMN IF NOT EXISTS seguimiento_color text;

ALTER TABLE public.giras_viaticos_detalle
  DROP CONSTRAINT IF EXISTS giras_viaticos_detalle_seguimiento_tipo_check;

ALTER TABLE public.giras_viaticos_detalle
  ADD CONSTRAINT giras_viaticos_detalle_seguimiento_tipo_check
  CHECK (
    seguimiento_tipo IS NULL
    OR seguimiento_tipo = ANY (ARRAY['viatico'::text, 'reintegro'::text])
  );

ALTER TABLE public.giras_viaticos_detalle
  DROP CONSTRAINT IF EXISTS giras_viaticos_detalle_seguimiento_color_check;

ALTER TABLE public.giras_viaticos_detalle
  ADD CONSTRAINT giras_viaticos_detalle_seguimiento_color_check
  CHECK (
    seguimiento_color IS NULL
    OR seguimiento_color = ANY (ARRAY['amarillo'::text, 'verde'::text])
  );

COMMENT ON COLUMN public.giras_viaticos_detalle.seguimiento_tipo IS
  'Clasificación de seguimiento en Gestión: viatico | reintegro';
COMMENT ON COLUMN public.giras_viaticos_detalle.seguimiento_color IS
  'Marca visual de fila en Seguimiento de viáticos: amarillo | verde';
