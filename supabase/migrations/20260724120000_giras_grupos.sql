-- Grupos de convocatoria por gira (opcionales).
-- Permiten asignar integrantes a grupos y filtrar eventos de agenda por esos grupos.

CREATE TABLE IF NOT EXISTS public.giras_grupos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint NOT NULL,
  nombre text NOT NULL,
  color text,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT giras_grupos_pkey PRIMARY KEY (id),
  CONSTRAINT giras_grupos_id_gira_fkey FOREIGN KEY (id_gira) REFERENCES public.programas(id) ON DELETE CASCADE,
  CONSTRAINT giras_grupos_id_gira_nombre_key UNIQUE (id_gira, nombre)
);

CREATE TABLE IF NOT EXISTS public.giras_grupos_integrantes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_grupo bigint NOT NULL,
  id_integrante bigint NOT NULL,
  CONSTRAINT giras_grupos_integrantes_pkey PRIMARY KEY (id),
  CONSTRAINT giras_grupos_integrantes_id_grupo_fkey FOREIGN KEY (id_grupo) REFERENCES public.giras_grupos(id) ON DELETE CASCADE,
  CONSTRAINT giras_grupos_integrantes_id_integrante_fkey FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id) ON DELETE CASCADE,
  CONSTRAINT giras_grupos_integrantes_grupo_integrante_key UNIQUE (id_grupo, id_integrante)
);

CREATE TABLE IF NOT EXISTS public.eventos_grupos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_evento bigint NOT NULL,
  id_grupo bigint NOT NULL,
  CONSTRAINT eventos_grupos_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_grupos_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.eventos(id) ON DELETE CASCADE,
  CONSTRAINT eventos_grupos_id_grupo_fkey FOREIGN KEY (id_grupo) REFERENCES public.giras_grupos(id) ON DELETE CASCADE,
  CONSTRAINT eventos_grupos_evento_grupo_key UNIQUE (id_evento, id_grupo)
);

CREATE INDEX IF NOT EXISTS idx_giras_grupos_id_gira ON public.giras_grupos (id_gira);
CREATE INDEX IF NOT EXISTS idx_giras_grupos_integrantes_id_grupo ON public.giras_grupos_integrantes (id_grupo);
CREATE INDEX IF NOT EXISTS idx_giras_grupos_integrantes_id_integrante ON public.giras_grupos_integrantes (id_integrante);
CREATE INDEX IF NOT EXISTS idx_eventos_grupos_id_evento ON public.eventos_grupos (id_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_grupos_id_grupo ON public.eventos_grupos (id_grupo);

COMMENT ON TABLE public.giras_grupos IS
  'Grupos opcionales de convocatoria dentro de una gira (ensayos / eventos segmentados).';
COMMENT ON TABLE public.giras_grupos_integrantes IS
  'Membresía de integrantes a grupos de gira. Ausentes se filtran en UI/visibilidad efectiva sin borrar la fila.';
COMMENT ON TABLE public.eventos_grupos IS
  'Asignación de eventos a uno o más grupos. Sin filas = visible para todo el roster (comportamiento histórico).';
