-- Vehículo oficial del catálogo OFRN (flota propia).
-- Si es true, viáticos/destaques marcan automáticamente "patente oficial".

ALTER TABLE public.transportes
  ADD COLUMN IF NOT EXISTS es_oficial boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.transportes.es_oficial IS
  'True si el vehículo es oficial (flota OFRN). Exportación de viáticos/destaques tilda el check de patente oficial.';
