-- Jefes de fila (cuerdas): RPCs acotados + plantilla REPERTORIO_PARTES_LISTOS.
-- Jefe = atril_num=1 AND lado=0 del contenedor (sin columna persistente).

CREATE OR REPLACE FUNCTION public.reorder_contenedor_items_jefe(
  p_actor_id bigint,
  p_contenedor_id bigint,
  p_placements jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_item_id bigint;
  v_placement jsonb;
  v_item_id bigint;
  v_atril int;
  v_lado int;
  v_orden int;
  v_count_db int;
  v_count_payload int;
  v_ids_payload bigint[];
  v_actor_still_jefe boolean;
BEGIN
  IF p_actor_id IS NULL OR p_contenedor_id IS NULL THEN
    RAISE EXCEPTION 'actor y contenedor son obligatorios';
  END IF;
  IF p_placements IS NULL OR jsonb_typeof(p_placements) <> 'array' THEN
    RAISE EXCEPTION 'placements debe ser un array JSON';
  END IF;

  SELECT i.id
    INTO v_actor_item_id
  FROM seating_contenedores_items i
  WHERE i.id_contenedor = p_contenedor_id
    AND i.id_musico = p_actor_id
    AND i.atril_num = 1
    AND i.lado = 0
  LIMIT 1;

  IF v_actor_item_id IS NULL THEN
    RAISE EXCEPTION 'Solo el jefe de fila (atril 1a) puede reordenar este contenedor';
  END IF;

  SELECT COUNT(*)::int INTO v_count_db
  FROM seating_contenedores_items
  WHERE id_contenedor = p_contenedor_id;

  v_count_payload := jsonb_array_length(p_placements);
  IF v_count_payload <> v_count_db THEN
    RAISE EXCEPTION 'El reorder debe incluir exactamente los ítems del contenedor';
  END IF;

  SELECT COALESCE(array_agg((elem->>'id')::bigint), ARRAY[]::bigint[])
    INTO v_ids_payload
  FROM jsonb_array_elements(p_placements) AS elem;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_ids_payload) AS pid
    WHERE NOT EXISTS (
      SELECT 1 FROM seating_contenedores_items i
      WHERE i.id = pid AND i.id_contenedor = p_contenedor_id
    )
  ) THEN
    RAISE EXCEPTION 'Hay ítems que no pertenecen al contenedor';
  END IF;

  -- El actor debe quedar en 1a en el payload
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_placements) AS elem
    WHERE (elem->>'id')::bigint = v_actor_item_id
      AND (elem->>'atril_num')::int = 1
      AND (elem->>'lado')::int = 0
  ) INTO v_actor_still_jefe;

  IF NOT v_actor_still_jefe THEN
    RAISE EXCEPTION 'El jefe de fila no puede cambiarse a sí mismo de ubicación (debe permanecer en 1a)';
  END IF;

  FOR v_placement IN SELECT * FROM jsonb_array_elements(p_placements)
  LOOP
    v_item_id := (v_placement->>'id')::bigint;
    v_atril := (v_placement->>'atril_num')::int;
    v_lado := (v_placement->>'lado')::int;
    IF v_atril IS NULL OR v_lado IS NULL OR v_atril < 1 OR v_lado NOT IN (0, 1) THEN
      RAISE EXCEPTION 'atril_num/lado inválidos';
    END IF;
    v_orden := (v_atril - 1) * 2 + v_lado + 1;
    UPDATE seating_contenedores_items
       SET atril_num = v_atril,
           lado = v_lado,
           orden = v_orden
     WHERE id = v_item_id
       AND id_contenedor = p_contenedor_id;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reorder_contenedor_items_jefe(bigint, bigint, jsonb) IS
  'Reorder de atriles dentro de un contenedor; solo el jefe (1a) y sin moverse a sí mismo.';

CREATE OR REPLACE FUNCTION public.assign_particella_individual_jefe(
  p_actor_id bigint,
  p_programa_id bigint,
  p_obra_id bigint,
  p_musico_id bigint,
  p_particella_ids bigint[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contenedor_id bigint;
  v_part_id bigint;
  v_row seating_asignaciones%ROWTYPE;
  v_ids bigint[];
  v_desired bigint[];
BEGIN
  IF p_actor_id IS NULL OR p_programa_id IS NULL OR p_obra_id IS NULL OR p_musico_id IS NULL THEN
    RAISE EXCEPTION 'parámetros obligatorios incompletos';
  END IF;

  SELECT c.id
    INTO v_contenedor_id
  FROM seating_contenedores c
  JOIN seating_contenedores_items jefe
    ON jefe.id_contenedor = c.id
   AND jefe.id_musico = p_actor_id
   AND jefe.atril_num = 1
   AND jefe.lado = 0
  JOIN seating_contenedores_items miembro
    ON miembro.id_contenedor = c.id
   AND miembro.id_musico = p_musico_id
  WHERE c.id_programa = p_programa_id
  LIMIT 1;

  IF v_contenedor_id IS NULL THEN
    RAISE EXCEPTION 'Solo el jefe de fila puede asignar partes individuales a músicos de su contenedor';
  END IF;

  v_desired := COALESCE(
    (SELECT array_agg(DISTINCT x) FROM unnest(COALESCE(p_particella_ids, ARRAY[]::bigint[])) AS x WHERE x IS NOT NULL),
    ARRAY[]::bigint[]
  );

  -- Quitar al músico de filas M- (sin contenedor) de esta obra que ya no correspondan
  FOR v_row IN
    SELECT *
    FROM seating_asignaciones
    WHERE id_programa = p_programa_id
      AND id_obra = p_obra_id
      AND id_contenedor IS NULL
      AND p_musico_id = ANY (id_musicos_asignados)
  LOOP
    IF v_row.id_particella = ANY (v_desired) THEN
      CONTINUE;
    END IF;
    v_ids := array_remove(v_row.id_musicos_asignados, p_musico_id);
    IF coalesce(array_length(v_ids, 1), 0) = 0 THEN
      DELETE FROM seating_asignaciones WHERE id = v_row.id;
    ELSE
      UPDATE seating_asignaciones
         SET id_musicos_asignados = v_ids
       WHERE id = v_row.id;
    END IF;
  END LOOP;

  FOREACH v_part_id IN ARRAY v_desired
  LOOP
    SELECT *
      INTO v_row
    FROM seating_asignaciones
    WHERE id_programa = p_programa_id
      AND id_obra = p_obra_id
      AND id_contenedor IS NULL
      AND id_particella = v_part_id
    LIMIT 1;

    IF FOUND THEN
      IF NOT (p_musico_id = ANY (v_row.id_musicos_asignados)) THEN
        UPDATE seating_asignaciones
           SET id_musicos_asignados = array_append(v_row.id_musicos_asignados, p_musico_id)
         WHERE id = v_row.id;
      END IF;
    ELSE
      INSERT INTO seating_asignaciones (
        id_programa, id_obra, id_particella, id_musicos_asignados, id_contenedor
      ) VALUES (
        p_programa_id, p_obra_id, v_part_id, ARRAY[p_musico_id]::bigint[], NULL
      );
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.assign_particella_individual_jefe(bigint, bigint, bigint, bigint, bigint[]) IS
  'Asignación individual M- de particellas; solo jefe de fila sobre miembros de su contenedor.';

REVOKE ALL ON FUNCTION public.reorder_contenedor_items_jefe(bigint, bigint, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_particella_individual_jefe(bigint, bigint, bigint, bigint, bigint[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_contenedor_items_jefe(bigint, bigint, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_particella_individual_jefe(bigint, bigint, bigint, bigint, bigint[]) TO anon, authenticated, service_role;

INSERT INTO public.mail_plantillas (template_id, variant_key, titulo, asunto, slots)
VALUES
  (
    'convocatoria_gira',
    'REPERTORIO_PARTES_LISTOS',
    'Repertorio y partes listos',
    'Repertorio y partes disponibles | {gira}',
    jsonb_build_object(
      'titulo_interno', 'Repertorio y partes disponibles',
      'lead', 'Ya está subido el repertorio de la gira <strong>{gira}</strong> ({nomenclador}) y hecha la asignación inicial de partes.',
      'cuerpo', 'En cuerdas, la disposición queda a disposición de los jefes de fila para ajustes de atriles y asignaciones individuales. Ante cualquier cambio te van a notificar.',
      'cierre', 'Cualquier consulta, respondé a este correo.',
      'link_texto', 'Ver repertorio y material de la gira',
      'footer', 'Orquesta Filarmónica de Río Negro – Sistema de Gestión'
    )
  ),
  (
    'convocatoria_gira',
    'SEATING_CAMBIO',
    'Novedades de seating',
    'Novedades de seating | {gira}',
    jsonb_build_object(
      'titulo_interno', 'Novedades de seating',
      'lead', 'Hay novedades de seating en la gira <strong>{gira}</strong> ({nomenclador}).',
      'reason', '{motivo}',
      'actor_nota', 'Este cambio lo efectuó el/la jefe de fila {actor_jefe} (no producción).',
      'cierre', 'Saludos.',
      'footer', 'Orquesta Filarmónica de Río Negro – Sistema de Gestión'
    )
  )
ON CONFLICT (template_id, variant_key) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  asunto = EXCLUDED.asunto,
  slots = EXCLUDED.slots,
  updated_at = now();
