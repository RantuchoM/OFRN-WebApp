-- Enlaces de consulta de agenda con token único y filtros congelados.
-- Distinto de fimba_ediciones.token_consulta (consulta general de la edición).
-- Ruta app: /fimba/c/:token/agenda  (token = fila de esta tabla; sin query string).

CREATE TABLE IF NOT EXISTS public.fimba_agenda_consultas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_edicion bigint NOT NULL REFERENCES public.fimba_ediciones (id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  propuestas bigint[] NOT NULL DEFAULT '{}'::bigint[],
  grupos bigint[] NOT NULL DEFAULT '{}'::bigint[],
  locaciones bigint[] NOT NULL DEFAULT '{}'::bigint[],
  include_tutti boolean NOT NULL DEFAULT false,
  origen text NOT NULL DEFAULT 'fimba'
    CONSTRAINT fimba_agenda_consultas_origen_chk
      CHECK (origen = ANY (ARRAY['fimba'::text, 'ofrn'::text, 'all'::text])),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fimba_agenda_consultas_token_key UNIQUE (token)
);

CREATE UNIQUE INDEX IF NOT EXISTS fimba_agenda_consultas_fingerprint_uidx
  ON public.fimba_agenda_consultas (
    id_edicion,
    propuestas,
    grupos,
    locaciones,
    include_tutti,
    origen
  );

CREATE INDEX IF NOT EXISTS fimba_agenda_consultas_id_edicion_idx
  ON public.fimba_agenda_consultas (id_edicion);

COMMENT ON TABLE public.fimba_agenda_consultas IS
  'Consulta de agenda compartible: token UUID único + filtros congelados (artistas/grupos/locación/origen). No se editan desde el enlace público.';

COMMENT ON COLUMN public.fimba_agenda_consultas.token IS
  'UUID público /fimba/c/:token/agenda. Independiente de fimba_ediciones.token_consulta.';

COMMENT ON COLUMN public.fimba_agenda_consultas.propuestas IS
  'IDs fimba_propuestas congelados (array canónico ordenado y único).';

COMMENT ON COLUMN public.fimba_agenda_consultas.grupos IS
  'IDs giras_grupos congelados (array canónico ordenado y único).';

CREATE OR REPLACE FUNCTION public.fimba_agenda_consultas_canonicalize()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.propuestas := ARRAY(
    SELECT DISTINCT x FROM unnest(COALESCE(NEW.propuestas, '{}'::bigint[])) AS x ORDER BY x
  );
  NEW.grupos := ARRAY(
    SELECT DISTINCT x FROM unnest(COALESCE(NEW.grupos, '{}'::bigint[])) AS x ORDER BY x
  );
  NEW.locaciones := ARRAY(
    SELECT DISTINCT x FROM unnest(COALESCE(NEW.locaciones, '{}'::bigint[])) AS x ORDER BY x
  );
  IF NEW.origen IS NULL OR btrim(NEW.origen) = '' THEN
    NEW.origen := 'fimba';
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fimba_agenda_consultas_canonicalize_trg
  ON public.fimba_agenda_consultas;
CREATE TRIGGER fimba_agenda_consultas_canonicalize_trg
  BEFORE INSERT OR UPDATE OF propuestas, grupos, locaciones, include_tutti, origen
  ON public.fimba_agenda_consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.fimba_agenda_consultas_canonicalize();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_agenda_consultas TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
