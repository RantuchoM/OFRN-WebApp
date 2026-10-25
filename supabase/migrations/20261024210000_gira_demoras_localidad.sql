-- Demoras PCV por tramo localidad → localidad (localía / casa ↔ destino).
-- Seed desde gira_demoras_hub usando localidad representativa de cada hub.

CREATE TABLE IF NOT EXISTS public.gira_demoras_localidad (
  id_localidad_origen integer NOT NULL
    REFERENCES public.localidades (id) ON DELETE CASCADE,
  id_localidad_destino integer NOT NULL
    REFERENCES public.localidades (id) ON DELETE CASCADE,
  minutos integer NOT NULL DEFAULT 0 CHECK (minutos >= 0),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gira_demoras_localidad_pkey
    PRIMARY KEY (id_localidad_origen, id_localidad_destino)
);

COMMENT ON TABLE public.gira_demoras_localidad IS
  'Minutos de viaje entre localidades para proyeccion PCV (localia ↔ destino). Editable en Prestaciones → Proyeccion.';

CREATE INDEX IF NOT EXISTS gira_demoras_localidad_destino_idx
  ON public.gira_demoras_localidad (id_localidad_destino);

-- Localidad representativa por hub (misma que seed de localidades.hub)
WITH hub_loc AS (
  SELECT * FROM (VALUES
    ('Viedma'::text, 57),
    ('Valle'::text, 16),      -- Cipolletti
    ('Bariloche'::text, 5),
    ('Bolson'::text, 23)
  ) AS t(hub, id_loc)
)
INSERT INTO public.gira_demoras_localidad
  (id_localidad_origen, id_localidad_destino, minutos, updated_at)
SELECT
  o.id_loc,
  d.id_loc,
  h.minutos,
  now()
FROM public.gira_demoras_hub h
JOIN hub_loc o ON o.hub = h.hub_origen
JOIN hub_loc d ON d.hub = h.hub_destino
ON CONFLICT (id_localidad_origen, id_localidad_destino) DO UPDATE
SET minutos = EXCLUDED.minutos,
    updated_at = now();
