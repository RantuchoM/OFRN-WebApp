-- Documentación de transporte, chofer por transporte de gira y carnet de integrante.

ALTER TABLE public.integrantes
ADD COLUMN IF NOT EXISTS link_carnet text;

ALTER TABLE public.transportes
ADD COLUMN IF NOT EXISTS documentacion text;

ALTER TABLE public.giras_transportes
ADD COLUMN IF NOT EXISTS id_chofer bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'giras_transportes_id_chofer_fkey'
      AND conrelid = 'public.giras_transportes'::regclass
  ) THEN
    ALTER TABLE public.giras_transportes
      ADD CONSTRAINT giras_transportes_id_chofer_fkey
      FOREIGN KEY (id_chofer)
      REFERENCES public.integrantes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_giras_transportes_id_chofer
  ON public.giras_transportes(id_chofer);

-- Policies explícitas para bucket musician-docs (estética y alcance existente).
DROP POLICY IF EXISTS "Actualizacion musician-docs" ON storage.objects;
CREATE POLICY "Actualizacion musician-docs"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'musician-docs')
WITH CHECK (bucket_id = 'musician-docs');
