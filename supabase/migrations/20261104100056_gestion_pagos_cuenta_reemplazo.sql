-- Pago/gasto con fondo reemplazos debe poder apuntar a una cuenta concreta.

ALTER TABLE public.gestion_pagos
  ADD COLUMN IF NOT EXISTS id_cuenta_reemplazo bigint
    REFERENCES public.gestion_cuentas_reemplazo (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.gestion_pagos.id_cuenta_reemplazo IS
  'Cuenta de reemplazos cuando id_fondo es el fondo reemplazos. Obligatoria en UI al usar ese fondo.';

CREATE INDEX IF NOT EXISTS gestion_pagos_id_cuenta_reemplazo_idx
  ON public.gestion_pagos (id_cuenta_reemplazo)
  WHERE id_cuenta_reemplazo IS NOT NULL;
