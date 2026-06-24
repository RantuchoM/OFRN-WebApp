-- Registro de envío del mail encargo_arreglo (evitar reenvíos accidentales)
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS encargo_arreglo_mail_enviado_at timestamptz;

COMMENT ON COLUMN public.obras.encargo_arreglo_mail_enviado_at IS
  'Marca de tiempo del último envío exitoso del mail de asignación (template encargo_arreglo) al arreglador.';
