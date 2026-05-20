-- Porcentaje global de liquidación para exportación de destaques (100 / 80 / 0).
-- Sin esta columna, los PATCH desde DestaquesLocationPanel devuelven 400.

ALTER TABLE public.giras_viaticos_config
ADD COLUMN IF NOT EXISTS porcentaje_destaques numeric DEFAULT 100;

COMMENT ON COLUMN public.giras_viaticos_config.porcentaje_destaques IS
  'Porcentaje global aplicado al viático en exportación masiva de destaques';
