-- Fusionar integrantes duplicados + explicar por qué no se puede borrar uno.
-- SECURITY INVOKER: mismas RLS que Personas. Un fallo en merge hace rollback.

CREATE OR REPLACE FUNCTION public.merge_integrantes_remap_bigint_array(
  arr bigint[],
  p_from bigint,
  p_to bigint
)
RETURNS bigint[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT CASE WHEN x = p_from THEN p_to ELSE x END
      FROM unnest(COALESCE(arr, '{}'::bigint[])) AS x
    ),
    '{}'::bigint[]
  );
$$;

CREATE OR REPLACE FUNCTION public.merge_integrantes_remap_text_id_array(
  arr text[],
  p_from bigint,
  p_to bigint
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT CASE
        WHEN x = p_from::text THEN p_to::text
        ELSE x
      END
      FROM unnest(COALESCE(arr, '{}'::text[])) AS x
    ),
    '{}'::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.merge_integrantes_move_scalar_fk(
  p_table text,
  p_column text,
  p_source bigint,
  p_target bigint,
  p_conflict_cols text[] DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_n int := 0;
  v_pred text;
BEGIN
  IF p_conflict_cols IS NOT NULL AND coalesce(array_length(p_conflict_cols, 1), 0) > 0 THEN
    SELECT string_agg(format('t.%I IS NOT DISTINCT FROM s.%I', c, c), ' AND ')
    INTO v_pred
    FROM unnest(p_conflict_cols) AS c;

    EXECUTE format(
      'DELETE FROM public.%I s WHERE s.%I = $1 AND EXISTS (
         SELECT 1 FROM public.%I t WHERE t.%I = $2 AND %s
       )',
      p_table, p_column, p_table, p_column, v_pred
    )
    USING p_source, p_target;
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET %I = $1 WHERE %I = $2',
    p_table, p_column, p_column
  )
  USING p_target, p_source;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_integrantes_person_label(p_id bigint)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT trim(both FROM concat_ws(
    ', ',
    nullif(trim(coalesce(apellido, '')), ''),
    nullif(trim(coalesce(nombre, '')), '')
  ))
  FROM public.integrantes
  WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.get_integrante_delete_blockers(p_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.integrantes%ROWTYPE;
  v_label text;
  v_blockers jsonb := '[]'::jsonb;
  v_n int;
  v_details jsonb;
BEGIN
  IF p_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'ID de persona inválido.'
    );
  END IF;

  SELECT * INTO v_row FROM public.integrantes WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Esa persona ya no existe.'
    );
  END IF;

  v_label := coalesce(
    public.merge_integrantes_person_label(p_id),
    format('#%s', p_id)
  );

  IF public.integrantes_is_protected_email(v_row.mail) THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'protected',
      'label', 'Cuenta protegida del sistema',
      'count', 1,
      'details', jsonb_build_array(v_row.mail)
    ));
  END IF;

  SELECT count(*)::int,
         coalesce(jsonb_agg(x ORDER BY x) FILTER (WHERE x IS NOT NULL), '[]'::jsonb)
  INTO v_n, v_details
  FROM (
    SELECT format(
      '%s (%s)',
      coalesce(nullif(trim(p.nombre_gira), ''), 'Gira #' || p.id::text),
      coalesce(nullif(trim(gi.estado), ''), 'convocado')
    ) AS x
    FROM public.giras_integrantes gi
    JOIN public.programas p ON p.id = gi.id_gira
    WHERE gi.id_integrante = p_id
    ORDER BY p.fecha_desde DESC NULLS LAST
    LIMIT 8
  ) s;
  SELECT count(*)::int INTO v_n
  FROM public.giras_integrantes
  WHERE id_integrante = p_id;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'giras',
      'label', 'Convocado a giras',
      'count', v_n,
      'details', v_details
    ));
  END IF;

  SELECT count(*)::int,
         coalesce(jsonb_agg(x ORDER BY x) FILTER (WHERE x IS NOT NULL), '[]'::jsonb)
  INTO v_n, v_details
  FROM (
    SELECT format(
      '%s · %s',
      coalesce(nullif(trim(p.nombre_gira), ''), 'Gira #' || p.id::text),
      coalesce(nullif(trim(g.nombre), ''), 'grupo')
    ) AS x
    FROM public.giras_grupos_integrantes ggi
    JOIN public.giras_grupos g ON g.id = ggi.id_grupo
    JOIN public.programas p ON p.id = g.id_gira
    WHERE ggi.id_integrante = p_id
    LIMIT 8
  ) s;
  SELECT count(*)::int INTO v_n
  FROM public.giras_grupos_integrantes
  WHERE id_integrante = p_id;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'grupos_gira',
      'label', 'Miembro de grupos de gira',
      'count', v_n,
      'details', v_details
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM (
    SELECT id FROM public.giras_logistica_admision WHERE id_integrante = p_id
    UNION ALL
    SELECT id FROM public.giras_logistica_rutas WHERE id_integrante = p_id
    UNION ALL
    SELECT id FROM public.giras_logistica_reglas_transportes WHERE id_integrante = p_id
    UNION ALL
    SELECT id FROM public.giras_logistica_reglas
    WHERE p_id = ANY(COALESCE(target_ids, '{}'::bigint[]))
  ) q;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'logistica',
      'label', 'Reglas de logística / transporte a título personal',
      'count', v_n,
      'details', '[]'::jsonb
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM public.hospedaje_habitaciones
  WHERE p_id = ANY(COALESCE(id_integrantes_asignados, '{}'::bigint[]));
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'rooming',
      'label', 'Asignado a habitaciones',
      'count', v_n,
      'details', '[]'::jsonb
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM (
    SELECT id FROM public.seating_contenedores_items WHERE id_musico = p_id
    UNION ALL
    SELECT id FROM public.seating_asignaciones
    WHERE p_id = ANY(COALESCE(id_musicos_asignados, '{}'::bigint[]))
  ) q;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'seating',
      'label', 'Asignaciones de seating',
      'count', v_n,
      'details', '[]'::jsonb
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM (
    SELECT id FROM public.giras_viaticos WHERE id_integrante = p_id
    UNION ALL
    SELECT id FROM public.giras_viaticos_detalle WHERE id_integrante = p_id
  ) q;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'viaticos',
      'label', 'Viáticos',
      'count', v_n,
      'details', '[]'::jsonb
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM public.horas_catedra
  WHERE id_integrante = p_id;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'horas',
      'label', 'Horas cátedra',
      'count', v_n,
      'details', '[]'::jsonb
    ));
  END IF;

  SELECT count(*)::int,
         coalesce(jsonb_agg(x ORDER BY x) FILTER (WHERE x IS NOT NULL), '[]'::jsonb)
  INTO v_n, v_details
  FROM (
    SELECT DISTINCT coalesce(nullif(trim(e.ensamble), ''), 'Ensamble #' || e.id::text) AS x
    FROM public.integrantes_ensambles ie
    JOIN public.ensambles e ON e.id = ie.id_ensamble
    WHERE ie.id_integrante = p_id
    LIMIT 8
  ) s;
  SELECT count(*)::int INTO v_n
  FROM public.integrantes_ensambles
  WHERE id_integrante = p_id;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'ensambles',
      'label', 'Membresía de ensambles',
      'count', v_n,
      'details', v_details
    ));
  END IF;

  SELECT count(*)::int,
         coalesce(jsonb_agg(x ORDER BY x) FILTER (WHERE x IS NOT NULL), '[]'::jsonb)
  INTO v_n, v_details
  FROM (
    SELECT coalesce(nullif(trim(e.ensamble), ''), 'Ensamble #' || e.id::text) AS x
    FROM public.ensambles_coordinadores c
    JOIN public.ensambles e ON e.id = c.id_ensamble
    WHERE c.id_integrante = p_id
    LIMIT 8
  ) s;
  SELECT count(*)::int INTO v_n
  FROM public.ensambles_coordinadores
  WHERE id_integrante = p_id;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'coordinador',
      'label', 'Coordinador de ensamble',
      'count', v_n,
      'details', v_details
    ));
  END IF;

  SELECT count(*)::int,
         coalesce(jsonb_agg(x ORDER BY x) FILTER (WHERE x IS NOT NULL), '[]'::jsonb)
  INTO v_n, v_details
  FROM (
    SELECT o.titulo AS x
    FROM public.obras o
    WHERE o.id_integrante_arreglador = p_id OR o.id_usuario_carga = p_id
    LIMIT 8
  ) s;
  SELECT count(*)::int INTO v_n
  FROM public.obras
  WHERE id_integrante_arreglador = p_id OR id_usuario_carga = p_id;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'obras',
      'label', 'Obras (arreglador o carga)',
      'count', v_n,
      'details', v_details
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM public.perfiles
  WHERE id_integrante = p_id;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'perfil',
      'label', 'Perfil de acceso (login)',
      'count', v_n,
      'details', CASE
        WHEN nullif(trim(coalesce(v_row.email_acceso, '')), '') IS NOT NULL
          THEN jsonb_build_array(v_row.email_acceso)
        ELSE '[]'::jsonb
      END
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM public.giras_transportes
  WHERE id_chofer = p_id;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'chofer',
      'label', 'Chofer de transportes de gira',
      'count', v_n,
      'details', '[]'::jsonb
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM public.fimba_participantes
  WHERE id_integrante = p_id;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'fimba',
      'label', 'Participante FIMBA vinculado',
      'count', v_n,
      'details', '[]'::jsonb
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM (
    SELECT id FROM public.eventos_asistencia WHERE id_integrante = p_id
    UNION ALL
    SELECT id FROM public.eventos_asistencia_custom WHERE id_integrante = p_id
    UNION ALL
    SELECT id FROM public.eventos_checkin_ensayo WHERE id_integrante = p_id
    UNION ALL
    SELECT id FROM public.giras_comidas_rsvp WHERE id_integrante = p_id
  ) q;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'asistencia',
      'label', 'Asistencia, check-in o RSVP de comidas',
      'count', v_n,
      'details', '[]'::jsonb
    ));
  END IF;

  SELECT count(*)::int INTO v_n
  FROM (
    SELECT 1 FROM public.gira_difusion
    WHERE editor_link_foto_home = p_id
       OR editor_link_foto_banner = p_id
       OR editor_link_logo_1 = p_id
       OR editor_link_logo_2 = p_id
       OR editor_otros_comentarios = p_id
    UNION ALL
    SELECT 1 FROM public.eventos_venue_log WHERE id_integrante = p_id
    UNION ALL
    SELECT 1 FROM public.conciertos_difusion_logs WHERE id_editor = p_id
    UNION ALL
    SELECT 1 FROM public.giras_progreso WHERE updated_by = p_id
    UNION ALL
    SELECT 1 FROM public.giras_progreso_historial WHERE modificado_por = p_id
    UNION ALL
    SELECT 1 FROM public.obras_produccion_log WHERE id_usuario_accion = p_id
    UNION ALL
    SELECT 1 FROM public.traduccion_partituras WHERE created_by = p_id
    UNION ALL
    SELECT 1 FROM public.sistema_comentarios WHERE id_autor = p_id
    UNION ALL
    SELECT 1 FROM public.sistema_novedades WHERE creado_por = p_id
    UNION ALL
    SELECT 1 FROM public.giras_hospedajes_excluidos WHERE id_integrante = p_id
    UNION ALL
    SELECT 1 FROM public.giras_accesos WHERE id_integrante = p_id
    UNION ALL
    SELECT 1 FROM public.obras_ajustes
    WHERE id_integrante_arreglador = p_id OR id_usuario_solicita = p_id
  ) q;
  IF v_n > 0 THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'actividad',
      'label', 'Otra actividad (edición, comentarios, logs, accesos de gira)',
      'count', v_n,
      'details', '[]'::jsonb
    ));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id', p_id,
    'nombre', v_label,
    'can_delete', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_integrante(p_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_info jsonb;
BEGIN
  v_info := public.get_integrante_delete_blockers(p_id);
  IF coalesce(v_info->>'ok', 'false') <> 'true' THEN
    RETURN v_info;
  END IF;
  IF coalesce((v_info->>'can_delete')::boolean, false) IS NOT TRUE THEN
    RETURN v_info || jsonb_build_object(
      'deleted', false,
      'error', 'No se puede eliminar: tiene actividad o vínculos.'
    );
  END IF;

  DELETE FROM public.integrantes WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esa persona ya no existe.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted', true,
    'id', p_id,
    'nombre', v_info->>'nombre'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'deleted', false,
      'error', SQLERRM
    );
END;
$$;

-- El label del source ya no existe tras DELETE; reconstruir summary con nombres capturados.
CREATE OR REPLACE FUNCTION public.merge_integrantes(
  p_source_id bigint,
  p_target_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_source public.integrantes%ROWTYPE;
  v_target public.integrantes%ROWTYPE;
  v_source_label text;
  v_target_label text;
  v_n int;
  v_counts jsonb := '{}'::jsonb;
  v_parts text[] := ARRAY[]::text[];
  v_k text;
  v_v text;
BEGIN
  IF p_source_id IS NULL OR p_target_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'IDs de persona inválidos.');
  END IF;
  IF p_source_id = p_target_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'No podés fusionar una persona consigo misma.'
    );
  END IF;

  SELECT * INTO v_source FROM public.integrantes WHERE id = p_source_id;
  SELECT * INTO v_target FROM public.integrantes WHERE id = p_target_id;
  IF v_source.id IS NULL OR v_target.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Una de las personas ya no existe.');
  END IF;

  v_source_label := coalesce(public.merge_integrantes_person_label(p_source_id), '#' || p_source_id::text);
  v_target_label := coalesce(public.merge_integrantes_person_label(p_target_id), '#' || p_target_id::text);

  IF public.integrantes_is_protected_email(v_source.mail) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'No se puede fusionar (borrar) una cuenta protegida.'
    );
  END IF;

  UPDATE public.integrantes t
  SET
    apellido = CASE WHEN nullif(trim(coalesce(t.apellido, '')), '') IS NULL THEN s.apellido ELSE t.apellido END,
    nombre = CASE WHEN nullif(trim(coalesce(t.nombre, '')), '') IS NULL THEN s.nombre ELSE t.nombre END,
    id_instr = COALESCE(t.id_instr, s.id_instr),
    genero = COALESCE(t.genero, s.genero),
    telefono = CASE WHEN nullif(trim(coalesce(t.telefono, '')), '') IS NULL THEN s.telefono ELSE t.telefono END,
    dni = CASE WHEN nullif(trim(coalesce(t.dni, '')), '') IS NULL THEN s.dni ELSE t.dni END,
    mail = CASE WHEN nullif(trim(coalesce(t.mail, '')), '') IS NULL THEN s.mail ELSE t.mail END,
    alimentacion = CASE WHEN nullif(trim(coalesce(t.alimentacion, '')), '') IS NULL THEN s.alimentacion ELSE t.alimentacion END,
    nombre_preferencia = CASE WHEN nullif(trim(coalesce(t.nombre_preferencia, '')), '') IS NULL THEN s.nombre_preferencia ELSE t.nombre_preferencia END,
    apellido_preferencia = CASE WHEN nullif(trim(coalesce(t.apellido_preferencia, '')), '') IS NULL THEN s.apellido_preferencia ELSE t.apellido_preferencia END,
    nacionalidad = CASE WHEN nullif(trim(coalesce(t.nacionalidad, '')), '') IS NULL THEN s.nacionalidad ELSE t.nacionalidad END,
    cuil = CASE WHEN nullif(trim(coalesce(t.cuil, '')), '') IS NULL THEN s.cuil ELSE t.cuil END,
    fecha_nac = COALESCE(t.fecha_nac, s.fecha_nac),
    email_google = CASE WHEN nullif(trim(coalesce(t.email_google, '')), '') IS NULL THEN s.email_google ELSE t.email_google END,
    fecha_alta = COALESCE(LEAST(t.fecha_alta, s.fecha_alta), t.fecha_alta, s.fecha_alta),
    fecha_baja = CASE
      WHEN t.fecha_baja IS NULL OR s.fecha_baja IS NULL THEN NULL
      ELSE GREATEST(t.fecha_baja, s.fecha_baja)
    END,
    id_localidad = COALESCE(t.id_localidad, s.id_localidad),
    condicion = COALESCE(t.condicion, s.condicion),
    email_acceso = CASE WHEN nullif(trim(coalesce(t.email_acceso, '')), '') IS NULL THEN s.email_acceso ELSE t.email_acceso END,
    rol_sistema = (
      SELECT ARRAY(SELECT DISTINCT unnest(
        COALESCE(t.rol_sistema, '{}'::text[]) || COALESCE(s.rol_sistema, '{}'::text[])
      ))
    ),
    clave_acceso = CASE WHEN nullif(trim(coalesce(t.clave_acceso, '')), '') IS NULL THEN s.clave_acceso ELSE t.clave_acceso END,
    link_bio = CASE WHEN nullif(trim(coalesce(t.link_bio, '')), '') IS NULL THEN s.link_bio ELSE t.link_bio END,
    link_foto_popup = CASE WHEN nullif(trim(coalesce(t.link_foto_popup, '')), '') IS NULL THEN s.link_foto_popup ELSE t.link_foto_popup END,
    documentacion = CASE WHEN nullif(trim(coalesce(t.documentacion, '')), '') IS NULL THEN s.documentacion ELSE t.documentacion END,
    docred = CASE WHEN nullif(trim(coalesce(t.docred, '')), '') IS NULL THEN s.docred ELSE t.docred END,
    firma = CASE WHEN nullif(trim(coalesce(t.firma, '')), '') IS NULL THEN s.firma ELSE t.firma END,
    id_loc_viaticos = COALESCE(t.id_loc_viaticos, s.id_loc_viaticos),
    domicilio = CASE WHEN nullif(trim(coalesce(t.domicilio, '')), '') IS NULL THEN s.domicilio ELSE t.domicilio END,
    avatar_url = CASE WHEN nullif(trim(coalesce(t.avatar_url, '')), '') IS NULL THEN s.avatar_url ELSE t.avatar_url END,
    avatar_color = CASE WHEN nullif(trim(coalesce(t.avatar_color, '')), '') IS NULL THEN s.avatar_color ELSE t.avatar_color END,
    link_carpeta = CASE WHEN nullif(trim(coalesce(t.link_carpeta, '')), '') IS NULL THEN s.link_carpeta ELSE t.link_carpeta END,
    link_dni_img = CASE WHEN nullif(trim(coalesce(t.link_dni_img, '')), '') IS NULL THEN s.link_dni_img ELSE t.link_dni_img END,
    link_cbu_img = CASE WHEN nullif(trim(coalesce(t.link_cbu_img, '')), '') IS NULL THEN s.link_cbu_img ELSE t.link_cbu_img END,
    link_declaracion = CASE WHEN nullif(trim(coalesce(t.link_declaracion, '')), '') IS NULL THEN s.link_declaracion ELSE t.link_declaracion END,
    link_cuil = CASE WHEN nullif(trim(coalesce(t.link_cuil, '')), '') IS NULL THEN s.link_cuil ELSE t.link_cuil END,
    cargo = CASE WHEN nullif(trim(coalesce(t.cargo, '')), '') IS NULL THEN s.cargo ELSE t.cargo END,
    jornada = CASE WHEN nullif(trim(coalesce(t.jornada, '')), '') IS NULL THEN s.jornada ELSE t.jornada END,
    motivo = CASE WHEN nullif(trim(coalesce(t.motivo, '')), '') IS NULL THEN s.motivo ELSE t.motivo END,
    id_domicilio_laboral = COALESCE(t.id_domicilio_laboral, s.id_domicilio_laboral),
    nota_interna = CASE
      WHEN nullif(trim(coalesce(t.nota_interna, '')), '') IS NULL THEN s.nota_interna
      WHEN nullif(trim(coalesce(s.nota_interna, '')), '') IS NULL THEN t.nota_interna
      WHEN t.nota_interna = s.nota_interna THEN t.nota_interna
      ELSE t.nota_interna || E'\n\nâ€” fusionado de #' || s.id::text || E' â€”\n' || s.nota_interna
    END,
    last_verified_at = GREATEST(t.last_verified_at, s.last_verified_at),
    last_modified_at = now()
  FROM public.integrantes s
  WHERE t.id = p_target_id AND s.id = p_source_id;

  IF EXISTS (SELECT 1 FROM public.perfiles WHERE id_integrante = p_target_id) THEN
    UPDATE public.perfiles
    SET id_integrante = NULL
    WHERE id_integrante = p_source_id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('perfiles.unlinked', v_n);
  ELSE
    v_n := public.merge_integrantes_move_scalar_fk(
      'perfiles', 'id_integrante', p_source_id, p_target_id, NULL
    );
    v_counts := v_counts || jsonb_build_object('perfiles', v_n);
  END IF;

  v_n := public.merge_integrantes_move_scalar_fk('giras_integrantes', 'id_integrante', p_source_id, p_target_id, ARRAY['id_gira']);
  v_counts := v_counts || jsonb_build_object('giras_integrantes', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_grupos_integrantes', 'id_integrante', p_source_id, p_target_id, ARRAY['id_grupo']);
  v_counts := v_counts || jsonb_build_object('giras_grupos_integrantes', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_accesos', 'id_integrante', p_source_id, p_target_id, ARRAY['id_gira']);
  v_counts := v_counts || jsonb_build_object('giras_accesos', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_hospedajes_excluidos', 'id_integrante', p_source_id, p_target_id, ARRAY['id_programa']);
  v_counts := v_counts || jsonb_build_object('giras_hospedajes_excluidos', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_viaticos', 'id_integrante', p_source_id, p_target_id, ARRAY['id_gira']);
  v_counts := v_counts || jsonb_build_object('giras_viaticos', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_viaticos_detalle', 'id_integrante', p_source_id, p_target_id, ARRAY['id_gira', 'tramo_orden']);
  v_counts := v_counts || jsonb_build_object('giras_viaticos_detalle', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_comidas_rsvp', 'id_integrante', p_source_id, p_target_id, ARRAY['id_comida']);
  v_counts := v_counts || jsonb_build_object('giras_comidas_rsvp', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('eventos_asistencia', 'id_integrante', p_source_id, p_target_id, ARRAY['id_evento']);
  v_counts := v_counts || jsonb_build_object('eventos_asistencia', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('eventos_asistencia_custom', 'id_integrante', p_source_id, p_target_id, ARRAY['id_evento', 'tipo']);
  v_counts := v_counts || jsonb_build_object('eventos_asistencia_custom', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('eventos_checkin_ensayo', 'id_integrante', p_source_id, p_target_id, ARRAY['id_evento']);
  v_counts := v_counts || jsonb_build_object('eventos_checkin_ensayo', v_n);
  PERFORM public.merge_integrantes_move_scalar_fk('eventos_checkin_ensayo', 'id_integrante_prestador', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('eventos_checkin_ensayo', 'id_integrante_prestador_salida', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('eventos_checkin_ensayo', 'id_editado_por', p_source_id, p_target_id, NULL);
  v_n := public.merge_integrantes_move_scalar_fk('eventos_checkin_recordatorios', 'id_integrante', p_source_id, p_target_id, ARRAY['id_evento', 'tipo', 'canal']);
  v_counts := v_counts || jsonb_build_object('eventos_checkin_recordatorios', v_n);
  PERFORM public.merge_integrantes_move_scalar_fk('eventos_checkin_pase', 'id_integrante_prestador', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('eventos_checkin_pase', 'id_integrante_usuario', p_source_id, p_target_id, NULL);
  v_n := public.merge_integrantes_move_scalar_fk('horas_catedra', 'id_integrante', p_source_id, p_target_id, NULL);
  v_counts := v_counts || jsonb_build_object('horas_catedra', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('integrantes_ensambles', 'id_integrante', p_source_id, p_target_id, NULL);
  v_counts := v_counts || jsonb_build_object('integrantes_ensambles', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('ensambles_coordinadores', 'id_integrante', p_source_id, p_target_id, ARRAY['id_ensamble']);
  v_counts := v_counts || jsonb_build_object('ensambles_coordinadores', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_logistica_admision', 'id_integrante', p_source_id, p_target_id, ARRAY['id_gira', 'alcance', 'tipo', 'id_transporte_fisico']);
  v_counts := v_counts || jsonb_build_object('giras_logistica_admision', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_logistica_rutas', 'id_integrante', p_source_id, p_target_id, ARRAY['id_gira', 'alcance', 'id_transporte_fisico']);
  v_counts := v_counts || jsonb_build_object('giras_logistica_rutas', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_logistica_reglas_transportes', 'id_integrante', p_source_id, p_target_id, ARRAY['id_gira_transporte', 'alcance']);
  v_counts := v_counts || jsonb_build_object('giras_logistica_reglas_transportes', v_n);

  UPDATE public.giras_logistica_reglas
  SET target_ids = public.merge_integrantes_remap_bigint_array(target_ids, p_source_id, p_target_id)
  WHERE p_source_id = ANY(COALESCE(target_ids, '{}'::bigint[]));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('giras_logistica_reglas.target_ids', v_n);

  UPDATE public.giras_logistica_admision
  SET target_ids = public.merge_integrantes_remap_bigint_array(target_ids, p_source_id, p_target_id)
  WHERE target_ids IS NOT NULL AND p_source_id = ANY(target_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('giras_logistica_admision.target_ids', v_n);

  UPDATE public.giras_logistica_rutas
  SET target_ids = public.merge_integrantes_remap_bigint_array(target_ids, p_source_id, p_target_id)
  WHERE target_ids IS NOT NULL AND p_source_id = ANY(target_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('giras_logistica_rutas.target_ids', v_n);

  UPDATE public.giras_logistica_reglas_transportes
  SET target_ids = public.merge_integrantes_remap_text_id_array(target_ids, p_source_id, p_target_id)
  WHERE target_ids IS NOT NULL AND p_source_id::text = ANY(target_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('giras_logistica_reglas_transportes.target_ids', v_n);

  UPDATE public.hospedaje_habitaciones
  SET
    id_integrantes_asignados = public.merge_integrantes_remap_bigint_array(
      id_integrantes_asignados, p_source_id, p_target_id
    ),
    asignaciones_config = COALESCE((
      SELECT jsonb_agg(elem ORDER BY ord)
      FROM (
        SELECT DISTINCT ON (id_key) elem, ord
        FROM (
          SELECT
            CASE
              WHEN (elem->>'id') ~ '^[0-9]+$' AND (elem->>'id')::bigint = p_source_id
                THEN jsonb_set(elem, '{id}', to_jsonb(p_target_id))
              ELSE elem
            END AS elem,
            CASE
              WHEN (elem->>'id') ~ '^[0-9]+$' AND (elem->>'id')::bigint = p_source_id THEN p_target_id
              WHEN (elem->>'id') ~ '^[0-9]+$' THEN (elem->>'id')::bigint
              ELSE NULL
            END AS id_key,
            ord
          FROM jsonb_array_elements(COALESCE(asignaciones_config, '[]'::jsonb))
               WITH ORDINALITY AS t(elem, ord)
        ) mapped
        ORDER BY id_key, ord
      ) s
    ), '[]'::jsonb)
  WHERE p_source_id = ANY(COALESCE(id_integrantes_asignados, '{}'::bigint[]))
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements(COALESCE(asignaciones_config, '[]'::jsonb)) e
       WHERE (e->>'id') ~ '^[0-9]+$' AND (e->>'id')::bigint = p_source_id
     );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('hospedaje_habitaciones', v_n);

  UPDATE public.seating_asignaciones
  SET id_musicos_asignados = public.merge_integrantes_remap_bigint_array(
    id_musicos_asignados, p_source_id, p_target_id
  )
  WHERE p_source_id = ANY(COALESCE(id_musicos_asignados, '{}'::bigint[]));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('seating_asignaciones', v_n);

  v_n := public.merge_integrantes_move_scalar_fk('seating_contenedores_items', 'id_musico', p_source_id, p_target_id, ARRAY['id_contenedor']);
  v_counts := v_counts || jsonb_build_object('seating_contenedores_items', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('giras_transportes', 'id_chofer', p_source_id, p_target_id, NULL);
  v_counts := v_counts || jsonb_build_object('giras_transportes.id_chofer', v_n);
  v_n := public.merge_integrantes_move_scalar_fk('fimba_participantes', 'id_integrante', p_source_id, p_target_id, NULL);
  v_counts := v_counts || jsonb_build_object('fimba_participantes', v_n);
  PERFORM public.merge_integrantes_move_scalar_fk('obras', 'id_integrante_arreglador', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('obras', 'id_usuario_carga', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('obras_ajustes', 'id_integrante_arreglador', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('obras_ajustes', 'id_usuario_solicita', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('obras_produccion_log', 'id_usuario_accion', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('conciertos_difusion_logs', 'id_editor', p_source_id, p_target_id, NULL);

  UPDATE public.gira_difusion
  SET
    editor_link_foto_home = CASE WHEN editor_link_foto_home = p_source_id THEN p_target_id ELSE editor_link_foto_home END,
    editor_link_foto_banner = CASE WHEN editor_link_foto_banner = p_source_id THEN p_target_id ELSE editor_link_foto_banner END,
    editor_link_logo_1 = CASE WHEN editor_link_logo_1 = p_source_id THEN p_target_id ELSE editor_link_logo_1 END,
    editor_link_logo_2 = CASE WHEN editor_link_logo_2 = p_source_id THEN p_target_id ELSE editor_link_logo_2 END,
    editor_otros_comentarios = CASE WHEN editor_otros_comentarios = p_source_id THEN p_target_id ELSE editor_otros_comentarios END
  WHERE editor_link_foto_home = p_source_id
     OR editor_link_foto_banner = p_source_id
     OR editor_link_logo_1 = p_source_id
     OR editor_link_logo_2 = p_source_id
     OR editor_otros_comentarios = p_source_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('gira_difusion', v_n);

  PERFORM public.merge_integrantes_move_scalar_fk('eventos_venue_log', 'id_integrante', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('giras_progreso', 'updated_by', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('giras_progreso_historial', 'modificado_por', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('sistema_comentarios', 'id_autor', p_source_id, p_target_id, NULL);
  PERFORM public.merge_integrantes_move_scalar_fk('sistema_novedades', 'creado_por', p_source_id, p_target_id, NULL);
  v_n := public.merge_integrantes_move_scalar_fk('sistema_novedades_lecturas', 'id_usuario', p_source_id, p_target_id, ARRAY['id_novedad']);
  v_counts := v_counts || jsonb_build_object('sistema_novedades_lecturas', v_n);
  PERFORM public.merge_integrantes_move_scalar_fk('traduccion_partituras', 'created_by', p_source_id, p_target_id, NULL);

  DELETE FROM public.user_ui_settings
  WHERE user_id = p_source_id
    AND EXISTS (SELECT 1 FROM public.user_ui_settings WHERE user_id = p_target_id);
  UPDATE public.user_ui_settings SET user_id = p_target_id WHERE user_id = p_source_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('user_ui_settings', v_n);

  PERFORM public.merge_integrantes_move_scalar_fk('web_push_subscriptions', 'id_integrante', p_source_id, p_target_id, NULL);

  DELETE FROM public.integrantes WHERE id = p_source_id;

  FOR v_k, v_v IN
    SELECT key, value #>> '{}'
    FROM jsonb_each(v_counts)
  LOOP
    IF COALESCE(v_v::int, 0) > 0 THEN
      v_parts := array_append(v_parts, v_k || ': ' || v_v);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'counts', v_counts,
    'summary',
    format(
      'Â«%sÂ» (#%s) â†’ Â«%sÂ» (#%s). %s.',
      v_source_label,
      p_source_id,
      v_target_label,
      p_target_id,
      CASE
        WHEN coalesce(array_length(v_parts, 1), 0) > 0 THEN array_to_string(v_parts, '; ')
        ELSE 'ficha unificada, sin referencias extra'
      END
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.get_integrante_delete_blockers(bigint) IS
  'Lista motivos por los que no se puede eliminar un integrante (giras, horas, etc.).';
COMMENT ON FUNCTION public.delete_integrante(bigint) IS
  'Borra un integrante solo si get_integrante_delete_blockers.can_delete.';
COMMENT ON FUNCTION public.merge_integrantes(bigint, bigint) IS
  'Fusiona integrante duplicado (source) en canónico (target) en una transacción; remapea FKs/arrays y elimina source.';

REVOKE ALL ON FUNCTION public.merge_integrantes_remap_bigint_array(bigint[], bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_integrantes_remap_bigint_array(bigint[], bigint, bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.merge_integrantes_remap_text_id_array(text[], bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_integrantes_remap_text_id_array(text[], bigint, bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.merge_integrantes_move_scalar_fk(text, text, bigint, bigint, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_integrantes_move_scalar_fk(text, text, bigint, bigint, text[]) TO authenticated;

REVOKE ALL ON FUNCTION public.merge_integrantes_person_label(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_integrantes_person_label(bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.get_integrante_delete_blockers(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_integrante_delete_blockers(bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_integrante(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_integrante(bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.merge_integrantes(bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_integrantes(bigint, bigint) TO authenticated;
