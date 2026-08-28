-- FIMBA: metadata operativa de venues por edición (no estado de venue OFRN).
-- Una fila por par (id_edicion, id_locacion).

CREATE TABLE IF NOT EXISTS public.fimba_venue_info (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_edicion bigint NOT NULL
    REFERENCES public.fimba_ediciones (id) ON DELETE CASCADE,
  id_locacion bigint NOT NULL
    REFERENCES public.locaciones (id) ON DELETE CASCADE,
  referente_nombre text,
  referente_telefono text,
  rider_disponible text,
  sillas_disponibles text,
  agua text,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fimba_venue_info_edicion_locacion_key UNIQUE (id_edicion, id_locacion)
);

CREATE INDEX IF NOT EXISTS fimba_venue_info_id_edicion_idx
  ON public.fimba_venue_info (id_edicion);

CREATE INDEX IF NOT EXISTS fimba_venue_info_id_locacion_idx
  ON public.fimba_venue_info (id_locacion);

COMMENT ON TABLE public.fimba_venue_info IS
  'Información operativa FIMBA por locación y edición (referente, rider, sillas, agua, observaciones). '
  'Nombre/dirección siguen en locaciones. Distinto de eventos.id_estado_venue (Management OFRN).';

COMMENT ON COLUMN public.fimba_venue_info.rider_disponible IS
  'Texto libre: sí/no, enlace al rider de sala, notas.';

COMMENT ON COLUMN public.fimba_venue_info.sillas_disponibles IS
  'Cantidad o descripción de sillas disponibles en la sala.';

COMMENT ON COLUMN public.fimba_venue_info.agua IS
  'Disponibilidad de agua (texto libre: sí/no, detalle).';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_venue_info TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
