-- Agenda marca «recién editado» con eventos.updated_at (24 h).
-- ADD COLUMN ... DEFAULT false es catalog-only en PG 11+ y no debería reescribir
-- filas; los BEFORE UPDATE sí pisan updated_at/last_modified_at en cualquier UPDATE.
-- 1) Si solo cambia ensayo_pese_conflicto (o es un no-op), no tocar timestamps.
-- 2) Reset defensivo de filas stampadas en la ventana de esa migración.

CREATE OR REPLACE FUNCTION public.handle_eventos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (
      to_jsonb(NEW) - ARRAY['updated_at', 'last_modified_at', 'ensayo_pese_conflicto']
      IS NOT DISTINCT FROM
      to_jsonb(OLD) - ARRAY['updated_at', 'last_modified_at', 'ensayo_pese_conflicto']
    ) THEN
      NEW.updated_at := OLD.updated_at;
      RETURN NEW;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_last_modified_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (
      to_jsonb(NEW) - ARRAY['updated_at', 'last_modified_at', 'ensayo_pese_conflicto']
      IS NOT DISTINCT FROM
      to_jsonb(OLD) - ARRAY['updated_at', 'last_modified_at', 'ensayo_pese_conflicto']
    ) THEN
      NEW.last_modified_at := OLD.last_modified_at;
      RETURN NEW;
    END IF;
  END IF;
  NEW.last_modified_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_eventos_updated_at() IS
  'Pisa eventos.updated_at en UPDATE editorial. No si solo cambia ensayo_pese_conflicto.';

COMMENT ON FUNCTION public.update_last_modified_column() IS
  'Pisa eventos.last_modified_at en UPDATE editorial. No si solo cambia ensayo_pese_conflicto.';

-- Evitar que el reset dispare auditoría, sheet-sync ni un segundo now().
DO $$
BEGIN
  ALTER TABLE public.eventos DISABLE TRIGGER USER;

  UPDATE public.eventos e
  SET
    updated_at = COALESCE(e.created_at, e.updated_at),
    last_modified_at = COALESCE(e.created_at, e.last_modified_at)
  WHERE e.updated_at >= TIMESTAMPTZ '2026-09-27 00:20:00+00'
    AND e.updated_at < TIMESTAMPTZ '2026-09-27 00:40:00+00'
    AND COALESCE(e.ensayo_pese_conflicto, false) = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.eventos_logs l
      WHERE l.id_evento = e.id
        AND l.created_at >= TIMESTAMPTZ '2026-09-27 00:20:00+00'
        AND l.created_at < TIMESTAMPTZ '2026-09-27 00:40:00+00'
        AND l.campo IS DISTINCT FROM 'created'
    );

  ALTER TABLE public.eventos ENABLE TRIGGER USER;
EXCEPTION
  WHEN OTHERS THEN
    ALTER TABLE public.eventos ENABLE TRIGGER USER;
    RAISE;
END
$$;
