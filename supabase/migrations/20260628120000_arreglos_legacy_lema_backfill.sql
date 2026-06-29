-- Incluir obras legacy arregladas por Germán Lema en el dashboard de arreglos.
-- Criterio: id_integrante_arreglador, id_arreglador (compositor) u obras_compositores.rol = 'arreglador'.
-- Idempotente: no duplica logs ni sobrescribe id_integrante_arreglador ya asignado.
-- Fecha de entrega legacy: 31/12/2025 (nunca now()) para no adelantar obras reales de 2026.

DO $$
DECLARE
  _lema_integrante_id bigint := 4340365;
  _lema_compositor_id bigint;
  _fecha_entrega_legacy timestamptz := timestamptz '2025-12-31 12:00:00+00';
  _obra record;
  _estado_obra text;
BEGIN
  SELECT id INTO _lema_compositor_id
  FROM compositores
  WHERE apellido = 'Lema' AND nombre = 'Germán'
  LIMIT 1;

  IF _lema_compositor_id IS NULL THEN
    RAISE NOTICE 'Compositor Lema, Germán no encontrado; omitiendo backfill.';
    RETURN;
  END IF;

  UPDATE obras o
  SET id_integrante_arreglador = _lema_integrante_id
  WHERE o.id_integrante_arreglador IS NULL
    AND (
      o.id_arreglador = _lema_compositor_id
      OR EXISTS (
        SELECT 1
        FROM obras_compositores oc
        WHERE oc.id_obra = o.id
          AND oc.rol = 'arreglador'
          AND oc.id_compositor = _lema_compositor_id
      )
    );

  FOR _obra IN
    SELECT DISTINCT o.id, o.estado, o.link_drive
    FROM obras o
    WHERE o.estado IS DISTINCT FROM 'Solicitud'::estado_obra
      AND (
        o.id_integrante_arreglador = _lema_integrante_id
        OR o.id_arreglador = _lema_compositor_id
        OR EXISTS (
          SELECT 1
          FROM obras_compositores oc
          WHERE oc.id_obra = o.id
            AND oc.rol = 'arreglador'
            AND oc.id_compositor = _lema_compositor_id
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM obras_produccion_log l
        WHERE l.id_obra = o.id
          AND l.estado_anterior IN ('Para arreglar', 'Entregado', 'Oficial')
          AND l.estado_nuevo IN ('Para arreglar', 'Entregado', 'Oficial')
      )
  LOOP
    _estado_obra := lower(_obra.estado::text);

    IF _estado_obra = 'oficial' THEN
      INSERT INTO obras_produccion_log (id_obra, estado_anterior, estado_nuevo, link_entregado, fecha)
      VALUES (_obra.id, 'Para arreglar', 'Entregado', _obra.link_drive, _fecha_entrega_legacy);

      INSERT INTO obras_produccion_log (id_obra, estado_anterior, estado_nuevo, fecha)
      VALUES (_obra.id, 'Entregado', 'Oficial', NULL);
    ELSIF _estado_obra = 'entregado' THEN
      INSERT INTO obras_produccion_log (id_obra, estado_anterior, estado_nuevo, link_entregado, fecha)
      VALUES (_obra.id, 'Para arreglar', 'Entregado', _obra.link_drive, _fecha_entrega_legacy);
    ELSE
      INSERT INTO obras_produccion_log (id_obra, estado_anterior, estado_nuevo, link_entregado, fecha)
      VALUES (_obra.id, 'Para arreglar', 'Entregado', _obra.link_drive, NULL);
    END IF;
  END LOOP;
END $$;
