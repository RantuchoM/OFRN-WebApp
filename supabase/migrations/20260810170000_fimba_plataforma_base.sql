-- FIMBA foundation: ediciones, propuestas (artistas), participantes,
-- audiencia OFRN en eventos, asignaciones evento↔artista y transporte multi-vehículo.
-- IDs de personas OFRN siguen siendo bigint; participantes FIMBA son entidad propia
-- (id_integrante nullable, sin clonar esquema integrantes).

-- ---------------------------------------------------------------------------
-- 1) Ediciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fimba_ediciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  anio integer NOT NULL,
  id_gira bigint NOT NULL REFERENCES public.programas(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fimba_ediciones_id_gira_key UNIQUE (id_gira)
);

CREATE INDEX IF NOT EXISTS fimba_ediciones_anio_idx
  ON public.fimba_ediciones (anio DESC);

COMMENT ON TABLE public.fimba_ediciones IS
  'Edición FIMBA ligada 1:1 a un programa/gira OFRN (id_gira → programas.id).';

-- ---------------------------------------------------------------------------
-- 2) Propuestas (UI: Artista)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fimba_propuestas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_edicion bigint NOT NULL REFERENCES public.fimba_ediciones(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  color text,
  orden integer NOT NULL DEFAULT 0,
  cantidad_planificada integer NOT NULL DEFAULT 1
    CONSTRAINT fimba_propuestas_cantidad_planificada_chk
      CHECK (cantidad_planificada >= 1 AND cantidad_planificada <= 200),
  plazas_extra_materiales integer NOT NULL DEFAULT 0
    CONSTRAINT fimba_propuestas_plazas_extra_chk CHECK (plazas_extra_materiales >= 0),
  checkin_at date,
  checkout_at date,
  token_consulta uuid NOT NULL DEFAULT gen_random_uuid(),
  token_edicion uuid NOT NULL DEFAULT gen_random_uuid(),
  estado text NOT NULL DEFAULT 'activa'
    CONSTRAINT fimba_propuestas_estado_chk
      CHECK (estado = ANY (ARRAY['borrador'::text, 'activa'::text, 'cerrada'::text, 'cancelada'::text])),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fimba_propuestas_token_consulta_key UNIQUE (token_consulta),
  CONSTRAINT fimba_propuestas_token_edicion_key UNIQUE (token_edicion)
);

CREATE INDEX IF NOT EXISTS fimba_propuestas_id_edicion_idx
  ON public.fimba_propuestas (id_edicion);

CREATE INDEX IF NOT EXISTS fimba_propuestas_token_consulta_idx
  ON public.fimba_propuestas (token_consulta);

CREATE INDEX IF NOT EXISTS fimba_propuestas_token_edicion_idx
  ON public.fimba_propuestas (token_edicion);

COMMENT ON TABLE public.fimba_propuestas IS
  'Propuesta artística (UI: Artista). Capacidad hotel/comida = cantidad_planificada; transporte = planificada + plazas_extra_materiales.';
COMMENT ON COLUMN public.fimba_propuestas.plazas_extra_materiales IS
  'Solo transporte (material/extra); no cuenta para hotel ni comidas.';
COMMENT ON COLUMN public.fimba_propuestas.token_consulta IS
  'UUID para enlace solo-lectura /fimba/a/:token';
COMMENT ON COLUMN public.fimba_propuestas.token_edicion IS
  'UUID para enlace de edición externa /fimba/e/:token';

-- ---------------------------------------------------------------------------
-- 3) Participantes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fimba_participantes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_propuesta bigint NOT NULL REFERENCES public.fimba_propuestas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  apellido text NOT NULL,
  documento text,
  tipo_alimentacion text NOT NULL DEFAULT 'regular'
    CONSTRAINT fimba_participantes_tipo_alimentacion_chk
      CHECK (tipo_alimentacion = ANY (ARRAY[
        'regular'::text,
        'vegetariano'::text,
        'vegano'::text,
        'celiaco'::text,
        'sin_tacc'::text,
        'otro'::text
      ])),
  nota_alimentacion text,
  activo boolean NOT NULL DEFAULT true,
  id_integrante bigint REFERENCES public.integrantes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS fimba_participantes_id_propuesta_idx
  ON public.fimba_participantes (id_propuesta);

CREATE INDEX IF NOT EXISTS fimba_participantes_id_integrante_idx
  ON public.fimba_participantes (id_integrante)
  WHERE id_integrante IS NOT NULL;

-- Un documento activo por propuesta
CREATE UNIQUE INDEX IF NOT EXISTS fimba_participantes_propuesta_documento_uidx
  ON public.fimba_participantes (id_propuesta, lower(btrim(documento)))
  WHERE documento IS NOT NULL AND btrim(documento) <> '' AND activo = true;

COMMENT ON TABLE public.fimba_participantes IS
  'Participantes FIMBA (no clonan integrantes). id_integrante opcional si la persona también es de la nómina OFRN.';

-- Un documento activo único por edición (simplicidad v1: no en dos artistas)
CREATE OR REPLACE FUNCTION public.fimba_participantes_enforce_doc_edicion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id_edicion bigint;
  v_conflicto bigint;
BEGIN
  IF NEW.activo IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF NEW.documento IS NULL OR btrim(NEW.documento) = '' THEN
    RETURN NEW;
  END IF;

  SELECT p.id_edicion INTO v_id_edicion
  FROM public.fimba_propuestas p
  WHERE p.id = NEW.id_propuesta;

  IF v_id_edicion IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT fp.id INTO v_conflicto
  FROM public.fimba_participantes fp
  JOIN public.fimba_propuestas pr ON pr.id = fp.id_propuesta
  WHERE pr.id_edicion = v_id_edicion
    AND fp.activo = true
    AND fp.id IS DISTINCT FROM NEW.id
    AND fp.documento IS NOT NULL
    AND lower(btrim(fp.documento)) = lower(btrim(NEW.documento))
  LIMIT 1;

  IF v_conflicto IS NOT NULL THEN
    RAISE EXCEPTION 'Documento ya registrado en otra propuesta de esta edición FIMBA (participante %)', v_conflicto
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fimba_participantes_doc_edicion_trg ON public.fimba_participantes;
CREATE TRIGGER fimba_participantes_doc_edicion_trg
  BEFORE INSERT OR UPDATE OF documento, activo, id_propuesta
  ON public.fimba_participantes
  FOR EACH ROW
  EXECUTE FUNCTION public.fimba_participantes_enforce_doc_edicion();

-- ---------------------------------------------------------------------------
-- 4) Eventos: audiencia OFRN + tags FIMBA
-- ---------------------------------------------------------------------------
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS audiencia_ofrn text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'eventos_audiencia_ofrn_chk'
  ) THEN
    ALTER TABLE public.eventos
      ADD CONSTRAINT eventos_audiencia_ofrn_chk
      CHECK (
        audiencia_ofrn IS NULL
        OR audiencia_ofrn = ANY (ARRAY['none'::text, 'tutti'::text, 'grupos'::text])
      );
  END IF;
END $$;

-- Backfill: con grupos → 'grupos'; sin filas en eventos_grupos → 'tutti'
UPDATE public.eventos e
SET audiencia_ofrn = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.eventos_grupos eg WHERE eg.id_evento = e.id
  ) THEN 'grupos'
  ELSE 'tutti'
END
WHERE e.audiencia_ofrn IS NULL;

ALTER TABLE public.eventos
  ALTER COLUMN audiencia_ofrn SET DEFAULT 'tutti';

COMMENT ON COLUMN public.eventos.audiencia_ofrn IS
  'Convocatoria OFRN del evento: none | tutti | grupos. Backfill: grupos si hay eventos_grupos, si no tutti.';

CREATE TABLE IF NOT EXISTS public.eventos_fimba_propuestas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_evento bigint NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  id_propuesta bigint NOT NULL REFERENCES public.fimba_propuestas(id) ON DELETE CASCADE,
  CONSTRAINT eventos_fimba_propuestas_evento_propuesta_key UNIQUE (id_evento, id_propuesta)
);

CREATE INDEX IF NOT EXISTS eventos_fimba_propuestas_id_evento_idx
  ON public.eventos_fimba_propuestas (id_evento);

CREATE INDEX IF NOT EXISTS eventos_fimba_propuestas_id_propuesta_idx
  ON public.eventos_fimba_propuestas (id_propuesta);

COMMENT ON TABLE public.eventos_fimba_propuestas IS
  'Propuestas FIMBA convocadas a un evento (tag por artista).';

-- ---------------------------------------------------------------------------
-- 5) Transporte multi-vehículo en eventos FIMBA (flota de la gira)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fimba_evento_transportes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_evento bigint NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  id_gira_transporte bigint NOT NULL REFERENCES public.giras_transportes(id) ON DELETE CASCADE,
  plazas integer NOT NULL DEFAULT 0
    CONSTRAINT fimba_evento_transportes_plazas_chk CHECK (plazas >= 0),
  CONSTRAINT fimba_evento_transportes_evento_transporte_key UNIQUE (id_evento, id_gira_transporte)
);

CREATE INDEX IF NOT EXISTS fimba_evento_transportes_id_evento_idx
  ON public.fimba_evento_transportes (id_evento);

CREATE INDEX IF NOT EXISTS fimba_evento_transportes_id_gira_transporte_idx
  ON public.fimba_evento_transportes (id_gira_transporte);

COMMENT ON TABLE public.fimba_evento_transportes IS
  'Asignación de plazas FIMBA a vehículos de la flota de la gira (giras_transportes). Stub de capacidad v1.';

-- ---------------------------------------------------------------------------
-- 6) Acceso: mismo modelo que intranet OFRN (anon key + auth app-level).
--    Tokens UUID para rutas públicas; sin RLS hasta hardening futuro.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_ediciones TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_propuestas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_participantes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos_fimba_propuestas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_evento_transportes TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
