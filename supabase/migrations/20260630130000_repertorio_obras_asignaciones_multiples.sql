-- Flag en repertorio_obras: un músico con >1 particella asignada en seating del programa.
-- Si false, auditoría usa obras.instrumentacion; si true, cálculo completo con seating.

ALTER TABLE public.repertorio_obras
  ADD COLUMN IF NOT EXISTS tiene_asignaciones_multiples boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.repertorio_obras.tiene_asignaciones_multiples IS
  'True si en seating_asignaciones del programa algún músico tiene más de una particella de la obra. Auditoría: false → obras.instrumentacion; true → cálculo con seating.';

CREATE OR REPLACE FUNCTION public.obra_programa_tiene_asignaciones_multiples(
  p_id_programa bigint,
  p_id_obra bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seating_asignaciones sa
    CROSS JOIN LATERAL unnest(sa.id_musicos_asignados) AS id_musico
    WHERE sa.id_programa = p_id_programa
      AND sa.id_obra = p_id_obra
      AND sa.id_particella IS NOT NULL
      AND sa.id_musicos_asignados IS NOT NULL
      AND cardinality(sa.id_musicos_asignados) > 0
    GROUP BY id_musico
    HAVING count(DISTINCT sa.id_particella) > 1
  );
$$;

COMMENT ON FUNCTION public.obra_programa_tiene_asignaciones_multiples(bigint, bigint) IS
  'Detecta asignación múltiple por músico (más de una particella) en seating para una obra en un programa.';

CREATE OR REPLACE FUNCTION public.sync_repertorio_obras_asignaciones_multiples(
  p_id_programa bigint,
  p_id_obra bigint
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_id_programa IS NULL OR p_id_obra IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.repertorio_obras ro
  SET tiene_asignaciones_multiples =
    public.obra_programa_tiene_asignaciones_multiples(p_id_programa, p_id_obra)
  FROM public.programas_repertorios pr
  WHERE pr.id = ro.id_repertorio
    AND pr.id_programa = p_id_programa
    AND ro.id_obra = p_id_obra;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_seating_asignaciones_sync_ro_multiples()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_programa bigint;
  v_obra bigint;
BEGIN
  v_programa := COALESCE(NEW.id_programa, OLD.id_programa);
  v_obra := COALESCE(NEW.id_obra, OLD.id_obra);
  PERFORM public.sync_repertorio_obras_asignaciones_multiples(v_programa, v_obra);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS seating_asignaciones_sync_ro_multiples ON public.seating_asignaciones;

CREATE TRIGGER seating_asignaciones_sync_ro_multiples
  AFTER INSERT OR UPDATE OR DELETE ON public.seating_asignaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seating_asignaciones_sync_ro_multiples();

-- Backfill por cada par programa+obra presente en repertorio.
UPDATE public.repertorio_obras ro
SET tiene_asignaciones_multiples = public.obra_programa_tiene_asignaciones_multiples(
  pr.id_programa,
  ro.id_obra
)
FROM public.programas_repertorios pr
WHERE pr.id = ro.id_repertorio
  AND ro.id_obra IS NOT NULL;
