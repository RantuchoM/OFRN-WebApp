SELECT json_build_object(
  'programa', (
    SELECT json_build_object(
      'id', id, 'nombre', nombre_gira, 'nomenclador', nomenclador,
      'estado', estado, 'tipo', tipo, 'mes_letra', mes_letra,
      'fecha_desde', fecha_desde, 'fecha_hasta', fecha_hasta
    )
    FROM programas WHERE id = 13
  ),
  'admision_que_podria_matchear', (
    SELECT COALESCE(json_agg(json_build_object(
      'id', a.id, 'id_transporte', a.id_transporte_fisico, 'detalle', gt.detalle,
      'categoria', gt.categoria_logistica, 'alcance', a.alcance, 'tipo', a.tipo,
      'id_integrante', a.id_integrante, 'id_localidad', a.id_localidad,
      'target_ids', a.target_ids, 'familia', a.instrumento_familia
    )), '[]'::json)
    FROM giras_logistica_admision a
    JOIN giras_transportes gt ON gt.id = a.id_transporte_fisico
    WHERE a.id_gira = 13
      AND (
        a.id_integrante = 1767967586926
        OR a.target_ids && ARRAY['1767967586926']::text[]
        OR a.alcance ILIKE 'general'
        OR a.alcance ILIKE 'categoria'
        OR COALESCE(a.instrumento_familia, '') ILIKE '%director%'
        OR a.target_ids && ARRAY['DIRECTORES','directores']::text[]
      )
  ),
  'rutas_persona_el', (
    SELECT COALESCE(json_agg(r.id), '[]'::json)
    FROM giras_logistica_rutas r
    WHERE r.id_gira = 13 AND r.id_integrante = 1767967586926
  ),
  'eventos_tipo35_gira', (
    SELECT json_agg(json_build_object(
      'id', e.id, 'fecha', e.fecha, 'hora', e.hora_inicio,
      'desc', left(regexp_replace(e.descripcion, '<[^>]+>', '', 'g'), 70),
      'visible', e.visible_agenda, 'gt', e.id_gira_transporte
    ) ORDER BY e.fecha, e.hora_inicio)
    FROM eventos e
    WHERE e.id_gira = 13 AND e.id_tipo_evento = 35 AND COALESCE(e.is_deleted, false) = false
  ),
  'regla_226', (
    SELECT json_build_object(
      'id', id, 'alcance', alcance, 'target_categories', target_categories,
      'comida_inicio_servicio', comida_inicio_servicio,
      'comida_fin_servicio', comida_fin_servicio,
      'id_evento_checkin', id_evento_checkin,
      'id_evento_checkout', id_evento_checkout,
      'prov_cena', prov_cena, 'prov_almuerzo', prov_almuerzo
    )
    FROM giras_logistica_reglas WHERE id = 226
  )
) AS payload;
