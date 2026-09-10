-- Fix UNION bigint/uuid in get_integrante_delete_blockers (actividad).

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

REVOKE ALL ON FUNCTION public.get_integrante_delete_blockers(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_integrante_delete_blockers(bigint) TO authenticated;
