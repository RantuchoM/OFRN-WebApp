-- Estado independiente por persona (mismos valores que scrn_reservas.estado).
-- Cada fila en scrn_reserva_pasajeros puede aceptarse / rechazarse / anularse por separado.
-- Plazas ocupadas = (reserva del solicitante aceptada ? 1 : 0) + count(filas pax con estado = 'aceptada').

ALTER TABLE public.scrn_reserva_pasajeros
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente';

ALTER TABLE public.scrn_reserva_pasajeros
  DROP CONSTRAINT IF EXISTS scrn_reserva_pasajeros_estado_check;

ALTER TABLE public.scrn_reserva_pasajeros
  ADD CONSTRAINT scrn_reserva_pasajeros_estado_check
  CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada'));

-- Alinear acompañantes con la reserva padre (datos viejos: un solo estado global)
UPDATE public.scrn_reserva_pasajeros p
SET estado = r.estado
FROM public.scrn_reservas r
WHERE p.id_reserva = r.id
  AND r.estado IS NOT NULL
  AND (p.estado IS NULL OR p.estado = 'pendiente');

COMMENT ON COLUMN public.scrn_reserva_pasajeros.estado IS
  'Gestion independiente: pendiente, aceptada, rechazada, cancelada.';
