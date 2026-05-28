-- Lugar de comisión por fila (viáticos individuales); vacío → giras_viaticos_config.lugar_comision

ALTER TABLE public.giras_viaticos_detalle
  ADD COLUMN IF NOT EXISTS lugar_comision text;

COMMENT ON COLUMN public.giras_viaticos_detalle.lugar_comision IS
  'Lugar de comisión para esta fila. Si es NULL o vacío, se usa giras_viaticos_config.lugar_comision al exportar.';
