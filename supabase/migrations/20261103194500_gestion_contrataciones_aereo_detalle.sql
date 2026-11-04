-- Detalle de aéreos cuando la orquesta compra (números de vuelo, costos, etc.).
ALTER TABLE public.gestion_contrataciones
  ADD COLUMN IF NOT EXISTS aereo_detalle jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.gestion_contrataciones.aereo_detalle IS
  'Cuando aereo_modo=orquesta: { vuelos:[{numero,fecha,origen,destino,costo,notas}], costo_total, id_fondo, notas, id_expediente_transporte }.';
