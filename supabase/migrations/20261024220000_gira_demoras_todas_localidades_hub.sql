-- Completar gira_demoras_localidad: todas las localidades con hub × todas.
-- Minutos = matriz hub (gira_demoras_hub). No pisa filas ya editadas (DO NOTHING).
-- Cubre Villa Regina, General Roca, Ñorquinco, Choele Choel, SAO, etc.

INSERT INTO public.gira_demoras_localidad
  (id_localidad_origen, id_localidad_destino, minutos, updated_at)
SELECT
  o.id,
  d.id,
  coalesce(h.minutos, 0),
  now()
FROM public.localidades o
CROSS JOIN public.localidades d
LEFT JOIN public.gira_demoras_hub h
  ON h.hub_origen = o.hub
 AND h.hub_destino = d.hub
WHERE o.hub IS NOT NULL
  AND d.hub IS NOT NULL
ON CONFLICT (id_localidad_origen, id_localidad_destino) DO NOTHING;

COMMENT ON TABLE public.gira_demoras_localidad IS
  'Minutos de viaje entre localidades (localia ↔ destino) para proyeccion PCV. Matriz completa de localidades.hub; editable en Prestaciones → Proyeccion.';
