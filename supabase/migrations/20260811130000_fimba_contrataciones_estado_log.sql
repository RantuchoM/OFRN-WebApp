-- FIMBA: historial append-only de «Último estado conocido» en contrataciones.
-- UI presets (Factura presentada/emitida/pedida, Pagado) se persisten como texto libre.

CREATE TABLE IF NOT EXISTS public.fimba_contrataciones_estado_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_contratacion bigint NOT NULL
    REFERENCES public.fimba_contrataciones (id) ON DELETE CASCADE,
  estado text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by_label text,
  created_by_integrante_id bigint,
  created_by_fimba_usuario_id bigint
    REFERENCES public.fimba_usuarios (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS fimba_contrataciones_estado_log_contratacion_created_idx
  ON public.fimba_contrataciones_estado_log (id_contratacion, created_at DESC, id DESC);

COMMENT ON TABLE public.fimba_contrataciones_estado_log IS
  'Log append-only de cambios a ultimo_estado_conocido (texto + timestamp + autor).';
COMMENT ON COLUMN public.fimba_contrataciones_estado_log.estado IS
  'Valor del estado (preset de UI o texto libre).';
COMMENT ON COLUMN public.fimba_contrataciones_estado_log.created_by_label IS
  'Nombre o mail de quien registró (sesión OFRN o fimba_user); denormalizado para display.';
COMMENT ON COLUMN public.fimba_contrataciones_estado_log.created_by_integrante_id IS
  'ID numérico de integrante OFRN si el actor fue staff OFRN (sin FK dura).';
COMMENT ON COLUMN public.fimba_contrataciones_estado_log.created_by_fimba_usuario_id IS
  'fk opcional a fimba_usuarios si el actor fue sesión externa FIMBA.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_contrataciones_estado_log TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
