-- Permite anular reservas desde "Mis reservaciones" (estado = 'cancelada').
-- Si la columna `estado` tiene CHECK, agregar el valor o usar TEXT sin restricción.

-- Ejemplo si tenés un CHECK y falla el UPDATE a 'cancelada':
-- ALTER TABLE public.scrn_reservas DROP CONSTRAINT IF EXISTS scrn_reservas_estado_check;
-- ALTER TABLE public.scrn_reservas ADD CONSTRAINT scrn_reservas_estado_check
--   CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada'));

-- RLS: el usuario debe poder UPDATE su fila a cancelada, y leer/actualizar el admin.
-- (Ajustar según vuestras políticas existentes.)
