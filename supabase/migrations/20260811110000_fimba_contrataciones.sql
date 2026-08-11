-- FIMBA: planilla de contrataciones / expedientes por edición.
-- Tracking tipo spreadsheet: expediente, montos, flags de firma/doc/ADM.

CREATE TABLE IF NOT EXISTS public.fimba_contrataciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_edicion bigint NOT NULL
    REFERENCES public.fimba_ediciones (id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0,
  numero_expediente text,
  id_propuesta bigint
    REFERENCES public.fimba_propuestas (id) ON DELETE SET NULL,
  nombre text,
  monto numeric,
  fecha_limite_resol date,
  tipo_contratacion text NOT NULL DEFAULT 'Expediente',
  envio_firma_mfm_nota boolean NOT NULL DEFAULT false,
  nota_firmada boolean NOT NULL DEFAULT false,
  falta_documentacion boolean NOT NULL DEFAULT false,
  enviado_adm boolean NOT NULL DEFAULT false,
  ultimo_estado_conocido text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS fimba_contrataciones_id_edicion_orden_idx
  ON public.fimba_contrataciones (id_edicion, orden ASC, id ASC);

CREATE INDEX IF NOT EXISTS fimba_contrataciones_id_propuesta_idx
  ON public.fimba_contrataciones (id_propuesta)
  WHERE id_propuesta IS NOT NULL;

COMMENT ON TABLE public.fimba_contrataciones IS
  'Contrataciones / expedientes FIMBA por edición (planilla operativa).';
COMMENT ON COLUMN public.fimba_contrataciones.id_propuesta IS
  'Artista (fimba_propuestas) opcional; nombre libre si no hay vínculo o como fallback UI.';
COMMENT ON COLUMN public.fimba_contrataciones.nombre IS
  'Nombre display (texto libre y/o nombre de artista asociado).';
COMMENT ON COLUMN public.fimba_contrataciones.tipo_contratacion IS
  'Default Expediente; texto libre (otros tipos de contratación).';
COMMENT ON COLUMN public.fimba_contrataciones.fecha_limite_resol IS
  'Fecha límite para la resolución; UI en negrita roja.';
COMMENT ON COLUMN public.fimba_contrataciones.envio_firma_mfm_nota IS
  'Envío a la firma de MFM nota.';
COMMENT ON COLUMN public.fimba_contrataciones.falta_documentacion IS
  'Falta recibir documentación.';
COMMENT ON COLUMN public.fimba_contrataciones.enviado_adm IS
  'Enviado a ADM.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_contrataciones TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
