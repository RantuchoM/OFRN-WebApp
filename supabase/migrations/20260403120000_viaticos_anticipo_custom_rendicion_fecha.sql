-- Anticipo manual por fila (giras_viaticos_detalle) y fecha límite de rendición por gira (config).
-- Si no ejecutás esta migración en el proyecto remoto, los PATCH con anticipo_custom devuelven 400.

ALTER TABLE public.giras_viaticos_detalle
ADD COLUMN IF NOT EXISTS anticipo_custom numeric DEFAULT NULL;

ALTER TABLE public.giras_viaticos
ADD COLUMN IF NOT EXISTS anticipo_custom numeric DEFAULT NULL;

ALTER TABLE public.giras_viaticos_config
ADD COLUMN IF NOT EXISTS rendicion_fecha date DEFAULT NULL;

COMMENT ON COLUMN public.giras_viaticos_detalle.anticipo_custom IS 'Anticipo manual que reemplaza al calculado';
COMMENT ON COLUMN public.giras_viaticos_config.rendicion_fecha IS 'Fecha límite de rendición personalizada para la gira';
