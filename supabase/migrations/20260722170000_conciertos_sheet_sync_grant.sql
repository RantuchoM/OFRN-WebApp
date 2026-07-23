-- Permitir lectura del estado del Sheet a usuarios autenticados (botón Abrir).
GRANT SELECT ON public.conciertos_sheet_sync TO authenticated;
GRANT SELECT ON public.conciertos_sheet_sync TO service_role;
