-- Expedientes: comisión editable + destino del misceláneo (fondo/cuenta).

ALTER TABLE public.gestion_expedientes
  ADD COLUMN IF NOT EXISTS monto_comision numeric(14, 2);

ALTER TABLE public.gestion_expedientes
  ADD COLUMN IF NOT EXISTS id_fondo_miscelaneo bigint
    REFERENCES public.gestion_fondos (id) ON DELETE SET NULL;

ALTER TABLE public.gestion_expedientes
  ADD COLUMN IF NOT EXISTS id_cuenta_miscelaneo bigint
    REFERENCES public.gestion_cuentas_reemplazo (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.gestion_expedientes.monto_comision IS
  'Comisión productor editable (sugerida 10% del bruto base = neto/0.85).';

COMMENT ON COLUMN public.gestion_expedientes.id_fondo_miscelaneo IS
  'Fondo al que suma el monto_miscelaneo del expediente.';

COMMENT ON COLUMN public.gestion_expedientes.id_cuenta_miscelaneo IS
  'Cuenta de reemplazos opcional cuando el misceláneo va al fondo reemplazos.';
