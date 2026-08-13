-- Grupos de convocatoria por bloque de repertorio (programas_repertorios).
-- Mismo patrón que eventos_grupos: vacío = todo el roster; con filas = solo esos grupos.

CREATE TABLE IF NOT EXISTS public.programas_repertorios_grupos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_repertorio bigint NOT NULL,
  id_grupo bigint NOT NULL,
  CONSTRAINT programas_repertorios_grupos_pkey PRIMARY KEY (id),
  CONSTRAINT programas_repertorios_grupos_id_repertorio_fkey
    FOREIGN KEY (id_repertorio) REFERENCES public.programas_repertorios(id) ON DELETE CASCADE,
  CONSTRAINT programas_repertorios_grupos_id_grupo_fkey
    FOREIGN KEY (id_grupo) REFERENCES public.giras_grupos(id) ON DELETE CASCADE,
  CONSTRAINT programas_repertorios_grupos_repertorio_grupo_key UNIQUE (id_repertorio, id_grupo)
);

CREATE INDEX IF NOT EXISTS idx_programas_repertorios_grupos_repertorio
  ON public.programas_repertorios_grupos (id_repertorio);
CREATE INDEX IF NOT EXISTS idx_programas_repertorios_grupos_grupo
  ON public.programas_repertorios_grupos (id_grupo);

COMMENT ON TABLE public.programas_repertorios_grupos IS
  'Asignación de bloques de repertorio a uno o más grupos de convocatoria. Sin filas = aplica a todo el roster (comportamiento histórico).';
