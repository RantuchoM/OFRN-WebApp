-- N:N ensamble ↔ camerata (CFVal / CFMon / CFMar / Jazz Band u otra camerata).
-- El staff elige; no se siembran membresías nuevas.

CREATE TABLE IF NOT EXISTS public.ensambles_cf (
  id_ensamble bigint NOT NULL REFERENCES public.ensambles(id) ON DELETE CASCADE,
  id_ensamble_cf bigint NOT NULL REFERENCES public.ensambles(id) ON DELETE CASCADE,
  PRIMARY KEY (id_ensamble, id_ensamble_cf),
  CONSTRAINT ensambles_cf_no_self CHECK (id_ensamble <> id_ensamble_cf)
);

CREATE INDEX IF NOT EXISTS ensambles_cf_cf_idx
  ON public.ensambles_cf (id_ensamble_cf);

COMMENT ON TABLE public.ensambles_cf IS
  'Cameratas (CF / Jazz Band) a las que pertenece un ensamble. Multi-select; el staff carga, no se inventa.';

INSERT INTO public.ensambles_cf (id_ensamble, id_ensamble_cf)
SELECT e.id, e.id_ensamble_cf
FROM public.ensambles e
WHERE e.id_ensamble_cf IS NOT NULL
  AND e.id <> e.id_ensamble_cf
ON CONFLICT DO NOTHING;

ALTER TABLE public.ensambles
  DROP CONSTRAINT IF EXISTS ensambles_id_ensamble_cf_fkey;

ALTER TABLE public.ensambles
  DROP COLUMN IF EXISTS id_ensamble_cf;

ALTER TABLE public.ensambles_cf ENABLE ROW LEVEL SECURITY;

CREATE POLICY ensambles_cf_authenticated_all
  ON public.ensambles_cf
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY ensambles_cf_anon_all
  ON public.ensambles_cf
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ensambles_cf
  TO authenticated, anon, service_role;
