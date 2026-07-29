-- Grupos de convocatoria default por vehículo físico de gira.
-- Se copian a eventos_grupos al crear paradas; se pueden reaplicar en masa.

CREATE TABLE IF NOT EXISTS public.giras_transportes_grupos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira_transporte bigint NOT NULL,
  id_grupo bigint NOT NULL,
  CONSTRAINT giras_transportes_grupos_pkey PRIMARY KEY (id),
  CONSTRAINT giras_transportes_grupos_id_gira_transporte_fkey
    FOREIGN KEY (id_gira_transporte) REFERENCES public.giras_transportes(id) ON DELETE CASCADE,
  CONSTRAINT giras_transportes_grupos_id_grupo_fkey
    FOREIGN KEY (id_grupo) REFERENCES public.giras_grupos(id) ON DELETE CASCADE,
  CONSTRAINT giras_transportes_grupos_transporte_grupo_key UNIQUE (id_gira_transporte, id_grupo)
);

CREATE INDEX IF NOT EXISTS idx_giras_transportes_grupos_transporte
  ON public.giras_transportes_grupos (id_gira_transporte);
CREATE INDEX IF NOT EXISTS idx_giras_transportes_grupos_grupo
  ON public.giras_transportes_grupos (id_grupo);

COMMENT ON TABLE public.giras_transportes_grupos IS
  'Grupos de convocatoria default de un vehículo (giras_transportes). Se copian a eventos_grupos al crear paradas.';
