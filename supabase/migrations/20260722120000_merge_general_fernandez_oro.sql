-- Merge duplicate locality "General Fernandez Oro" (id 62)
-- into canonical "General Fernández Oro" (id 29).
-- Idempotent: no-ops if id 62 already removed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.localidades
    WHERE id = 62 AND localidad = 'General Fernandez Oro'
  ) THEN
    RAISE NOTICE 'Localidad 62 ya fusionada o inexistente; skip.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.localidades
    WHERE id = 29 AND localidad = 'General Fernández Oro'
  ) THEN
    RAISE EXCEPTION 'Localidad canónica 29 (General Fernández Oro) no encontrada';
  END IF;
END $$;

-- Scalar FKs
UPDATE public.integrantes
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.integrantes
SET id_loc_viaticos = 29
WHERE id_loc_viaticos = 62;

UPDATE public.locaciones
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.hoteles
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.ensambles
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.giras_localidades
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.giras_destaques_config
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.giras_logistica_admision
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.giras_logistica_reglas_transportes
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.giras_logistica_rutas
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.giras_tramo_localidades
SET id_localidad = 29
WHERE id_localidad = 62;

UPDATE public.scrn_ruta_paradas
SET id_localidad = 29
WHERE id_localidad = 62;

-- Array columns: replace 62 -> 29 and dedupe preserving first occurrence order
UPDATE public.giras_logistica_reglas
SET target_localities = (
  SELECT COALESCE(array_agg(mapped ORDER BY ord), '{}'::bigint[])
  FROM (
    SELECT mapped, min(ord) AS ord
    FROM (
      SELECT CASE WHEN v = 62 THEN 29 ELSE v END AS mapped, ord
      FROM unnest(target_localities) WITH ORDINALITY AS t(v, ord)
    ) s
    GROUP BY mapped
  ) d
)
WHERE 62 = ANY(target_localities);

UPDATE public.plantillas_recorridos_tramos
SET ids_localidades_suben = (
  SELECT COALESCE(array_agg(mapped ORDER BY ord), '{}'::bigint[])
  FROM (
    SELECT mapped, min(ord) AS ord
    FROM (
      SELECT CASE WHEN v = 62 THEN 29 ELSE v END AS mapped, ord
      FROM unnest(ids_localidades_suben) WITH ORDINALITY AS t(v, ord)
    ) s
    GROUP BY mapped
  ) d
)
WHERE 62 = ANY(ids_localidades_suben);

UPDATE public.plantillas_recorridos_tramos
SET ids_localidades_bajan = (
  SELECT COALESCE(array_agg(mapped ORDER BY ord), '{}'::bigint[])
  FROM (
    SELECT mapped, min(ord) AS ord
    FROM (
      SELECT CASE WHEN v = 62 THEN 29 ELSE v END AS mapped, ord
      FROM unnest(ids_localidades_bajan) WITH ORDINALITY AS t(v, ord)
    ) s
    GROUP BY mapped
  ) d
)
WHERE 62 = ANY(ids_localidades_bajan);

-- Text duplicates in manual localities catalog (by name, no FK)
DELETE FROM public.viaticos_manual_localidad
WHERE nombre = 'General Fernandez Oro'
  AND EXISTS (
    SELECT 1 FROM public.viaticos_manual_localidad
    WHERE nombre = 'General Fernández Oro'
  );

UPDATE public.viaticos_manual_localidad
SET nombre = 'General Fernández Oro'
WHERE nombre = 'General Fernandez Oro';

DELETE FROM public.localidades
WHERE id = 62;
