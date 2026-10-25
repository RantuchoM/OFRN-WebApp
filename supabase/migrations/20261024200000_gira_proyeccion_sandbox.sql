-- Proyección sandbox Prestaciones: horas en programas, hubs, demoras editables.
-- Seed demoras = matriz actual informe 2027 (TRAVEL_MIN + DEPARTURE).

-- 1) Campos de proyección en programas
ALTER TABLE public.programas
  ADD COLUMN IF NOT EXISTS hora_inicio_proyeccion time without time zone,
  ADD COLUMN IF NOT EXISTS hora_fin_proyeccion time without time zone,
  ADD COLUMN IF NOT EXISTS servicios_estimados numeric;

COMMENT ON COLUMN public.programas.hora_inicio_proyeccion IS
  'Hora ancla de inicio de trabajo en destino (proyección PCV). Default tipico 15:00.';
COMMENT ON COLUMN public.programas.hora_fin_proyeccion IS
  'Hora ancla de cierre en destino. Default 23:00; 14:00 si ultimo concierto es de manana.';
COMMENT ON COLUMN public.programas.servicios_estimados IS
  'Override de servicios de gira para Estimar futuros. NULL = automatico (eventos o default 7).';

-- 2) Hub de localidad
ALTER TABLE public.localidades
  ADD COLUMN IF NOT EXISTS hub text;

ALTER TABLE public.localidades
  DROP CONSTRAINT IF EXISTS localidades_hub_check;
ALTER TABLE public.localidades
  ADD CONSTRAINT localidades_hub_check
  CHECK (hub IS NULL OR hub = ANY (ARRAY['Viedma'::text, 'Valle'::text, 'Bariloche'::text, 'Bolson'::text]));

COMMENT ON COLUMN public.localidades.hub IS
  'Hub de viaje para proyeccion PCV (Viedma/Valle/Bariloche/Bolson).';

UPDATE public.localidades SET hub = 'Bariloche' WHERE id IN (5, 46); -- Bariloche, Norquinco
UPDATE public.localidades SET hub = 'Bolson' WHERE id = 23; -- El Bolson
UPDATE public.localidades SET hub = 'Viedma' WHERE id = 57;
UPDATE public.localidades SET hub = 'Valle'
WHERE id IN (16, 30, 60, 14, 51); -- Cipolletti, Gral Roca, Villa Regina, Choele Choel, SAO

-- 3) Demoras entre hubs
CREATE TABLE IF NOT EXISTS public.gira_demoras_hub (
  hub_origen text NOT NULL,
  hub_destino text NOT NULL,
  minutos integer NOT NULL DEFAULT 0 CHECK (minutos >= 0),
  modo_salida text NOT NULL DEFAULT 'morning'
    CHECK (modo_salida = ANY (ARRAY['morning'::text, 'overnight'::text, 'relative'::text])),
  hora_salida_default time without time zone,
  lead_min integer,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gira_demoras_hub_pkey PRIMARY KEY (hub_origen, hub_destino),
  CONSTRAINT gira_demoras_hub_origen_check
    CHECK (hub_origen = ANY (ARRAY['Viedma'::text, 'Valle'::text, 'Bariloche'::text, 'Bolson'::text])),
  CONSTRAINT gira_demoras_hub_destino_check
    CHECK (hub_destino = ANY (ARRAY['Viedma'::text, 'Valle'::text, 'Bariloche'::text, 'Bolson'::text]))
);

COMMENT ON TABLE public.gira_demoras_hub IS
  'Minutos y modo de salida entre hubs para proyeccion PCV (editable en Prestaciones sandbox).';

INSERT INTO public.gira_demoras_hub
  (hub_origen, hub_destino, minutos, modo_salida, hora_salida_default, lead_min)
VALUES
  ('Viedma', 'Valle', 410, 'morning', '06:00', NULL),
  ('Valle', 'Viedma', 410, 'morning', '06:00', NULL),
  ('Viedma', 'Bariloche', 780, 'overnight', '22:00', NULL),
  ('Bariloche', 'Viedma', 780, 'overnight', '22:00', NULL),
  ('Valle', 'Bariloche', 365, 'morning', '06:00', NULL),
  ('Bariloche', 'Valle', 365, 'morning', '06:00', NULL),
  ('Bolson', 'Bariloche', 150, 'relative', NULL, 150),
  ('Bariloche', 'Bolson', 150, 'relative', NULL, 150),
  ('Bolson', 'Viedma', 930, 'overnight', '22:00', NULL),
  ('Viedma', 'Bolson', 930, 'overnight', '22:00', NULL),
  ('Bolson', 'Valle', 515, 'morning', '06:00', NULL),
  ('Valle', 'Bolson', 515, 'morning', '06:00', NULL),
  ('Viedma', 'Viedma', 0, 'morning', '12:00', NULL),
  ('Valle', 'Valle', 45, 'morning', '12:00', NULL),
  ('Bariloche', 'Bariloche', 0, 'morning', '12:00', NULL),
  ('Bolson', 'Bolson', 0, 'morning', '12:00', NULL)
ON CONFLICT (hub_origen, hub_destino) DO UPDATE
SET minutos = EXCLUDED.minutos,
    modo_salida = EXCLUDED.modo_salida,
    hora_salida_default = EXCLUDED.hora_salida_default,
    lead_min = EXCLUDED.lead_min,
    updated_at = now();

-- 4) Backfill horas de proyeccion
-- Inicio: 15:00. Fin: 14:00 si ultimo concierto (tipo 1) tiene hora_inicio < 15:00; si no 23:00.
UPDATE public.programas p
SET
  hora_inicio_proyeccion = coalesce(p.hora_inicio_proyeccion, '15:00'::time),
  hora_fin_proyeccion = coalesce(
    p.hora_fin_proyeccion,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.eventos e
        WHERE e.id_gira = p.id
          AND coalesce(e.is_deleted, false) = false
          AND e.id_tipo_evento = 1
          AND e.fecha = (
            SELECT max(e2.fecha)
            FROM public.eventos e2
            WHERE e2.id_gira = p.id
              AND coalesce(e2.is_deleted, false) = false
              AND e2.id_tipo_evento = 1
          )
          AND e.hora_inicio IS NOT NULL
          AND e.hora_inicio < '15:00'::time
      ) THEN '14:00'::time
      ELSE '23:00'::time
    END
  )
WHERE p.fecha_desde >= '2027-01-01'
  AND p.fecha_desde < '2028-01-01'
  AND p.tipo::text IN ('Sinfónico', 'Camerata Filarmónica');

-- Cualquier otra gira sin horas (futuras): mismos defaults al vuelo en app;
-- precarga basica para no dejar NULL en sinf/CF sin anio filtro.
UPDATE public.programas p
SET
  hora_inicio_proyeccion = coalesce(p.hora_inicio_proyeccion, '15:00'::time),
  hora_fin_proyeccion = coalesce(p.hora_fin_proyeccion, '23:00'::time)
WHERE p.tipo::text IN ('Sinfónico', 'Camerata Filarmónica')
  AND (p.hora_inicio_proyeccion IS NULL OR p.hora_fin_proyeccion IS NULL);
