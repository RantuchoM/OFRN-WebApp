-- Configuración general de gastos/rendiciones para destaques masivos (fallback por gira).
-- Una fila con id_localidad IS NULL = valores por defecto para todas las localidades.
-- En filas por localidad: NULL en un monto = heredar el valor general; un número (incl. 0) = valor propio.

-- Índices: una fila general y una por localidad por gira
CREATE UNIQUE INDEX IF NOT EXISTS giras_destaques_config_one_general_per_gira
  ON public.giras_destaques_config (id_gira)
  WHERE id_localidad IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS giras_destaques_config_one_per_gira_localidad
  ON public.giras_destaques_config (id_gira, id_localidad)
  WHERE id_localidad IS NOT NULL;

-- Nuevas filas por localidad sin override explícito heredan (no forzar 0)
ALTER TABLE public.giras_destaques_config
  ALTER COLUMN gasto_alojamiento DROP DEFAULT,
  ALTER COLUMN gasto_combustible DROP DEFAULT,
  ALTER COLUMN gasto_otros DROP DEFAULT,
  ALTER COLUMN gastos_movilidad DROP DEFAULT,
  ALTER COLUMN gastos_movil_otros DROP DEFAULT,
  ALTER COLUMN gastos_capacit DROP DEFAULT,
  ALTER COLUMN rendicion_gasto_alojamiento DROP DEFAULT,
  ALTER COLUMN rendicion_gasto_combustible DROP DEFAULT,
  ALTER COLUMN rendicion_gasto_otros DROP DEFAULT,
  ALTER COLUMN rendicion_gastos_movil_otros DROP DEFAULT,
  ALTER COLUMN rendicion_gastos_capacit DROP DEFAULT,
  ALTER COLUMN rendicion_transporte_otros DROP DEFAULT,
  ALTER COLUMN rendicion_viatico_monto DROP DEFAULT;

COMMENT ON TABLE public.giras_destaques_config IS
  'Config destaques: id_localidad NULL = general/fallback de la gira; por localidad con montos NULL = hereda del general.';
