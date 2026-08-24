-- La intranet usa la anon key sin JWT de Supabase Auth (login custom).
-- Sin policy para anon, SELECT devuelve 0 filas e INSERT falla por RLS.
CREATE POLICY obras_ajustes_anon_all
  ON public.obras_ajustes
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);