-- Merge duplicate locality "Bariloche" (id 143)
-- into canonical "San Carlos de Bariloche" (id 5).
-- Idempotent: no-ops if id 143 already removed.
--
-- Problem surfaces before merge:
--   - Selectors / roster / logistics treat 5 and 143 as distinct cities
--     (is_local, reglas Localidad, destaques, sedes de gira, SCRN paradas).
--   - Catálogo viáticos manual tenía "BARILOCHE" y "San Carlos de Bariloche".
--   - Alias textual ya existía en scrn_resolve_localidad_id; la fila duplicada
--     seguía contaminando catálogos basados en id.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.localidades
    WHERE id = 143 AND lower(trim(localidad)) = 'bariloche'
  ) THEN
    RAISE NOTICE 'Localidad 143 (Bariloche) ya fusionada o inexistente; skip data remap.';
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.localidades
      WHERE id = 5 AND lower(trim(localidad)) = 'san carlos de bariloche'
    ) THEN
      RAISE EXCEPTION 'Localidad canónica 5 (San Carlos de Bariloche) no encontrada';
    END IF;

    -- Junction / unique parents: drop 143 when 5 already present
    DELETE FROM public.giras_localidades d
    WHERE d.id_localidad = 143
      AND EXISTS (
        SELECT 1 FROM public.giras_localidades c
        WHERE c.id_gira = d.id_gira AND c.id_localidad = 5
      );

    DELETE FROM public.giras_tramo_localidades d
    WHERE d.id_localidad = 143
      AND EXISTS (
        SELECT 1 FROM public.giras_tramo_localidades c
        WHERE c.id_segmento = d.id_segmento AND c.id_localidad = 5
      );

    DELETE FROM public.scrn_ruta_paradas d
    WHERE d.id_localidad = 143
      AND EXISTS (
        SELECT 1 FROM public.scrn_ruta_paradas c
        WHERE c.id_ruta = d.id_ruta AND c.id_localidad = 5
      );

    DELETE FROM public.giras_destaques_config d
    WHERE d.id_localidad = 143
      AND EXISTS (
        SELECT 1 FROM public.giras_destaques_config c
        WHERE c.id_gira = d.id_gira AND c.id_localidad = 5
      );

    -- Scalar FKs
    UPDATE public.integrantes SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.integrantes SET id_loc_viaticos = 5 WHERE id_loc_viaticos = 143;
    UPDATE public.locaciones SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.hoteles SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.ensambles SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.giras_localidades SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.giras_destaques_config SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.giras_logistica_admision SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.giras_logistica_reglas_transportes SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.giras_logistica_rutas SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.giras_tramo_localidades SET id_localidad = 5 WHERE id_localidad = 143;
    UPDATE public.scrn_ruta_paradas SET id_localidad = 5 WHERE id_localidad = 143;

    -- Array columns: replace 143 -> 5 and dedupe preserving first occurrence order
    UPDATE public.giras_logistica_reglas
    SET target_localities = (
      SELECT COALESCE(array_agg(mapped ORDER BY ord), '{}'::bigint[])
      FROM (
        SELECT mapped, min(ord) AS ord
        FROM (
          SELECT CASE WHEN v = 143 THEN 5 ELSE v END AS mapped, ord
          FROM unnest(target_localities) WITH ORDINALITY AS t(v, ord)
        ) s
        GROUP BY mapped
      ) d
    )
    WHERE 143 = ANY(target_localities);

    UPDATE public.plantillas_recorridos_tramos
    SET ids_localidades_suben = (
      SELECT COALESCE(array_agg(mapped ORDER BY ord), '{}'::bigint[])
      FROM (
        SELECT mapped, min(ord) AS ord
        FROM (
          SELECT CASE WHEN v = 143 THEN 5 ELSE v END AS mapped, ord
          FROM unnest(ids_localidades_suben) WITH ORDINALITY AS t(v, ord)
        ) s
        GROUP BY mapped
      ) d
    )
    WHERE 143 = ANY(ids_localidades_suben);

    UPDATE public.plantillas_recorridos_tramos
    SET ids_localidades_bajan = (
      SELECT COALESCE(array_agg(mapped ORDER BY ord), '{}'::bigint[])
      FROM (
        SELECT mapped, min(ord) AS ord
        FROM (
          SELECT CASE WHEN v = 143 THEN 5 ELSE v END AS mapped, ord
          FROM unnest(ids_localidades_bajan) WITH ORDINALITY AS t(v, ord)
        ) s
        GROUP BY mapped
      ) d
    )
    WHERE 143 = ANY(ids_localidades_bajan);

    -- Destaques JSON: personalizados keyed by locality id
    UPDATE public.giras_viaticos_config
    SET lugar_comision_destaques_exportacion = regexp_replace(
      lugar_comision_destaques_exportacion,
      '"143"\s*:',
      '"5":',
      'g'
    )
    WHERE lugar_comision_destaques_exportacion LIKE '%"143"%';

    DELETE FROM public.localidades WHERE id = 143;
  END IF;
END $$;

-- Text catalog (by name, no FK to localidades.id)
DELETE FROM public.viaticos_manual_localidad
WHERE lower(trim(nombre)) IN ('bariloche')
  AND EXISTS (
    SELECT 1 FROM public.viaticos_manual_localidad
    WHERE lower(trim(nombre)) = 'san carlos de bariloche'
  );

UPDATE public.viaticos_manual_localidad
SET nombre = 'San Carlos de Bariloche'
WHERE lower(trim(nombre)) = 'bariloche';

UPDATE public.viaticos_manual_persona
SET ciudad_origen = 'San Carlos de Bariloche'
WHERE lower(trim(ciudad_origen)) = 'bariloche';

-- Prevent re-creating "Bariloche" as a separate manual catalog entry
CREATE OR REPLACE FUNCTION public.viaticos_manual_upsert_localidad(p_nombre text)
RETURNS public.viaticos_manual_localidad
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.viaticos_manual_localidad;
  v_nombre text := trim(coalesce(p_nombre, ''));
BEGIN
  IF v_nombre = '' THEN
    RETURN NULL;
  END IF;

  IF lower(v_nombre) IN ('bariloche', 'san carlos de bariloche') THEN
    v_nombre := 'San Carlos de Bariloche';
  END IF;

  SELECT * INTO v_row
  FROM public.viaticos_manual_localidad
  WHERE lower(trim(nombre)) = lower(v_nombre)
  LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    UPDATE public.viaticos_manual_localidad
    SET aportes = aportes + 1
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.viaticos_manual_localidad (nombre)
    VALUES (v_nombre)
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.viaticos_manual_upsert_localidad(text) IS
  'Upsert catálogo de localidades de viáticos manual. Alias Bariloche → San Carlos de Bariloche.';
