-- Merge duplicate localities CEB BARILOCHE (id 147) and Bariloche (id 148)
-- into canonical San Carlos de Bariloche (id 5).
-- Idempotent: data remap no-ops if those rows are already gone.
--
-- Id 143 was merged earlier (20260728120000). These two rows were created
-- afterwards and again split roster, sedes, locaciones and plantillas.

DO $$
DECLARE
  v_ids bigint[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}'::bigint[])
  INTO v_ids
  FROM public.localidades
  WHERE (id = 147 AND lower(trim(localidad)) = 'ceb bariloche')
     OR (id = 148 AND lower(trim(localidad)) = 'bariloche');

  IF cardinality(v_ids) = 0 THEN
    RAISE NOTICE 'Alias Bariloche 147/148 ya fusionados; skip data remap.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.localidades
    WHERE id = 5 AND lower(trim(localidad)) = 'san carlos de bariloche'
  ) THEN
    RAISE EXCEPTION 'Localidad canónica 5 (San Carlos de Bariloche) no encontrada';
  END IF;

  -- Junction / unique parents: drop alias when id 5 is already present
  DELETE FROM public.giras_localidades d
  WHERE d.id_localidad = ANY (v_ids)
    AND EXISTS (
      SELECT 1 FROM public.giras_localidades c
      WHERE c.id_gira = d.id_gira AND c.id_localidad = 5
    );

  DELETE FROM public.giras_tramo_localidades d
  WHERE d.id_localidad = ANY (v_ids)
    AND EXISTS (
      SELECT 1 FROM public.giras_tramo_localidades c
      WHERE c.id_segmento = d.id_segmento AND c.id_localidad = 5
    );

  DELETE FROM public.scrn_ruta_paradas d
  WHERE d.id_localidad = ANY (v_ids)
    AND EXISTS (
      SELECT 1 FROM public.scrn_ruta_paradas c
      WHERE c.id_ruta = d.id_ruta AND c.id_localidad = 5
    );

  DELETE FROM public.giras_destaques_config d
  WHERE d.id_localidad = ANY (v_ids)
    AND EXISTS (
      SELECT 1 FROM public.giras_destaques_config c
      WHERE c.id_gira = d.id_gira AND c.id_localidad = 5
    );

  -- Demoras: drop alias pairs that already exist on id 5, then pairs that
  -- collapse onto the same canonical endpoints, then self-loops.
  DELETE FROM public.gira_demoras_localidad d
  WHERE (d.id_localidad_origen = ANY (v_ids) OR d.id_localidad_destino = ANY (v_ids))
    AND EXISTS (
      SELECT 1
      FROM public.gira_demoras_localidad c
      WHERE c.id_localidad_origen NOT IN (SELECT unnest(v_ids))
        AND c.id_localidad_destino NOT IN (SELECT unnest(v_ids))
        AND c.id_localidad_origen = CASE
          WHEN d.id_localidad_origen = ANY (v_ids) THEN 5 ELSE d.id_localidad_origen
        END
        AND c.id_localidad_destino = CASE
          WHEN d.id_localidad_destino = ANY (v_ids) THEN 5 ELSE d.id_localidad_destino
        END
    );

  DELETE FROM public.gira_demoras_localidad d
  WHERE d.ctid IN (
    SELECT ctid
    FROM (
      SELECT
        ctid,
        row_number() OVER (
          PARTITION BY
            CASE WHEN id_localidad_origen = ANY (v_ids) THEN 5 ELSE id_localidad_origen END,
            CASE WHEN id_localidad_destino = ANY (v_ids) THEN 5 ELSE id_localidad_destino END
          ORDER BY updated_at DESC NULLS LAST, ctid
        ) AS rn
      FROM public.gira_demoras_localidad
      WHERE id_localidad_origen = ANY (v_ids)
         OR id_localidad_destino = ANY (v_ids)
    ) ranked
    WHERE rn > 1
  );

  DELETE FROM public.gira_demoras_localidad
  WHERE (
      CASE WHEN id_localidad_origen = ANY (v_ids) THEN 5 ELSE id_localidad_origen END
    ) = (
      CASE WHEN id_localidad_destino = ANY (v_ids) THEN 5 ELSE id_localidad_destino END
    )
    AND (
      id_localidad_origen = ANY (v_ids)
      OR id_localidad_destino = ANY (v_ids)
    );

  -- Scalar FKs
  UPDATE public.integrantes SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.integrantes SET id_loc_viaticos = 5 WHERE id_loc_viaticos = ANY (v_ids);
  UPDATE public.locaciones SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.hoteles SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.ensambles SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.giras_localidades SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.giras_destaques_config SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.giras_logistica_admision SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.giras_logistica_reglas_transportes SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.giras_logistica_rutas SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.giras_tramo_localidades SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.scrn_ruta_paradas SET id_localidad = 5 WHERE id_localidad = ANY (v_ids);
  UPDATE public.gira_demoras_localidad
  SET id_localidad_origen = 5
  WHERE id_localidad_origen = ANY (v_ids);
  UPDATE public.gira_demoras_localidad
  SET id_localidad_destino = 5
  WHERE id_localidad_destino = ANY (v_ids);

  -- Array columns: replace alias ids with 5 and dedupe, keeping first occurrence
  UPDATE public.giras_logistica_reglas
  SET target_localities = (
    SELECT COALESCE(array_agg(mapped ORDER BY ord), '{}'::bigint[])
    FROM (
      SELECT mapped, min(ord) AS ord
      FROM (
        SELECT CASE WHEN v = ANY (v_ids) THEN 5::bigint ELSE v END AS mapped, ord
        FROM unnest(target_localities) WITH ORDINALITY AS t(v, ord)
      ) s
      GROUP BY mapped
    ) d
  )
  WHERE target_localities && v_ids;

  UPDATE public.plantillas_recorridos_tramos
  SET ids_localidades_suben = (
    SELECT COALESCE(array_agg(mapped ORDER BY ord), '{}'::bigint[])
    FROM (
      SELECT mapped, min(ord) AS ord
      FROM (
        SELECT CASE WHEN v = ANY (v_ids) THEN 5::bigint ELSE v END AS mapped, ord
        FROM unnest(ids_localidades_suben) WITH ORDINALITY AS t(v, ord)
      ) s
      GROUP BY mapped
    ) d
  )
  WHERE ids_localidades_suben && v_ids;

  UPDATE public.plantillas_recorridos_tramos
  SET ids_localidades_bajan = (
    SELECT COALESCE(array_agg(mapped ORDER BY ord), '{}'::bigint[])
    FROM (
      SELECT mapped, min(ord) AS ord
      FROM (
        SELECT CASE WHEN v = ANY (v_ids) THEN 5::bigint ELSE v END AS mapped, ord
        FROM unnest(ids_localidades_bajan) WITH ORDINALITY AS t(v, ord)
      ) s
      GROUP BY mapped
    ) d
  )
  WHERE ids_localidades_bajan && v_ids;

  -- Plantillas de recorridos: [{ "ids": [id_localidad, ...] }]
  UPDATE public.viaticos_recorridos_plantillas p
  SET recorridos = (
    SELECT COALESCE(jsonb_agg(rewritten ORDER BY elem_ord), '[]'::jsonb)
    FROM (
      SELECT
        elem_ord,
        CASE
          WHEN jsonb_typeof(elem -> 'ids') = 'array' THEN
            jsonb_set(
              elem,
              '{ids}',
              (
                SELECT COALESCE(jsonb_agg(to_jsonb(mapped) ORDER BY ord), '[]'::jsonb)
                FROM (
                  SELECT mapped, min(ord) AS ord
                  FROM (
                    SELECT
                      CASE
                        WHEN v::bigint = ANY (v_ids) THEN 5::bigint
                        ELSE v::bigint
                      END AS mapped,
                      ord
                    FROM jsonb_array_elements_text(elem -> 'ids') WITH ORDINALITY AS t(v, ord)
                  ) s
                  GROUP BY mapped
                ) d
              )
            )
          ELSE elem
        END AS rewritten
      FROM jsonb_array_elements(p.recorridos) WITH ORDINALITY AS t(elem, elem_ord)
    ) steps
  )
  WHERE p.recorridos::text ~ '(^|[^0-9])(147|148)([^0-9]|$)';

  -- Destaques JSON: personalizados keyed by locality id
  UPDATE public.giras_viaticos_config
  SET lugar_comision_destaques_exportacion = regexp_replace(
    regexp_replace(
      lugar_comision_destaques_exportacion,
      '"147"\s*:',
      '"5":',
      'g'
    ),
    '"148"\s*:',
    '"5":',
    'g'
  )
  WHERE lugar_comision_destaques_exportacion ~ '"147"\s*:|"148"\s*:';

  DELETE FROM public.localidades WHERE id = ANY (v_ids);
END $$;

-- Text catalog (by name, no FK to localidades.id).
-- Drop aliases when the official name already exists, then rename any leftover.
DELETE FROM public.viaticos_manual_localidad alias
WHERE lower(trim(alias.nombre)) IN ('bariloche', 'ceb bariloche')
  AND EXISTS (
    SELECT 1
    FROM public.viaticos_manual_localidad canon
    WHERE lower(trim(canon.nombre)) = 'san carlos de bariloche'
  );

UPDATE public.viaticos_manual_localidad
SET nombre = 'San Carlos de Bariloche'
WHERE id = (
  SELECT id
  FROM public.viaticos_manual_localidad
  WHERE lower(trim(nombre)) IN ('bariloche', 'ceb bariloche')
  ORDER BY aportes DESC, created_at
  LIMIT 1
);

DELETE FROM public.viaticos_manual_localidad
WHERE lower(trim(nombre)) IN ('bariloche', 'ceb bariloche');

UPDATE public.viaticos_manual_persona
SET ciudad_origen = 'San Carlos de Bariloche'
WHERE lower(trim(ciudad_origen)) IN ('bariloche', 'ceb bariloche');

UPDATE public.giras_viaticos_config
SET lugar_comision = 'San Carlos de Bariloche'
WHERE lower(trim(lugar_comision)) IN ('bariloche', 'ceb bariloche');

UPDATE public.scrn_reservas
SET localidad_subida = 'San Carlos de Bariloche'
WHERE lower(trim(localidad_subida)) IN ('bariloche', 'ceb bariloche');

UPDATE public.scrn_reservas
SET localidad_bajada = 'San Carlos de Bariloche'
WHERE lower(trim(localidad_bajada)) IN ('bariloche', 'ceb bariloche');

UPDATE public.scrn_reserva_pasajeros
SET localidad_subida = 'San Carlos de Bariloche'
WHERE lower(trim(localidad_subida)) IN ('bariloche', 'ceb bariloche');

UPDATE public.scrn_reserva_pasajeros
SET localidad_bajada = 'San Carlos de Bariloche'
WHERE lower(trim(localidad_bajada)) IN ('bariloche', 'ceb bariloche');

UPDATE public.scrn_solicitudes_nuevo_viaje
SET localidad_subida = 'San Carlos de Bariloche'
WHERE lower(trim(localidad_subida)) IN ('bariloche', 'ceb bariloche');

UPDATE public.scrn_solicitudes_nuevo_viaje
SET localidad_bajada = 'San Carlos de Bariloche'
WHERE lower(trim(localidad_bajada)) IN ('bariloche', 'ceb bariloche');

UPDATE public.scrn_transportes
SET localidad_base = 'San Carlos de Bariloche'
WHERE lower(trim(localidad_base)) IN ('bariloche', 'ceb bariloche');

-- Keep the short name on the canonical row. CEB is a venue, not a city alias.
UPDATE public.localidades
SET alias = 'Bariloche'
WHERE id = 5
  AND lower(trim(localidad)) = 'san carlos de bariloche'
  AND (alias IS NULL OR btrim(alias) = '');

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

  IF lower(v_nombre) IN ('bariloche', 'ceb bariloche', 'san carlos de bariloche') THEN
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
  'Upsert catálogo de localidades de viáticos manual. Alias Bariloche y CEB BARILOCHE → San Carlos de Bariloche.';

CREATE OR REPLACE FUNCTION public.scrn_resolve_localidad_id(p_nombre text)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  WITH norm AS (
    SELECT lower(trim(coalesce(p_nombre, ''))) AS q
  ),
  bariloche AS (
    SELECT q
    FROM norm
    WHERE q IN ('bariloche', 'ceb bariloche', 'san carlos de bariloche')
  )
  SELECT l.id
  FROM public.localidades l
  CROSS JOIN norm n
  WHERE
    (
      EXISTS (SELECT 1 FROM bariloche)
      AND lower(trim(l.localidad)) IN (
        'bariloche',
        'ceb bariloche',
        'san carlos de bariloche'
      )
    )
    OR (
      NOT EXISTS (SELECT 1 FROM bariloche)
      AND lower(trim(l.localidad)) = n.q
    )
  ORDER BY
    CASE WHEN lower(trim(l.localidad)) = 'san carlos de bariloche' THEN 0 ELSE 1 END,
    CASE WHEN l.id_provincia = 15 THEN 0 ELSE 1 END,
    l.id
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.scrn_resolve_localidad_id(text) IS
  'Resuelve texto de localidad a id. Unifica alias Bariloche y CEB BARILOCHE; prioriza filas de Río Negro (id_provincia=15).';

CREATE OR REPLACE FUNCTION public.localidades_bloquear_alias_bariloche()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF lower(trim(coalesce(NEW.localidad, ''))) IN ('bariloche', 'ceb bariloche') THEN
    RAISE EXCEPTION 'Esa localidad ya existe como San Carlos de Bariloche'
      USING ERRCODE = 'unique_violation',
            HINT = 'Elegí San Carlos de Bariloche en el listado.';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.localidades_bloquear_alias_bariloche() IS
  'Impide volver a crear Bariloche o CEB BARILOCHE como filas distintas de San Carlos de Bariloche.';

DROP TRIGGER IF EXISTS localidades_bloquear_alias_bariloche ON public.localidades;

CREATE TRIGGER localidades_bloquear_alias_bariloche
  BEFORE INSERT OR UPDATE OF localidad
  ON public.localidades
  FOR EACH ROW
  EXECUTE FUNCTION public.localidades_bloquear_alias_bariloche();
