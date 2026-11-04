-- Tildes de expediente: boolean → date (null = no tilde; fecha = día en que se tildó / editada).

ALTER TABLE public.gestion_expedientes
  ALTER COLUMN firma_nota DROP DEFAULT,
  ALTER COLUMN documentacion DROP DEFAULT,
  ALTER COLUMN facturacion DROP DEFAULT,
  ALTER COLUMN enviado_adm DROP DEFAULT;

ALTER TABLE public.gestion_expedientes
  ALTER COLUMN firma_nota DROP NOT NULL,
  ALTER COLUMN documentacion DROP NOT NULL,
  ALTER COLUMN facturacion DROP NOT NULL,
  ALTER COLUMN enviado_adm DROP NOT NULL;

ALTER TABLE public.gestion_expedientes
  ALTER COLUMN firma_nota TYPE date
    USING (CASE WHEN firma_nota IS TRUE THEN CURRENT_DATE ELSE NULL END),
  ALTER COLUMN documentacion TYPE date
    USING (CASE WHEN documentacion IS TRUE THEN CURRENT_DATE ELSE NULL END),
  ALTER COLUMN facturacion TYPE date
    USING (CASE WHEN facturacion IS TRUE THEN CURRENT_DATE ELSE NULL END),
  ALTER COLUMN enviado_adm TYPE date
    USING (CASE WHEN enviado_adm IS TRUE THEN CURRENT_DATE ELSE NULL END);

COMMENT ON COLUMN public.gestion_expedientes.firma_nota IS
  'Fecha de tilde Firma nota (null = pendiente).';
COMMENT ON COLUMN public.gestion_expedientes.documentacion IS
  'Fecha de tilde Documentación (null = pendiente).';
COMMENT ON COLUMN public.gestion_expedientes.facturacion IS
  'Fecha de tilde Facturación (null = pendiente).';
COMMENT ON COLUMN public.gestion_expedientes.enviado_adm IS
  'Fecha de tilde Enviado a ADM (null = pendiente).';
