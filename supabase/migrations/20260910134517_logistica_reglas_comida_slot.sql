-- Ventana de comidas de logística = slot (día + tipo base), no un eventos.id.
-- Backfill desde el evento ancla (incluye is_deleted) y drop de FKs de comida.

CREATE OR REPLACE FUNCTION public._tmp_meal_slot_base(nombre text, tipo_id bigint)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  token text;
  low text;
BEGIN
  token := NULLIF(
    trim(split_part(regexp_replace(coalesce(nombre, ''), '[\s(/]+', ' ', 'g'), ' ', 1)),
    ''
  );
  low := lower(token);
  IF low = 'desayuno' THEN RETURN 'Desayuno'; END IF;
  IF low = 'almuerzo' THEN RETURN 'Almuerzo'; END IF;
  IF low = 'merienda' THEN RETURN 'Merienda'; END IF;
  IF low = 'cena' THEN RETURN 'Cena'; END IF;
  IF low = 'catering' THEN RETURN 'Catering'; END IF;
  RETURN CASE tipo_id
    WHEN 7 THEN 'Desayuno'
    WHEN 8 THEN 'Almuerzo'
    WHEN 9 THEN 'Merienda'
    WHEN 10 THEN 'Cena'
    ELSE NULL
  END;
END;
$$;

ALTER TABLE public.giras_logistica_reglas
  ADD COLUMN IF NOT EXISTS comida_inicio_fecha date,
  ADD COLUMN IF NOT EXISTS comida_fin_fecha date;

-- Inicio: fecha del evento ancla; servicio = base ya válida en la regla, si no tipo del evento.
UPDATE public.giras_logistica_reglas r
SET
  comida_inicio_fecha = COALESCE(r.comida_inicio_fecha, left(e.fecha::text, 10)::date),
  comida_inicio_servicio = COALESCE(
    public._tmp_meal_slot_base(r.comida_inicio_servicio, NULL::bigint),
    public._tmp_meal_slot_base(te.nombre, e.id_tipo_evento),
    r.comida_inicio_servicio
  )
FROM public.eventos e
LEFT JOIN public.tipos_evento te ON te.id = e.id_tipo_evento
WHERE r.id_evento_comida_inicio IS NOT NULL
  AND e.id = r.id_evento_comida_inicio;

UPDATE public.giras_logistica_reglas r
SET
  comida_fin_fecha = COALESCE(r.comida_fin_fecha, left(e.fecha::text, 10)::date),
  comida_fin_servicio = COALESCE(
    public._tmp_meal_slot_base(r.comida_fin_servicio, NULL::bigint),
    public._tmp_meal_slot_base(te.nombre, e.id_tipo_evento),
    r.comida_fin_servicio
  )
FROM public.eventos e
LEFT JOIN public.tipos_evento te ON te.id = e.id_tipo_evento
WHERE r.id_evento_comida_fin IS NOT NULL
  AND e.id = r.id_evento_comida_fin;

-- Normalizar servicios huérfanos (sin evento, texto tipo "Cena Técnica").
UPDATE public.giras_logistica_reglas
SET comida_inicio_servicio = public._tmp_meal_slot_base(comida_inicio_servicio, NULL::bigint)
WHERE comida_inicio_servicio IS NOT NULL
  AND public._tmp_meal_slot_base(comida_inicio_servicio, NULL::bigint) IS NOT NULL
  AND comida_inicio_servicio IS DISTINCT FROM public._tmp_meal_slot_base(comida_inicio_servicio, NULL::bigint);

UPDATE public.giras_logistica_reglas
SET comida_fin_servicio = public._tmp_meal_slot_base(comida_fin_servicio, NULL::bigint)
WHERE comida_fin_servicio IS NOT NULL
  AND public._tmp_meal_slot_base(comida_fin_servicio, NULL::bigint) IS NOT NULL
  AND comida_fin_servicio IS DISTINCT FROM public._tmp_meal_slot_base(comida_fin_servicio, NULL::bigint);

ALTER TABLE public.giras_logistica_reglas
  DROP CONSTRAINT IF EXISTS giras_logistica_reglas_id_evento_comida_inicio_fkey,
  DROP CONSTRAINT IF EXISTS giras_logistica_reglas_id_evento_comida_fin_fkey;

ALTER TABLE public.giras_logistica_reglas
  DROP COLUMN IF EXISTS id_evento_comida_inicio,
  DROP COLUMN IF EXISTS id_evento_comida_fin;

DROP FUNCTION IF EXISTS public._tmp_meal_slot_base(text, bigint);
