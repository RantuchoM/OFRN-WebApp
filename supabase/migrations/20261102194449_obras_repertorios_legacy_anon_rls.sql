-- Alinear con obras_ajustes: lectura/escritura también para rol anon (JWT sin sesión
-- o clientes que aún no elevan a authenticated). Sin esta policy, RLS devolvía 0 filas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'obras_repertorios_legacy'
      AND pol.polname = 'obras_repertorios_legacy_anon_all'
  ) THEN
    CREATE POLICY obras_repertorios_legacy_anon_all
      ON public.obras_repertorios_legacy
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
