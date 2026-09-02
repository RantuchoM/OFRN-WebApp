-- seating_asignaciones: permitir la misma particella en contenedor y músicos (ej. contrabajo en parte de cello).
-- Antes: UNIQUE (id_programa, id_particella) — una sola fila por partitura en el programa.
-- Ahora:
--   - una partitura por celda contenedor/obra
--   - una fila agregada de músicos por partitura/obra (id_musicos_asignados)

ALTER TABLE public.seating_asignaciones
  DROP CONSTRAINT IF EXISTS seating_programa_particella_unique;

CREATE UNIQUE INDEX IF NOT EXISTS seating_asignaciones_programa_obra_contenedor_unique
  ON public.seating_asignaciones (id_programa, id_obra, id_contenedor)
  WHERE id_contenedor IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS seating_asignaciones_programa_obra_particella_musician_unique
  ON public.seating_asignaciones (id_programa, id_obra, id_particella)
  WHERE id_contenedor IS NULL;

COMMENT ON INDEX public.seating_asignaciones_programa_obra_contenedor_unique IS
  'Una particella asignada por contenedor de cuerdas y obra en el programa.';

COMMENT ON INDEX public.seating_asignaciones_programa_obra_particella_musician_unique IS
  'Una fila agregada de músicos por particella y obra; varios músicos en id_musicos_asignados.';
