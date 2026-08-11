-- FIMBA: rutas de subida/bajada por artista (cantidad), análogas a giras_logistica_rutas
-- pero con plazas (no id_integrante). Reutiliza flota giras_transportes + eventos de la gira.

CREATE TABLE IF NOT EXISTS public.fimba_propuesta_rutas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_propuesta bigint NOT NULL
    REFERENCES public.fimba_propuestas (id) ON DELETE CASCADE,
  id_gira_transporte bigint NOT NULL
    REFERENCES public.giras_transportes (id) ON DELETE CASCADE,
  plazas integer NOT NULL DEFAULT 1
    CONSTRAINT fimba_propuesta_rutas_plazas_chk CHECK (plazas >= 0),
  id_evento_subida bigint
    REFERENCES public.eventos (id) ON DELETE SET NULL,
  id_evento_bajada bigint
    REFERENCES public.eventos (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fimba_propuesta_rutas_stop_chk CHECK (
    id_evento_subida IS NOT NULL OR id_evento_bajada IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS fimba_propuesta_rutas_id_propuesta_idx
  ON public.fimba_propuesta_rutas (id_propuesta);

CREATE INDEX IF NOT EXISTS fimba_propuesta_rutas_id_gira_transporte_idx
  ON public.fimba_propuesta_rutas (id_gira_transporte);

CREATE INDEX IF NOT EXISTS fimba_propuesta_rutas_id_evento_subida_idx
  ON public.fimba_propuesta_rutas (id_evento_subida)
  WHERE id_evento_subida IS NOT NULL;

CREATE INDEX IF NOT EXISTS fimba_propuesta_rutas_id_evento_bajada_idx
  ON public.fimba_propuesta_rutas (id_evento_bajada)
  WHERE id_evento_bajada IS NOT NULL;

COMMENT ON TABLE public.fimba_propuesta_rutas IS
  'Subidas/bajadas FIMBA por artista (cantidad de plazas) en una unidad giras_transportes. '
  'Paridad operativa con giras_logistica_rutas (OFRN por persona); aquí n es plazas, no nomina.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_propuesta_rutas TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
