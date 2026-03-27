-- Quiénes NO requieren hotel en una gira (rooming)
CREATE TABLE IF NOT EXISTS public.giras_hospedajes_excluidos (
    id_programa bigint NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
    id_integrante bigint NOT NULL REFERENCES public.integrantes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (id_programa, id_integrante)
);

ALTER TABLE public.giras_hospedajes_excluidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a usuarios autenticados" ON public.giras_hospedajes_excluidos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
