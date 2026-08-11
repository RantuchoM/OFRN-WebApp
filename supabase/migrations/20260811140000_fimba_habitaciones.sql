-- FIMBA: rooming por artista (propuesta).
-- Inventario de habitaciones (slots) + ocupantes (participantes activos).
-- Capacidades: SGL=1, DBL=2, TPL=3, QAD=4. Matrimonial solo multi (no SGL).
-- PAX hotel planificada (cantidad_planificada) NO se altera aquí.

-- ---------------------------------------------------------------------------
-- 1) Habitaciones (slots de inventario por propuesta)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fimba_propuestas_habitaciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_propuesta bigint NOT NULL
    REFERENCES public.fimba_propuestas (id) ON DELETE CASCADE,
  tipo text NOT NULL
    CONSTRAINT fimba_propuestas_habitaciones_tipo_chk
      CHECK (tipo = ANY (ARRAY['SGL'::text, 'DBL'::text, 'TPL'::text, 'QAD'::text])),
  matrimonial boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 0,
  label text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fimba_propuestas_habitaciones_sgl_no_matri_chk
    CHECK (tipo <> 'SGL' OR matrimonial = false)
);

CREATE INDEX IF NOT EXISTS fimba_propuestas_habitaciones_propuesta_orden_idx
  ON public.fimba_propuestas_habitaciones (id_propuesta, orden ASC, id ASC);

CREATE INDEX IF NOT EXISTS fimba_propuestas_habitaciones_tipo_idx
  ON public.fimba_propuestas_habitaciones (id_propuesta, tipo);

COMMENT ON TABLE public.fimba_propuestas_habitaciones IS
  'Cupos de habitación por artista FIMBA (propuesta). Admin define inventario; editor asigna personas.';
COMMENT ON COLUMN public.fimba_propuestas_habitaciones.tipo IS
  'SGL=1, DBL=2, TPL=3, QAD=4 plazas. Matrimonial solo DBL/TPL/QAD (default twin = false).';
COMMENT ON COLUMN public.fimba_propuestas_habitaciones.matrimonial IS
  'Cama matrimonial (vs twin). Forzado false en SGL.';
COMMENT ON COLUMN public.fimba_propuestas_habitaciones.orden IS
  'Orden de visualización dentro del artista.';
COMMENT ON COLUMN public.fimba_propuestas_habitaciones.label IS
  'Etiqueta opcional (ej. «Suite 1»).';

-- ---------------------------------------------------------------------------
-- 2) Ocupantes (participante en una habitación; una sola vez)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fimba_habitaciones_ocupantes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_habitacion bigint NOT NULL
    REFERENCES public.fimba_propuestas_habitaciones (id) ON DELETE CASCADE,
  id_participante bigint NOT NULL
    REFERENCES public.fimba_participantes (id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fimba_habitaciones_ocupantes_participante_key UNIQUE (id_participante)
);

CREATE INDEX IF NOT EXISTS fimba_habitaciones_ocupantes_habitacion_orden_idx
  ON public.fimba_habitaciones_ocupantes (id_habitacion, orden ASC, id ASC);

COMMENT ON TABLE public.fimba_habitaciones_ocupantes IS
  'Asignación persona → habitación FIMBA. id_participante único (no en dos habitaciones).';
COMMENT ON COLUMN public.fimba_habitaciones_ocupantes.orden IS
  'Orden del slot dentro de la habitación (1..capacidad).';

-- Participante y habitación deben ser de la misma propuesta
CREATE OR REPLACE FUNCTION public.fimba_habitaciones_ocupantes_same_propuesta()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_hab_prop bigint;
  v_part_prop bigint;
  v_tipo text;
  v_cap integer;
  v_count integer;
BEGIN
  SELECT h.id_propuesta, h.tipo INTO v_hab_prop, v_tipo
  FROM public.fimba_propuestas_habitaciones h
  WHERE h.id = NEW.id_habitacion;

  IF v_hab_prop IS NULL THEN
    RAISE EXCEPTION 'Habitación % no existe', NEW.id_habitacion
      USING ERRCODE = '23503';
  END IF;

  SELECT p.id_propuesta INTO v_part_prop
  FROM public.fimba_participantes p
  WHERE p.id = NEW.id_participante;

  IF v_part_prop IS NULL THEN
    RAISE EXCEPTION 'Participante % no existe', NEW.id_participante
      USING ERRCODE = '23503';
  END IF;

  IF v_hab_prop IS DISTINCT FROM v_part_prop THEN
    RAISE EXCEPTION 'El participante y la habitación deben pertenecer al mismo artista (propuesta)'
      USING ERRCODE = '23514';
  END IF;

  v_cap := CASE v_tipo
    WHEN 'SGL' THEN 1
    WHEN 'DBL' THEN 2
    WHEN 'TPL' THEN 3
    WHEN 'QAD' THEN 4
    ELSE 0
  END;

  SELECT count(*)::integer INTO v_count
  FROM public.fimba_habitaciones_ocupantes o
  WHERE o.id_habitacion = NEW.id_habitacion
    AND o.id IS DISTINCT FROM NEW.id;

  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'Habitación llena (capacidad % para tipo %)', v_cap, v_tipo
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fimba_habitaciones_ocupantes_same_propuesta_trg
  ON public.fimba_habitaciones_ocupantes;
CREATE TRIGGER fimba_habitaciones_ocupantes_same_propuesta_trg
  BEFORE INSERT OR UPDATE OF id_habitacion, id_participante
  ON public.fimba_habitaciones_ocupantes
  FOR EACH ROW
  EXECUTE FUNCTION public.fimba_habitaciones_ocupantes_same_propuesta();

-- No permitir matrimonial en SGL al update
CREATE OR REPLACE FUNCTION public.fimba_propuestas_habitaciones_sgl_matri()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tipo = 'SGL' THEN
    NEW.matrimonial := false;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fimba_propuestas_habitaciones_sgl_matri_trg
  ON public.fimba_propuestas_habitaciones;
CREATE TRIGGER fimba_propuestas_habitaciones_sgl_matri_trg
  BEFORE INSERT OR UPDATE OF tipo, matrimonial
  ON public.fimba_propuestas_habitaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.fimba_propuestas_habitaciones_sgl_matri();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_propuestas_habitaciones TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_habitaciones_ocupantes TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
