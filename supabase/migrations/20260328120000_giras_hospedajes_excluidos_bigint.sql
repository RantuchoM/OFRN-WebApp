-- id_programa e id_integrante deben ser bigint como programas(id) e integrantes(id).
-- INTEGER trunca/rechaza ids > 2_147_483_647 ("out of range for type integer").

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'giras_hospedajes_excluidos'
      AND c.column_name = 'id_integrante'
      AND c.data_type = 'integer'
  ) THEN
    ALTER TABLE public.giras_hospedajes_excluidos
      DROP CONSTRAINT IF EXISTS giras_hospedajes_excluidos_id_programa_fkey,
      DROP CONSTRAINT IF EXISTS giras_hospedajes_excluidos_id_integrante_fkey;

    ALTER TABLE public.giras_hospedajes_excluidos
      ALTER COLUMN id_programa TYPE bigint USING id_programa::bigint,
      ALTER COLUMN id_integrante TYPE bigint USING id_integrante::bigint;

    ALTER TABLE public.giras_hospedajes_excluidos
      ADD CONSTRAINT giras_hospedajes_excluidos_id_programa_fkey
        FOREIGN KEY (id_programa) REFERENCES public.programas(id) ON DELETE CASCADE,
      ADD CONSTRAINT giras_hospedajes_excluidos_id_integrante_fkey
        FOREIGN KEY (id_integrante) REFERENCES public.integrantes(id) ON DELETE CASCADE;
  END IF;
END $$;
