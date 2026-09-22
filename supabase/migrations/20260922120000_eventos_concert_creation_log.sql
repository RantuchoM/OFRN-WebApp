-- Alta de conciertos: quién y desde dónde.
-- created_by / creation_source en eventos (nullable en filas históricas).
-- eventos_logs.created_by para la línea «created» y, a futuro, autor de cambios.
-- Trigger AFTER INSERT: si el tipo es categoría Conciertos (id_categoria = 1),
-- inserta eventos_logs.campo = 'created'.

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS created_by bigint,
  ADD COLUMN IF NOT EXISTS creation_source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'eventos_created_by_fkey'
  ) THEN
    ALTER TABLE public.eventos
      ADD CONSTRAINT eventos_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.integrantes(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

COMMENT ON COLUMN public.eventos.created_by IS
  'Integrante que creó el evento. Solo se completa en altas de conciertos (categoría 1). Nullable en filas históricas.';
COMMENT ON COLUMN public.eventos.creation_source IS
  'Origen del alta: agenda | gira_form | transposition | script | fimba.';

CREATE INDEX IF NOT EXISTS eventos_created_by_idx
  ON public.eventos (created_by)
  WHERE created_by IS NOT NULL;

ALTER TABLE public.eventos_logs
  ADD COLUMN IF NOT EXISTS created_by bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'eventos_logs_created_by_fkey'
  ) THEN
    ALTER TABLE public.eventos_logs
      ADD CONSTRAINT eventos_logs_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.integrantes(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

COMMENT ON COLUMN public.eventos_logs.created_by IS
  'Integrante autor del log. En campo=created copia eventos.created_by.';

CREATE INDEX IF NOT EXISTS eventos_logs_created_by_idx
  ON public.eventos_logs (created_by)
  WHERE created_by IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_audit_event_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_categoria bigint;
BEGIN
  SELECT te.id_categoria
    INTO v_categoria
  FROM public.tipos_evento te
  WHERE te.id = NEW.id_tipo_evento;

  IF v_categoria = 1 THEN
    INSERT INTO public.eventos_logs (
      id_evento,
      campo,
      valor_anterior,
      valor_nuevo,
      created_by
    ) VALUES (
      NEW.id,
      'created',
      NULL,
      NEW.creation_source,
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_event_insert ON public.eventos;
CREATE TRIGGER tr_audit_event_insert
  AFTER INSERT ON public.eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_event_insert();

COMMENT ON FUNCTION public.fn_audit_event_insert() IS
  'Al insertar un evento de categoría Conciertos, registra eventos_logs.campo=created con autor y fuente.';
