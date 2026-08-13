-- Encargos Suite Mujeres Argentinas: Lema (integrante 4340365) como arreglador
-- en obras.id_arreglador y obras_compositores. Idempotente.

DO $$
DECLARE
  _lema_int bigint := 4340365;
  _lema_comp bigint;
  _ids bigint[] := ARRAY[3574, 3576, 3578, 3580, 3582, 3584, 3586, 3588, 3590];
BEGIN
  SELECT id INTO _lema_comp
  FROM compositores
  WHERE apellido = 'Lema' AND nombre = 'Germán'
  LIMIT 1;

  IF _lema_comp IS NULL THEN
    RAISE EXCEPTION 'Compositor Lema, Germán no encontrado';
  END IF;

  UPDATE obras
  SET
    id_arreglador = _lema_comp,
    id_integrante_arreglador = _lema_int
  WHERE id = ANY (_ids);

  DELETE FROM obras_compositores
  WHERE id_obra = ANY (_ids)
    AND rol = 'arreglador';

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT x.id_obra, _lema_comp, 'arreglador'
  FROM unnest(_ids) AS x(id_obra);

  RAISE NOTICE 'Lema compositor % como arreglador en % obras', _lema_comp, array_length(_ids, 1);
END $$;
