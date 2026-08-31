-- Asegura backup_viatico: la migración 20260528095500 figura applied
-- pero en algunas instancias la columna no quedó en el schema remoto.
ALTER TABLE public.giras_viaticos_detalle
  ADD COLUMN IF NOT EXISTS backup_viatico numeric;

COMMENT ON COLUMN public.giras_viaticos_detalle.backup_viatico IS
  'Snapshot del monto de viático al exportar (histórico / seguimiento)';
