-- Temporada alta como franja (completa o parcial) en config de viáticos de gira.
-- Semántica:
--   factor_temporada = 0 → off
--   factor_temporada = 0.3 + fechas null → completa (legacy / todos los días del viaje)
--   factor_temporada = 0.3 + temporada_desde/hasta → parcial (solo días en el intervalo)

ALTER TABLE public.giras_viaticos_config
  ADD COLUMN IF NOT EXISTS temporada_desde date,
  ADD COLUMN IF NOT EXISTS temporada_hasta date;

COMMENT ON COLUMN public.giras_viaticos_config.temporada_desde IS
  'Inicio de franja de temporada alta (+30%). Null con factor_temporada>0 = franja completa del viaje.';
COMMENT ON COLUMN public.giras_viaticos_config.temporada_hasta IS
  'Fin de franja de temporada alta (+30%). Null con factor_temporada>0 = franja completa del viaje.';
