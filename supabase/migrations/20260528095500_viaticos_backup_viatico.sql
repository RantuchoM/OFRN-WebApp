-- Compatibilidad para exportación de viáticos:
-- algunas instancias no tienen la columna backup_viatico en giras_viaticos_detalle.

ALTER TABLE public.giras_viaticos_detalle
ADD COLUMN IF NOT EXISTS backup_viatico numeric;
