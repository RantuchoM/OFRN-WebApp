-- Función de convocatoria en la fila de gira (aparte de rol).
-- reemplazo exige la persona ausente a la que cubre.

ALTER TABLE public.giras_integrantes
  ADD COLUMN IF NOT EXISTS funcion text,
  ADD COLUMN IF NOT EXISTS id_cubre_a bigint;

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_funcion_check;

ALTER TABLE public.giras_integrantes
  ADD CONSTRAINT giras_integrantes_funcion_check
  CHECK (
    funcion IS NULL
    OR funcion = ANY (ARRAY['reemplazo'::text, 'refuerzo'::text, 'pasante'::text])
  );

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_id_cubre_a_fkey;

ALTER TABLE public.giras_integrantes
  ADD CONSTRAINT giras_integrantes_id_cubre_a_fkey
  FOREIGN KEY (id_cubre_a) REFERENCES public.integrantes(id);

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_reemplazo_cubre_check;

ALTER TABLE public.giras_integrantes
  ADD CONSTRAINT giras_integrantes_reemplazo_cubre_check
  CHECK (
    (funcion = 'reemplazo' AND id_cubre_a IS NOT NULL)
    OR (funcion IS DISTINCT FROM 'reemplazo' AND id_cubre_a IS NULL)
  );
