-- Expediente sin tipo obligatorio; pagos_pagos distingue pago vs gasto.

-- 1) Expediente.tipo deja de ser obligatorio (legado artista/transporte).
ALTER TABLE public.gestion_expedientes
  DROP CONSTRAINT IF EXISTS gestion_expedientes_tipo_check;

ALTER TABLE public.gestion_expedientes
  ALTER COLUMN tipo DROP NOT NULL,
  ALTER COLUMN tipo DROP DEFAULT;

COMMENT ON COLUMN public.gestion_expedientes.tipo IS
  'Legado opcional. El expediente puede mezclar contrataciones, pagos y gastos (p. ej. aéreos).';

COMMENT ON TABLE public.gestion_expedientes IS
  'Contenedor admin: puede agrupar artistas (contrataciones), pagos y gastos (p. ej. aéreos) juntos.';

-- 2) Clase en movimientos de caja del expediente: pago | gasto.
ALTER TABLE public.gestion_pagos
  ADD COLUMN IF NOT EXISTS clase text;

UPDATE public.gestion_pagos
SET clase = 'pago'
WHERE clase IS NULL;

ALTER TABLE public.gestion_pagos
  ALTER COLUMN clase SET DEFAULT 'pago',
  ALTER COLUMN clase SET NOT NULL;

ALTER TABLE public.gestion_pagos
  DROP CONSTRAINT IF EXISTS gestion_pagos_clase_check;

ALTER TABLE public.gestion_pagos
  ADD CONSTRAINT gestion_pagos_clase_check
  CHECK (clase = ANY (ARRAY['pago'::text, 'gasto'::text]));

COMMENT ON COLUMN public.gestion_pagos.clase IS
  'pago = liquidación/desembolso del expediente; gasto = costo operativo (aéreo, extras, etc.).';
